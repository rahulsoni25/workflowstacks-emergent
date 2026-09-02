// /api/library — the website's door into My Library, keyed by the ws_lib
// cookie (the same anonymous id the MCP connector's OAuth consent uses, so
// saves made here appear in Claude via list_my_skills and vice versa).
//
// GET    → current library
// POST   {skillId} → save a skill (mints the cookie on first save)
// DELETE {skillId} → remove

import { loadSkill } from '@/lib/claude-skill'
import { addToLibrary, removeFromLibrary, listLibrary, readLibraryCookie, libraryCookieHeader, newLibraryId } from '@/lib/library'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const libraryId = readLibraryCookie(request)
  const items = await listLibrary(libraryId).catch(() => [])
  return Response.json(
    { items: items.map(({ _id, library_id, ...rest }) => rest) },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Bad JSON' }, { status: 400 })
  }
  const skill = await loadSkill(String(body?.skillId || ''))
  if (!skill) return Response.json({ error: 'Skill not found' }, { status: 404 })

  let libraryId = readLibraryCookie(request)
  const isNew = !libraryId
  if (isNew) libraryId = newLibraryId()

  await addToLibrary(libraryId, skill)
  const headers = { 'Cache-Control': 'no-store' }
  if (isNew) headers['Set-Cookie'] = libraryCookieHeader(libraryId)
  return Response.json({ ok: true }, { headers })
}

export async function DELETE(request) {
  const libraryId = readLibraryCookie(request)
  if (!libraryId) return Response.json({ error: 'No library' }, { status: 404 })
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Bad JSON' }, { status: 400 })
  }
  const removed = await removeFromLibrary(libraryId, String(body?.skillId || ''))
  return Response.json({ ok: removed }, { headers: { 'Cache-Control': 'no-store' } })
}
