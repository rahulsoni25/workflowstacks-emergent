// Deterministic weekly SEO/AEO/GEO hygiene check. No AI needed — runs in CI.
// Exits non-zero if any HIGH-severity signal regresses, so the GitHub Action flags it.

const BASE = process.env.BASE_URL || 'https://workflowstacks-emergent.vercel.app'
const checks = []
const add = (area, name, ok, sev, detail = '') => checks.push({ area, name, ok, sev, detail })

async function text(path) {
  try {
    const r = await fetch(`${BASE}${path}`, { headers: { 'User-Agent': 'WorkflowStacks-SEO-Check' } })
    return r.ok ? await r.text() : ''
  } catch {
    return ''
  }
}

const robots = await text('/robots.txt')
add('SEO', 'robots.txt present', !!robots, 'high')
add('SEO', 'robots points to sitemap', /sitemap:/i.test(robots), 'high')
add('GEO', 'robots welcomes AI crawlers', /GPTBot|ClaudeBot|PerplexityBot/i.test(robots), 'medium')

const sitemap = await text('/sitemap.xml')
const urlCount = (sitemap.match(/<loc>/g) || []).length
add('SEO', 'sitemap.xml valid', /<urlset/i.test(sitemap), 'high')
add('SEO', `sitemap has URLs (${urlCount})`, urlCount > 20, 'high', `${urlCount} urls`)

const llms = await text('/llms.txt')
add('GEO', 'llms.txt present', llms.length > 100, 'medium')

const home = await text('/')
add('SEO', 'home <title>', /<title>[^<]{10,}<\/title>/i.test(home), 'high')
add('SEO', 'home meta description', /name="description"/i.test(home), 'high')
add('SEO', 'home canonical', /rel="canonical"/i.test(home), 'medium')
add('SEO', 'home OG tags', /property="og:title"/i.test(home), 'medium')
add('AEO', 'home FAQPage schema', /FAQPage/i.test(home), 'medium')

// One skill detail page
let skillHtml = ''
try {
  const api = await fetch(`${BASE}/api/skills?limit=1`)
  const d = await api.json()
  const id = d?.skills?.[0]?.id
  if (id) skillHtml = await text(`/skills/${id}`)
} catch {}
if (skillHtml) {
  add('SEO', 'skill page <h1>', /<h1[\s>]/i.test(skillHtml), 'medium')
  add('AEO', 'skill SoftwareApplication schema', /SoftwareApplication/i.test(skillHtml), 'medium')
  add('AEO', 'skill BreadcrumbList schema', /BreadcrumbList/i.test(skillHtml), 'low')
  add('SEO', 'skill og:image', /property="og:image"/i.test(skillHtml), 'medium')
}

// Report
const fails = checks.filter((c) => !c.ok)
const highFails = fails.filter((c) => c.sev === 'high')
const summary = ['# SEO / AEO / GEO hygiene\n', `Site: ${BASE}\n`]
for (const c of checks) summary.push(`- ${c.ok ? '✅' : '❌'} [${c.area}] ${c.name}${c.detail ? ` (${c.detail})` : ''}${c.ok ? '' : ` — **${c.sev}**`}`)
summary.push(`\n**${checks.length - fails.length}/${checks.length} passing** · ${highFails.length} high-severity failure(s).`)
const out = summary.join('\n')
console.log(out)

if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import('node:fs')
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, out + '\n')
}

if (highFails.length > 0) {
  console.error(`\n${highFails.length} HIGH-severity SEO issue(s) — failing the check.`)
  process.exit(1)
}
