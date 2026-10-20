// POST /api/track-install — anonymous, fire-and-forget install telemetry.
// Every button in the "Use with Claude" panel and the editor launch rows
// reports which channel was used, so we learn where installs actually happen
// (zip vs deep link vs Claude Code vs Cursor vs MCP vs the CLI) and which
// skills convert. The MCP server writes its own rows through the same helper
// (lib/track-install-server.js) without going through this endpoint.
//
// Privacy: no user identity is recorded — just skill id, channel, and time.

import { getDb } from '@/lib/mongo'
import { recordInstall } from '@/lib/track-install-server'

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
  // `npx workflowstacks add <slug>` (cli/index.js), after the file is written.
  'cli',
  // MCP server (app/api/mcp/route.js): a skill loaded into a conversation,
  // and one saved to the user's library. Written server-side; listed here so
  // the channel vocabulary lives in one place.
  'mcp_get',
  'mcp_install',
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
  // First-touch attribution captured client-side (lib/analytics.js); the
  // helper whitelists its keys. It also swallows every failure and the no-DB
  // case (local dev), so the client always gets its 202 — telemetry must
  // never error the UI.
  await recordInstall({
    skillId,
    channel,
    page: typeof body?.page === 'string' ? body.page : '',
    attribution: body?.attribution,
  })
  return new Response(null, { status: 202 })
}
