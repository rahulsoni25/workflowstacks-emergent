// Ask engine — turns a plain-English question into a ranked set of real
// catalog skills, the same way /api/search-skills and /api/recommend-skills
// already do (tokenize -> stem -> weighted field match), but self-contained
// so it can run against either MongoDB (production) or the local JSON
// snapshot in lib/data/ask-snapshot.json (local dev with no DB configured).
//
// No invented data: every result is a real, verbatim catalog record. When
// nothing scores above zero, the engine says so instead of guessing.

import snapshot from './data/ask-snapshot.json'
import { matchTemplate, templateMeta } from './templates'

const NOISE = new Set([
  'the', 'a', 'an', 'my', 'your', 'our', 'for', 'of', 'to', 'from', 'with', 'in', 'on', 'at',
  'is', 'are', 'be', 'can', 'do', 'i', 'we', 'you', 'it', 'that', 'this', 'and', 'or', 'but',
  'how', 'what', 'when', 'where', 'want', 'need', 'please', 'help', 'make', 'build', 'create',
  'use', 'using', 'about', 'some', 'any', 'find', 'show', 'give', 'let', 'tell', 'best', 'top', 'good',
])

function lightStem(t) {
  return t
    .replace(/(ization|isation|ations|ation)$/i, 'ate')
    .replace(/(ribed|ribing|ription)$/i, 'ribe')
    .replace(/(ies)$/i, 'y')
    .replace(/(ing|ed|es|s)$/i, '')
}

export function tokenize(q) {
  return Array.from(new Set(
    String(q || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 3 && !NOISE.has(t))
      .map(lightStem)
      .filter((t) => t.length >= 3)
  ))
}

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

// Returns the raw text-match score with NO popularity bonus — a skill with
// zero token hits must score exactly 0 here, full stop. The star-count
// tiebreaker is applied separately, only to skills that already matched
// (see rankSkills below) — otherwise every skill in the pool would get a
// nonzero score from the log10(stars) term alone, and a nonsense query with
// no real match would still "find" the catalog's most popular tools.
function matchScore(s, tokens) {
  let score = 0
  for (const [path, w] of Object.entries(WEIGHTS)) {
    const t = fieldText(s, path).toLowerCase()
    if (!t) continue
    for (const tok of tokens) {
      if (t.includes(tok)) score += w
    }
  }
  return score
}

function buildSnippet(skill, tokens) {
  const text = skill.explainer?.use_case_example || skill.explainer?.what_it_is || skill.description_human || skill.description || ''
  if (!text) return null
  const lower = text.toLowerCase()
  for (const t of tokens) {
    const i = lower.indexOf(t)
    if (i >= 0) {
      const start = Math.max(0, i - 60)
      const end = Math.min(text.length, i + 140)
      return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
    }
  }
  return text.length > 160 ? text.slice(0, 157) + '…' : text
}

// Rank a pool of catalog records against a question. Pool can come from
// MongoDB (production) or the local snapshot (dev fallback) — same shape.
export function rankSkills(pool, question, limit = 8) {
  const tokens = tokenize(question)
  if (tokens.length === 0) return { tokens: [], results: [] }
  const ranked = pool
    .map((s) => ({ ...s, _match_score: matchScore(s, tokens) }))
    .filter((s) => s._match_score > 0) // must have an actual text hit — no free pass from popularity
    .map((s) => ({ ...s, _score: s._match_score + Math.log10(Math.max(1, s.github_stars || 0)) * 0.5 }))
    .sort((a, b) => b._score - a._score)
    .slice(0, limit)
    .map((s) => ({ ...s, matched_snippet: buildSnippet(s, tokens) }))
  return { tokens, results: ranked }
}

// Local-dev entry point: ranks against the bundled snapshot and also checks
// the hand-built outcome-template registry (a working download beats a
// reading list, same rule /api/recommend-skills follows).
export function askLocal(question, limit = 8) {
  const { tokens, results } = rankSkills(snapshot.skills, question, limit)
  const matchedTemplate = matchTemplate(question)
  return {
    question,
    tokens,
    results,
    matched_template: matchedTemplate ? templateMeta(matchedTemplate) : null,
    source: 'local-snapshot',
    snapshot_meta: snapshot._meta,
  }
}

export function synthesizeAnswer({ question, results, matched_template }) {
  if (matched_template) {
    return `WorkflowStacks has a ready-to-run template for this: "${matched_template.title}" — ${matched_template.outcome}`
  }
  if (!results || results.length === 0) {
    return `No catalog matches found for "${question}" in this local snapshot. Try different keywords, or browse the full catalog once this is live against the real database.`
  }
  const top = results.slice(0, 3).map((r) => r.title_human || r.name).join(', ')
  return `Found ${results.length} real open-source tool${results.length === 1 ? '' : 's'} in the WorkflowStacks catalog that match this: ${top}${results.length > 3 ? ', and others below' : ''}. Each card links straight to its source and install steps.`
}
