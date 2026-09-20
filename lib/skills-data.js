// Catalog reads for server code — pages, route handlers, sitemap, llms.txt,
// the MCP connector and the public API itself.
//
// Why this exists (Vercel usage): every server-rendered page used to load its
// data by fetching the site's OWN public API over HTTP (`${SITE_URL}/api/...`).
// On Vercel that turns one page render into several billable events: the
// page function, plus one extra function invocation per internal API call,
// plus Fast Origin Transfer for each API response (it leaves the API function,
// crosses the edge, and re-enters the page function), plus an ISR/Data Cache
// write for every `next: { revalidate }` fetch. A single skill-page
// regeneration was 4 invocations and ~4 cache writes; across a ~2,000-page
// catalog re-crawled daily that dominated the Hobby-plan Fluid CPU, ISR-write
// and origin-transfer budgets (see the 2026-08-11 and 2026-09-01 overages).
//
// Reading Mongo directly from the render is one invocation, no self-transfer,
// and the page-level ISR `revalidate` is the only cache involved. The public
// API handlers in app/api/[[...path]]/route.js call these same functions, so
// there is one definition of every query and every field-fallback rule.
//
// Local dev without MONGO_URL keeps working: each reader falls back to the
// public API exactly as before. Production falls back the same way only if a
// direct read throws, so the worst case is the previous behaviour.

import { getDb } from '@/lib/mongo'
import { TOOLS_ONLY } from '@/lib/catalog-gates'
import { tokenize as tokenizeSearch } from '@/lib/search-tokens'
import { SITE_URL } from '@/lib/site-url'

// ---------------------------------------------------------------------------
// Field rules shared with the API
// ---------------------------------------------------------------------------

// Fields only the single-skill detail view needs — excluded from list/catalog
// queries (they're large free-text blobs and were being fetched+serialized
// for every skill on every /skills page load, then discarded client-side).
// NOTE: use_guide is deliberately kept — app/sitemap.js's quality gate reads
// it (guideRichness()) from these same list responses; it's a small
// structured object, not a free-text blob like the ones excluded here.
export const LIST_PROJECTION = {
  readme_preview: 0, description_original: 0, name_original: 0, rewritten_at: 0,
  codeflow: 0, // detail-page only (several KB per skill)
  stars_history: 0, // up to 90 daily snapshots per skill; only /refresh-stars reads it
}

// Fallback prettifier for skills whose AI-rewritten title_human hasn't landed yet.
// Cleans hyphens/underscores, fixes obvious all-caps acronyms, title-cases — so
// "GitHubDaily" stays as-is, "applied-ml" → "Applied ML", "google-ads-mcp" →
// "Google Ads MCP". Never overrides an existing title_human.
const COMMON_ACRONYMS = new Set(['mcp', 'ai', 'llm', 'cli', 'sdk', 'api', 'ui', 'ux', 'ml', 'cv', 'nlp', 'rag', 'os', 'db', 'qa', 'seo', 'aeo', 'geo', 'crm', 'cms', 'pdf', 'aws', 'gcp', 'http', 'json', 'yaml', 'sql'])
export function prettyName(raw) {
  if (!raw) return ''
  // Preserve known good styling (camelCase, mixed case with internal caps, dotted names like llama.cpp).
  if (/[a-z][A-Z]/.test(raw) || /\./.test(raw)) return raw
  return raw
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .map((w) => {
      const lw = w.toLowerCase()
      if (COMMON_ACRONYMS.has(lw)) return lw.toUpperCase()
      return w.charAt(0).toUpperCase() + w.slice(1)
    })
    .join(' ')
    .trim()
}
export function prettyDesc(raw) {
  if (!raw) return ''
  // Strip leading emoji + whitespace; capitalize first letter; trim CJK-only filler.
  let s = raw.replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\s]+/u, '').trim()
  if (!s) return raw
  s = s.charAt(0).toUpperCase() + s.slice(1)
  return s.length > 200 ? s.slice(0, 197) + '…' : s
}

// Older rewritten descriptions froze template filler into prose: a trailing
// "168k GitHub stars." / "70k+ stars." / "Popular." sentence (a number that
// goes stale the day it is written — stars are already structured metadata on
// every card) and a generic "For founders ..." audience line stamped on a
// Docker updater and a trading bot alike. Scrub both at read time so every
// surface (site, MCP search_skills, llms.txt) stops repeating them, without a
// catalog rewrite.
const STAR_SENTENCE = /(^|\.\s+)(?:[^.]{0,40}?\b(?:backed by|with)\s+)?[\d.,]+k?\+?\s+(?:GitHub\s+)?stars\.?(?=\s|$)/gi
const FILLER_SENTENCE = /(^|\.\s+)(?:Popular|For (?:busy )?founders[^.]{0,60})\.(?=\s|$)/gi
// Mid-sentence variants the live catalog actually shows: ", with 191k+ GitHub
// stars" / ", backed by 31k+ GitHub stars" and "platform for founders, with".
const STAR_CLAUSE = /,?\s*(?:backed by|with|boasting|and)\s+(?:over\s+)?[\d.,]+k?\+?\s+(?:GitHub\s+)?stars(?=[,.;]|\s|$)/gi
const FOUNDER_CLAUSE = /\s+for (?:busy |startup |indie )?founders(?=[,.;]|\s+with\b)/gi
export function scrubBoilerplate(desc) {
  if (!desc || typeof desc !== 'string') return desc
  const out = desc
    .replace(STAR_SENTENCE, (m, lead) => (lead === '' ? '' : '.'))
    .replace(FILLER_SENTENCE, (m, lead) => (lead === '' ? '' : '.'))
    .replace(STAR_CLAUSE, '')
    .replace(FOUNDER_CLAUSE, '')
    .replace(/,\s*([.;])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/\.\s*\./g, '.')
    .trim()
  return out || desc
}

// Apply to a skills array — adds title_human/description_human ONLY if missing.
export function applyFallback(skills) {
  return (skills || []).map((s) => ({
    ...s,
    title_human: s.title_human || prettyName(s.name),
    description_human: scrubBoilerplate(s.description_human) || prettyDesc(s.description),
  }))
}

// User input must never reach $regex raw — crafted patterns can trigger
// catastrophic backtracking (DoS) or match-everything queries.
export function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function skillLabel(s) { return s.title_human || s.name || s.slug || '' }

// ---------------------------------------------------------------------------
// Plumbing
// ---------------------------------------------------------------------------

// Mongo documents carry ObjectId/Date instances. Pages hand these results to
// client components and JSON-LD, so normalise to what the HTTP API used to
// return: plain JSON (ids as strings, dates as ISO strings).
export function toPlain(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value))
}

function hasMongo() { return !!process.env.MONGO_URL }

async function db(existing) {
  return existing || getDb()
}

// Same-shape fallback to the public API, used when MONGO_URL is unset (local
// dev) or a direct read throws. `revalidate` mirrors the caller's page window.
async function viaApi(path, revalidate = 3600, timeoutMs = 10_000) {
  try {
    const res = await fetch(`${SITE_URL}/api${path}`, {
      next: { revalidate },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function direct(reader, fallback, label) {
  if (!hasMongo()) return fallback()
  try {
    return await reader()
  } catch (e) {
    console.error(`[skills-data] ${label} direct read failed, using API fallback:`, e?.message || e)
    return fallback()
  }
}

// ---------------------------------------------------------------------------
// Catalog list — the one implementation behind GET /api/skills
// ---------------------------------------------------------------------------

const SORT_SPECS = {
  trending: { popularity_score: -1, github_stars: -1 },
  popular: { github_stars: -1 },
  newest: { added_at: -1, created_at: -1 },
  updated: { last_updated: -1 },
  quality: { rewrite_score: -1, github_stars: -1 },
}
export const LIST_SORTS = [...Object.keys(SORT_SPECS), 'gems']

function num(v) {
  if (v === undefined || v === null || v === '') return NaN
  return typeof v === 'number' ? v : parseFloat(v)
}
function int(v) {
  if (v === undefined || v === null || v === '') return NaN
  return typeof v === 'number' ? v : parseInt(v, 10)
}
function bool(v) { return v === true || v === 'true' }

// Normalises either a URLSearchParams (the API) or a plain options object
// (pages) into the Mongo query the catalog list runs.
export function buildListQuery(input = {}) {
  const get = typeof input.get === 'function' ? (k) => input.get(k) : (k) => input[k]
  const category = get('category')
  const search = get('search')
  const all = bool(get('all'))

  // Quality gate: only show published listings (unless all=true).
  // Learning material lives on the /learn shelf (type=resource), never
  // in the skills library — mega-list repos were drowning real tools.
  let query = all ? {} : { published: { $ne: false }, ...TOOLS_ONLY }
  if (get('type') === 'resource') {
    query = { published: { $ne: false }, content_type: 'resource' }
  }
  if (category && category !== 'all') query.category = category
  // free=true — marketplace "Free only" toggle: hide paid creator listings.
  if (bool(get('free'))) query.is_premium = { $ne: true }

  const searchTokens = search ? tokenizeSearch(search) : []
  if (search) {
    // Per-token matching across the fields a visitor actually thinks in.
    // OR across tokens and fields guarantees recall; the trending/stars sort
    // plus the re-rank below keeps the best matches on top.
    const fields = ['name', 'title_human', 'description', 'description_human', 'category', 'github_topics']
    if (searchTokens.length) {
      query.$or = searchTokens.flatMap((t) => {
        const re = escapeRegex(t)
        return fields.map((f) => ({ [f]: { $regex: re, $options: 'i' } }))
      })
    } else {
      // Short/noise-only queries ("ai", "go") keep the old whole-phrase match.
      const searchSafe = escapeRegex(search)
      query.$or = [
        { name: { $regex: searchSafe, $options: 'i' } },
        { description: { $regex: searchSafe, $options: 'i' } },
      ]
    }
  }
  // Optional server-side pre-filter — lets a caller like the sitemap (which
  // only wants the small slice passing its quality gate) avoid fetching and
  // discarding thousands of docs just to find a few hundred.
  const minScore = num(get('minScore'))
  if (Number.isFinite(minScore)) query.rewrite_score = { $gte: minScore }
  const minStars = int(get('minStars'))
  if (Number.isFinite(minStars)) query.github_stars = { $gte: minStars }

  // Default cap (no limit given) protects against the collection's continued
  // daily growth silently reintroducing a slow unbounded scan+sort.
  const limitParam = int(get('limit'))
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 2000) : 3000
  const offsetParam = int(get('offset'))
  const offset = Number.isFinite(offsetParam) && offsetParam > 0 ? offsetParam : 0

  return { query, sort: get('sort') || 'trending', search: search || '', searchTokens, limit, offset, all, isNew: bool(get('new')) }
}

async function listSkillsDirect(input, existingDb) {
  const database = await db(existingDb)
  const col = database.collection('skills')
  const { query, sort: sortKey, searchTokens, limit, offset, isNew } = buildListQuery(input)

  // new=true — the 8 most recently updated skills (freshest GitHub pushes).
  if (isNew) {
    const newSkills = await col
      .find({ published: { $ne: false }, last_updated: { $exists: true }, ...TOOLS_ONLY }, { projection: LIST_PROJECTION })
      .sort({ last_updated: -1, github_stars: -1 })
      .limit(8)
      .toArray()
    return { skills: applyFallback(toPlain(newSkills)) }
  }

  let skills, total
  if (sortKey === 'gems') {
    // "Hidden gems" is a computed score (quality + freshness - fame), not
    // a stored field, so it needs an aggregation instead of a plain sort.
    const pipeline = [
      { $match: query },
      { $addFields: {
          _rewriteScore: { $ifNull: ['$rewrite_score', 7] },
          _stars: { $ifNull: ['$github_stars', 0] },
          // last_updated is a Date on most docs but a plain ISO string on
          // some older/backfilled ones — $subtract can't mix the two, so
          // normalize first (onError/onNull covers missing + unparsable).
          _lastUpdatedDate: { $convert: { input: '$last_updated', to: 'date', onError: null, onNull: null } },
      } },
      { $addFields: {
          _daysAgo: {
            $cond: [
              { $ifNull: ['$_lastUpdatedDate', false] },
              { $divide: [{ $subtract: ['$$NOW', '$_lastUpdatedDate'] }, 86400000] },
              1e9,
            ],
          },
      } },
      { $addFields: {
          _freshness: { $max: [0, { $divide: [{ $subtract: [30, '$_daysAgo'] }, 30] }] },
          _fameDamp: { $cond: [{ $gt: ['$_stars', 15000] }, 0, { $subtract: [1, { $divide: ['$_stars', 15000] }] }] },
      } },
      { $addFields: {
          _gemScore: { $add: [
            { $multiply: ['$_rewriteScore', 2] },
            { $multiply: ['$_freshness', 5] },
            { $multiply: ['$_fameDamp', 5] },
          ] },
      } },
      { $sort: { _gemScore: -1 } },
      { $skip: offset },
      { $limit: limit },
      { $project: { ...LIST_PROJECTION, _rewriteScore: 0, _stars: 0, _lastUpdatedDate: 0, _daysAgo: 0, _freshness: 0, _fameDamp: 0, _gemScore: 0 } },
    ]
    ;[skills, total] = await Promise.all([
      col.aggregate(pipeline).toArray(),
      col.countDocuments(query),
    ])
  } else {
    const sortSpec = SORT_SPECS[sortKey] || SORT_SPECS.trending
    if (searchTokens.length >= 1) {
      // The OR-across-tokens query buys recall, but sorting the matches by
      // stars alone let one common token ("automation") drown the one that
      // carried the intent ("n8n"). Re-rank a bounded window by how many
      // distinct tokens each doc matches (name/title/slug count most), then
      // fall back to the requested sort.
      const window = Math.min(offset + limit + 150, 400)
      const [candidates, count] = await Promise.all([
        col.find(query, { projection: LIST_PROJECTION }).sort(sortSpec).limit(window).toArray(),
        col.countDocuments(query),
      ])
      const scored = candidates.map((s, idx) => {
        const strong = `${s.name || ''} ${s.title_human || ''} ${s.slug || ''}`.toLowerCase()
        const mid = `${s.category || ''} ${(s.github_topics || []).join(' ')}`.toLowerCase()
        const weak = `${s.description || ''} ${s.description_human || ''}`.toLowerCase()
        let matched = 0, weight = 0
        for (const t of searchTokens) {
          const inStrong = strong.includes(t), inMid = mid.includes(t), inWeak = weak.includes(t)
          if (inStrong || inMid || inWeak) matched++
          weight += inStrong ? 3 : inMid ? 2 : inWeak ? 1 : 0
        }
        return { s, matched, weight, idx }
      })
      scored.sort((a, b) => b.matched - a.matched || b.weight - a.weight || a.idx - b.idx)
      skills = scored.slice(offset, offset + limit).map((x) => x.s)
      total = count
    } else {
      ;[skills, total] = await Promise.all([
        col.find(query, { projection: LIST_PROJECTION }).sort(sortSpec).skip(offset).limit(limit).toArray(),
        col.countDocuments(query),
      ])
    }
  }

  return { skills: applyFallback(toPlain(skills)), total, hasMore: offset + skills.length < total }
}

function listQueryString(input) {
  if (typeof input.toString === 'function' && typeof input.get === 'function') return input.toString()
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(input)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v))
  return p.toString()
}

// { skills, total, hasMore } — same shape as GET /api/skills. `input` is a
// URLSearchParams or { category, sort, search, limit, offset, type, free,
// minScore, minStars, all, new }. Pass `existingDb` from the API route so the
// route reuses its own connection pool.
export async function listSkills(input = {}, { db: existingDb = null, revalidate = 3600 } = {}) {
  return direct(
    () => listSkillsDirect(input, existingDb),
    async () => (await viaApi(`/skills?${listQueryString(input)}`, revalidate, 15_000)) || { skills: [], total: 0, hasMore: false },
    'listSkills'
  )
}

// ---------------------------------------------------------------------------
// Single skill — behind GET /api/skills/:slugOrId
// ---------------------------------------------------------------------------

export async function getSkillByKey(key, { db: existingDb = null, revalidate = 86400 } = {}) {
  if (!key) return null
  return direct(
    async () => {
      const database = await db(existingDb)
      const col = database.collection('skills')
      // Try slug first (the new canonical), then uuid for back-compat
      const skill = (await col.findOne({ slug: key })) || (await col.findOne({ id: key }))
      return skill ? applyFallback([toPlain(skill)])[0] : null
    },
    async () => (await viaApi(`/skills/${encodeURIComponent(key)}`, revalidate))?.skill || null,
    'getSkillByKey'
  )
}

// ---------------------------------------------------------------------------
// Stats — behind GET /api/stats
// ---------------------------------------------------------------------------

export async function getStats({ db: existingDb = null, revalidate = 1800 } = {}) {
  return direct(
    async () => {
      const database = await db(existingDb)
      const skills = database.collection('skills')
      const [totalSkills, categories, agentsBuilt, subscriberCount, memberCount, publishedSkills] = await Promise.all([
        skills.countDocuments(),
        skills.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]).toArray(),
        database.collection('agent_templates').countDocuments(),
        database.collection('subscribers').countDocuments(),
        database.collection('members').countDocuments(),
        skills.countDocuments({ published: { $ne: false } }),
      ])
      return {
        totalSkills,
        categories: categories.reduce((acc, cat) => { acc[cat._id] = cat.count; return acc }, {}),
        agentsBuilt,
        communitySize: subscriberCount + memberCount,
        publishedSkills,
      }
    },
    () => viaApi('/stats', revalidate),
    'getStats'
  )
}

// ---------------------------------------------------------------------------
// Weekly lists (Hot / Top / Rising) — behind GET /api/hot, the digest email,
// the homepage strip, /hot and /best/<category>
// ---------------------------------------------------------------------------

// Only what the lists render. Keeps /hot, the stored issue and the homepage
// strip small — stars_history alone is up to 90 entries per skill.
export const WEEKLY_FIELDS = {
  _id: 0, id: 1, slug: 1, name: 1, title_human: 1, description: 1, description_human: 1,
  'use_guide.whatItDoes': 1, category: 1, github_stars: 1, github_forks: 1, github_url: 1,
  creator: 1, velocity_7d: 1, velocity_provisional: 1, added_at: 1, last_updated: 1,
}

// Hot = most stars gained in the last 7 days (velocity_7d, written by
// /refresh-stars). Top = most stars overall, minus anything already in Hot.
// Rising = added in the last 30 days, minus anything above.
export async function getWeeklyLists(database, { category = null, hotLimit = 5, topLimit = 8, risingLimit = 5 } = {}) {
  const base = { published: { $ne: false }, ...TOOLS_ONLY }
  if (category) base.category = category
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const col = database.collection('skills')
  const q = (filter, sort, limit) => (limit > 0
    ? col.find(filter, { projection: WEEKLY_FIELDS }).sort(sort).limit(limit).toArray()
    : Promise.resolve([]))
  const [hot, top, rising] = await Promise.all([
    q({ ...base, velocity_7d: { $gt: 0 } }, { velocity_7d: -1, github_stars: -1 }, hotLimit),
    q(base, { github_stars: -1 }, topLimit + hotLimit),
    q({ ...base, added_at: { $gte: thirtyDaysAgo } }, { github_stars: -1 }, risingLimit + hotLimit),
  ])
  const used = new Set(hot.map((s) => s.id))
  const topOut = top.filter((s) => !used.has(s.id)).slice(0, topLimit)
  topOut.forEach((s) => used.add(s.id))
  const risingOut = rising.filter((s) => !used.has(s.id)).slice(0, risingLimit)
  return { hot, top: topOut, rising: risingOut }
}

export function hotShareText(hot) {
  if (!hot.length) return `The fastest-growing open-source AI skills this week, ranked by GitHub star growth: ${SITE_URL}/hot`
  const lines = hot.slice(0, 5).map((s, i) => `${i + 1}. ${skillLabel(s)} (+${s.velocity_7d}★)`)
  return `🔥 Hottest open-source AI skills this week, ranked by GitHub star growth:\n\n${lines.join('\n')}\n\nFull list + Monday digest: ${SITE_URL}/hot`
}

// Page-facing: the exact payload GET /api/hot returns.
export async function getHotLists({ category = null, revalidate = 1800 } = {}) {
  const cat = (category || '').trim().slice(0, 40) || null
  return direct(
    async () => {
      const database = await db()
      const lists = await getWeeklyLists(database, { category: cat, hotLimit: 10, topLimit: 10, risingLimit: 8 })
      return toPlain({ ...lists, share_text: hotShareText(lists.hot), generated_at: new Date().toISOString() })
    },
    () => viaApi(`/hot${cat ? `?category=${encodeURIComponent(cat)}` : ''}`, revalidate),
    'getHotLists'
  )
}

// ---------------------------------------------------------------------------
// Newsletter issue archive — behind GET /api/newsletter/issues
// ---------------------------------------------------------------------------

export async function getNewsletterIssues({ db: existingDb = null, revalidate = 1800 } = {}) {
  return direct(
    async () => {
      const database = await db(existingDb)
      const docs = await database.collection('newsletter_sends')
        .find({ type: 'weekly-hot', issue: { $exists: true } }, { projection: { _id: 0, issue: 1, sent_at: 1, subject: 1, hot_count: 1, top_count: 1, rising_count: 1, 'items.hot': 1 } })
        .sort({ sent_at: -1 }).limit(104).toArray()
      return toPlain(docs.map((d) => ({
        issue: d.issue, sent_at: d.sent_at, subject: d.subject || null,
        hot_count: d.hot_count || 0, top_count: d.top_count || 0, rising_count: d.rising_count || 0,
        hot_preview: ((d.items && d.items.hot) || []).slice(0, 3).map((s) => ({ slug: s.slug || s.id, name: skillLabel(s), velocity_7d: s.velocity_7d })),
      })))
    },
    async () => (await viaApi('/newsletter/issues', revalidate))?.issues || [],
    'getNewsletterIssues'
  )
}
