export const meta = {
  name: 'competitor-council',
  description: 'Token-lean: ONE Haiku agent turns cached competitor intel into a prioritized deploy plan — zero web fetching by default',
  phases: [{ title: 'Plan', detail: 'single Haiku agent synthesizes from cached intel' }],
}

// --- Token economy ---------------------------------------------------------
// The expensive version ran 7 agents that each web-scraped a competitor (~250k
// tokens). This lean version bakes the research in as CACHED INTEL and uses 1
// Haiku agent to synthesize the plan with NO web calls (~10-20k tokens).
// Pass args.refresh=true to do a live web re-research (heavier) when intel is stale.
const REFRESH = !!(args && args.refresh)

// Cached competitor intel (gathered 2026-05-31). Refresh occasionally with ?refresh=true.
const INTEL = `
CLAW MART (shopclawmart.com) — DIRECT OpenClaw rival, PAID ($5-99/item, 90% creator share, instant publish):
  - Deep itemized "what you get" spec sheets: exact file count + total line count + every named sub-component
    (e.g. "The Content Engine" = 15 files / 3,400+ lines / 12 named agents) + quantified outputs.
  - Version history with dated changelogs (signals maintenance). Stacked social proof: ratings, "1,383 sold".
  - Aggregate proof ($100k+ paid to creators, 2,000+ listings). "Operator-tested, not theoretical."
  - WEAKNESS: pay-to-inspect — you must BUY ($9-49) to see what's inside the black box.
AGENSI (agensi.io) — curated SKILL.md + MCP, 80/20 split:
  - 8-point automated security scan + human review = trust moat (hammered everywhere). 1-command <60s install.
  - SKILL.md open standard evangelism. 80+ SEO "learn" articles ranking for competitor comparisons.
  - WEAKNESS: scan is a black box (no public report); browse grid has no trust signals (gated behind a click).
SMITHERY (smithery.ai) — largest MCP catalog, 1-click install/config, hosting.
PROMPTBASE — 270k+ prompts + agent skills, direct-sell at 0% fee, $2-10/item.

WORKFLOWSTACKS ADVANTAGES (unfair, hard to copy): 100% FREE (real OSS), verifiable live GitHub trust signals,
the Agent Builder (custom blueprint vs static config), auto-refresh pipeline, quality/published gate.

TOP OPPORTUNITIES IDENTIFIED:
  1. Read-the-source spec sheet: render the FULL skill source (file tree, named components, line counts,
     example IO) inline and FREE — inverts rivals' pay-to-inspect into our top-of-funnel.
  2. GitHub-native trust strip on every card (live stars/forks/maintainer/recency).
  3. "The listing IS the installer": one-click copy install command per target tool.
  4. Transparent, reproducible security-scan strip (honest checklist + linked raw output, not a bare badge).
`

const SCHEMA = {
  type: 'object',
  properties: {
    plan: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          rank: { type: 'number' },
          item: { type: 'string' },
          build: { type: 'string', description: 'what to build, concretely' },
          where: { type: 'string', description: 'which Next.js files/pages (app/ dir)' },
          impact: { type: 'string' },
        },
        required: ['rank', 'item', 'build'],
      },
    },
  },
  required: ['plan'],
}

phase('Plan')

let intel = INTEL
if (REFRESH) {
  // Optional heavier path: one agent does a quick web refresh of the two key rivals.
  intel = await agent(
    `Quickly refresh competitor intel for Claw Mart (shopclawmart.com) and Agensi (agensi.io) using WebSearch/WebFetch — ` +
    `what they do best (listing depth, trust model, pricing) in <=12 concise bullets. Be brief to save tokens.`,
    { model: 'haiku', label: 'refresh-intel' }
  )
}

const result = await agent(
  `You are a lean competitive strategist for WorkflowStacks — a FREE open-source AI-skills marketplace with an agent builder.\n` +
  `Using ONLY this intel (do NOT browse the web — save tokens):\n${intel}\n\n` +
  `Output the TOP 5 prioritized, feasible, differentiated moves to make WorkflowStacks more valuable than these rivals. ` +
  `Each: what to build, which Next.js files/pages (app/ dir; the API is app/api/[[...path]]/route.js), and expected impact. ` +
  `Favor moves that exploit our FREE + Builder advantage. Order by impact/effort.`,
  { schema: SCHEMA, model: 'haiku', label: 'plan' }
)

return { mode: REFRESH ? 'refreshed (web)' : 'cached intel (lean)', plan: result.plan }
