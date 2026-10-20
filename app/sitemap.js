import { TEMPLATES } from '../lib/templates'
import { TYPE_CATEGORIES, FOR_CATEGORIES } from '../lib/skill-display'
import { BUNDLES } from '../lib/bundles'
import { OUTCOMES } from '../lib/outcomes'
import { MCP_SERVERS } from '../lib/mcp-servers'
import { KITS } from '../lib/kits'
import { SLASH_COMMANDS } from '../lib/commands'
import { passesSkillGate, skillPriority, SKILL_GATE_PROJECTION, SKILL_GATE_QUERY, skillLastModified } from '@/lib/skill-gate'
import { SITE_URL as BASE } from '@/lib/site-url'

// --- Why this file gates skill pages -----------------------------------
// Google Search Console (2026-07-29) reported 1,450 URLs "Discovered –
// currently not indexed" and 45 "Crawled – currently not indexed". Google
// sampled 45 skill pages, indexed none, then stopped crawling the rest. By
// 2026-09-28 it was 549 crawled-not-indexed, 504 discovered-not-indexed and
// 0 indexed out of 674 submitted.
//
// Skill pages are largely derived from third-party GitHub READMEs. At 96% of
// the URLs they consume nearly all crawl budget on a domain with little
// authority, starving the pages that are original work (templates, /automate
// outcome pages, MCP configs). Google's scaled-content-abuse policy judges
// usefulness, not production method, so volume alone is a liability here.
//
// The gate (lib/skill-gate.js) submits only skill pages carrying our OWN
// substantive content (a real use_guide) and high rewrite quality. The same
// gate decides which skill pages carry noindex (app/skills/[id]/page.js), so
// the sitemap and the indexable set are one list. Pages outside it stay live
// and linked. The old 1,000-star floor is gone: Search Console shows the
// pages that actually get indexed and shown are the small, specifically named
// tools, not the famous ones (see lib/skill-gate.js for the list).
//
// --- lastmod ------------------------------------------------------------
// Every entry used to carry lastModified = now, regenerated daily, so the
// sitemap told Google that 150 static pages changed every day. Google only
// trusts <lastmod> when it is consistently accurate and otherwise ignores it,
// which also hid the one change that mattered: a rewrite of a catalog page's
// copy. Now a date is given only where one is known (skill rewrite date, blog
// publish/update date, newsletter send date) and omitted everywhere else.

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
  const now = new Date()
  const staticEntries = STATIC_ROUTES.map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: path === '' || path === '/skills' || path === '/hot' ? 'daily' : path === '/submit' ? 'monthly' : 'weekly',
    priority: priorityFor(path),
  }))

  // Dynamic per-skill detail pages (published only), filtered by the gate.
  // Read Mongo directly (as the blog and collections below already do) with
  // a projection of only the fields the gate reads. The previous version
  // made two self-fetches of /api/skills?limit=2000 with 15 s timeouts; on
  // the cold render after each weekly deploy that was slow enough to time
  // out and silently publish a sitemap with zero skill URLs, and slow enough
  // for a crawler's fetch of /sitemap.xml to give up.
  let skillEntries = []
  try {
    const { getDb } = await import('@/lib/mongo')
    const db = await getDb()
    const docs = await db.collection('skills')
      .find(SKILL_GATE_QUERY, { projection: SKILL_GATE_PROJECTION })
      .limit(3000)
      .toArray()
    skillEntries = docs.filter(passesSkillGate).map((s) => {
      const entry = { url: `${BASE}/skills/${s.slug}`, changeFrequency: 'monthly', priority: skillPriority(s) }
      const lastModified = skillLastModified(s)
      if (lastModified) entry.lastModified = lastModified
      return entry
    })
  } catch (e) {
    // Sitemap still valid with just static routes if Mongo is unreachable —
    // but say so. This used to fail silently, which is indistinguishable in
    // production from "no skill passes the gate": a sitemap with zero skill
    // URLs and nothing in the logs. The fallback leaves a trace in Vercel
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
      // `updated_at` is what the store projects (refreshed_at never was, so
      // every post reported its publish date even after an edit).
      lastModified: new Date(p.updated_at || p.published_at),
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

  // Crawlable catalog pagination (/skills/page/N). These are the link path
  // to every published skill regardless of the gate above; listing them here
  // just tells Google the chain exists. Count comes from the API's `total`.
  let pageEntries = []
  try {
    const res = await fetch(`${BASE}/api/skills?limit=1`, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(10_000) })
    if (res.ok) {
      const total = (await res.json()).total || 0
      const pages = Math.ceil(total / 48)
      pageEntries = Array.from({ length: Math.max(0, pages - 1) }, (_, i) => ({
        url: `${BASE}/skills/page/${i + 2}`,
        changeFrequency: 'weekly',
        priority: 0.4,
      }))
    }
  } catch (e) {
    console.error('[sitemap] catalog page entries unavailable:', e?.message || e)
  }

  // Archived Monday issues (/newsletter/<date>). Each one is a dated page of
  // ranked skills — they rank for the skill names they carry.
  let issueEntries = []
  try {
    const res = await fetch(`${BASE}/api/newsletter/issues`, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(10_000) })
    if (res.ok) {
      const issues = (await res.json()).issues || []
      issueEntries = issues.map((it) => ({
        url: `${BASE}/newsletter/${it.issue}`,
        lastModified: it.sent_at ? new Date(it.sent_at) : now,
        changeFrequency: 'monthly',
        priority: 0.6,
      }))
    }
  } catch (e) {
    console.error('[sitemap] newsletter issue entries unavailable:', e?.message || e)
  }

  return [...staticEntries, ...blogEntries, ...collectionEntries, ...issueEntries, ...pageEntries, ...skillEntries]
}
