import { TEMPLATES } from '../lib/templates'
import { BUNDLES } from '../lib/bundles'
import { OUTCOMES } from '../lib/outcomes'
import { MCP_SERVERS } from '../lib/mcp-servers'
import { KITS } from '../lib/kits'
import { SLASH_COMMANDS } from '../lib/commands'
import { isAiRelevant, guideRichness } from '../lib/skill-relevance'
import { SITE_URL as BASE } from '@/lib/site-url'

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
// content (a real use_guide), high rewrite quality, and enough upstream
// notability to have genuine search demand.
//
// IMPORTANT: this narrows the sitemap only. Every skill page stays live,
// internally linked, and indexable — removing a URL from a sitemap is a
// discovery hint, not a deindex request. Already-indexed pages keep their
// index status.
//
// --- Why the score threshold moved 9 -> 8 (stage 1 of a staged widening) ---
// The original gate carried no topical relevance test, so `minRewriteScore: 9`
// and `minStars: 1000` were doing double duty: filtering for quality AND, by
// accident, for "is this even an AI tool". They filtered badly at the second
// job — /skills/linux, /skills/flutter and /skills/youtube-dl all cleared it.
//
// Relevance is now enforced explicitly by isAiRelevant(), which frees the
// score threshold to mean only what it says. Against the live catalog:
//
//   score>=9, stars>=1000, guide>=600  ->  143 pages   (previous behaviour)
//   score>=8, stars>=1000, guide>=600  ->  447 pages   (this commit)
//   score>=8, stars>=100,  guide>=600  ->  871 pages
//   score>=8, stars>=0,    guide>=600  ->  952 pages
//
// 8 is the publish gate, so every page in the 447 already cleared the quality
// bar we set for showing it to a human at all, carries 600+ chars of guidance
// we wrote, and describes a tool notable enough (1k+ stars) for its name to
// have real query volume. That is a defensible expansion.
//
// We deliberately do NOT jump to 871 or 952. Relaxing `minStars` is what
// reinstates the original failure — a sitemap dominated by pages for tools
// nobody searches for by name, on a domain with little authority. The next
// widening should be driven by Search Console coverage data for these 447,
// not by another guess. Search Console is not currently connected; connecting
// it is the prerequisite for stage 2.
const SKILL_SITEMAP_GATE = {
  minRewriteScore: 8, // == the publish gate; relevance is handled separately now
  minStars: 1000, // upstream notability => real query volume for the tool name
  minGuideRichness: 600, // chars of OUR written guidance; ~1/3 of the catalog falls below this
}

function passesSkillGate(s) {
  const score = typeof s.rewrite_score === 'number' ? s.rewrite_score : 0
  const stars = typeof s.github_stars === 'number' ? s.github_stars : 0
  return (
    !s.dead_repo &&
    // Topical relevance, judged from the upstream repo rather than our stored
    // `category` field — that field is unreliable enough to have filed the
    // Linux kernel, Flutter and yt-dlp as `ai-agent`, which is how those pages
    // ended up submitted to Google as top-tier assets. See lib/skill-relevance.
    isAiRelevant(s) &&
    // 495 of 2,215 catalog entries never got a slug, so `s.slug || s.id` below
    // yields /skills/<uuid> — a URL carrying no keyword signal, unreadable in
    // a SERP and unquotable by an answer engine. 37 were in the live sitemap.
    // They stay live and linked; they just stop being submitted until the slug
    // backfill reaches them.
    !!s.slug &&
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
  if (path.startsWith('/templates') || path.startsWith('/automate') || path === '/blog') return 0.9
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
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.7,
      }))
  } catch (e) {
    console.error('[sitemap] collection entries unavailable:', e?.message || e)
  }

  return [...staticEntries, ...blogEntries, ...collectionEntries, ...skillEntries]
}
