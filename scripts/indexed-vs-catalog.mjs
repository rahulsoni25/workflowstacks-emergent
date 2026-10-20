#!/usr/bin/env node
// What do the pages Google indexed have that the rest of the catalog lacks?
//
// Input: the list of indexed URLs from Search Console. Either
//   - Page indexing -> Indexed -> "View data about indexed pages" -> Export
//     (CSV with a URL column), or
//   - Performance -> Pages -> Export (any page with impressions is indexed).
// Usage:
//   node scripts/indexed-vs-catalog.mjs path/to/export.csv
//   node scripts/indexed-vs-catalog.mjs https://workflowstacks.com/skills/foo ...
//   BASE_URL=https://workflowstacks.com SAMPLE=60 node scripts/indexed-vs-catalog.mjs export.csv
//
// For every /skills/* URL it fetches the listing and prints the fields the
// index gate (lib/skill-gate.js) reads: stars, rewrite score, chars of our
// guide, category, slug vs uuid. Then it draws a random sample of the rest of
// the catalog and prints medians for both groups side by side, so the
// comparison is data, not a guess. Needs network; run locally or in Actions.
import { readFileSync } from 'node:fs'

const BASE = (process.env.BASE_URL || 'https://workflowstacks.com').replace(/\/$/, '')
const SAMPLE = Number(process.env.SAMPLE || 60)

// Same measure as lib/skill-relevance.js guideRichness(): chars of guidance WE
// wrote, `install` excluded because it is boilerplate on most entries. Inlined
// because lib/ is CommonJS-resolved from a script (no "type": "module").
function guideRichness(g) {
  if (!g || typeof g !== 'object') return 0
  const text = [g.whatItDoes, g.quickStart, g.examplePrompt, g.gotcha].filter((x) => typeof x === 'string').join(' ')
  const whenToUse = Array.isArray(g.whenToUse) ? g.whenToUse.join(' ') : ''
  return text.length + whenToUse.length
}

function urlsFromArgs(args) {
  const out = new Set()
  for (const a of args) {
    if (/^https?:\/\//.test(a)) { out.add(a); continue }
    const text = readFileSync(a, 'utf8')
    for (const m of text.matchAll(/https?:\/\/[^\s",]+/g)) out.add(m[0])
  }
  return [...out]
}

function skillKey(url) {
  const m = url.match(/^https?:\/\/(?:www\.)?workflowstacks\.com\/skills\/([^/?#]+)\/?$/)
  return m && !/^page$/.test(m[1]) ? decodeURIComponent(m[1]) : null
}

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { 'User-Agent': 'indexed-vs-catalog' }, signal: AbortSignal.timeout(20_000) })
  if (!res.ok) throw new Error(`${path} -> ${res.status}`)
  return res.json()
}

function row(s, url) {
  const guide = guideRichness(s.use_guide)
  return {
    page: url || `/skills/${s.slug || s.id}`,
    stars: Number(s.github_stars) || 0,
    score: typeof s.rewrite_score === 'number' ? s.rewrite_score : null,
    guide,
    category: s.category || '',
    slug: s.slug ? 'slug' : 'uuid',
    topics: Array.isArray(s.github_topics) ? s.github_topics.length : 0,
    readme: (s.readme_preview || '').length,
    title: (s.title_human || s.name || '').slice(0, 48),
  }
}

const median = (xs) => {
  const a = xs.filter((x) => typeof x === 'number').sort((x, y) => x - y)
  if (!a.length) return null
  const m = Math.floor(a.length / 2)
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2
}

function summary(label, rows) {
  const pct = (f) => `${Math.round((rows.filter(f).length / Math.max(1, rows.length)) * 100)}%`
  return {
    group: label,
    n: rows.length,
    'median stars': median(rows.map((r) => r.stars)),
    'median score': median(rows.map((r) => r.score)),
    'median guide chars': median(rows.map((r) => r.guide)),
    'guide >= 600': pct((r) => r.guide >= 600),
    'score >= 8': pct((r) => (r.score ?? 0) >= 8),
    'stars >= 1000': pct((r) => r.stars >= 1000),
    'has slug': pct((r) => r.slug === 'slug'),
    'median readme chars': median(rows.map((r) => r.readme)),
  }
}

const urls = urlsFromArgs(process.argv.slice(2))
if (!urls.length) {
  console.error('Give a Search Console export CSV or one or more URLs.')
  process.exit(1)
}
const keys = urls.map(skillKey).filter(Boolean)
const nonSkill = urls.filter((u) => !skillKey(u))
console.log(`${urls.length} URL(s): ${keys.length} skill page(s), ${nonSkill.length} other (listed at the end)\n`)

const indexed = []
for (const key of keys) {
  try {
    const { skill } = await getJson(`/api/skills/${encodeURIComponent(key)}`)
    if (skill) indexed.push(row(skill, `/skills/${key}`))
    else console.error(`no listing for ${key}`)
  } catch (e) {
    console.error(`${key}: ${e.message}`)
  }
}
console.log('Indexed skill pages:')
console.table(indexed)

// Baseline: a random sample of the catalog that is NOT in the indexed list.
const list = (await getJson('/api/skills?limit=3000')).skills || []
const indexedKeys = new Set(keys)
const pool = list.filter((s) => !indexedKeys.has(s.slug) && !indexedKeys.has(s.id))
const picked = []
while (picked.length < Math.min(SAMPLE, pool.length)) {
  const i = Math.floor(Math.random() * pool.length)
  picked.push(pool.splice(i, 1)[0])
}
const baseline = []
for (const s of picked) {
  try {
    const { skill } = await getJson(`/api/skills/${encodeURIComponent(s.slug || s.id)}`)
    if (skill) baseline.push(row(skill))
  } catch {}
}

console.log('\nWhat separates them (medians and shares):')
console.table([summary('indexed', indexed), summary(`random non-indexed sample`, baseline)])

if (nonSkill.length) {
  console.log('\nNon-catalog URLs in the list:')
  for (const u of nonSkill) console.log('  ' + u)
}
