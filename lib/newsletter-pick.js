// Picks the skill the daily email features.
//
// The previous rule was "highest GitHub stars, not sent in the last 7 days".
// That produced an 8-day loop of the same eight repos — freeCodeCamp, awesome,
// public-apis, build-your-own-x — none of them AI skills, mailed to the whole
// list every day for weeks. Stars measure how famous a repo is, not whether a
// subscriber needs it today.
//
// This module ranks by three things we can actually observe:
//   need      what people typed into the site search and what they installed
//   freshness what is gaining stars this week, or is new to the catalog
//   quality   how good OUR guide for it is, since the email is built from it
// and never repeats a skill inside NO_REPEAT_DAYS.
//
// scoreSkill/pickDaily are pure so they can be exercised without a database.

import { isAiRelevant, guideRichness } from './skill-relevance.js'
import { TOOLS_ONLY, classifyContentType } from './catalog-gates.js'
import { tokenize } from './search-tokens.js'

// The eligible pool is about a thousand skills, so a year without repeats still
// leaves most of the catalog unsent.
export const NO_REPEAT_DAYS = 365
const DEMAND_WINDOW_DAYS = 30
const MIN_GUIDE_CHARS = 200

const WEIGHTS = { need: 0.4, freshness: 0.3, quality: 0.3 }
// Yesterday's category is penalised harder than the day before's, so the week
// rotates through the catalog instead of sending five MCP servers in a row.
const CATEGORY_PENALTY = [0.15, 0.08]

// Reading material rather than something a subscriber can install and run.
// catalog-gates already files awesome-lists and courses as 'resource'; survey
// and paper collections pass that gate because they are legitimately listable,
// but "here is a literature survey" is not a skill of the day.
const READING_NAME = /(^|[-_.])(survey|papers?|paper[-_]?list|reading[-_]?list|bibliograph\w*)($|[-_.])/i
const READING_TOPICS = new Set(['survey', 'paper', 'papers', 'paper-list', 'reading-list', 'literature-review'])
export function isInstallable(skill) {
  if (classifyContentType(skill) === 'resource') return false
  if (READING_NAME.test(skill.name || '')) return false
  const topics = Array.isArray(skill.github_topics) ? skill.github_topics : []
  return !topics.some((t) => READING_TOPICS.has(String(t).toLowerCase()))
}

// A search query is user-typed text. It may only be quoted in an email to the
// whole list when it is plainly a generic phrase that several people typed.
const QUOTABLE = /^[a-z0-9][a-z0-9 .+#-]{2,39}$/
const QUOTABLE_MIN_COUNT = 3

// queries: [{ q, count }] -> Map(token -> { weight, count, sample })
export function buildDemandIndex(queries) {
  const index = new Map()
  for (const row of queries || []) {
    const q = String(row.q || '').toLowerCase().trim()
    const count = Number(row.count) || 0
    if (!q || count <= 0) continue
    const quotable = count >= QUOTABLE_MIN_COUNT && QUOTABLE.test(q) && !q.includes('@')
    for (const token of tokenize(q)) {
      const cur = index.get(token) || { weight: 0, count: 0, sample: null, sampleCount: 0 }
      cur.weight += Math.log1p(count)
      cur.count += count
      if (quotable && count > cur.sampleCount) { cur.sample = q; cur.sampleCount = count }
      index.set(token, cur)
    }
  }
  return index
}

function skillTokens(skill) {
  const strong = tokenize([
    skill.name, skill.slug, skill.title_human, skill.category,
    ...(Array.isArray(skill.github_topics) ? skill.github_topics : []),
  ].filter(Boolean).join(' '))
  const strongSet = new Set(strong)
  // The upstream description is matched at half weight: it is where "scrape
  // websites" finds a crawler, but it is also wordy enough to match anything.
  const weak = tokenize(skill.description || '').filter((t) => !strongSet.has(t))
  return { strong, weak }
}

// "scrape websites" and a repo tagged "scraper" share a need but not a token:
// the shared stemmer leaves them as "scrape" / "scraper". Treat one token being
// a prefix of the other as a slightly weaker match, from 5 characters up so
// "data" does not claim "database".
const PREFIX_MIN = 5
function demandMatches(token, demandIndex) {
  const out = []
  const exact = demandIndex.get(token)
  if (exact) out.push({ hit: exact, factor: 1 })
  if (token.length < PREFIX_MIN) return out
  for (const [key, hit] of demandIndex) {
    if (key === token || key.length < PREFIX_MIN) continue
    if (key.startsWith(token) || token.startsWith(key)) out.push({ hit, factor: 0.8 })
  }
  return out
}

function searchDemand(skill, demandIndex) {
  const { strong, weak } = skillTokens(skill)
  let raw = 0
  let best = null
  const seen = new Set()
  const consider = (token, factor) => {
    for (const { hit, factor: matchFactor } of demandMatches(token, demandIndex)) {
      // "scraper" and "scraping" on one skill both reach the demand token
      // "scrape"; count that search interest once.
      if (seen.has(hit)) continue
      seen.add(hit)
      raw += hit.weight * factor * matchFactor
      if (!best || hit.count > best.count) best = hit
    }
  }
  strong.forEach((t) => consider(t, 1))
  weak.forEach((t) => consider(t, 0.5))
  return { raw, best }
}

// Events in the demand window before a signal is trusted at full weight.
const FULL_CONFIDENCE_EVENTS = 100
const confidence = (events) => Math.min(1, (Number(events) || 0) / FULL_CONFIDENCE_EVENTS)

const log1pNorm = (value, max) => (max > 0 ? Math.log1p(Math.max(0, value)) / Math.log1p(max) : 0)

// ctx: { demandIndex, installs: Map(skill_id -> n), totalSearches, totalInstalls,
//        recentCategories: [yesterday, dayBefore], now: Date, max: { search, installs, velocity, stars } }
export function scoreSkill(skill, ctx) {
  const { raw: searchRaw, best: searchHit } = ctx.demandBySkill?.get(skill.id) || searchDemand(skill, ctx.demandIndex)
  const installs = ctx.installs.get(skill.id) || 0
  // Both signals are normalised against the pool maximum, so on a quiet month
  // one person's single search would otherwise score as full-strength demand.
  // Confidence scales them by how much data the month actually produced.
  const search = (ctx.max.search > 0 ? searchRaw / ctx.max.search : 0) * confidence(ctx.totalSearches)
  const installNeed = log1pNorm(installs, ctx.max.installs) * confidence(ctx.totalInstalls)
  const need = 0.7 * search + 0.3 * installNeed

  const velocity = typeof skill.velocity_7d === 'number' ? skill.velocity_7d : 0
  // A provisional velocity is measured over less than a full week.
  const velocityScore = log1pNorm(velocity, ctx.max.velocity) * (skill.velocity_provisional ? 0.5 : 1)
  const addedAt = skill.added_at ? new Date(skill.added_at).getTime() : 0
  const isNew = addedAt > 0 && ctx.now.getTime() - addedAt < 30 * 24 * 60 * 60 * 1000
  const freshness = Math.min(1, velocityScore + (isNew ? 0.35 : 0))

  const rewrite = typeof skill.rewrite_score === 'number' ? Math.min(skill.rewrite_score, 10) / 10 : 0
  const richness = Math.min(guideRichness(skill.use_guide), 3000) / 3000
  // Stars are a minor prior, not the ranking: with the topic gate already
  // applied they separate a tool thousands rely on from an abandoned demo when
  // nothing else does. At 20% of a 30% component they cannot outvote demand.
  const popularity = log1pNorm(skill.github_stars || 0, ctx.max.stars)
  const quality = 0.5 * rewrite + 0.3 * richness + 0.2 * popularity

  let penalty = 0
  ctx.recentCategories.forEach((cat, i) => {
    if (cat && skill.category === cat) penalty += CATEGORY_PENALTY[i] || 0
  })

  const score = WEIGHTS.need * need + WEIGHTS.freshness * freshness + WEIGHTS.quality * quality - penalty
  const parts = { need, freshness, quality, penalty }

  return { score, parts, reason: buildReason({ parts, searchHit, installs, velocity, isNew, skill }) }
}

// One honest sentence for the email and the send log. Every number in it is a
// number we measured; when nothing stands out it says so plainly.
function buildReason({ parts, searchHit, installs, velocity, isNew, skill }) {
  const needLed = parts.need * WEIGHTS.need >= parts.freshness * WEIGHTS.freshness
  if (needLed && searchHit && searchHit.count >= QUOTABLE_MIN_COUNT) {
    return searchHit.sample
      ? `People searched WorkflowStacks for “${searchHit.sample}” ${searchHit.sampleCount} times this month.`
      : 'It matches one of the most common searches on WorkflowStacks this month.'
  }
  if (needLed && installs >= 3) return `Installed ${installs} times from WorkflowStacks in the last 30 days.`
  if (velocity > 0 && !skill.velocity_provisional) return `It gained ${velocity.toLocaleString('en-US')} GitHub stars in the last 7 days.`
  if (isNew) return 'New to the catalog this month.'
  if (searchHit) return 'It matches a recent search on WorkflowStacks.'
  if (installs > 0) return 'Installed from WorkflowStacks this month.'
  return 'Next up from the catalog: a guide we have not sent you yet.'
}

export function pickDaily(skills, ctx) {
  const installable = skills.filter(isInstallable)
  const usable = (strict, minGuide) => installable.filter((s) =>
    isAiRelevant(s, { strict }) && guideRichness(s.use_guide) >= minGuide)
  // Relax in order of how much each gate protects the reader: a thin guide is
  // a worse email than a loosely-tagged repo, so the topic gate loosens first.
  const pool = [usable(true, MIN_GUIDE_CHARS), usable(false, MIN_GUIDE_CHARS), usable(false, 1)]
    .find((p) => p.length > 0) || []
  if (pool.length === 0) return { pick: null, candidates: [] }

  // Computed once per skill: it feeds both the normalising max and the score.
  const demandBySkill = new Map(pool.map((s) => [s.id, searchDemand(s, ctx.demandIndex)]))
  const max = { search: 0, installs: 0, velocity: 0, stars: 0 }
  for (const s of pool) {
    max.search = Math.max(max.search, demandBySkill.get(s.id).raw)
    max.installs = Math.max(max.installs, ctx.installs.get(s.id) || 0)
    max.velocity = Math.max(max.velocity, typeof s.velocity_7d === 'number' ? s.velocity_7d : 0)
    max.stars = Math.max(max.stars, s.github_stars || 0)
  }

  const ranked = pool
    .map((skill) => ({ skill, ...scoreSkill(skill, { ...ctx, max, demandBySkill }) }))
    .sort((a, b) => b.score - a.score || (b.skill.github_stars || 0) - (a.skill.github_stars || 0))

  return { pick: ranked[0], candidates: ranked.slice(0, 5) }
}

const PICK_FIELDS = {
  _id: 0, id: 1, slug: 1, name: 1, title_human: 1, description: 1, description_human: 1,
  category: 1, github_topics: 1, github_stars: 1, github_url: 1, use_guide: 1,
  rewrite_score: 1, velocity_7d: 1, velocity_provisional: 1, added_at: 1,
}

export async function pickDailyFromDb(database, { now = new Date() } = {}) {
  const day = 24 * 60 * 60 * 1000
  const demandSince = new Date(now.getTime() - DEMAND_WINDOW_DAYS * day)

  // Daily sends only: the weekly issue stores lists, not a skill_id.
  const sends = await database.collection('newsletter_sends')
    .find({ skill_id: { $exists: true }, sent_at: { $gte: new Date(now.getTime() - NO_REPEAT_DAYS * day) } },
      { projection: { skill_id: 1, sent_at: 1 } })
    .sort({ sent_at: -1 }).toArray()
  const sentIds = [...new Set(sends.map((s) => s.skill_id))]

  const [queries, installRows, lastTwo] = await Promise.all([
    database.collection('search_queries').aggregate([
      { $match: { at: { $gte: demandSince } } },
      { $group: { _id: '$q', count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 300 },
    ]).toArray().catch(() => []),
    database.collection('install_events').aggregate([
      { $match: { created_at: { $gte: demandSince } } },
      { $group: { _id: '$skill_id', count: { $sum: 1 } } },
    ]).toArray().catch(() => []),
    database.collection('skills')
      .find({ id: { $in: sends.slice(0, 2).map((s) => s.skill_id) } }, { projection: { id: 1, category: 1 } })
      .toArray(),
  ])

  const categoryOf = new Map(lastTwo.map((s) => [s.id, s.category]))
  const ctx = {
    now,
    demandIndex: buildDemandIndex(queries.map((r) => ({ q: r._id, count: r.count }))),
    installs: new Map(installRows.map((r) => [r._id, r.count])),
    recentCategories: sends.slice(0, 2).map((s) => categoryOf.get(s.skill_id) || null),
    totalSearches: queries.reduce((n, r) => n + r.count, 0),
    totalInstalls: installRows.reduce((n, r) => n + r.count, 0),
  }

  const base = { published: { $ne: false }, ...TOOLS_ONLY }
  let skills = await database.collection('skills')
    .find({ ...base, id: { $nin: sentIds } }, { projection: PICK_FIELDS }).toArray()
  let recycled = false
  if (skills.length === 0) {
    // Every eligible skill went out inside the window. Start over rather than
    // skip the day, and say so in the log.
    skills = await database.collection('skills').find(base, { projection: PICK_FIELDS }).toArray()
    recycled = true
  }

  return { ...pickDaily(skills, ctx), poolSize: skills.length, recycled, excludedRecent: sentIds.length }
}
