// Server-side install telemetry: one row in `install_events` plus the catalog's
// `installs` counter. Shared by POST /api/track-install (the browser's install
// buttons, the CLI) and the MCP handler (get_skill / install_skill), so every
// channel lands in the same collection with the same fields and the admin
// stats GET groups them by `channel` without knowing the list.
//
// Privacy: skill id, channel, time, and (from the browser) the session's
// first-touch attribution. No user identity, no email.
//
// Never throws — telemetry must never fail the request that produced it.
// The client-side counterpart is lib/track-install.js.

import { getDb } from '@/lib/mongo'
import { randomUUID } from 'crypto'

const ATTRIBUTION_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'ref', 'landing', 'referrer', 'first_seen']

// Whitelist keys and clamp lengths so the collection never becomes a dumping
// ground for whatever a client chooses to send.
export function cleanAttribution(raw) {
  const out = {}
  if (!raw || typeof raw !== 'object') return out
  for (const k of ATTRIBUTION_KEYS) {
    const v = raw[k]
    if (typeof v === 'string' && v) out[k] = v.slice(0, 120)
  }
  return out
}

// Resolves true when a row was written, false otherwise (no DB configured,
// bad input, or a Mongo error). Callers never need to await the outcome.
export async function recordInstall({ skillId, channel, page = '', attribution = null } = {}) {
  const skill_id = typeof skillId === 'string' ? skillId.slice(0, 200) : ''
  if (!skill_id || typeof channel !== 'string' || !channel) return false
  // No DB configured (local dev): accept and drop.
  if (!process.env.MONGO_URL) return false
  try {
    const db = await getDb()
    const attr = cleanAttribution(attribution)
    const pagePath = typeof page === 'string' ? page.slice(0, 200) : ''
    await db.collection('install_events').insertOne({
      id: randomUUID(),
      skill_id,
      channel,
      ...(pagePath ? { page: pagePath } : {}),
      ...(Object.keys(attr).length ? { attribution: attr } : {}),
      created_at: new Date(),
    })
    // Same counter the catalog already sorts/displays with.
    await db
      .collection('skills')
      .updateOne({ $or: [{ id: skill_id }, { slug: skill_id }] }, { $inc: { installs: 1 } })
    return true
  } catch {
    return false
  }
}
