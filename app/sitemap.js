import { TEMPLATES } from '../lib/templates'
import { BUNDLES } from '../lib/bundles'
import { OUTCOMES } from '../lib/outcomes'
import { MCP_SERVERS } from '../lib/mcp-servers'
import { KITS } from '../lib/kits'
import { SLASH_COMMANDS } from '../lib/commands'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks.com'

// --- Why this file gates skill pages -----------------------------------
// Google Search Console (2026-07-29) reported 1,450 URLs "Discovered –
// currently not indexed" and 45 "Crawled – currently not indexed". Google
// sampled 45 skill pages, indexed none, then stopped crawling the rest.
//
// Skill pages are largely derived from third-party GitHub READMEs. At 1,749
// of 1,827 sitemap URLs (96%) they consume nearly all crawl budget on a
// domain with little authority, starving the pages that are original work
// (templates, /automate outcome pages, MCP configs) — the ones that can
// actually rank. Google's scaled-content-abuse policy judges usefulness, not
// production method, so volume alone is a liability here.
//
// The gate below submits only skill pages carrying our OWN substantive
// content (a real use_guide), top rewrite quality, and enough upstream
// notability to have genuine search demand.
//
// IMPORTANT: this narrows the sitemap only. Every skill page stays live,
// internally linked, and indexable — removing a URL from a sitemap is a
// discovery hint, not a deindex request. Already-indexed pages keep their
// index status. Raise these thresholds' generosity as domain authority grows.
const SKILL_SITEMAP_GATE = {
  minRewriteScore: 9, // top tier; publish gate is 8, so 9 = best ~22% (351/1578)
  minStars: 1000, // upstream notability => real query volume for the tool name
  minGuideRichness: 600, // chars of OUR written guidance; ~1/3 of the catalog falls below this
}

// use_guide is an OBJECT ({whatItDoes, whenToUse[], install, quickStart,
// examplePrompt, gotcha}), not a string. `install` is deliberately excluded —
// it's generic boilerplate ("git clone ...") on most entries, so counting it
// would inflate thin pages. The remaining fields are what we actually wrote.
function guideRichness(g) {
  if (!g || typeof g !== 'object') return 0
  const text = [g.whatItDoes, g.quickStart, g.examplePrompt, g.gotcha]
    .filter((x) => typeof x === 'string')
    .join(' ')
  const whenToUse = Array.isArray(g.whenToUse) ? g.whenToUse.join(' ') : ''
  return text.length + whenToUse.length
}

function passesSkillGate(s) {
  const score = typeof s.rewrite_score === 'number' ? s.rewrite_score : 0
  const stars = typeof s.github_stars === 'number' ? s.github_stars : 0
  return (
    !s.dead_repo &&
    score >= SKILL_SITEMAP_GATE.minRewriteScore &&
    stars >= SKILL_SITEMAP_GATE.minStars &&
    guideRichness(s.use_guide) >= SKILL_SITEMAP_GATE.minGuideRichness
  )
}

// Static, indexable routes
const STATIC_ROUTES = [
  '', '/skills', '/discover', '/problems', '/deals', '/partner', '/members', '/join', '/community', '/packs', '/playbooks', '/personas', '/builder', '/upload', '/build-for-me',
  '/templates',
  ...Object.keys(TEMPLATES).map((slug) => `/templates/${slug}`),
  '/tools',
  ...Object.keys(BUNDLES).map((slug) => `/bundles/${slug}`),
  ...Object.keys(OUTCOMES).map((slug) => `/automate/${slug}`),
  '/kits',
  ...Object.keys(KITS).map((slug) => `/kits/${slug}`),
  '/mcp',
  ...Object.keys(MCP_SERVERS).map((slug) => `/mcp/${slug}`),
  '/commands',
  ...Object.keys(SLASH_COMMANDS).map((slug) => `/commands/${slug}`),
  '/learn', '/learn/how-it-works', '/learn/agents', '/learn/skills',
  '/learn/mcp', '/learn/creators', '/learn/security', '/learn/resources',
  '/about', '/docs', '/help', '/enterprise', '/founder-launch', '/pricing',
  '/privacy', '/terms',
  '/submit',
]

// Priority tells Google which of OUR pages matter most relative to each
// other. Original work (templates, outcome pages, MCP configs, paid tools)
// outranks catalog pages — the reverse of the previous ordering, which gave
// derivative skill pages a higher priority than hand-built templates.
function priorityFor(path) {
  if (path === '') return 1
  if (path.startsWith('/templates') || path.startsWith('/automate')) return 0.9
  if (path.startsWith('/tools') || path.startsWith('/bundles') || path.startsWith('/mcp') || path.startsWith('/kits') || path.startsWith('/commands')) return 0.8
  if (path === '/skills' || path === '/pricing' || path.startsWith('/learn')) return 0.7
  return 0.5
}

export const revalidate = 86400 // refresh sitemap daily

export default async function sitemap() {
  const now = new Date()
  const staticEntries = STATIC_ROUTES.map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: path === '' || path === '/skills' ? 'daily' : path === '/submit' ? 'monthly' : 'weekly',
    priority: priorityFor(path),
  }))

  // Dynamic per-skill detail pages (published only), filtered by the quality
  // gate above. Tools and learning resources are fetched separately —
  // /api/skills returns tools only; resource pages stay live either way.
  //
  // AbortSignal.timeout guards against the catalog query being slow/hung —
  // without it, an unresponsive API hangs this fetch forever (fetch has no
  // implicit timeout), which stalls Next's static export for EVERY page in
  // the build, not just this one. Better to fail fast into the existing
  // static-routes-only fallback below than block the whole deploy.
  let skillEntries = []
  try {
    // Pre-filter server-side to (roughly) the gate's score/star thresholds —
    // fetching the full catalog (2,000+ docs) just to keep the ~300 that
    // pass was slow enough to blow the timeout below and silently fall back
    // to static-only. guideRichness still needs a JS check (it reads a
    // structured sub-object the DB filter can't easily express), so this is
    // a coarse pre-filter, not a full replacement of passesSkillGate.
    const gateParams = `minScore=${SKILL_SITEMAP_GATE.minRewriteScore}&minStars=${SKILL_SITEMAP_GATE.minStars}`
    const [toolsRes, resourcesRes] = await Promise.all([
      fetch(`${BASE}/api/skills?${gateParams}&limit=2000`, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(15_000) }),
      fetch(`${BASE}/api/skills?type=resource&${gateParams}&limit=2000`, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(15_000) }),
    ])
    const docs = []
    if (toolsRes.ok) docs.push(...((await toolsRes.json()).skills || []))
    if (resourcesRes.ok) docs.push(...((await resourcesRes.json()).skills || []))
    skillEntries = docs.filter(passesSkillGate).map((s) => ({
      url: `${BASE}/skills/${s.slug || s.id}`,
      lastModified: s.last_updated ? new Date(s.last_updated) : now,
      changeFrequency: 'weekly',
      priority: 0.5,
    }))
  } catch (e) {
    // Sitemap still valid with just static routes if the API is unreachable
  }

  return [...staticEntries, ...skillEntries]
}
