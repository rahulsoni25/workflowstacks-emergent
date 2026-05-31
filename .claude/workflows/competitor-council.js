export const meta = {
  name: 'competitor-council',
  description: 'Agents research competitors, identify what each does best, an adversary critiques feasibility, and they synthesize a prioritized deploy plan',
  phases: [
    { title: 'Research', detail: 'one agent per competitor' },
    { title: 'Synthesize', detail: 'lead strategist finds top opportunities' },
    { title: 'Critique', detail: 'adversary checks feasibility & differentiation' },
    { title: 'Plan', detail: 'prioritized deploy plan' },
  ],
}

const COMPETITORS = [
  { name: 'Claw Mart', url: 'https://www.shopclawmart.com', note: 'DIRECT OpenClaw rival — sells personas/skills/playbooks with deep, itemized listings; 90% creator share' },
  { name: 'Agensi', url: 'https://www.agensi.io', note: 'security-reviewed skills + MCP marketplace; 8-point scan; 80/20' },
  { name: 'Smithery', url: 'https://smithery.ai', note: 'largest MCP server hub; 1-click install/config; hosting' },
  { name: 'PromptBase', url: 'https://promptbase.com', note: 'prompts + agent-skill marketplace; direct-sell 0% fee' },
]

const FIND_SCHEMA = {
  type: 'object',
  properties: {
    competitor: { type: 'string' },
    bestThings: { type: 'array', items: { type: 'string' }, description: 'what they do best' },
    listingDepth: { type: 'string', description: 'how deep/structured their listings are' },
    trustModel: { type: 'string' },
    monetization: { type: 'string' },
    oneThingToSteal: { type: 'string', description: 'single highest-impact thing WorkflowStacks should copy or beat' },
  },
  required: ['competitor', 'bestThings', 'oneThingToSteal'],
}

phase('Research')
const findings = (await parallel(COMPETITORS.map((c) => () =>
  agent(
    `Research the AI-marketplace competitor "${c.name}" (${c.url} — ${c.note}). ` +
    `Use WebSearch and WebFetch on their site. Identify what they do BEST: listing depth/structure, ` +
    `trust signals, how they present and sell, pricing/monetization, and the SINGLE highest-impact thing ` +
    `WorkflowStacks (a FREE marketplace of real open-source AI skills with an agent builder) should copy or beat. Be specific and concrete.`,
    { schema: FIND_SCHEMA, label: `research:${c.name}`, phase: 'Research' }
  )
))).filter(Boolean)

phase('Synthesize')
const synthesis = await agent(
  `You are the lead strategist. Competitor findings: ${JSON.stringify(findings)}.\n` +
  `WorkflowStacks is a FREE marketplace of real, trending open-source AI skills, with an agent builder, ` +
  `a quality/published gate, real GitHub trust signals, and an auto-refresh pipeline. ` +
  `Identify the TOP 5 opportunities to make WorkflowStacks MORE valuable than these competitors. ` +
  `Each opportunity: the competitor insight it's based on, and how our free + builder model BEATS them (not me-too).`,
  { schema: { type: 'object', properties: { opportunities: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, basedOn: { type: 'string' }, howWeBeatThem: { type: 'string' }, impact: { type: 'string' } }, required: ['title', 'howWeBeatThem'] } } }, required: ['opportunities'] }, phase: 'Synthesize' }
)

phase('Critique')
const critique = await agent(
  `Adversarially critique these opportunities for WorkflowStacks: ${JSON.stringify(synthesis.opportunities)}.\n` +
  `For each: is it feasible WITHOUT paid infra or huge effort? Is it genuinely differentiated (not me-too)? What's the risk? ` +
  `Flag weak ones. Then give the recommended implementation order (by impact/effort).`,
  { schema: { type: 'object', properties: { verdicts: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, feasible: { type: 'boolean' }, differentiated: { type: 'boolean' }, note: { type: 'string' } } } }, recommendedOrder: { type: 'array', items: { type: 'string' } } }, required: ['verdicts', 'recommendedOrder'] }, phase: 'Critique' }
)

phase('Plan')
const plan = await agent(
  `Produce a prioritized, concrete deploy plan for WorkflowStacks from the opportunities ${JSON.stringify(synthesis.opportunities)} ` +
  `and the critique ${JSON.stringify(critique)}. Only include feasible, differentiated items. ` +
  `For each: what to build, which pages/files (the app is Next.js — app/ dir, MongoDB API at app/api/[[...path]]/route.js), and expected ranking impact. Order by impact/effort.`,
  { schema: { type: 'object', properties: { plan: { type: 'array', items: { type: 'object', properties: { rank: { type: 'number' }, item: { type: 'string' }, build: { type: 'string' }, where: { type: 'string' }, impact: { type: 'string' } }, required: ['rank', 'item', 'build'] } } }, required: ['plan'] }, phase: 'Plan' }
)

return { findings, opportunities: synthesis.opportunities, critique, plan: plan.plan }
