export const meta = {
  name: 'rating-council',
  description: 'Token-lean council: ONE Haiku agent scores the site, self-verifies every claim against ground truth, and proposes fixes — built to run cheaply on a low plan',
  phases: [{ title: 'Audit', detail: 'single Haiku agent: score + verify + fix in one pass' }],
}

// --- Token-economy notes ---------------------------------------------------
// The expensive version fanned out 10-15 agents that each re-fetched the same
// pages (~200k tokens/run). This lean version uses 1 Haiku agent and <=3 page
// fetches (~15-30k tokens, a few cents). Pass args.thorough=true ONLY when you
// want the heavier multi-agent pass.
const BASE = (args && args.baseUrl) || 'https://workflowstacks-emergent.vercel.app'
const BASELINE = (args && args.baseline) || {}
const CB = (args && args.cacheBust) || 'rc'
const THOROUGH = !!(args && args.thorough)

const DIMS = ['ux_clarity', 'content_depth', 'seo_perf', 'trust_conversion', 'tech_security']

const SCHEMA = {
  type: 'object',
  properties: {
    scores: {
      type: 'object',
      properties: Object.fromEntries(DIMS.map((d) => [d, { type: 'number' }])),
      required: DIMS,
    },
    confirmedIssues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          dimension: { type: 'string' },
          issue: { type: 'string' },
          evidence: { type: 'string' },
          fix: { type: 'string' },
        },
        required: ['dimension', 'issue', 'fix'],
      },
    },
  },
  required: ['scores', 'confirmedIssues'],
}

const PROMPT =
  `You are a token-efficient one-person rating council for WorkflowStacks — a FREE open-source AI-skills ` +
  `marketplace with an agent builder — at ${BASE}.\n\n` +
  `BE ECONOMICAL. Fetch at most these URLs (append ?cb=${CB} to bust cache):\n` +
  `1) ${BASE}/?cb=${CB}  2) ${BASE}/skills?cb=${CB}  3) ONE ${BASE}/skills/<id>?cb=${CB} detail page (get an id from ${BASE}/api/skills?cb=${CB}).\n` +
  `Do NOT fetch more pages or read code unless a finding truly requires it.\n\n` +
  `Score 0-10 each (vs best-in-class Claw Mart/Smithery): ${DIMS.join(', ')}.\n\n` +
  `CRITICAL — do not cry wolf. Before reporting ANY issue, VERIFY it:\n` +
  `- Data claims ("stars fabricated/inflated"): check the real value via https://api.github.com/repos/OWNER/REPO and compare. If the site matches reality, it is NOT an issue.\n` +
  `- "Content X present/missing / says 500+ / fake testimonials": trust ONLY the cache-busted HTML you actually fetched.\n` +
  `Report ONLY verified-real issues, each with concrete evidence and a one-line fix. Quality over quantity — a few real issues beat many guesses.`

phase('Audit')

async function audit(label) {
  return agent(PROMPT, { schema: SCHEMA, model: 'haiku', label })
}

// Default: 1 cheap agent. Thorough: 2 agents, keep the more critical (lower-scoring) read.
let result
if (THOROUGH) {
  const runs = (await parallel([() => audit('audit-a'), () => audit('audit-b')])).filter(Boolean)
  result = runs.sort((a, b) => sum(a.scores) - sum(b.scores))[0] || runs[0]
} else {
  result = await audit('audit')
}

function sum(o) {
  return Object.values(o).reduce((a, b) => a + b, 0)
}

const scores = result.scores
const overall = Number((sum(scores) / DIMS.length).toFixed(2))
const baseVals = Object.values(BASELINE).filter((v) => typeof v === 'number')
const prev = baseVals.length ? Number((baseVals.reduce((a, b) => a + b, 0) / baseVals.length).toFixed(2)) : null
const deltas = Object.fromEntries(
  DIMS.map((d) => [d, typeof BASELINE[d] === 'number' ? Number((scores[d] - BASELINE[d]).toFixed(2)) : null])
)
log(`Overall ${overall}${prev !== null ? ` (was ${prev} — ${overall >= prev ? 'UP' : 'DOWN'})` : ' (baseline)'}; ${result.confirmedIssues.length} verified issue(s)`)

return {
  overall,
  previousOverall: prev,
  verdict: prev === null ? 'BASELINE-SET' : overall >= prev ? 'IMPROVED-OR-HELD' : 'REGRESSED',
  mode: THOROUGH ? 'thorough (2 agents)' : 'lean (1 Haiku agent)',
  scores,
  deltas,
  confirmedIssues: result.confirmedIssues,
}
