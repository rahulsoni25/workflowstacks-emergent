export const meta = {
  name: 'rating-panel',
  description: 'Reliable site rating: 3 independent grounded judges score the live site, every flagged issue is adversarially verified against ground truth, score is median-aggregated (robust to a single hallucinating judge)',
  phases: [
    { title: 'Judge', detail: '3 independent judges score the live site against best practice' },
    { title: 'Verify', detail: 'adversarially verify each flagged issue against the live site' },
  ],
}

const BASE = (args && args.baseUrl) || 'https://workflowstacks-emergent.vercel.app'
const CB = (args && args.cb) || 'rp'

const PRIMER =
  `GROUND TRUTH — verify against the LIVE site, do not assume (these traps have produced false findings before):\n` +
  `- Skill detail pages use UUID ids. Get a real id from ${BASE}/api/skills (the "id" field), then load ${BASE}/skills/<uuid>. Every real id returns 200. Do NOT guess slugs like /skills/n8n and then claim routing is broken.\n` +
  `- JSON-LD structured data is SERVER-RENDERED inside <script type="application/ld+json"> tags. Home has WebSite + Organization + FAQPage; skill pages have SoftwareApplication + BreadcrumbList; /deals and /problems have ItemList. If your fetch tool strips <script> tags you may not see them — fetch the RAW HTML and search for "application/ld+json" before claiming schema is missing.\n` +
  `- GitHub star/fork counts are cached snapshots refreshed daily. Small drift (a few %) vs live GitHub is expected and is NOT fabrication.\n` +
  `- These pages are server-rendered with full content in the initial HTML: /, /skills, /packs, /playbooks, /personas, /deals, /problems, /discover, /community, /members.\n` +
  `- The free open-source catalog is intentional. Monetization = group-buy tool deals + done-for-you services + creator tools, NOT the catalog. "It's free" is the business model, not a missing revenue model.\n` +
  `- Append ?cb=${CB} to page URLs to bypass caches.`

const DIMS =
  `Score each dimension 0-10 vs best-in-class SaaS / marketplace sites (10 = nothing left to improve):\n` +
  `- ux_clarity: navigation, hierarchy; can a first-time visitor understand the product and act within 5 seconds?\n` +
  `- content_depth: real, specific, useful content on every key page (not thin or placeholder).\n` +
  `- seo_perf: title/meta/canonical/OG, structured data, crawlable server-rendered content, sitemap/robots/llms.txt, page weight.\n` +
  `- trust_conversion: credibility, honest claims, clear CTAs, no dark patterns or fabricated metrics.\n` +
  `- tech_security: no broken links/routes/JS errors, sane response headers, no exposed secrets.`

const JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    ux_clarity: { type: 'number' },
    content_depth: { type: 'number' },
    seo_perf: { type: 'number' },
    trust_conversion: { type: 'number' },
    tech_security: { type: 'number' },
    overall: { type: 'number', description: 'your holistic 0-10' },
    summary: { type: 'string', description: '2-3 sentence verdict' },
    issues: {
      type: 'array',
      description: 'Only issues you VERIFIED against fetched content. If unsure, omit it.',
      items: {
        type: 'object',
        properties: {
          dimension: { type: 'string', enum: ['ux_clarity', 'content_depth', 'seo_perf', 'trust_conversion', 'tech_security'] },
          issue: { type: 'string' },
          evidence: { type: 'string', description: 'the concrete thing you fetched/saw that proves it' },
          fix: { type: 'string', description: 'concrete fix (file/route if known)' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['dimension', 'issue', 'evidence', 'fix', 'severity'],
      },
    },
  },
  required: ['ux_clarity', 'content_depth', 'seo_perf', 'trust_conversion', 'tech_security', 'overall', 'issues'],
}

const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    real: { type: 'boolean', description: 'true only if you reproduced the problem against the live site right now' },
    reason: { type: 'string' },
    severity: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['real', 'reason', 'severity'],
}

function judgePrompt(n) {
  return (
    `You are independent judge #${n} rating ${BASE} as a DEMANDING senior reviewer who is both a skeptical first-time customer and an SEO/AEO expert.\n\n` +
    `${PRIMER}\n\n${DIMS}\n\n` +
    `Actually FETCH and inspect (token-frugal, ~8 fetches): the homepage, one skill detail page (real UUID from /api/skills), /skills, /packs or /playbooks, /deals, /problems, plus robots.txt + sitemap.xml + llms.txt.\n` +
    `Be rigorous and fair. VERIFY every issue against what you actually fetched — do not speculate. If you cannot reproduce a problem, do not list it. Reserve scores of 9-10 for genuinely excellent dimensions; reserve high-severity issues for real, reproduced defects.`
  )
}

// ---- Phase 1: three independent judges ----
phase('Judge')
const judges = (await parallel([1, 2, 3].map((n) => () =>
  agent(judgePrompt(n), { schema: JUDGE_SCHEMA, label: `judge-${n}`, phase: 'Judge' })
))).filter(Boolean)

if (judges.length === 0) {
  return { error: 'All judges failed (no web access?)', verdict: 'INVALID' }
}

const DIM_KEYS = ['ux_clarity', 'content_depth', 'seo_perf', 'trust_conversion', 'tech_security']
const median = (xs) => {
  const a = [...xs].sort((x, y) => x - y)
  const m = Math.floor(a.length / 2)
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2
}
const scores = {}
for (const k of DIM_KEYS) scores[k] = Number(median(judges.map((j) => Number(j[k]) || 0)).toFixed(2))

// ---- Phase 2: adversarially verify every flagged issue ----
const allIssues = []
judges.forEach((j, i) => (j.issues || []).forEach((it) => allIssues.push({ ...it, judge: i + 1 })))
// De-dupe near-identical issues by (dimension + first 60 chars), keep highest severity
const sevRank = { high: 3, medium: 2, low: 1 }
const byKey = {}
for (const it of allIssues) {
  const key = `${it.dimension}:${(it.issue || '').toLowerCase().slice(0, 60)}`
  if (!byKey[key] || sevRank[it.severity] > sevRank[byKey[key].severity]) byKey[key] = it
}
const uniqueIssues = Object.values(byKey).slice(0, 12) // bound verification cost

phase('Verify')
const verified = (await parallel(uniqueIssues.map((it) => () =>
  agent(
    `Adversarially verify this claimed issue on ${BASE}. Try to REFUTE it by fetching the live site right now.\n\n` +
    `${PRIMER}\n\n` +
    `CLAIM [${it.dimension}, ${it.severity}]: ${it.issue}\nEVIDENCE GIVEN: ${it.evidence}\n\n` +
    `Return real=true ONLY if you reproduce the problem against the live site. If the ground truth above explains it away, or you cannot reproduce it, return real=false.`,
    { schema: VERIFY_SCHEMA, label: `verify:${it.dimension}`, phase: 'Verify' }
  ).then((v) => ({ ...it, verdict: v })).catch(() => null)
))).filter(Boolean)

const confirmed = verified.filter((v) => v.verdict?.real)
const falsePositives = verified.filter((v) => v.verdict && !v.verdict.real)

const overall = Number((DIM_KEYS.reduce((s, k) => s + scores[k], 0) / DIM_KEYS.length).toFixed(2))
const confirmedHigh = confirmed.filter((c) => c.verdict.severity === 'high')

log(`Panel: ${judges.length} judges · overall ${overall} (median-aggregated) · ${confirmed.length} confirmed issue(s), ${falsePositives.length} false positive(s) discarded`)

return {
  overall,
  verdict: overall >= 9.5 ? 'MEETS-9.5' : 'BELOW-9.5',
  scores,
  judgeOveralls: judges.map((j) => Number(j.overall) || 0),
  judgeSummaries: judges.map((j) => j.summary).filter(Boolean),
  confirmedIssues: confirmed.map((c) => ({ dimension: c.dimension, issue: c.issue, fix: c.fix, severity: c.verdict.severity, reason: c.verdict.reason })),
  confirmedHighCount: confirmedHigh.length,
  discardedFalsePositives: falsePositives.map((f) => ({ issue: f.issue, why: f.verdict.reason })),
}
