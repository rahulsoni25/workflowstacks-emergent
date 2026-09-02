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
  'editor-cursor',
  'editor-antigravity',
  'editor-vs-code',
  'editor-windsurf',
])

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
  // No DB configured (local dev): accept and drop, never break the client.
  if (!process.env.MONGO_URL) return new Response(null, { status: 202 })
  try {
    const db = await getDb()
    await db.collection('install_events').insertOne({
      id: randomUUID(),
      skill_id: skillId,
      channel,
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
