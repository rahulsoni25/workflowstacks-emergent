// Weekly structural crawl of the live site. Deterministic, no dependencies.
//
// Produces one JSON document describing what a crawler would see this week:
// link graph (depth, inbound counts, orphans), broken internal links, UUID
// URLs, structured data per page type, sitemap composition, llms.txt ordering,
// and — when ADMIN_SECRET is present — Search Console URL-inspection verdicts
// for one URL per page type. scripts/seo-weekly-report.mjs turns this plus the
// Search Console pulls into the Monday report.
//
// Why a crawl and not just Search Console: the 15 Aug 2026 collapse (~97% of
// impressions) was caused by the catalog index losing every <a> to its own
// pages. Search Console showed the effect three weeks later; a crawl would
// have shown the cause the same day.
//
//   BASE_URL=https://workflowstacks.com ADMIN_SECRET=... node scripts/seo-crawl.mjs > crawl.json

const BASE = (process.env.BASE_URL || 'https://workflowstacks.com').replace(/\/$/, '')
const ADMIN = process.env.ADMIN_SECRET || ''
const MAX_PAGES = Number(process.env.CRAWL_MAX_PAGES || 400)
const CONC = 8
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
const SKIP = /^\/(api|admin|earnings|my-agents|oauth|unsubscribe|_next)(\/|$)/

const seen = new Map() // path -> depth
const inbound = new Map() // path -> Set(source)
const meta = new Map() // path -> {status,title,canonical,out}

function norm(h) {
  if (!h || h.startsWith('//') || h.startsWith('mailto:') || h.startsWith('tel:')) return null
  if (/^https?:\/\//i.test(h)) {
    try { const u = new URL(h); if (u.hostname !== new URL(BASE).hostname) return null; h = u.pathname } catch { return null }
  }
  if (!h.startsWith('/')) return null
  h = h.split('#')[0].split('?')[0]
  if (h.length > 1) h = h.replace(/\/$/, '')
  if (SKIP.test(h)) return null
  if (/\.(png|jpe?g|svg|ico|webp|xml|txt|json|zip|css|js|woff2?)$/i.test(h)) return null
  return h || '/'
}

async function fetchText(path, init = {}) {
  try {
    const r = await fetch(BASE + path, { redirect: 'manual', ...init, signal: AbortSignal.timeout(20_000) })
    return { status: r.status, text: r.status < 300 ? await r.text() : '', location: r.headers.get('location') || '' }
  } catch (e) {
    return { status: 0, text: '', error: e.message }
  }
}

function extract(html) {
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => norm(m[1])).filter(Boolean)
  const title = (/<title>([^<]*)<\/title>/.exec(html) || [])[1]?.trim() || ''
  const canonical = (/rel="canonical" href="([^"]+)"/.exec(html) || [])[1] || ''
  const types = [...new Set([...html.matchAll(/"@type":"([A-Za-z]+)"/g)].map((m) => m[1]))].sort()
  return { hrefs: [...new Set(hrefs)], title, canonical, types }
}

async function crawl() {
  const queue = [['/', 0]]
  seen.set('/', 0)
  while (queue.length && seen.size <= MAX_PAGES) {
    const batch = queue.splice(0, CONC)
    await Promise.all(batch.map(async ([p, d]) => {
      const r = await fetchText(p)
      const x = r.text ? extract(r.text) : { hrefs: [], title: '', canonical: '', types: [] }
      meta.set(p, { status: r.status, title: x.title, canonical: x.canonical, types: x.types, out: x.hrefs.length, location: r.location })
      for (const h of x.hrefs) {
        if (!inbound.has(h)) inbound.set(h, new Set())
        if (h !== p) inbound.get(h).add(p)
        if (!seen.has(h) && seen.size < MAX_PAGES) { seen.set(h, d + 1); queue.push([h, d + 1]) }
      }
    }))
  }
}

function section(p) { return '/' + p.replace(/^\//, '').split('/')[0] }

async function sitemapSummary() {
  const r = await fetchText('/sitemap.xml')
  const locs = [...r.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(BASE, ''))
  const by = {}
  for (const l of locs) by[section(l)] = (by[section(l)] || 0) + 1
  return { count: locs.length, uuid_urls: locs.filter((l) => UUID.test(l)).length, by_section: by, has_pagination: locs.filter((l) => l.startsWith('/skills/page/')).length }
}

async function llmsTop() {
  const r = await fetchText('/llms.txt')
  const m = [...r.text.matchAll(/\]\((https?:\/\/[^)]+\/skills\/([^)/]+))\)/g)].map((x) => x[2])
  return m.slice(0, 10)
}

// One URL per page type. Indexation differs by type far more than within one.
const INSPECT = ['/', '/skills', '/skills/page/2', '/templates/cold-email-personalizer', '/automate/triage-your-inbox', '/mcp/filesystem', '/bundles/lead-finder', '/blog/best-mcp-servers-claude-desktop', '/skills/ogcode', '/skills/browser-use', '/collections']

async function inspectAll() {
  if (!ADMIN) return { skipped: 'no ADMIN_SECRET' }
  const out = {}
  for (const u of INSPECT) {
    try {
      const r = await fetch(`${BASE}/api/gsc?action=inspect&url=${encodeURIComponent(BASE + u)}`, { headers: { 'x-admin-secret': ADMIN }, signal: AbortSignal.timeout(30_000) })
      const j = await r.json()
      const idx = j.indexStatusResult || j.inspectionResult?.indexStatusResult || {}
      out[u] = j.error ? { error: j.error, message: j.message } : {
        verdict: idx.verdict || null,
        coverage: idx.coverageState || null,
        last_crawl: idx.lastCrawlTime || null,
        indexing_state: idx.indexingState || null,
        canonical_google: idx.googleCanonical || null,
        robots: idx.robotsTxtState || null,
      }
    } catch (e) { out[u] = { error: e.message } }
  }
  return out
}

async function main() {
  await crawl()
  const pages = [...seen.entries()].map(([u, d]) => ({ url: u, depth: d, inbound: (inbound.get(u) || new Set()).size, ...(meta.get(u) || {}) }))
  const depth = {}
  for (const p of pages) depth[p.depth] = (depth[p.depth] || 0) + 1
  const skillsHtml = (await fetchText('/skills')).text
  const skillAnchors = new Set([...skillsHtml.matchAll(/href="\/skills\/([^"/]+)"/g)].map((m) => m[1]).filter((s) => s !== 'page')).size
  const page2 = await fetchText('/skills/page/2')
  const schemaByType = {}
  for (const p of pages) {
    const s = section(p.url)
    if (!schemaByType[s] && p.types?.length) schemaByType[s] = { sample: p.url, types: p.types }
  }
  const [sitemap, llms, inspect] = await Promise.all([sitemapSummary(), llmsTop(), inspectAll()])

  const report = {
    generated_at: new Date().toISOString(),
    base: BASE,
    crawl: {
      pages_crawled: pages.length,
      depth_distribution: depth,
      max_depth: Math.max(...pages.map((p) => p.depth)),
      non_200_linked: pages.filter((p) => p.status && p.status !== 200).map((p) => ({ url: p.url, status: p.status, location: p.location || undefined, linked_from: [...(inbound.get(p.url) || [])].slice(0, 3) })),
      weak_inbound: pages.filter((p) => p.inbound <= 1 && p.status === 200 && p.url !== '/').map((p) => ({ url: p.url, inbound: p.inbound, depth: p.depth })),
      uuid_urls_linked: pages.filter((p) => UUID.test(p.url)).map((p) => p.url),
      sections: Object.entries(pages.reduce((a, p) => { const s = section(p.url); a[s] = (a[s] || 0) + 1; return a }, {})).sort((a, b) => b[1] - a[1]),
      skills_index_anchor_count: skillAnchors,
      skills_page2_status: page2.status,
      skills_page2_anchor_count: new Set([...page2.text.matchAll(/href="\/skills\/([^"/]+)"/g)].map((m) => m[1]).filter((s) => s !== 'page')).size,
      homepage_skill_links: [...(meta.get('/') ? [...(await fetchText('/')).text.matchAll(/href="\/skills\/([^"/]+)"/g)].map((m) => m[1]) : [])],
      schema_by_section: schemaByType,
    },
    sitemap,
    llms_top10: llms,
    inspect,
  }
  process.stdout.write(JSON.stringify(report, null, 2) + '\n')
}

main().catch((e) => { console.error(e); process.exit(1) })
