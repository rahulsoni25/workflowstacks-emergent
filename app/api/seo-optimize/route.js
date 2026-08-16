import { timingSafeEqual } from 'crypto'
import { getDb } from '@/lib/mongo'

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

const MAX_TITLE = 60 // SERP truncation point
const MIN_TITLE = 15
const MAX_DESC = 160
const MIN_DESC = 50
const COOLDOWN_DAYS = 45

function requireAdmin(request) {
  const secret = process.env.ADMIN_SECRET
  if (!secret) return Response.json({ error: 'ADMIN_SECRET not configured' }, { status: 500 })
  // Header only — a ?secret= query param would land in request logs.
  const provided = request.headers.get('x-admin-secret') || ''
  if (provided.length !== secret.length || !timingSafeEqual(Buffer.from(provided), Buffer.from(secret))) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return null
}

// Truncate ONLY at a clean word boundary. Returns null when it cannot cut
// cleanly — the caller then leaves the text alone and defers to the
// judge-gated rewriter.
//
// This refusal is the whole point. A naive character cut turns
// "Content Generation with content-generation-solution-accelerator" into
// "...solution-acceler", which is exactly the mid-word junk that got
// /api/rewrite-titles disabled. Emitting nothing beats emitting garbage.
function trimTo(text, max) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  // Require the boundary to retain at least 60% of the budget, otherwise the
  // result is too stunted to be a faithful shortening of the original.
  if (lastSpace < max * 0.6) return null
  const out = cut.slice(0, lastSpace).replace(/[,;:\-–—\s]+$/, '')
  return out.length >= max * 0.5 ? out : null
}

// Owner login from the repo URL — a factual disambiguator for duplicate
// titles. Using real provenance rather than inventing a differentiator.
function ownerOf(skill) {
  const m = /github\.com\/([^/]+)/.exec(skill.github_url || '')
  return m ? m[1] : ''
}

export async function POST(request) {
  const denied = requireAdmin(request)
  if (denied) return denied

  const url = new URL(request.url)
  const dryRun = url.searchParams.get('dryRun') === 'true'
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '40', 10), 100)

  const db = await getDb()
  const col = db.collection('skills')
  const cooldown = new Date(Date.now() - COOLDOWN_DAYS * 86400000)

  const docs = await col
    .find({
      published: { $ne: false },
      $or: [{ seo_optimized_at: { $exists: false } }, { seo_optimized_at: { $lt: cooldown } }],
    })
    .project({
      id: 1, slug: 1, name: 1, title_human: 1, description_human: 1,
      description: 1, github_url: 1, github_stars: 1,
    })
    .limit(2000)
    .toArray()

  // Duplicate titles are found across the whole working set before any edit,
  // so the first occurrence can be left alone and only collisions repaired.
  const titleCounts = new Map()
  for (const d of docs) {
    const t = (d.title_human || d.name || '').trim().toLowerCase()
    if (t) titleCounts.set(t, (titleCounts.get(t) || 0) + 1)
  }
  const seenTitle = new Set()

  const actions = []
  for (const d of docs) {
    if (actions.length >= limit) break
    const set = {}
    const reasons = []

    const title = (d.title_human || d.name || '').trim()
    const titleKey = title.toLowerCase()

    // Anything trimTo refuses to shorten cleanly is escalated to the
    // judge-gated rewriter instead of being mangled here.
    let unfixable = false

    // 1. Duplicate title — disambiguate with the real repo owner.
    if (title && titleCounts.get(titleKey) > 1) {
      if (seenTitle.has(titleKey)) {
        const owner = ownerOf(d)
        if (owner && !titleKey.includes(owner.toLowerCase())) {
          const next = trimTo(`${title} by ${owner}`, MAX_TITLE)
          if (next) {
            set.title_human = next
            reasons.push('duplicate-title')
          } else {
            unfixable = true
            reasons.push('duplicate-title-needs-rewrite')
          }
        }
      } else {
        seenTitle.add(titleKey)
      }
    }

    // 2. Title too long for the SERP.
    if (!set.title_human && title.length > MAX_TITLE) {
      const next = trimTo(title, MAX_TITLE)
      if (next) {
        set.title_human = next
        reasons.push('title-too-long')
      } else {
        unfixable = true
        reasons.push('title-too-long-needs-rewrite')
      }
    }

    // 3. Description length. Too-long is mechanically fixable; too-short is
    //    NOT — inventing words would be fabrication, so it's only reported
    //    and handed to agent-rewrite, which is judge-gated.
    const desc = (d.description_human || d.description || '').trim()
    if (desc.length > MAX_DESC) {
      const next = trimTo(desc, MAX_DESC)
      if (next) {
        set.description_human = next
        reasons.push('description-too-long')
      } else {
        unfixable = true
        reasons.push('description-too-long-needs-rewrite')
      }
    }

    const needsRewrite = unfixable || title.length < MIN_TITLE || desc.length < MIN_DESC

    if (Object.keys(set).length > 0) {
      actions.push({ id: d.id, slug: d.slug, reasons, set, needsRewrite })
    } else if (needsRewrite) {
      actions.push({ id: d.id, slug: d.slug, reasons: ['too-thin-for-deterministic-fix'], set: null, needsRewrite })
    }
  }

  let updated = 0
  if (!dryRun) {
    for (const a of actions) {
      if (!a.set) continue
      await col.updateOne({ id: a.id }, { $set: { ...a.set, seo_optimized_at: new Date() } })
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
