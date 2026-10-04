// The social team: five agents, each one model call with its own role and a
// verdict the orchestrator (scripts/social-daily.mjs) enforces in code — a
// model saying "approved" is not enough on its own.
//
//   Scout         picks today's topic and angle from the catalog shortlist
//   Fact-checker  approves the topic against the facts and fixes the angle
//   Writer        writes the story: hook, X, LinkedIn, Instagram, slides
//   Editor        approves, returns notes, or returns a corrected draft
//   Hygiene       final claim audit: every claim must name a supporting fact
//
// Same providers as scripts/rewrite-backfill.mjs: Groq first, OpenRouter when
// Groq's daily cap is spent, both already set as repository secrets.

import { parseJsonObject } from './social-lib.mjs'

const GROQ_API_KEY = process.env.GROQ_API_KEY
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
// The strongest general chat model on this account's Groq key (see the model
// notes in scripts/rewrite-backfill.mjs).
const GROQ_MODEL = process.env.SOCIAL_GROQ_MODEL || 'openai/gpt-oss-120b'
const OPENROUTER_MODEL = process.env.SOCIAL_OPENROUTER_MODEL || 'google/gemma-4-31b-it:free'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

export const llmConfigured = () => Boolean(GROQ_API_KEY || OPENROUTER_API_KEY)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function callProvider(provider, { system, user, maxTokens, temperature, effort }) {
  const groq = provider === 'groq'
  const body = {
    model: groq ? GROQ_MODEL : OPENROUTER_MODEL,
    temperature,
    // gpt-oss spends output tokens on hidden reasoning before the answer; the
    // headroom keeps a long draft from coming back empty.
    max_tokens: groq ? maxTokens + 2000 : maxTokens,
    ...(groq ? { reasoning_effort: effort } : {}),
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
  }
  const headers = groq
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` }
    : { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'X-Title': 'WorkflowStacks' }
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(groq ? GROQ_URL : OPENROUTER_URL, { method: 'POST', headers, body: JSON.stringify(body) })
    if (res.ok) {
      const data = await res.json()
      return data.choices?.[0]?.message?.content || ''
    }
    const text = await res.text()
    if (res.status !== 429 || attempt === 1) throw new Error(`${provider} ${res.status}: ${text.slice(0, 200)}`)
    // A short wait is Groq's per-minute budget; a long one is the daily cap,
    // which no wait inside this run will clear.
    const m = text.match(/try again in ([0-9.]+)s/) || [null, res.headers.get('retry-after') || (groq ? '' : '20')]
    const waitS = Math.ceil(parseFloat(m[1] || '999'))
    if (waitS > 60) throw new Error(`${provider} 429 (wait ${waitS}s): ${text.slice(0, 200)}`)
    await sleep((waitS + 1) * 1000)
  }
  throw new Error(`${provider}: unreachable`)
}

async function chat(opts) {
  const providers = [GROQ_API_KEY && 'groq', OPENROUTER_API_KEY && 'openrouter'].filter(Boolean)
  if (!providers.length) throw new Error('Neither GROQ_API_KEY nor OPENROUTER_API_KEY is set')
  const errors = []
  for (const p of providers) {
    try { return await callProvider(p, opts) } catch (e) { errors.push(e.message) }
  }
  throw new Error(errors.join(' | '))
}

// One agent turn that must come back as a JSON object. A malformed answer gets
// one retry with the parse failure spelled out.
async function askJson(system, user, { maxTokens = 1200, temperature = 0.3, effort = 'low' } = {}) {
  let text = await chat({ system, user, maxTokens, temperature, effort })
  let out = parseJsonObject(text)
  if (out) return out
  text = await chat({ system, user: `${user}\n\nYour last answer was not a valid JSON object. Return ONLY the JSON object.`, maxTokens, temperature, effort })
  out = parseJsonObject(text)
  if (out) return out
  throw new Error(`no JSON object in the answer (${(text || '').length} chars): ${JSON.stringify((text || '').slice(0, 150))}`)
}

const TEAM = 'You are part of the WorkflowStacks social team. WorkflowStacks is a marketplace of open-source AI skills, MCP servers and agents that install into Claude, Cursor and other AI tools. The team posts one story a day on X, LinkedIn and Instagram.'
const json = (v) => JSON.stringify(v, null, 2)

// ----------------------------------------------------------------- Scout

const SCOUT = `${TEAM}

You are the Scout. You get today's shortlist from the WorkflowStacks catalog (the data the website shows), each with why it is on the list, and the hooks posted recently.

Pick the candidates with the best short story for founders, marketers and developers who use AI tools: a clear problem the reader has, and a clear change once they use it. Skip anything whose facts are thin or too close to a recent post.

Return ONLY JSON: {"picks": [{"index": <number>, "angle": "one sentence: the story, grounded in that candidate's facts", "audience": "who it is for"}]} with up to 3 picks, best first.`

export async function scout(candidates, { recentHooks, format }) {
  const list = candidates.map((c, index) => ({ index, why_on_list: c.reason, ...c.facts }))
  const out = await askJson(SCOUT, `Today's format: ${format}\n\nShortlist:\n${json(list)}\n\nRecent hooks:\n${json(recentHooks)}`)
  const seen = new Set()
  const picks = (Array.isArray(out.picks) ? out.picks : [])
    .filter((p) => Number.isInteger(p.index) && p.index >= 0 && p.index < candidates.length && !seen.has(p.index) && seen.add(p.index))
    .filter((p) => typeof p.angle === 'string' && p.angle.trim())
    .slice(0, 3)
  return { picks, raw: out }
}

// ---------------------------------------------------------- Fact-checker

const FACT_CHECKER = `${TEAM}

You are the Fact-checker. The Scout proposed a topic and an angle. You get the facts sheet: the catalog entry, re-checked minutes ago against GitHub and the live website.

Approve only if:
- the angle is fully supported by the facts (narrow it to a smaller, true version if needed),
- the facts are enough for a short, useful story: what it is, who it is for, what it does,
- nothing in the facts looks wrong or contradictory, such as a description that does not match the repo's topics.

Return ONLY JSON: {"approved": true|false, "angle": "the angle, corrected so every word is supported", "audience": "who it is for", "points": ["3 to 6 short points the writer may use, each ending with the supporting facts key in brackets, e.g. 'Turns a URL into a podcast [what_it_does]'"], "problems": ["why, if not approved"]}`

export async function factCheck(facts, pick) {
  const out = await askJson(FACT_CHECKER, `Scout's pick:\n${json(pick)}\n\nFacts:\n${json(facts)}`)
  const points = (Array.isArray(out.points) ? out.points : []).filter((p) => typeof p === 'string' && p.trim())
  const approved = out.approved === true && points.length >= 2 && typeof out.angle === 'string' && out.angle.trim().length > 0
  return {
    approved,
    brief: approved ? { angle: out.angle.trim(), audience: String(out.audience || pick.audience || ''), points } : null,
    problems: approved ? [] : (out.problems?.length ? out.problems : ['not approved, or fewer than 2 supported points']),
    raw: out,
  }
}

// ---------------------------------------------------------------- Writer

const WRITER = `${TEAM}

You are the Writer. Every post is a short STORY, not an announcement. People decide in the first second whether to keep reading, so the first line carries the post.

You get the facts sheet (the only source of truth), the brief the Scout and Fact-checker agreed, today's format, and sometimes notes from the Editor or the Hygiene check that you must fix.

Return ONLY a JSON object:
- "hook": one line, at most 90 characters. The scroll-stopper: a specific tension, a contrast, or a pain the reader recognises. It opens every post and is printed large on the image.
- "x": the rest of the X post after the hook, at most 140 characters. One or two lines that make the reader want the link.
- "linkedin": the rest of the LinkedIn post after the hook, 500 to 1100 characters. One or two sentences per paragraph. Arc: the situation the reader is in, the turn (what this does), what they can do afterwards, then one question that invites a comment.
- "instagram": the rest of the Instagram caption after the hook, 300 to 900 characters. Same arc, warmer, a line break between beats.
- "slides": 3 to 5 lines of at most 100 characters each: the story beats after the hook, one per carousel slide or video frame. Each makes sense alone; together they tell the arc.
- "hashtags": 3 to 5 hashtags without the # sign, letters and digits only.

Rules (the Hygiene check rejects any break):
- Second person ("you"). A situation the reader recognises is fine; invented specifics are not.
- Never invent people, companies, customers, quotes, testimonials, results, time saved, percentages or user counts.
- Never say you or WorkflowStacks used, tested or built something unless the facts say so.
- State only capabilities the facts state. If the facts do not say it works with a tool, do not say so.
- The only numbers you may use are numbers that appear in the facts.
- For an open-source repo, credit built_by by name as its creator. Never write an @handle.
- No links, URLs or domain names; the link is added after you.
- At most two emoji per field. Never "game-changer", "revolutionary", "unlock", "supercharge", "level up", "dive in" or 🚀.`

export async function write(facts, brief, { format, feedback = [], previous = null }) {
  const fix = feedback.length
    ? `\n\nYour previous draft:\n${json(previous)}\n\nFix all of these:\n${feedback.map((f) => `- ${f}`).join('\n')}`
    : ''
  return askJson(WRITER, `Format: ${format}\n\nBrief:\n${json(brief)}\n\nFacts:\n${json(facts)}${fix}`,
    { maxTokens: 1800, temperature: 0.8, effort: 'medium' })
}

// ---------------------------------------------------------------- Editor

export const EDITOR_MIN_SCORE = 8
const SCORE_KEYS = ['hook', 'story', 'clarity', 'cta', 'fit']

const EDITOR = `${TEAM}

You are the Editor. You decide whether a draft is good enough to publish under the brand, judged as a reader scrolling a busy feed.

Score each from 1 to 10:
- hook: would a founder or developer stop scrolling on the first line alone? Specific beats clever; vague or generic scores low.
- story: does it move from the reader's situation to the turn to the payoff, rather than listing features?
- clarity: plain words, short sentences, nothing a busy reader trips on.
- cta: does it give a clear reason to click (X, LinkedIn) or to search and save (Instagram), and does LinkedIn end with a question?
- fit: right length and tone for each platform; each slide makes sense alone.

Approve only if every score is ${EDITOR_MIN_SCORE} or higher and nothing is inaccurate against the facts.
If you do not approve, either give "notes" (specific and actionable, at most 6) for the Writer, or, when the fixes are small, return "revised": the full corrected draft in the same JSON shape as the draft. A revised draft follows the Writer's rules: facts only, no links, no @handles, no numbers that are not in the facts.

Return ONLY JSON: {"approved": true|false, "scores": {"hook": n, "story": n, "clarity": n, "cta": n, "fit": n}, "notes": ["..."], "revised": null}`

export async function edit(facts, brief, draft, { format }) {
  const out = await askJson(EDITOR, `Format: ${format}\n\nBrief:\n${json(brief)}\n\nFacts:\n${json(facts)}\n\nDraft:\n${json(draft)}`,
    { maxTokens: 2000, temperature: 0.2 })
  const scores = Object.fromEntries(SCORE_KEYS.map((k) => [k, Number(out.scores?.[k]) || 0]))
  const approved = out.approved === true && SCORE_KEYS.every((k) => scores[k] >= EDITOR_MIN_SCORE)
  const notes = (Array.isArray(out.notes) ? out.notes : []).filter((n) => typeof n === 'string' && n.trim())
  if (!approved && !notes.length) notes.push(`raise every score to ${EDITOR_MIN_SCORE}+ (scores: ${json(scores)})`)
  const revised = !approved && out.revised && typeof out.revised === 'object' ? out.revised : null
  return { approved, scores, notes, revised, raw: out }
}

// --------------------------------------------------------------- Hygiene

const HYGIENE = `${TEAM}

You are the final Hygiene check. Nothing is published without your pass. You do not rewrite; you audit.

1. List every factual claim in the draft (hook, x, linkedin, instagram, slides): what the thing is, does, works with, who built it, any number. For each, name the facts key that supports it, or null if no fact supports it. A claim is supported only if the facts state it or it follows directly from them. A second-person situation ("you have ten tabs open") is not a claim about the product; do not list it.
2. List problems: an unsupported claim, anything misleading about who built it, a promise of results, anything that reads as a testimonial or a real person's experience, anything offensive or off-brand, broken grammar, or text that does not match its platform.

Return ONLY JSON: {"passed": true|false, "claims": [{"claim": "...", "fact_key": "what_it_does" | null}], "problems": ["..."]}`

export async function hygiene(facts, draft) {
  const out = await askJson(HYGIENE, `Facts:\n${json(facts)}\n\nDraft:\n${json(draft)}`, { maxTokens: 2000, temperature: 0 })
  const claims = Array.isArray(out.claims) ? out.claims : []
  // The cited key must exist in the facts ("guide_when_to_use[1]" counts as
  // guide_when_to_use); a made-up key is the same as no support.
  const known = (k) => typeof k === 'string' && Object.hasOwn(facts, k.replace(/\[.*$/, '').trim())
  const unsupported = claims.filter((c) => !c || !known(c.fact_key)).map((c) => `unsupported claim: "${c?.claim}" (cited: ${c?.fact_key ?? 'nothing'})`)
  const problems = [...(Array.isArray(out.problems) ? out.problems.filter((p) => typeof p === 'string' && p.trim()) : []), ...unsupported]
  return { passed: out.passed === true && problems.length === 0, claims, problems, raw: out }
}
