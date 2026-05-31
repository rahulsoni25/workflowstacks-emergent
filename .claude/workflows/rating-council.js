export const meta = {
  name: 'rating-council',
  description: 'Council scores the live site across dimensions, compares to baseline, and turns any regression into concrete fixes',
  phases: [
    { title: 'Score', detail: 'parallel judges score each dimension against a 10/10 bar' },
    { title: 'Verdict', detail: 'compare to baseline, flag regressions' },
    { title: 'Remediate', detail: 'propose concrete fixes for any regression' },
  ],
}

const BASE = (args && args.baseUrl) || 'https://workflowstacks-emergent.vercel.app'
const BASELINE = (args && args.baseline) || {}

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
    `Inspect the LIVE site at ${BASE} using WebFetch on these pages: /, /skills, one /skills/<id> detail page (get an id from ${BASE}/api/skills), /packs, /playbooks, /personas, /builder. ` +
    `You may also Read/Grep the repo (app/ directory) to verify implementation.\n` +
    `Score 0-10 HONESTLY against a best-in-class bar (Claw Mart, Smithery, Agensi). Do not inflate. ` +
    `Return the score, a one-paragraph rationale, and the most important concrete issues.`,
    { schema: SCORE_SCHEMA, label: `score:${d.key}`, phase: 'Score' }
  ).then((r) => ({ ...d, ...r }))
))).filter(Boolean)

const overall = results.length ? Number((results.reduce((s, r) => s + r.score, 0) / results.length).toFixed(2)) : 0

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
let remediation = []
if (regressions.length) {
  remediation = (await parallel(regressions.map((r) => () =>
    agent(
      `On the WorkflowStacks rating council, dimension "${r.title}" REGRESSED (now ${r.score}, was ${r.baseline}).\n` +
      `Issues flagged: ${JSON.stringify(r.topIssues)}.\n` +
      `Propose the specific, minimal code/content changes (files + actions) to restore and improve this dimension. Be concrete and prioritized.`,
      { schema: { type: 'object', properties: { fixes: { type: 'array', items: { type: 'string' } } }, required: ['fixes'] }, label: `fix:${r.key}`, phase: 'Remediate' }
    ).then((f) => ({ dimension: r.title, ...f }))
  ))).filter(Boolean)
}

return {
  overall,
  previousOverall: prevOverall,
  verdict: prevOverall === null ? 'BASELINE-SET' : overall >= prevOverall ? 'IMPROVED-OR-HELD' : 'REGRESSED — see remediation',
  scorecard: compared.map((r) => ({ dimension: r.title, score: r.score, baseline: r.baseline, delta: r.delta, topIssues: r.topIssues })),
  regressions: regressions.map((r) => r.title),
  remediation,
}
