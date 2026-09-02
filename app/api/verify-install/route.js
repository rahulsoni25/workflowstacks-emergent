// Verified installs — the API half of the pipeline. A weekly GitHub Action
// (scripts/verify-installs.mjs) pulls candidates from GET, actually runs each
// allowlisted install in a throwaway CI environment, and reports the outcome
// to POST. Skills that pass show a "✓ Install verified" badge, and the setup
// prompts tell the agent the install is known-good.
//
// Both endpoints are admin-only (x-admin-secret), same pattern as
// /api/did-it-work.

import { getDb } from '@/lib/mongo'
import { parseSafeInstall } from '@/lib/safe-install.mjs'

export const dynamic = 'force-dynamic'

function requireAdmin(request) {
  const secret = process.env.ADMIN_SECRET
  if (!secret || request.headers.get('x-admin-secret') !== secret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

// GET → candidates: skills whose documented install command is safely
// runnable and that haven't been verified recently. Most-starred first.
export async function GET(request) {
  const denied = requireAdmin(request)
  if (denied) return denied
  const limit = Math.min(parseInt(new URL(request.url).searchParams.get('limit') || '10', 10) || 10, 50)
  const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000)

  const db = await getDb()
  const rows = await db
    .collection('skills')
    .find(
      { 'use_guide.install': { $exists: true, $ne: '' } },
      { projection: { id: 1, slug: 1, name: 1, title_human: 1, 'use_guide.install': 1, github_stars: 1, verified_install: 1 } }
    )
    .sort({ github_stars: -1 })
    .limit(500)
    .toArray()

  const candidates = []
  for (const s of rows) {
    if (candidates.length >= limit) break
    if (s.verified_install?.at && new Date(s.verified_install.at) > cutoff) continue
    const parsed = parseSafeInstall(s.use_guide?.install)
    if (!parsed) continue
    candidates.push({
      id: s.id,
      slug: s.slug,
      name: s.title_human || s.name,
      install: s.use_guide.install,
      kind: parsed.kind,
      pkg: parsed.pkg,
    })
  }
  return Response.json({ candidates })
}

// POST → record one verification result on the skill document.
export async function POST(request) {
  const denied = requireAdmin(request)
  if (denied) return denied
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Bad JSON' }, { status: 400 })
  }
  const skillId = typeof body?.skillId === 'string' ? body.skillId.slice(0, 200) : ''
  if (!skillId || typeof body?.ok !== 'boolean') {
    return Response.json({ error: 'skillId and ok are required' }, { status: 400 })
  }
  const verified = {
    ok: body.ok,
    method: String(body.method || '').slice(0, 300),
    at: new Date(),
    duration_ms: Number(body.durationMs) || null,
    log_tail: String(body.log || '').slice(-2000),
  }
  const db = await getDb()
  const res = await db
    .collection('skills')
    .updateOne({ $or: [{ id: skillId }, { slug: skillId }] }, { $set: { verified_install: verified } })
  if (res.matchedCount === 0) return Response.json({ error: 'Skill not found' }, { status: 404 })
  return Response.json({ ok: true })
}
