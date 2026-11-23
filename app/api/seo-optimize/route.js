import { timingSafeEqual } from 'crypto'
import { getDb } from '@/lib/mongo'
import { revalidateSkill } from '@/lib/revalidate'
import { auditSeo, seoWorkingSetQuery, SEO_WORKING_SET_PROJECTION, SEO_WORKING_SET_MAX } from '@/lib/seo-hygiene'

export const runtime = 'nodejs'
export const maxDuration = 60

// Deterministic SEO hygiene for catalog records.
//
// SCOPE — this endpoint deliberately does NOT rewrite content with an LLM.
// /api/agent-rewrite already does judge-gated rewriting (?best=true&target=9,
// ?gateMin=9) and this endpoint must not duplicate it. What lives here is the
// set of mechanical defects a language model is the wrong tool for:
// duplicate titles, meta-length violations, and dead upstream repos.
//
// WHY DETERMINISTIC — Google's scaled-content-abuse policy targets large
// volumes of machine-generated pages. Mass-regenerating copy on a schedule is
// exactly that pattern, and this repo already has a cautionary precedent:
// /api/rewrite-titles is disabled (410) because automated title generation
// produced duplicate junk. Every mutation below is a bounded, reversible
// transformation of text we already have — truncation at a word boundary, or
// appending a factual owner name. Nothing is invented.
//
// GUARDRAILS
//   - Only records that FAIL a check are touched. No blanket passes.
//   - Hard cap per run (default 40, max 100) so a bad rule can't rewrite the
//     whole catalog before anyone notices.
//   - Cooldown: a record optimized within COOLDOWN_DAYS is skipped, which
//     prevents the flip-flopping that makes Google distrust a page.
//   - ?dryRun=true reports what it would change without writing.
//
// The checks themselves live in lib/seo-hygiene.js, because
// /api/agent-rewrite?seoFlagged=true selects its records with the same code:
// the records reported here as needsRewrite are the ones it rewrites.

function requireAdmin(request) {
  const secret = process.env.ADMIN_SECRET
  if (!secret) return Response.json({ error: 'ADMIN_SECRET not configured' }, { status: 500 })
  // Header only — a ?secret= query param would land in request logs.
  const provided = request.headers.get('x-admin-secret') || ''
  if (provided.length !== secret.length || !timingSafeEqual(Buffer.from(provided), Buffer.from(secret))) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return null
}

export async function POST(request) {
  const denied = requireAdmin(request)
  if (denied) return denied

  const url = new URL(request.url)
  const dryRun = url.searchParams.get('dryRun') === 'true'
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '40', 10), 100)

  const db = await getDb()
  const col = db.collection('skills')

  const docs = await col
    .find(seoWorkingSetQuery())
    .project(SEO_WORKING_SET_PROJECTION)
    .limit(SEO_WORKING_SET_MAX)
    .toArray()

  // Only records that fail a check, capped at `limit`.
  const actions = []
  for (const a of auditSeo(docs)) {
    if (actions.length >= limit) break
    actions.push(a)
  }

  let updated = 0
  if (!dryRun) {
    for (const a of actions) {
      if (!a.set) continue
      await col.updateOne({ id: a.id }, { $set: { ...a.set, seo_optimized_at: new Date() } })
      revalidateSkill(a)
      updated++
    }
  }

  return Response.json({
    at: new Date().toISOString(),
    dryRun,
    scanned: docs.length,
    cap: limit,
    updated,
    flaggedForRewrite: actions.filter((a) => a.needsRewrite).length,
    byReason: actions.reduce((acc, a) => {
      for (const r of a.reasons) acc[r] = (acc[r] || 0) + 1
      return acc
    }, {}),
    sample: actions.slice(0, 10),
  })
}
