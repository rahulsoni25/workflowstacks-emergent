export const meta = {
  name: 'rating-council',
  description: 'Council scores the live site across dimensions, compares to baseline, and turns any regression into concrete fixes',
  phases: [
    { title: 'Score', detail: 'parallel judges score each dimension against a 10/10 bar' },
    { title: 'Verify', detail: 'adversarial fact-check every flagged issue against ground truth' },
    { title: 'Verdict', detail: 'compare to baseline, flag regressions' },
    { title: 'Remediate', detail: 'propose concrete fixes for CONFIRMED issues only' },
  ],
}

const BASE = (args && args.baseUrl) || 'https://workflowstacks-emergent.vercel.app'
const BASELINE = (args && args.baseline) || {}
// Cache-buster so the council never scores stale WebFetch-cached HTML.
const CACHE_BUST = (args && args.cacheBust) || 'r' + (args && args.run || '1')

const DIMENSIONS = [
  { key: 'ux_clarity', title: 'UX & Clarity', focus: 'Is it obvious what each page is and what to do next? Are inner pages (skills, packs, playbooks, personas, builder) self-explanatory? Concept clarity: skills vs packs vs playbooks vs personas vs agents.' },
  { key: 'content_depth', title: 'Content Depth', focus: 'Do pages DELIVER the outcome on the page (how-to-use guides, ready-to-paste prompts, numbered playbook steps, persona briefs) instead of sending users to GitHub? Granularity and detail vs Claw Mart-grade depth.' },
  { key: 'seo_perf', title: 'SEO & Performance', focus: 'Server-rendered content in HTML, per-page metadata/canonical, sitemap.xml, robots.txt, OG images, first paint, mobile responsiveness.' },
  { key: 'trust_conversion', title: 'Trust & Conversion', focus: 'Trust signals (real stars/forks, quality score, verified, 100% free), CTAs that actually work, and the land -> evaluate -> build -> save funnel.' },
  { key: 'tech_security', title: 'Technical & Security', focus: 'Admin auth on expensive endpoints, the quality/published gate, no broken buttons, no duplicates, error/404/loading states.' },
]

const SCORE_SCHEMA = {
  type: 'object',
  properties: {
    score: { type: 'number', description: '0-10 against a best-in-class 10 bar' },
    rationale: { type: 'string' },
    topIssues: { type: 'array', items: { type: 'string' }, description: 'concrete issues holding the score back, most important first' },
  },
  required: ['score', 'rationale', 'topIssues'],
}

phase('Score')
const results = (await parallel(DIMENSIONS.map((d) => () =>
  agent(
    `You are a strict product reviewer on the rating council for WorkflowStacks, a marketplace of free open-source AI skills with an agent builder.\n` +
    `Evaluate ONLY this dimension: ${d.title}.\nCovers: ${d.focus}\n\n` +
    `Inspect the LIVE site using WebFetch on these pages, and CRITICAL: append "?cb=${CACHE_BUST}" to EVERY url to bypass stale cache: ` +
    `${BASE}/?cb=${CACHE_BUST}, ${BASE}/skills?cb=${CACHE_BUST}, one ${BASE}/skills/<id>?cb=${CACHE_BUST} detail page (get an id from ${BASE}/api/skills?cb=${CACHE_BUST}), ${BASE}/packs?cb=${CACHE_BUST}, ${BASE}/playbooks?cb=${CACHE_BUST}, ${BASE}/personas?cb=${CACHE_BUST}, ${BASE}/builder?cb=${CACHE_BUST}. ` +
    `You may also Read/Grep the repo (app/ directory) to verify implementation.\n` +
    `Score 0-10 HONESTLY against a best-in-class bar (Claw Mart, Smithery, Agensi). Do not inflate. ` +
    `Return the score, a one-paragraph rationale, and the most important concrete issues.`,
    { schema: SCORE_SCHEMA, label: `score:${d.key}`, phase: 'Score' }
  ).then((r) => ({ ...d, ...r }))
))).filter(Boolean)

const overall = results.length ? Number((results.reduce((s, r) => s + r.score, 0) / results.length).toFixed(2)) : 0

// Adversarial verification — the council MUST NOT cry wolf. Every flagged issue is
// fact-checked against ground truth before it can drive remediation.
phase('Verify')
const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    checks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          issue: { type: 'string' },
          confirmed: { type: 'boolean', description: 'true ONLY if verified real against ground truth' },
          evidence: { type: 'string', description: 'what you checked and found' },
        },
        required: ['issue', 'confirmed', 'evidence'],
      },
    },
  },
  required: ['checks'],
}
const verified = (await parallel(results.map((r) => () =>
  agent(
    `You are an adversarial fact-checker on the rating council. A reviewer flagged these issues for "${r.title}" on the live site:\n${JSON.stringify(r.topIssues)}\n\n` +
    `VERIFY each against GROUND TRUTH before it is treated as real — reviewers hallucinate. Specifically:\n` +
    `- Data claims ("X stars are fabricated/inflated", "metric is fake"): fetch the REAL value from the GitHub API (https://api.github.com/repos/OWNER/REPO — get the repo from ${BASE}/api/skills?cb=${CACHE_BUST}) and compare. If the site's number matches reality, mark confirmed:false.\n` +
    `- "Endpoint is unauthenticated/insecure": actually curl/WebFetch it and check the real HTTP status.\n` +
    `- "Content X present/missing", "says 500+", "fabricated testimonials": WebFetch the page WITH ?cb=${CACHE_BUST} and check the actual current HTML.\n` +
    `- "Duplicate listing": check whether they are genuinely the same product or legitimately different repos.\n` +
    `Mark confirmed:true ONLY if ground truth proves the issue is real right now. Otherwise confirmed:false with evidence.`,
    { schema: VERIFY_SCHEMA, label: `verify:${r.key}`, phase: 'Verify' }
  ).then((v) => ({ key: r.key, title: r.title, checks: (v && v.checks) || [] }))
))).filter(Boolean)

const confirmedByDim = {}
const falsePositives = []
for (const v of verified) {
  confirmedByDim[v.key] = v.checks.filter((c) => c.confirmed).map((c) => c.issue)
  falsePositives.push(...v.checks.filter((c) => !c.confirmed).map((c) => ({ dimension: v.title, issue: c.issue, evidence: c.evidence })))
}

phase('Verdict')
const compared = results.map((r) => {
  const prev = typeof BASELINE[r.key] === 'number' ? BASELINE[r.key] : null
  const delta = prev !== null ? Number((r.score - prev).toFixed(2)) : null
  return { ...r, baseline: prev, delta, regressed: delta !== null && delta < -0.05 }
})
const regressions = compared.filter((r) => r.regressed)
const baseVals = Object.values(BASELINE).filter((v) => typeof v === 'number')
const prevOverall = baseVals.length ? Number((baseVals.reduce((a, b) => a + b, 0) / baseVals.length).toFixed(2)) : null
log(`Overall ${overall}${prevOverall !== null ? ` (was ${prevOverall} — ${overall >= prevOverall ? 'IMPROVED' : 'REGRESSED'})` : ' (baseline set)'}; ${regressions.length} dimension(s) regressed`)

phase('Remediate')
// Remediate dimensions that have CONFIRMED issues (verified real), prioritizing regressions.
const toFix = compared.filter((r) => (confirmedByDim[r.key] || []).length > 0)
const remediation = (await parallel(toFix.map((r) => () =>
  agent(
    `On the WorkflowStacks rating council, dimension "${r.title}" (score ${r.score}${r.baseline !== null ? `, was ${r.baseline}` : ''}) has these VERIFIED-REAL issues:\n` +
    `${JSON.stringify(confirmedByDim[r.key])}.\n` +
    `Propose the specific, minimal code/content changes (files + actions) to fix them. Concrete and prioritized.`,
    { schema: { type: 'object', properties: { fixes: { type: 'array', items: { type: 'string' } } }, required: ['fixes'] }, label: `fix:${r.key}`, phase: 'Remediate' }
  ).then((f) => ({ dimension: r.title, ...f }))
))).filter(Boolean)

const confirmedCount = Object.values(confirmedByDim).reduce((n, arr) => n + arr.length, 0)
log(`Confirmed ${confirmedCount} real issue(s); rejected ${falsePositives.length} false positive(s) via fact-check`)

return {
  overall,
  previousOverall: prevOverall,
  verdict: prevOverall === null ? 'BASELINE-SET' : overall >= prevOverall ? 'IMPROVED-OR-HELD' : 'REGRESSED — see remediation',
  scorecard: compared.map((r) => ({ dimension: r.title, score: r.score, baseline: r.baseline, delta: r.delta, confirmedIssues: confirmedByDim[r.key] || [] })),
  falsePositivesRejected: falsePositives,
  regressions: regressions.map((r) => r.title),
  remediation,
}
