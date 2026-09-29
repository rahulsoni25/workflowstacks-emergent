import { TEMPLATES } from '../lib/templates'
import { TYPE_CATEGORIES, FOR_CATEGORIES } from '../lib/skill-display'
import { BUNDLES } from '../lib/bundles'
import { OUTCOMES } from '../lib/outcomes'
import { MCP_SERVERS } from '../lib/mcp-servers'
import { KITS } from '../lib/kits'
import { SLASH_COMMANDS } from '../lib/commands'
import { SKILL_INDEX_GATE, passesSkillIndexGate } from '../lib/skill-index-gate'
import { SITE_URL as BASE } from '@/lib/site-url'

// Skill pages are gated: only those passing lib/skill-index-gate.js are
// submitted here, and the same rule marks every other skill page noindex.
// The reasoning and the threshold history live in that file.

// Static, indexable routes
const STATIC_ROUTES = [
  '', '/skills', '/discover', '/problems', '/deals', '/partner', '/members', '/join', '/community', '/packs', '/playbooks', '/personas', '/builder', '/upload', '/build-for-me',
  '/templates',
  ...Object.keys(TEMPLATES).map((slug) => `/templates/${slug}`),
  '/tools',
  ...Object.keys(BUNDLES).map((slug) => `/bundles/${slug}`),
  '/collections',
  '/automate',
  ...Object.keys(OUTCOMES).map((slug) => `/automate/${slug}`),
  '/kits',
  ...Object.keys(KITS).map((slug) => `/kits/${slug}`),
  '/mcp',
  ...Object.keys(MCP_SERVERS).map((slug) => `/mcp/${slug}`),
  '/commands',
  ...Object.keys(SLASH_COMMANDS).map((slug) => `/commands/${slug}`),
  '/blog',
  // Growth surfaces: the public Hot list, the digest archive, and one
  // "best of" roundup per catalog category (each links 20+ skill pages).
  '/hot', '/newsletter', '/best', '/creators',
  ...[...TYPE_CATEGORIES, ...FOR_CATEGORIES].map(([slug]) => `/best/${slug}`),
  '/learn', '/learn/how-it-works', '/learn/agents', '/learn/skills',
  '/learn/mcp', '/learn/creators', '/learn/security', '/learn/resources',
  '/about', '/docs', '/help', '/enterprise', '/founder-launch', '/pricing',
  '/privacy', '/terms',
  '/submit',
  // Standalone landing pages served from public/sites/ (see LANDING_PAGES in
  // next.config.js). Original, hand-built pages, so they rank with templates.
  '/ai-avatar',
]

// Priority tells Google which of OUR pages matter most relative to each
// other. Original work (templates, outcome pages, MCP configs, paid tools)
// outranks catalog pages — the reverse of the previous ordering, which gave
// derivative skill pages a higher priority than hand-built templates.
function priorityFor(path) {
  if (path === '') return 1
  if (path.startsWith('/templates') || path.startsWith('/automate') || path === '/blog' || path === '/hot' || path === '/ai-avatar') return 0.9
  if (path.startsWith('/best') || path === '/newsletter') return 0.8
  if (path.startsWith('/tools') || path.startsWith('/bundles') || path.startsWith('/mcp') || path.startsWith('/kits') || path.startsWith('/commands')) return 0.8
  if (path === '/skills' || path === '/pricing' || path.startsWith('/learn')) return 0.7
  return 0.5
}

export const revalidate = 86400 // refresh sitemap daily

export default async function sitemap() {
  // No lastModified on hand-built routes: we have no per-page edit date, and
  // stamping every one with "now" on each daily regeneration told Google all
  // of them changed every day. Google ignores lastmod on a site where it
  // is consistently wrong, which also discounts the real dates below (blog,
  // newsletter, skills). Omitted is honest; "now" was not.
  const staticEntries = STATIC_ROUTES.map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: path === '' || path === '/skills' || path === '/hot' ? 'daily' : path === '/submit' ? 'monthly' : 'weekly',
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
    // a coarse pre-filter, not a full replacement of passesSkillIndexGate.
    const gateParams = `minScore=${SKILL_INDEX_GATE.minRewriteScore}&minStars=${SKILL_INDEX_GATE.minStars}`
    const [toolsRes, resourcesRes] = await Promise.all([
      fetch(`${BASE}/api/skills?${gateParams}&limit=2000`, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(15_000) }),
      fetch(`${BASE}/api/skills?type=resource&${gateParams}&limit=2000`, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(15_000) }),
    ])
    const docs = []
    if (toolsRes.ok) docs.push(...((await toolsRes.json()).skills || []))
    if (resourcesRes.ok) docs.push(...((await resourcesRes.json()).skills || []))
    skillEntries = docs.filter(passesSkillIndexGate).map((s) => ({
      url: `${BASE}/skills/${s.slug || s.id}`,
      lastModified: s.last_updated ? new Date(s.last_updated) : undefined,
      changeFrequency: 'weekly',
      priority: 0.5,
    }))
  } catch (e) {
    // Sitemap still valid with just static routes if the API is unreachable —
    // but say so. This used to fail silently, which is indistinguishable in
    // production from "no skill passes the gate": a sitemap with zero skill
    // URLs and nothing in the logs. Now a fallback leaves a trace in Vercel
    // function logs so it can be noticed and diagnosed.
    console.error('[sitemap] skill entries unavailable, falling back to static routes only:', e?.message || e)
  }

  // Published blog posts — original content, priority just under templates.
  let blogEntries = []
  try {
    const { allPublishedForSitemap } = await import('@/lib/blog/store')
    const posts = await allPublishedForSitemap()
    blogEntries = posts.map((p) => ({
      url: `${BASE}/blog/${p.slug}`,
      lastModified: p.refreshed_at ? new Date(p.refreshed_at) : new Date(p.published_at),
      changeFrequency: 'weekly',
      priority: 0.85,
    }))
  } catch (e) {
    // Sitemap still valid without blog entries if Mongo is unreachable.
  }

  // Curated collections. Hand-built groupings of catalog skills, so they rank
  // above a bare catalog page and below our own written work. They were absent
  // from the sitemap entirely — only the three section indexes were listed,
  // never the twelve items under them.
  let collectionEntries = []
  try {
    const { allCollectionItems } = await import('@/lib/collections')
    const items = await allCollectionItems()
    collectionEntries = items
      .filter((i) => i.slug)
      .map((i) => ({
        url: `${BASE}/${i.kind}/${i.slug}`,
        changeFrequency: 'monthly',
        priority: 0.7,
      }))
  } catch (e) {
    console.error('[sitemap] collection entries unavailable:', e?.message || e)
  }

  // Catalog pagination (/skills/page/N) is deliberately NOT listed. Those
  // pages stay live and linked from /skills, so the crawl path to every skill
  // is intact, but they are lists of mostly-noindex entries — submitting 49
  // of them told Google they were among our best URLs.

  // Archived Monday issues (/newsletter/<date>). Each one is a dated page of
  // ranked skills — they rank for the skill names they carry.
  let issueEntries = []
  try {
    const res = await fetch(`${BASE}/api/newsletter/issues`, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(10_000) })
    if (res.ok) {
      const issues = (await res.json()).issues || []
      issueEntries = issues.map((it) => ({
        url: `${BASE}/newsletter/${it.issue}`,
        lastModified: it.sent_at ? new Date(it.sent_at) : undefined,
        changeFrequency: 'monthly',
        priority: 0.6,
      }))
    }
  } catch (e) {
    console.error('[sitemap] newsletter issue entries unavailable:', e?.message || e)
  }

  return [...staticEntries, ...blogEntries, ...collectionEntries, ...issueEntries, ...skillEntries]
}
