import { TEMPLATES } from '@/lib/templates'
import { OUTCOMES } from '@/lib/outcomes'
import { MCP_SERVERS } from '@/lib/mcp-servers'

// Which of OUR pages a catalog skill should point at.
//
// A skill page linked to six sibling skills and to nothing else. The catalog
// is the only part of the site Google has ever ranked (every click in the
// 90-day Search Console history came from /skills/*), and it had no path into
// the templates, outcome pages and MCP configs that could actually convert a
// visit. This is the deterministic matcher that gives each skill page a
// "do this with a working workflow" block — same shape as relatedBundle() in
// lib/bundles.js, no LLM, so it never invents a page.
//
// Scoring is keyword overlap between the skill's own words (name, title,
// description, GitHub topics, category) and each asset's keyword set. A match
// needs at least two distinct keyword hits, so a single incidental word like
// "email" does not attach a cold-email template to a mail-server library.

const STOP = new Set(['the', 'and', 'for', 'with', 'your', 'you', 'from', 'that', 'this', 'into', 'are', 'can', 'use', 'using', 'via', 'any', 'all', 'one', 'get', 'set', 'run', 'runs', 'tool', 'tools', 'agent', 'agents', 'skill', 'skills', 'open', 'source', 'free', 'app', 'apps', 'api', 'apis', 'data', 'code', 'based', 'built', 'ai', 'llm', 'llms'])

// Words that appear in almost every asset's keyword list AND in most skill
// descriptions. They may count toward a match but can never carry one on
// their own: "write" + "copy" attached the product-descriptions template to
// a coding agent in testing. A match needs at least one hit outside this set.
const WEAK = new Set(['write', 'writes', 'writing', 'copy', 'create', 'creates', 'generate', 'generates', 'send', 'sends', 'reply', 'respond', 'make', 'build', 'builds', 'automate', 'automated', 'automation', 'automations', 'workflow', 'workflows', 'template', 'templates', 'guide', 'content', 'text', 'list', 'lists', 'draft', 'drafts', 'manage', 'track', 'tracking', 'update', 'updates', 'new', 'custom', 'local', 'file', 'files', 'web', 'search', 'chat', 'assistant', 'support', 'business', 'customer', 'customers'])

function tokens(text) {
  return new Set(
    String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/[\s-]+/)
      .filter((w) => w.length >= 3 && !STOP.has(w))
  )
}

function skillTokens(skill) {
  return tokens([
    skill.name, skill.title_human, skill.description, skill.description_human, skill.category,
    Array.isArray(skill.github_topics) ? skill.github_topics.join(' ') : '',
    skill.explainer?.what_it_is, skill.explainer?.use_case_example,
  ].filter(Boolean).join(' '))
}

// Each asset carries the keywords a match is judged against. Templates have
// hand-written match_keywords already (they power the goal recommender);
// outcome pages inherit their template's keywords plus their own headline;
// MCP configs are matched on name, blurb and category.
function assetIndex() {
  const out = []
  for (const t of Object.values(TEMPLATES)) {
    out.push({ kind: 'template', path: `/templates/${t.slug}`, title: t.title, blurb: t.outcome, kw: tokens((t.match_keywords || []).join(' ')) })
  }
  for (const o of Object.values(OUTCOMES)) {
    const t = TEMPLATES[o.template]
    out.push({ kind: 'outcome', path: `/automate/${o.slug}`, title: o.h1, blurb: o.how, kw: tokens(`${(t?.match_keywords || []).join(' ')} ${o.h1} ${o.title}`) })
  }
  for (const m of Object.values(MCP_SERVERS)) {
    out.push({ kind: 'mcp', path: `/mcp/${m.slug}`, title: `${m.name} MCP config`, blurb: m.blurb, kw: tokens(`${m.name} ${m.blurb} ${m.category} ${m.slug}`) })
  }
  return out
}

let INDEX = null

export function relatedAssets(skill, { limit = 3 } = {}) {
  if (!skill) return []
  INDEX = INDEX || assetIndex()
  const st = skillTokens(skill)
  if (!st.size) return []
  const scored = []
  for (const a of INDEX) {
    let hits = 0, strong = 0
    for (const k of a.kw) if (st.has(k)) { hits++; if (!WEAK.has(k)) strong++ }
    if (hits >= 2 && strong >= 1) scored.push({ kind: a.kind, path: a.path, title: a.title, blurb: a.blurb, score: hits + strong })
  }
  scored.sort((x, y) => y.score - x.score)
  // One of each kind before a second of any kind, so a skill that matches
  // three templates still surfaces the outcome page and the MCP config.
  const picked = []
  const seenKind = new Set()
  for (const s of scored) {
    if (picked.length >= limit) break
    if (seenKind.has(s.kind)) continue
    picked.push(s); seenKind.add(s.kind)
  }
  for (const s of scored) {
    if (picked.length >= limit) break
    if (!picked.includes(s)) picked.push(s)
  }
  return picked.map(({ score, ...rest }) => rest)
}
