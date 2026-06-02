export const meta = {
  name: 'seo-hygiene',
  description: 'Weekly SEO/AEO/GEO hygiene audit — one Haiku agent checks the live site against best practice and returns concrete, file-level fixes',
  phases: [{ title: 'Audit', detail: 'single Haiku agent audits SEO/AEO/GEO + proposes fixes' }],
}

const BASE = (args && args.baseUrl) || 'https://workflowstacks-emergent.vercel.app'
const CB = (args && args.cacheBust) || 'seo'

const SCHEMA = {
  type: 'object',
  properties: {
    seo: { type: 'number', description: '0-10 technical SEO health' },
    aeo: { type: 'number', description: '0-10 answer-engine readiness (FAQ/schema/snippets)' },
    geo: { type: 'number', description: '0-10 generative-engine readiness (AI crawlers, llms.txt, quotable facts)' },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          area: { type: 'string', enum: ['seo', 'aeo', 'geo'] },
          issue: { type: 'string' },
          evidence: { type: 'string', description: 'what you actually checked/found' },
          fix: { type: 'string', description: 'concrete fix incl. file/route if known' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['area', 'issue', 'fix', 'severity'],
      },
    },
  },
  required: ['seo', 'aeo', 'geo', 'issues'],
}

const PROMPT =
  `You are the weekly SEO/AEO/GEO hygiene auditor for WorkflowStacks (${BASE}).\n` +
  `Be token-frugal — at most ~7 fetches. Check the LIVE site (append ?cb=${CB} to HTML pages):\n` +
  `- ${BASE}/robots.txt — does it allow crawling, welcome AI bots (GPTBot/ClaudeBot/PerplexityBot), and point to the sitemap?\n` +
  `- ${BASE}/sitemap.xml — present, valid, reasonable URL count, includes key pages?\n` +
  `- ${BASE}/llms.txt — present and descriptive (GEO)?\n` +
  `- ${BASE}/?cb=${CB} — <title>, meta description, canonical, OG/Twitter tags, and FAQPage JSON-LD present?\n` +
  `- one ${BASE}/skills/<id>?cb=${CB} (id from ${BASE}/api/skills?cb=${CB}) — unique title/description, SoftwareApplication + BreadcrumbList JSON-LD, og:image, a single <h1>?\n` +
  `- a section page like ${BASE}/deals?cb=${CB} — does it have its own title/description (not the homepage's)?\n\n` +
  `VERIFY before flagging — only report issues you actually confirmed in the fetched content (don't guess). ` +
  `Score seo/aeo/geo 0-10 vs best practice, and list concrete, file-level fixes (the app is Next.js: app/robots.js, app/sitemap.js, public/llms.txt, app/layout.js for global JSON-LD, app/<page>/layout.js for metadata). ` +
  `If everything is healthy, return an empty issues array.`

phase('Audit')
const r = await agent(PROMPT, { schema: SCHEMA, model: 'haiku', label: 'seo-audit' })

const overall = Number(((r.seo + r.aeo + r.geo) / 3).toFixed(2))
const high = (r.issues || []).filter((i) => i.severity === 'high')
log(`SEO ${r.seo} · AEO ${r.aeo} · GEO ${r.geo} (avg ${overall}); ${r.issues.length} issue(s), ${high.length} high`)

return {
  overall,
  scores: { seo: r.seo, aeo: r.aeo, geo: r.geo },
  highPriority: high,
  allIssues: r.issues,
}
