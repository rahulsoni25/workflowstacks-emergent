import { postsCollection, revisionsCollection, countWords, serialize } from '@/lib/blog/store'
import { assembleBody } from '@/lib/blog/markdown'
import { runSeoChecks } from '@/lib/blog/seo-check'

export const dynamic = 'force-dynamic'

function requireAdmin(request) {
  const secret = process.env.ADMIN_SECRET
  const provided = request.headers.get('x-admin-secret')
  if (!secret || provided !== secret) {
    return Response.json({ error: 'Unauthorized — admin secret required' }, { status: 401 })
  }
  return null
}

export async function GET(request, { params }) {
  const denied = requireAdmin(request)
  if (denied) return denied
  const col = await postsCollection()
  const doc = await col.findOne({ slug: params.slug })
  if (!doc) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ post: serialize(doc) })
}

// PATCH: partial update — status changes (publish/unpublish/schedule) and
// field edits from the admin editor. Recomputes body + SEO when content moved.
export async function PATCH(request, { params }) {
  const denied = requireAdmin(request)
  if (denied) return denied
  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const col = await postsCollection()
  const doc = await col.findOne({ slug: params.slug })
  if (!doc) return Response.json({ error: 'Not found' }, { status: 404 })

  const now = new Date()
  const set = { updated_at: now }
  const editable = ['title', 'meta_title', 'meta_description', 'excerpt', 'answer', 'tldr', 'persona', 'topic', 'tags', 'seo', 'anchor_asset', 'sections', 'faq', 'key_takeaways', 'sources', 'author']
  let contentChanged = false
  for (const k of editable) {
    if (k in body) { set[k] = body[k]; contentChanged = contentChanged || ['title', 'sections', 'answer', 'faq', 'meta_description', 'seo'].includes(k) }
  }

  if (body.action === 'publish') {
    set.status = 'published'
    set.published_at = doc.published_at || now
  } else if (body.action === 'unpublish') {
    set.status = 'drafted'
  } else if (body.action === 'schedule' && body.scheduled_for) {
    set.status = 'published' // visible when published_at passes (see publicFilter)
    set.published_at = new Date(body.scheduled_for)
    set.scheduled_for = new Date(body.scheduled_for)
  } else if (body.status) {
    set.status = body.status
  }

  if (contentChanged) {
    const merged = { ...doc, ...set }
    set.body_md = assembleBody(merged)
    set.word_count = countWords(set.body_md)
    set.reading_min = Math.max(1, Math.round(set.word_count / 220))
    set.seo_report = runSeoChecks({ ...merged, body_md: set.body_md })
    const rev = await revisionsCollection()
    await rev.insertOne({ post_id: doc.slug, body_md: doc.body_md, title: doc.title, at: now, reason: 'pre-edit snapshot' })
  }

  await col.updateOne(
    { slug: params.slug },
    { $set: set, $push: { history: { at: now, status: set.status || doc.status, by: 'admin', note: body.action || 'edit' } } }
  )
  return Response.json({ ok: true, slug: params.slug, status: set.status || doc.status, seo_score: set.seo_report?.score })
}

export async function DELETE(request, { params }) {
  const denied = requireAdmin(request)
  if (denied) return denied
  const col = await postsCollection()
  // Soft delete — archived posts drop out of every public query but stay
  // recoverable from the admin list.
  const r = await col.updateOne({ slug: params.slug }, { $set: { status: 'archived', updated_at: new Date() } })
  if (!r.matchedCount) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ ok: true, archived: params.slug })
}
