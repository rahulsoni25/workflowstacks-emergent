// Blog persistence — one place that knows the `posts` collection shape.
// Everything (public pages, admin CMS, agent pipeline, seed scripts) goes
// through here so the status machine and indexes stay consistent.
import { getDb } from '@/lib/mongo'

export const POST_STATUSES = [
  'queued', 'briefed', 'drafting', 'drafted', 'edited', 'judged',
  'held', 'scheduled', 'published', 'archived',
]

export const TOPICS = {
  n8n: 'n8n',
  mcp: 'MCP',
  'claude-code': 'Claude Code',
  agents: 'AI agents',
  automate: 'Automate',
  repos: 'Open source',
}

export const PERSONAS = {
  founder: 'Founder',
  agency: 'Agency',
  ecommerce: 'Ecommerce',
  sales: 'Sales',
  builder: 'Builder',
}

// Public byline. A named human with a real profile is an E-E-A-T requirement;
// anonymous "Team" bylines are discounted by both Google and answer engines.
export const DEFAULT_AUTHOR = {
  id: 'rahul-soni',
  name: 'Rahul Soni',
  role: 'Founder, WorkflowStacks',
  bio: 'Builds and tests the n8n templates, MCP configs and agent stacks on WorkflowStacks. Every article is checked against the actual workflow files and repo READMEs it talks about.',
  url: 'https://workflowstacks.com/about',
  sameAs: ['https://github.com/rahulsoni25'],
}

let indexesEnsured = false
export async function postsCollection() {
  const db = await getDb()
  const col = db.collection('posts')
  if (!indexesEnsured) {
    indexesEnsured = true
    try {
      await Promise.all([
        col.createIndex({ slug: 1 }, { unique: true }),
        col.createIndex({ status: 1, published_at: -1 }),
        col.createIndex({ status: 1, scheduled_for: 1 }),
        col.createIndex({ topic: 1, published_at: -1 }),
        col.createIndex({ 'seo.primary': 1 }),
      ])
    } catch (e) {
      // Index creation is best-effort at runtime; a race on first boot is fine.
    }
  }
  return col
}

export async function topicQueueCollection() {
  const db = await getDb()
  const col = db.collection('topic_queue')
  try { await col.createIndex({ status: 1, score: -1 }) } catch (e) {}
  return col
}

export async function keywordsCollection() {
  const db = await getDb()
  const col = db.collection('keywords')
  try { await col.createIndex({ keyword: 1 }, { unique: true }) } catch (e) {}
  return col
}

export async function revisionsCollection() {
  const db = await getDb()
  const col = db.collection('post_revisions')
  try { await col.createIndex({ post_id: 1, at: -1 }) } catch (e) {}
  return col
}

// A post is publicly visible once its status is published AND its
// published_at is in the past. Scheduling therefore needs no cron: the
// pipeline sets published_at in the future and the pages simply start
// showing it when the clock passes. (Sitemap/ISR revalidate hourly.)
export function publicFilter(now = new Date()) {
  return { status: 'published', published_at: { $lte: now } }
}

// Projection for list pages — never ship the whole body to a card grid.
export const CARD_FIELDS = {
  slug: 1, title: 1, excerpt: 1, answer: 1, topic: 1, persona: 1, tags: 1,
  published_at: 1, updated_at: 1, reading_min: 1, word_count: 1,
  'media.hero': 1, 'seo.primary': 1, author: 1,
}

export async function listPublished({ topic, persona, limit = 24, skip = 0 } = {}) {
  const col = await postsCollection()
  const q = publicFilter()
  if (topic) q.topic = topic
  if (persona) q.persona = persona
  const [items, total] = await Promise.all([
    col.find(q, { projection: CARD_FIELDS }).sort({ published_at: -1 }).skip(skip).limit(limit).toArray(),
    col.countDocuments(q),
  ])
  return { items: items.map(serialize), total }
}

export async function getPublishedBySlug(slug) {
  const col = await postsCollection()
  const doc = await col.findOne({ slug, ...publicFilter() })
  return doc ? serialize(doc) : null
}

export async function getAnyBySlug(slug) {
  const col = await postsCollection()
  const doc = await col.findOne({ slug })
  return doc ? serialize(doc) : null
}

export async function relatedPosts(post, limit = 3) {
  const col = await postsCollection()
  const q = { ...publicFilter(), slug: { $ne: post.slug }, $or: [{ topic: post.topic }, { persona: post.persona }] }
  const items = await col.find(q, { projection: CARD_FIELDS }).sort({ published_at: -1 }).limit(limit).toArray()
  return items.map(serialize)
}

export async function allPublishedForSitemap() {
  const col = await postsCollection()
  const items = await col.find(publicFilter(), { projection: { slug: 1, published_at: 1, updated_at: 1, title: 1, excerpt: 1, topic: 1 } })
    .sort({ published_at: -1 }).limit(2000).toArray()
  return items.map(serialize)
}

export function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function countWords(md) {
  return String(md || '').replace(/```[\s\S]*?```/g, ' ').replace(/[#>*_`|\-]/g, ' ').split(/\s+/).filter(Boolean).length
}

// Turn Mongo's ObjectId/Date into plain JSON so server components + API
// responses can pass docs straight through.
export function serialize(doc) {
  if (!doc) return doc
  const out = { ...doc }
  if (out._id) out.id = String(out._id)
  delete out._id
  for (const k of ['published_at', 'updated_at', 'created_at', 'scheduled_for', 'refreshed_at']) {
    if (out[k] instanceof Date) out[k] = out[k].toISOString()
  }
  return out
}

export async function appendHistory(col, slug, entry) {
  await col.updateOne({ slug }, { $push: { history: { at: new Date(), ...entry } } })
}
