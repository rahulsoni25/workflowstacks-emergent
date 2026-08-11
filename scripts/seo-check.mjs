// Deep, scored SEO / AEO / GEO audit. Deterministic — no AI, runs in CI.
//
// Replaces the earlier shallow pass (14 binary checks against one skill page).
// This version samples every page TYPE, scores each area 0-10, and detects the
// three defect classes that silently kill a catalog site: dead pages,
// duplicate titles/descriptions, and missing structured data.
//
// Exit code: non-zero if the overall score drops below PASS_SCORE or any
// high-severity check fails, so the GitHub Action can flag it.

const BASE = process.env.BASE_URL || 'https://workflowstacks.com'
const PASS_SCORE = Number(process.env.SEO_PASS_SCORE || 9)
const SAMPLE = Number(process.env.SEO_SAMPLE || 40)

const checks = []
const add = (area, name, ok, sev, detail = '') => checks.push({ area, name, ok, sev, detail })

async function get(path) {
  try {
    const r = await fetch(path.startsWith('http') ? path : `${BASE}${path}`, {
      headers: { 'User-Agent': 'WorkflowStacks-SEO-Audit' },
      redirect: 'follow',
    })
    return { status: r.status, body: r.ok ? await r.text() : '' }
  } catch {
    return { status: 0, body: '' }
  }
}

const titleOf = (h) => (/<title>([^<]*)<\/title>/i.exec(h) || [])[1]?.trim() || ''
const descOf = (h) =>
  (/<meta name="description" content="([^"]*)"/i.exec(h) || [])[1]?.trim() || ''
const schemaTypes = (h) => [...new Set((h.match(/"@type":"([A-Za-z]+)"/g) || []))]

// ---------- Foundations ----------
const robots = (await get('/robots.txt')).body
add('SEO', 'robots.txt present', !!robots, 'high')
add('SEO', 'robots points to sitemap', /sitemap:/i.test(robots), 'high')
add('GEO', 'robots welcomes AI crawlers', /GPTBot|ClaudeBot|PerplexityBot/i.test(robots), 'medium')

const sitemap = (await get('/sitemap.xml')).body
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
add('SEO', 'sitemap.xml valid', /<urlset/i.test(sitemap), 'high')
add('SEO', `sitemap has URLs (${urls.length})`, urls.length > 20, 'high', `${urls.length} urls`)
// A sitemap that balloons again means the quality gate regressed or was bypassed.
add('SEO', 'sitemap stays focused (<600 urls)', urls.length > 0 && urls.length < 600, 'medium',
  `${urls.length} urls — catalog pages should be quality-gated, not bulk-listed`)

const llms = (await get('/llms.txt')).body
add('GEO', 'llms.txt present', llms.length > 100, 'medium')
add('GEO', 'llms.txt lists templates', /\/templates\//.test(llms), 'medium')
add('GEO', 'llms.txt lists pricing', /\/pricing/.test(llms), 'low')

// ---------- Sample every page type ----------
const byType = (p) => {
  const path = p.replace(/^https?:\/\/[^/]+/, '')
  if (path.startsWith('/templates/')) return 'template'
  if (path.startsWith('/automate/')) return 'outcome'
  if (path.startsWith('/bundles/')) return 'bundle'
  if (path.startsWith('/mcp/')) return 'mcp'
  if (path.startsWith('/skills/')) return 'skill'
  return 'core'
}
const buckets = {}
for (const u of urls) (buckets[byType(u)] ||= []).push(u)

// Take a spread across types rather than the first N (which would be all core).
const sample = []
const perType = Math.max(3, Math.floor(SAMPLE / Math.max(1, Object.keys(buckets).length)))
for (const [, list] of Object.entries(buckets)) sample.push(...list.slice(0, perType))

const pages = []
for (const u of sample.slice(0, SAMPLE)) {
  const { status, body } = await get(u)
  pages.push({ url: u, type: byType(u), status, title: titleOf(body), desc: descOf(body), types: schemaTypes(body), body })
}

// ---------- Dead pages ----------
const dead = pages.filter((p) => p.status === 0 || p.status >= 400)
add('SEO', 'no dead pages in sitemap', dead.length === 0, 'high',
  dead.length ? dead.slice(0, 5).map((d) => `${d.status} ${d.url}`).join(', ') : `${pages.length} sampled`)

const live = pages.filter((p) => p.status === 200)

// ---------- Titles & descriptions ----------
const missingTitle = live.filter((p) => p.title.length < 15)
const longTitle = live.filter((p) => p.title.length > 65)
const missingDesc = live.filter((p) => p.desc.length < 50)
const longDesc = live.filter((p) => p.desc.length > 165)
add('SEO', 'all sampled pages have a usable <title>', missingTitle.length === 0, 'high', `${missingTitle.length} short/missing`)
add('SEO', 'titles fit the SERP (<=65)', longTitle.length === 0, 'medium', `${longTitle.length} too long`)
add('SEO', 'all sampled pages have a meta description', missingDesc.length === 0, 'high', `${missingDesc.length} short/missing`)
add('SEO', 'descriptions fit the SERP (<=165)', longDesc.length === 0, 'medium', `${longDesc.length} too long`)

// ---------- Duplicates ----------
const dupeOf = (arr, key) => {
  const seen = new Map()
  for (const p of arr) {
    const v = (p[key] || '').toLowerCase().trim()
    if (!v) continue
    seen.set(v, (seen.get(v) || 0) + 1)
  }
  return [...seen.entries()].filter(([, n]) => n > 1)
}
const dupTitles = dupeOf(live, 'title')
const dupDescs = dupeOf(live, 'desc')
add('SEO', 'no duplicate titles', dupTitles.length === 0, 'high',
  dupTitles.length ? dupTitles.slice(0, 3).map(([t, n]) => `"${t.slice(0, 45)}" x${n}`).join('; ') : '')
add('SEO', 'no duplicate descriptions', dupDescs.length === 0, 'medium',
  dupDescs.length ? `${dupDescs.length} repeated` : '')

// ---------- Canonicals ----------
const noCanonical = live.filter((p) => !/rel="canonical"/i.test(p.body))
add('SEO', 'every page declares a canonical', noCanonical.length === 0, 'medium', `${noCanonical.length} missing`)

// ---------- Structured data by type ----------
const typeHas = (t, schema) => {
  const list = live.filter((p) => p.type === t)
  if (!list.length) return null
  return list.every((p) => p.types.some((x) => x.includes(schema)))
}
const schemaExpectations = [
  ['template', 'SoftwareApplication', 'medium'],
  ['template', 'BreadcrumbList', 'low'],
  ['bundle', 'Product', 'medium'],
  ['bundle', 'BreadcrumbList', 'low'],
  ['mcp', 'SoftwareApplication', 'medium'],
  ['mcp', 'BreadcrumbList', 'low'],
]
for (const [t, schema, sev] of schemaExpectations) {
  const res = typeHas(t, schema)
  if (res !== null) add('AEO', `${t} pages carry ${schema}`, res, sev)
}
const home = live.find((p) => p.type === 'core') || pages[0]
if (home) {
  add('SEO', 'home OG tags', /property="og:title"/i.test(home.body), 'medium')
  add('GEO', 'Organization schema sitewide', home.types.some((t) => t.includes('Organization')), 'medium')
}

// ---------- AEO: answer-first content ----------
// Answer engines lift self-contained opening paragraphs. A page whose first
// visible text is navigation chrome rarely gets quoted.
const outcomePages = live.filter((p) => p.type === 'outcome')
if (outcomePages.length) {
  const withH1 = outcomePages.filter((p) => /<h1[\s>]/i.test(p.body))
  add('AEO', 'outcome pages have an H1', withH1.length === outcomePages.length, 'medium',
    `${withH1.length}/${outcomePages.length}`)
}

// ---------- Score ----------
const WEIGHT = { high: 3, medium: 2, low: 1 }
const areas = ['SEO', 'AEO', 'GEO']
const areaScore = {}
for (const a of areas) {
  const list = checks.filter((c) => c.area === a)
  if (!list.length) continue
  const max = list.reduce((s, c) => s + WEIGHT[c.sev], 0)
  const got = list.reduce((s, c) => s + (c.ok ? WEIGHT[c.sev] : 0), 0)
  areaScore[a] = max ? Number(((got / max) * 10).toFixed(1)) : 10
}
const allMax = checks.reduce((s, c) => s + WEIGHT[c.sev], 0)
const allGot = checks.reduce((s, c) => s + (c.ok ? WEIGHT[c.sev] : 0), 0)
const overall = allMax ? Number(((allGot / allMax) * 10).toFixed(1)) : 0

const fails = checks.filter((c) => !c.ok)
const highFails = fails.filter((c) => c.sev === 'high')

const out = [
  '# SEO / AEO / GEO audit\n',
  `Site: ${BASE} · sampled ${pages.length} pages across ${Object.keys(buckets).length} types\n`,
  `## Score: **${overall}/10** (pass mark ${PASS_SCORE})`,
  areas.filter((a) => areaScore[a] !== undefined).map((a) => `- ${a}: **${areaScore[a]}/10**`).join('\n'),
  '\n## Checks\n',
  ...checks.map((c) => `- ${c.ok ? '✅' : '❌'} [${c.area}] ${c.name}${c.detail ? ` — ${c.detail}` : ''}${c.ok ? '' : ` **(${c.sev})**`}`),
  `\n**${checks.length - fails.length}/${checks.length} passing** · ${highFails.length} high-severity failure(s).`,
].join('\n')

console.log(out)

if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import('node:fs')
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, out + '\n')
}
if (process.env.GITHUB_ACTIONS) {
  // GITHUB_STEP_SUMMARY is a fresh file per step, so a later step (the
  // issue-creation step) can't read what this step wrote to it. Persist the
  // report to a plain workspace file instead, which IS shared across steps.
  const { writeFileSync } = await import('node:fs')
  writeFileSync('seo-report.md', out + '\n')
}
if (process.env.GITHUB_OUTPUT) {
  const { appendFileSync } = await import('node:fs')
  appendFileSync(process.env.GITHUB_OUTPUT, `score=${overall}\nhigh_failures=${highFails.length}\n`)
}

if (highFails.length > 0 || overall < PASS_SCORE) {
  console.error(`\nFAIL — score ${overall}/10 (need ${PASS_SCORE}), ${highFails.length} high-severity issue(s).`)
  process.exit(1)
}
