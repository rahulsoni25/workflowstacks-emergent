// One-off importer: normalizes writer-agent post JSONs (varied field names)
// into the posts collection shape and upserts them. First N publish now, the
// rest are scheduled one per day at 07:00 UTC.
//   node scripts/blog-seed.mjs <dir-with-post-jsons> [--publish-now=2]
import { MongoClient } from 'mongodb'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2]
if (!dir) { console.error('usage: node scripts/blog-seed.mjs <dir> [--publish-now=2]'); process.exit(1) }
const publishNow = parseInt((process.argv.find((a) => a.startsWith('--publish-now=')) || '=2').split('=')[1], 10)

// Load env from .env.local when not already present (script convenience).
if (!process.env.MONGO_URL) {
  try {
    for (const line of readFileSync(join(process.cwd(), '.env.local'), 'utf8').split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.*)$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
    }
  } catch {}
}

const AUTHOR = {
  id: 'rahul-soni',
  name: 'Rahul Soni',
  role: 'Founder, WorkflowStacks',
  bio: 'Builds and tests the n8n templates, MCP configs and agent stacks on WorkflowStacks. Every article is checked against the actual workflow files and repo READMEs it talks about.',
  url: 'https://workflowstacks.com/about',
  sameAs: ['https://github.com/rahulsoni25'],
}

const slugify = (s) => String(s || '').toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
const countWords = (md) => String(md || '').replace(/```[\s\S]*?```/g, ' ').replace(/[#>*_`|\-]/g, ' ').split(/\s+/).filter(Boolean).length

// Split a flat markdown body on ## headings into sections.
function sectionsFromBody(md) {
  const parts = String(md).split(/\n(?=## )/)
  const out = []
  for (const p of parts) {
    const m = p.match(/^##\s+(.+)\n([\s\S]*)$/)
    if (m) out.push({ h2: m[1].trim(), md: m[2].trim() })
  }
  return out
}

function firstOf(...vals) { for (const v of vals) if (v !== undefined && v !== null && v !== '') return v; return undefined }

function normalize(raw, fallbackSlug) {
  const meta = raw.meta || {}
  const seoIn = raw.seo || {}
  let sections = (raw.sections || []).map((s) => ({
    h2: firstOf(s.h2, s.heading, s.title),
    md: firstOf(s.md, s.markdown, s.body, s.body_markdown, s.content, ''),
  })).filter((s) => s.h2 && s.md)
  const flatBody = firstOf(raw.body_markdown, raw.bodyMarkdown, raw.intro_markdown && raw.sections ? null : raw.body)
  if (!sections.length && flatBody) sections = sectionsFromBody(flatBody)
  // intro_markdown + sections[{h2, body_markdown}] variant
  if (raw.intro_markdown && sections.length) sections[0].md = sections[0].md // intro folded below

  const faq = (raw.faq || raw.faqs || []).map((f) => ({ q: firstOf(f.q, f.question), a: firstOf(f.a, f.answer) })).filter((f) => f.q && f.a)
  const anchor = raw.anchor_asset || raw.anchorAsset || null

  const primary = firstOf(seoIn.primary, raw.primary_keyword, raw.primaryKeyword, seoIn.keywords?.primary)
  const secondary = firstOf(seoIn.secondary, raw.secondary_keywords, raw.secondaryKeywords, seoIn.keywords?.secondary, [])

  const title = firstOf(raw.title, seoIn.title, meta.title)
  const post = {
    slug: slugify(firstOf(raw.slug, fallbackSlug, title)),
    title,
    meta_title: firstOf(raw.meta_title, raw.metaTitle, meta.title, seoIn.title, title),
    meta_description: firstOf(raw.meta_description, raw.metaDescription, meta.description, seoIn.meta_description, raw.excerpt, ''),
    excerpt: firstOf(raw.excerpt, raw.meta_description, raw.metaDescription, meta.description, ''),
    answer: firstOf(raw.answer, raw.tldr_answer, ''),
    tldr: raw.tldr && Array.isArray(raw.tldr) ? raw.tldr : [],
    persona: firstOf(raw.persona, 'founder'),
    topic: firstOf(raw.topic, 'automate'),
    tags: raw.tags || [],
    seo: {
      primary, secondary,
      questions: firstOf(seoIn.questions, raw.questions, []),
      intent: firstOf(seoIn.intent, raw.intent, 'informational'),
      format: firstOf(seoIn.format, raw.format, 'guide'),
      volume_source: 'estimate',
    },
    anchor_asset: anchor,
    sections,
    faq,
    key_takeaways: raw.key_takeaways || raw.keyTakeaways || [],
    sources: (raw.sources || raw.sources_verified || raw.factsVerifiedFrom || []).map((s) =>
      typeof s === 'string' ? { title: s, url: s } : { title: firstOf(s.title, s.name, s.url), url: s.url }
    ).filter((s) => s.url),
    author: AUTHOR,
    created_by: 'agent',
  }
  // Fold a standalone intro into the first section.
  if (raw.intro_markdown && post.sections.length) {
    post.sections[0].md = `${raw.intro_markdown.trim()}\n\n${post.sections[0].md}`
  }
  // Derive an answer block if missing: first 2 sentences of section 1.
  if (!post.answer && post.sections.length) {
    const plain = post.sections[0].md.replace(/[#>*_`|]/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    post.answer = plain.split(/(?<=\.)\s+/).slice(0, 2).join(' ').split(/\s+/).slice(0, 58).join(' ')
  }
  if (!post.tldr.length && post.key_takeaways.length) post.tldr = post.key_takeaways.slice(0, 5)
  return post
}

function assembleBody(post) {
  const parts = post.sections.map((s) => `## ${s.h2}\n\n${s.md.trim()}\n`)
  if (post.faq.length) {
    parts.push('## Questions people ask\n')
    for (const f of post.faq) parts.push(`### ${f.q}\n\n${f.a}\n`)
  }
  return parts.join('\n')
}

const client = new MongoClient(process.env.MONGO_URL)
await client.connect()
const db = client.db(process.env.DB_NAME || 'workflowstacks')
const col = db.collection('posts')
await col.createIndex({ slug: 1 }, { unique: true }).catch(() => {})

const files = readdirSync(dir).filter((f) => f.endsWith('.json'))
console.log(`${files.length} post files`)
const now = new Date()
let i = 0
for (const f of files.sort()) {
  let raw
  try { raw = JSON.parse(readFileSync(join(dir, f), 'utf8')) } catch (e) { console.error(`SKIP ${f}: bad JSON — ${e.message}`); continue }
  const post = normalize(raw, f.replace(/\.json$/, ''))
  if (!post.title || post.sections.length < 4) { console.error(`SKIP ${f}: title/sections missing (${post.sections.length} sections)`); continue }
  post.body_md = assembleBody(post)
  post.word_count = countWords(post.body_md)
  post.reading_min = Math.max(1, Math.round(post.word_count / 220))

  let published_at
  if (i < publishNow) {
    published_at = new Date(now.getTime() - (publishNow - i) * 60_000) // just now, keeps order
  } else {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() + (i - publishNow + 1))
    d.setUTCHours(7, 0, 0, 0)
    published_at = d
  }

  await col.updateOne(
    { slug: post.slug },
    {
      $set: { ...post, status: 'published', published_at, scheduled_for: published_at, updated_at: now },
      $setOnInsert: { created_at: now, history: [{ at: now, status: 'published', by: 'seed', note: `seeded from ${f}` }] },
    },
    { upsert: true }
  )
  console.log(`OK  ${post.slug}  ${post.word_count}w  ${i < publishNow ? 'LIVE now' : `scheduled ${published_at.toISOString().slice(0, 10)}`}`)
  i++
}
await client.close()
console.log('done')
