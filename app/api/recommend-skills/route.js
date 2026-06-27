// LLM-driven recommendation engine.
// Two-stage:
//   1. Regex pre-filter — pulls ~60 candidate skills from the catalog that
//      contain ANY of the goal's keywords (cheap, narrows the LLM context).
//   2. LLM second-pass — reads the goal, identifies the job, then PICKS 4-7
//      skills that together solve the goal 100%. Returns context, solution
//      summary, and ranked skills with role (primary/secondary/optional).
//
// This is real understanding — the LLM picks based on what each skill DOES,
// not just keyword overlap. Quality vs the regex-only recommender is huge.

import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGO_URL)
let db

async function connectDB() {
  if (!db) {
    await client.connect()
    db = client.db(process.env.DB_NAME || 'workflowstacks')
  }
  return db
}

// ---- Stage 1: candidate pre-filter (reuses search-skills logic, simplified) ----

const NOISE = new Set([
  'the','a','an','my','your','our','for','of','to','from','with','in','on','at',
  'is','are','be','can','do','i','we','you','it','that','this','and','or','but',
  'how','what','when','where','want','need','please','help','make','build','create',
  'use','using','about','some','any','find','show','give','let','tell','best','top','good',
])
function lightStem(t) {
  return t
    .replace(/(ization|isation|ations|ation)$/i, 'ate')
    .replace(/(ribed|ribing|ription)$/i, 'ribe')
    .replace(/(ies)$/i, 'y')
    .replace(/(ing|ed|es|s)$/i, '')
}
function tokenize(q) {
  return Array.from(new Set(
    String(q || '')
      .toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .filter(t => t.length >= 3 && !NOISE.has(t))
      .map(lightStem).filter(t => t.length >= 3)
  ))
}

async function preFilterCandidates(database, goal, max = 60) {
  const tokens = tokenize(goal)
  if (tokens.length === 0) return []
  const fieldRegexes = (field) => tokens.map(t => ({ [field]: { $regex: t, $options: 'i' } }))
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
    category: 1, github_stars: 1, github_topics: 1, explainer: 1,
  }
  const docs = await database.collection('skills')
    .find({ $or: ors, hidden: { $ne: true } }, { projection })
    .limit(max * 2).toArray()
  // Score by token-hit count + log-stars tiebreaker, take top `max`
  function score(s) {
    let n = 0
    const all = [
      s.title_human, s.name, s.description, s.description_human, s.category,
      (s.github_topics || []).join(' '),
      s.explainer?.what_it_is, s.explainer?.what_you_can_make,
      s.explainer?.how_it_helps, s.explainer?.use_case_example,
    ].filter(Boolean).join(' ').toLowerCase()
    for (const t of tokens) if (all.includes(t)) n++
    return n + Math.log10(Math.max(1, s.github_stars || 0)) * 0.3
  }
  return docs.map(s => ({ ...s, _score: score(s) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, max)
}

// ---- Stage 2: LLM picks the actual solution ----

function defaultProvider() {
  if (process.env.GROQ_API_KEY) {
    return { name: 'groq', model: process.env.GROQ_REC_MODEL || 'llama-3.3-70b-versatile' }
  }
  if (process.env.OPENROUTER_API_KEY) {
    return { name: 'openrouter', model: 'anthropic/claude-haiku-4.5' }
  }
  return { name: 'none', model: null }
}

async function callLLMJson(provider, system, user, maxTokens = 1200) {
  if (provider.name === 'groq') {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: provider.model, max_tokens: maxTokens,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      }),
    })
    if (!r.ok) throw new Error(`Groq ${r.status}: ${(await r.text()).substring(0, 200)}`)
    const d = await r.json()
    return d.choices?.[0]?.message?.content || ''
  }
  if (provider.name === 'openrouter') {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'X-Title': 'WorkflowStacks' },
      body: JSON.stringify({
        model: provider.model, max_tokens: maxTokens,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      }),
    })
    if (!r.ok) throw new Error(`OpenRouter ${r.status}: ${(await r.text()).substring(0, 200)}`)
    const d = await r.json()
    return d.choices?.[0]?.message?.content || ''
  }
  throw new Error('No LLM provider configured')
}

const SYSTEM_PROMPT = `You are a senior product engineer recommending a tight, complete stack of tools for a user's stated goal.

Given (1) the user's goal in plain English and (2) a candidate list of AI skills/tools/agents from a marketplace, your job is to pick the SMALLEST set of skills (4-7) that — combined — fully solve the goal end-to-end.

Hard rules:
- Quality > quantity. Pick FEWER skills if fewer are enough.
- Each picked skill must contribute meaningfully to the goal. No filler.
- If two candidates do the same job, pick the better ONE and drop the other.
- Cover the WHOLE workflow: data in → processing → output → distribution where relevant.
- If a critical capability is MISSING from the candidates, say so honestly in "what_is_missing".
- Output ONLY valid JSON. No commentary, no markdown fences.`

function buildUserPrompt(goal, candidates) {
  const list = candidates.map((c, i) => {
    const what = c.explainer?.what_it_is || c.description_human || c.description || ''
    return `${i + 1}. id=${c.id} | ${c.title_human || c.name} [${c.category}] — ${String(what).slice(0, 180)}`
  }).join('\n')

  return `USER GOAL: "${goal}"

CANDIDATE SKILLS (${candidates.length}):
${list}

Pick 4-7 skills that together fully solve the goal. Return this exact JSON shape:
{
  "context_understood": "1 sentence — what the user is actually trying to do, in plainer language than they wrote.",
  "solution_summary": "2-3 sentences — how the selected skills combine to solve this end-to-end. Mention the flow: 'first X handles Y, then Z does W…'",
  "recommended": [
    {
      "skill_id": "id from the candidate list above",
      "rank": 1,
      "role": "primary | secondary | optional",
      "why_picked": "1-2 sentences — what this skill specifically contributes to solving the goal",
      "what_it_handles": "the part of the workflow this skill owns (e.g., 'content generation', 'scheduling', 'analytics')"
    }
  ],
  "what_is_missing": "If any key capability needed for the goal isn't covered by the candidates, name it. Else empty string.",
  "confidence": "high | medium | low — how confident you are that this stack fully solves the goal"
}

Order by rank: 1 = most essential. Maximum 7 picks.`
}

// ---- Route handler ----

export async function POST(request) {
  let body = {}
  try { body = await request.json() } catch {}
  const goal = (body.goal || '').toString().trim()
  if (!goal) return Response.json({ error: 'Missing goal' }, { status: 400 })
  if (goal.length > 600) return Response.json({ error: 'Goal too long (max 600 chars)' }, { status: 400 })

  const provider = defaultProvider()
  if (provider.name === 'none') {
    return Response.json({ error: 'No LLM provider configured' }, { status: 500 })
  }

  const database = await connectDB()

  // Stage 1: pre-filter the catalog to the most relevant candidates
  const candidates = await preFilterCandidates(database, goal, 60)
  if (candidates.length === 0) {
    return Response.json({
      goal,
      context_understood: 'Could not find any catalog matches for this goal — try simpler keywords.',
      solution_summary: '',
      recommended: [],
      what_is_missing: 'No candidates to recommend from. Browse the full catalog or try a more specific goal.',
      confidence: 'low',
    })
  }

  // Stage 2: LLM picks the actual solution
  let recObj
  try {
    const raw = await callLLMJson(provider, SYSTEM_PROMPT, buildUserPrompt(goal, candidates), 1400)
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    recObj = JSON.parse(cleaned)
  } catch (e) {
    return Response.json({
      goal, error: 'LLM call failed: ' + e.message,
      // Best-effort fallback: regex top 5
      recommended: candidates.slice(0, 5).map((c, i) => ({
        skill_id: c.id, rank: i + 1, role: 'primary',
        why_picked: 'Keyword match in catalog (LLM unavailable)',
        what_it_handles: c.category,
      })),
      confidence: 'low',
    }, { status: 200 })
  }

  // Join LLM picks with full skill records so UI gets complete data
  const byId = new Map(candidates.map(c => [c.id, c]))
  const recommended = (recObj.recommended || [])
    .map(r => {
      const skill = byId.get(r.skill_id)
      if (!skill) return null
      return {
        ...skill,
        _rec_rank: r.rank ?? 99,
        _rec_role: r.role || 'primary',
        _rec_why: r.why_picked || '',
        _rec_what_it_handles: r.what_it_handles || '',
      }
    })
    .filter(Boolean)
    .sort((a, b) => a._rec_rank - b._rec_rank)

  return Response.json({
    goal,
    context_understood: recObj.context_understood || '',
    solution_summary: recObj.solution_summary || '',
    what_is_missing: recObj.what_is_missing || '',
    confidence: recObj.confidence || 'medium',
    candidate_count: candidates.length,
    recommended,
    provider: provider.name,
    model: provider.model,
  })
}
