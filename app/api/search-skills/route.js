// Use-case search — "find me a skill for [job to be done]".
// Powered by the explainer fields we generated (use_case_example,
// what_you_can_make, how_it_helps) joined with native skill fields.
//
// Uses MongoDB $text search with English stemming so "transcribe", "transcribed",
// "transcription" all hit. Score-ranked. Returns matched-snippet so the UI can
// show WHY each result is relevant.

import { MongoClient } from 'mongodb'
import { TOOLS_ONLY } from '../../../lib/catalog-gates'
// One tokenizer for every search surface (this route, /api/skills?search=,
// the recommender): noise words, light stemming, and word-bounded short
// tokens so "ui ux" is a real query instead of an empty one.
import { tokenize, tokenPattern, tokenMatcher, phrasePattern, normalizeName } from '../../../lib/search-tokens'

const client = new MongoClient(process.env.MONGO_URL)
let db

async function connectDB() {
  if (!db) {
    await client.connect()
    db = client.db(process.env.DB_NAME || 'workflowstacks')
  }
  return db
}

// Pick the best matched snippet to show the user WHY this hit. We look for the
// query terms inside the explainer fields and return a short excerpt around them.
function buildSnippet(skill, query) {
  const q = (query || '').toLowerCase().trim()
  if (!q || !skill.explainer) return null
  const candidates = [
    { field: 'use_case_example', text: skill.explainer.use_case_example },
    { field: 'what_you_can_make', text: skill.explainer.what_you_can_make },
    { field: 'how_it_helps', text: skill.explainer.how_it_helps },
    { field: 'what_it_is', text: skill.explainer.what_it_is },
  ]
  const tokens = q.split(/\s+/).filter(t => t.length >= 3)
  for (const c of candidates) {
    if (!c.text) continue
    const lower = c.text.toLowerCase()
    for (const t of tokens) {
      const i = lower.indexOf(t)
      if (i >= 0) {
        const start = Math.max(0, i - 60)
        const end = Math.min(c.text.length, i + 140)
        return { field: c.field, snippet: (start > 0 ? '…' : '') + c.text.slice(start, end) + (end < c.text.length ? '…' : '') }
      }
    }
  }
  // Fallback: first 160 chars of use_case_example or what_you_can_make
  const fallback = skill.explainer.use_case_example || skill.explainer.what_you_can_make
  return fallback ? { field: 'use_case_example', snippet: fallback.slice(0, 160) + (fallback.length > 160 ? '…' : '') } : null
}

export async function POST(request) {
  let body = {}
  try { body = await request.json() } catch {}
  const query = (body.query || '').toString().trim()
  const limit = Math.min(Math.max(parseInt(body.limit || 12, 10), 1), 30)

  if (!query) {
    return Response.json({ query: '', results: [], total: 0, message: 'Empty query' })
  }

  const database = await connectDB()
  const tokens = tokenize(query)
  if (tokens.length === 0) {
    return Response.json({ query, results: [], total: 0, message: 'Query too generic — add more specific words' })
  }

  // Build an OR of regex matches (case-insensitive) against the candidate fields.
  // For 700-ish docs this is plenty fast and avoids text-index conflicts entirely.
  const fieldRegexes = (field) => tokens.map(t => ({ [field]: { $regex: tokenPattern(t), $options: 'i' } }))
  const ors = [
    ...fieldRegexes('explainer.use_case_example'),
    ...fieldRegexes('explainer.what_you_can_make'),
    ...fieldRegexes('explainer.how_it_helps'),
    ...fieldRegexes('explainer.what_it_is'),
    ...fieldRegexes('title_human'),
    ...fieldRegexes('name'),
    ...fieldRegexes('description_human'),
    ...fieldRegexes('description'),
    ...fieldRegexes('category'),
    ...fieldRegexes('github_topics'),
  ]
  const projection = {
    id: 1, slug: 1, name: 1, title_human: 1, description: 1, description_human: 1,
    category: 1, creator: 1, owner: 1, language: 1, github_stars: 1, github_forks: 1, github_url: 1,
    github_topics: 1, explainer: 1, hidden: 1,
    // Shown on the homepage match card: health score, real install clicks, price.
    rewrite_score: 1, installs: 1, is_premium: 1, price: 1,
  }

  // Listings whose name is the query itself are fetched separately and
  // boosted below: the 150-candidate window is the most popular token
  // matches, and a short token like "pro" matches most of the catalog, so an
  // exact-name hit with modest stars never reached the ranker.
  const baseFilter = { hidden: { $ne: true }, published: { $ne: false }, ...TOOLS_ONLY }
  const phrase = phrasePattern(query)
  let candidates = []
  try {
    const [byToken, byName] = await Promise.all([
      database.collection('skills')
        .find({ $or: ors, ...baseFilter }, { projection })
        .sort({ github_stars: -1 })
        .limit(150) // pull a wider set, then rank in JS
        .toArray(),
      phrase
        ? database.collection('skills')
          .find({ ...baseFilter, $or: ['name', 'slug', 'title_human'].map((f) => ({ [f]: { $regex: phrase, $options: 'i' } })) }, { projection })
          .sort({ github_stars: -1 })
          .limit(20)
          .toArray()
        : [],
    ])
    const seen = new Set(byToken.map((s) => String(s._id)))
    candidates = byToken.concat(byName.filter((s) => !seen.has(String(s._id))))
  } catch (e) {
    return Response.json({ query, results: [], error: e.message }, { status: 500 })
  }

  // Weighted relevance score: more matches in higher-value fields = higher rank.
  // The same weights as the original text-index plan, applied per-token.
  const WEIGHTS = {
    'explainer.use_case_example': 20,
    'explainer.what_you_can_make': 16,
    'explainer.how_it_helps': 10,
    'explainer.what_it_is': 8,
    title_human: 14,
    name: 12,
    description_human: 6,
    description: 4,
    category: 6,
    github_topics: 5,
  }
  function fieldText(s, path) {
    const parts = path.split('.')
    let v = s
    for (const p of parts) v = v ? v[p] : null
    if (Array.isArray(v)) return v.join(' ')
    return typeof v === 'string' ? v : ''
  }
  const matchers = tokens.map((t) => tokenMatcher(t))
  function scoreOne(s) {
    let score = 0
    for (const [path, w] of Object.entries(WEIGHTS)) {
      const t = fieldText(s, path).toLowerCase()
      if (!t) continue
      for (const m of matchers) {
        if (m(t)) score += w
      }
    }
    // Tiny tiebreaker: popular skills win when scores are close
    score += Math.log10(Math.max(1, s.github_stars || 0)) * 0.5
    return score
  }
  // 2: the listing IS what was typed; 1: what was typed is in its name or
  // title; 0: matched on tokens only. Ranked ahead of the field score so a
  // listing named "ui-ux-pro-max" beats anything that merely mentions "max".
  const phraseRe = phrase ? new RegExp(phrase, 'i') : null
  const wanted = normalizeName(query)
  function exactTier(s) {
    const names = [s.name, s.slug, s.title_human].filter(Boolean)
    if (names.some((n) => normalizeName(n) === wanted)) return 2
    if (phraseRe && names.some((n) => phraseRe.test(n))) return 1
    return 0
  }
  const ranked = candidates
    .map((s) => ({ s, score: scoreOne(s), exact: exactTier(s) }))
    .filter((x) => x.score > 0 || x.exact > 0)
    .sort((a, b) => b.exact - a.exact || b.score - a.score)
    .slice(0, limit)
    .map((x) => ({ ...x.s, score: x.score }))

  // Attach matched snippet for UI display
  for (const r of ranked) {
    r.matched = buildSnippet(r, query)
  }

  return Response.json({ query, tokens, total: ranked.length, results: ranked })
}

// GET: tiny health check + sample queries the UI can prefill
export async function GET() {
  return Response.json({
    ok: true,
    sample_queries: [
      'transcribe meetings',
      'build a chatbot for my docs',
      'send personalized cold emails',
      'generate images from text',
      'automate social media posting',
      'analyze a spreadsheet with AI',
      'turn a PDF into structured data',
      'run AI agents locally without API costs',
    ],
  })
}
