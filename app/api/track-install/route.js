// POST /api/track-install — anonymous, fire-and-forget install telemetry.
// Every button in the "Use with Claude" panel and the editor launch rows
// reports which channel was used, so we learn where installs actually happen
// (zip vs deep link vs Claude Code vs Cursor vs MCP) and which skills convert.
//
// Privacy: no user identity is recorded — just skill id, channel, and time.

import { getDb } from '@/lib/mongo'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

const CHANNELS = new Set([
  'zip',
  'try-claude',
  'copy-prompt',
  'claude-code',
  'mcp-copy',
  'cursor-mcp',
  'editor-claude-code',
  'editor-claude-cowork',
  'editor-cursor',
  'editor-antigravity',
  'editor-vs-code',
  'editor-windsurf',
  // Homepage install step: open-in-tool for the non-Claude targets and the
  // blueprint.md download (copy reuses 'copy-prompt', Claude reuses 'try-claude').
  'open-chatgpt',
  'open-gemini',
  'download-md',
])

// GET (admin-secret) → conversion stats: events by channel and top skills,
// last 30 days. This is how the telemetry answers "which install path wins".
export async function GET(request) {
  const secret = process.env.ADMIN_SECRET
  if (!secret || request.headers.get('x-admin-secret') !== secret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000)
  if (!process.env.MONGO_URL) {
    return Response.json({ since, total: 0, by_channel: [], top_skills: [] })
  }
  const db = await getDb()
  const [byChannel, topSkills, total] = await Promise.all([
    db.collection('install_events').aggregate([
      { $match: { created_at: { $gte: since } } },
      { $group: { _id: '$channel', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray(),
    db.collection('install_events').aggregate([
      { $match: { created_at: { $gte: since } } },
      { $group: { _id: '$skill_id', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 25 },
    ]).toArray(),
    db.collection('install_events').countDocuments({ created_at: { $gte: since } }),
  ])
  return Response.json({
    since,
    total,
    by_channel: byChannel.map((r) => ({ channel: r._id, count: r.count })),
    top_skills: topSkills.map((r) => ({ skill: r._id, count: r.count })),
  })
}

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ ok: false }, { status: 400 })
  }
  const skillId = typeof body?.skillId === 'string' ? body.skillId.slice(0, 200) : ''
  const channel = typeof body?.channel === 'string' ? body.channel : ''
  if (!skillId || !CHANNELS.has(channel)) {
    return Response.json({ ok: false }, { status: 400 })
  }
  // First-touch attribution captured client-side (lib/analytics.js). Whitelist
  // keys and clamp lengths so the collection never becomes a dumping ground.
  const attribution = {}
  if (body?.attribution && typeof body.attribution === 'object') {
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'ref', 'landing', 'referrer', 'first_seen']) {
      const v = body.attribution[k]
      if (typeof v === 'string' && v) attribution[k] = v.slice(0, 120)
    }
  }
  const page = typeof body?.page === 'string' ? body.page.slice(0, 200) : ''
  // No DB configured (local dev): accept and drop, never break the client.
  if (!process.env.MONGO_URL) return new Response(null, { status: 202 })
  try {
    const db = await getDb()
    await db.collection('install_events').insertOne({
      id: randomUUID(),
      skill_id: skillId,
      channel,
      ...(page ? { page } : {}),
      ...(Object.keys(attribution).length ? { attribution } : {}),
      created_at: new Date(),
    })
    // Same counter the catalog already sorts/displays with.
    await db
      .collection('skills')
      .updateOne({ $or: [{ id: skillId }, { slug: skillId }] }, { $inc: { installs: 1 } })
    return new Response(null, { status: 202 })
  } catch {
    return new Response(null, { status: 202 }) // telemetry must never error the UI
  }
}
