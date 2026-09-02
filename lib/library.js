// "My Library" — the anonymous per-person skill collection behind both the
// website (ws_lib cookie) and the MCP connector (OAuth library_id; the
// consent flow reuses the same cookie, so site + connector share one
// library). Mongo-backed; in-memory fallback keeps local dev working.

import { getDb } from '@/lib/mongo'
import { randomUUID } from 'crypto'

const mem = new Map() // library_id -> Map(skill_key -> entry)
const useMongo = () => Boolean(process.env.MONGO_URL)

export async function addToLibrary(libraryId, skill) {
  const entry = {
    id: randomUUID(),
    library_id: libraryId,
    skill_id: skill.id,
    slug: skill.slug || skill.id,
    name: skill.title_human || skill.name,
    category: skill.category || null,
    added_at: new Date(),
  }
  if (!useMongo()) {
    if (!mem.has(libraryId)) mem.set(libraryId, new Map())
    mem.get(libraryId).set(entry.skill_id, entry)
    return entry
  }
  const db = await getDb()
  await db.collection('library_installs').updateOne(
    { library_id: libraryId, skill_id: entry.skill_id },
    { $setOnInsert: entry },
    { upsert: true }
  )
  return entry
}

export async function removeFromLibrary(libraryId, key) {
  if (!useMongo()) {
    const lib = mem.get(libraryId)
    if (!lib) return false
    for (const [skillId, e] of lib) {
      if (skillId === key || e.slug === key) return lib.delete(skillId)
    }
    return false
  }
  const db = await getDb()
  const res = await db
    .collection('library_installs')
    .deleteOne({ library_id: libraryId, $or: [{ skill_id: key }, { slug: key }] })
  return res.deletedCount > 0
}

export async function listLibrary(libraryId) {
  if (!libraryId) return []
  if (!useMongo()) return Array.from(mem.get(libraryId)?.values() || []).sort((a, b) => b.added_at - a.added_at)
  const db = await getDb()
  return db.collection('library_installs').find({ library_id: libraryId }).sort({ added_at: -1 }).limit(200).toArray()
}

export function readLibraryCookie(request) {
  const raw = request.headers.get('cookie') || ''
  const m = raw.match(/(?:^|;\s*)ws_lib=([^;]+)/)
  return m ? decodeURIComponent(m[1]) : ''
}

export function libraryCookieHeader(libraryId) {
  return `ws_lib=${libraryId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`
}

export { randomUUID as newLibraryId }
