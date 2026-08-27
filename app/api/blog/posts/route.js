// Admin CRUD for blog posts. Header-authed like every other mutating route.
// POST accepts a full post document (from the pipeline, the admin editor, or
// a seed script) and upserts by slug; the SEO report is recomputed on every
// write so the stored score can never go stale.
import { postsCollection, revisionsCollection, slugify, countWords, DEFAULT_AUTHOR, serialize } from '@/lib/blog/store'
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

export async function GET(request) {
  const denied = requireAdmin(request)
  if (denied) return denied
  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500)
  const col = await postsCollection()
  const q = status ? { status } : {}
  const items = await col
    .find(q, { projection: { body_html_cache: 0 } })
    .sort({ updated_at: -1 })
    .limit(limit)
    .toArray()
  const counts = await col.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]).toArray()
  return Response.json({ posts: items.map(serialize), counts: Object.fromEntries(counts.map((c) => [c._id, c.n])) })
}

export async function POST(request) {
  const denied = requireAdmin(request)
  if (denied) return denied
  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const post = body.post || body
  if (!post.title || !post.sections?.length) {
    return Response.json({ error: 'title and sections[] required' }, { status: 400 })
  }
  const slug = slugify(post.slug || post.title)
  const now = new Date()
  const body_md = post.body_md || assembleBody(post)
  const word_count = countWords(body_md)

  const doc = {
    slug,
    title: post.title,
    meta_title: post.meta_title || post.title,
    meta_description: post.meta_description || '',
    excerpt: post.excerpt || '',
    answer: post.answer || '',
    tldr: post.tldr || [],
    persona: post.persona || 'founder',
    topic: post.topic || 'automate',
    tags: post.tags || [],
    seo: post.seo || {},
    anchor_asset: post.anchor_asset || null,
    sections: post.sections,
    faq: post.faq || [],
    key_takeaways: post.key_takeaways || [],
    sources: post.sources || [],
    body_md,
    word_count,
    reading_min: Math.max(1, Math.round(word_count / 220)),
    author: post.author || DEFAULT_AUTHOR,
    status: post.status || 'drafted',
    scheduled_for: post.scheduled_for ? new Date(post.scheduled_for) : null,
    published_at: post.published_at ? new Date(post.published_at) : null,
    created_by: post.created_by || 'agent',
    updated_at: now,
  }
  doc.seo_report = runSeoChecks(doc)
  if (doc.status === 'published' && !doc.published_at) doc.published_at = now

  const col = await postsCollection()
  const prev = await col.findOne({ slug }, { projection: { body_md: 1, title: 1 } })
  await col.updateOne(
    { slug },
    {
      $set: doc,
      $setOnInsert: { created_at: now },
      $push: { history: { at: now, status: doc.status, by: doc.created_by, note: body.note || 'upsert' } },
    },
    { upsert: true }
  )
  if (prev) {
    const rev = await revisionsCollection()
    await rev.insertOne({ post_id: slug, body_md: prev.body_md, title: prev.title, at: now, reason: 'pre-upsert snapshot' })
  }
  return Response.json({ ok: true, slug, status: doc.status, word_count, seo_score: doc.seo_report.score, seo_failed: doc.seo_report.failed.map((f) => f.id) })
}
