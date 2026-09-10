// Assemble the Monday report: Search Console pulls + crawl + audit + blog
// into reports/seo/<date>.json and a human-readable <date>.md with deltas
// against the previous report in the same folder.
//
//   node scripts/seo-weekly-report.mjs --in /tmp/seo --out reports/seo --date 2026-09-14
//
// Inputs in --in (all optional; a missing file becomes "no data", never a crash):
//   gsc-overview-7.json  gsc-overview-28.json  gsc-queries-7.json  gsc-pages-7.json
//   gsc-pages-28.json    crawl.json            blog-posts.json     blog-status.json
//   blog-runs.json       audit.json ({score, high_failures, md})

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d }
const IN = arg('in', '/tmp/seo')
const OUT = arg('out', 'reports/seo')
const DATE = arg('date', new Date().toISOString().slice(0, 10))
const BASE = 'https://workflowstacks.com'

function load(name) {
  const p = join(IN, name)
  if (!existsSync(p)) return null
  try { return JSON.parse(readFileSync(p, 'utf8')) } catch { return null }
}
const num = (v, d = 1) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(d) : '—')
const int = (v) => (typeof v === 'number' ? Math.round(v).toLocaleString('en-US') : '—')
const strip = (u) => String(u || '').replace(BASE, '') || '/'
const section = (u) => '/' + strip(u).replace(/^\//, '').split('/')[0]
const delta = (a, b) => (typeof a === 'number' && typeof b === 'number') ? (b === 0 ? (a === 0 ? '±0' : 'new') : `${a - b >= 0 ? '+' : ''}${Math.round(((a - b) / b) * 100)}%`) : '—'

const ov7 = load('gsc-overview-7.json'), ov28 = load('gsc-overview-28.json')
const q7 = load('gsc-queries-7.json'), p7 = load('gsc-pages-7.json'), p28 = load('gsc-pages-28.json')
const crawl = load('crawl.json'), posts = load('blog-posts.json'), bstatus = load('blog-status.json'), bruns = load('blog-runs.json'), audit = load('audit.json')

// previous report for deltas
mkdirSync(OUT, { recursive: true })
const prevName = readdirSync(OUT).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f) && f < `${DATE}.json`).sort().pop()
const prev = prevName ? JSON.parse(readFileSync(join(OUT, prevName), 'utf8')) : null

// ---- derived --------------------------------------------------------------
const bySection = (rows) => {
  const m = {}
  for (const r of rows || []) { const s = section(r.key); m[s] = m[s] || { clicks: 0, impressions: 0 }; m[s].clicks += r.clicks || 0; m[s].impressions += r.impressions || 0 }
  return Object.entries(m).sort((a, b) => b[1].impressions - a[1].impressions)
}
const sec7 = bySection(p7?.rows), sec28 = bySection(p28?.rows)

const postList = Array.isArray(posts) ? posts : (posts?.posts || posts?.items || [])
const sevenDaysAgo = new Date(Date.now() - 7 * 86400e3)
const publishedWeek = postList.filter((p) => p.status === 'published' && p.published_at && new Date(p.published_at) <= new Date() && new Date(p.published_at) >= sevenDaysAgo)
const lastPublished = postList.filter((p) => p.status === 'published' && p.published_at && new Date(p.published_at) <= new Date()).sort((a, b) => new Date(b.published_at) - new Date(a.published_at))[0]
const held = postList.filter((p) => p.status === 'held')
const inflight = postList.filter((p) => ['briefed', 'drafting', 'drafted', 'edited', 'revising', 'styled', 'judged'].includes(p.status))
const recentJudged = postList.filter((p) => p.judge?.score != null).sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0)).slice(0, 5)

const json = {
  date: DATE, generated_at: new Date().toISOString(), previous_report: prevName || null,
  gsc: {
    week: ov7 ? { window: ov7.window, ...ov7.totals, change_pct: ov7.change_pct } : null,
    month: ov28 ? { window: ov28.window, ...ov28.totals, change_pct: ov28.change_pct } : null,
    daily_28: ov28?.daily || null,
    sections_7d: sec7, sections_28d: sec28,
    top_queries_7d: (q7?.rows || []).slice(0, 30),
    top_pages_7d: (p7?.rows || []).slice(0, 30),
    top_pages_28d: (p28?.rows || []).slice(0, 50),
  },
  crawl: crawl?.crawl || null, sitemap: crawl?.sitemap || null, llms_top10: crawl?.llms_top10 || null, inspect: crawl?.inspect || null,
  audit: audit ? { score: audit.score ?? null, high_failures: audit.high_failures ?? null } : null,
  blog: {
    published_last_7d: publishedWeek.map((p) => ({ slug: p.slug, at: p.published_at, score: p.judge?.score ?? null })),
    last_published: lastPublished ? { slug: lastPublished.slug, at: lastPublished.published_at } : null,
    held: held.map((p) => ({ slug: p.slug, score: p.judge?.score ?? null })),
    in_flight: inflight.map((p) => ({ slug: p.slug, status: p.status })),
    recent_judge_scores: recentJudged.map((p) => ({ slug: p.slug, score: p.judge.score, status: p.status })),
    counts: bstatus?.counts || null, providers: bstatus?.providers || null,
    daily_runs_last_7: Array.isArray(bruns) ? bruns.map((r) => ({ at: r.createdAt, conclusion: r.conclusion })) : null,
  },
}
writeFileSync(join(OUT, `${DATE}.json`), JSON.stringify(json, null, 2) + '\n')

// ---- markdown -------------------------------------------------------------
const L = []
const h = (t) => L.push('', `## ${t}`, '')
L.push(`# Weekly SEO review — ${DATE}`, '', `Collected ${json.generated_at}. Previous report: ${prevName ? prevName.replace('.json', '') : 'none (first run)'}.`)

h('Search Console')
if (ov7) {
  const w = ov7.totals, pw = prev?.gsc?.week
  L.push(`Last 7 days (${ov7.window.startDate} → ${ov7.window.endDate}), vs the 7 before per GSC, and vs last report:`, '',
    '| metric | this week | vs prior 7d (GSC) | vs last report |', '|---|---|---|---|',
    `| clicks | ${int(w.clicks)} | ${num(ov7.change_pct?.clicks, 0)}% | ${delta(w.clicks, pw?.clicks)} |`,
    `| impressions | ${int(w.impressions)} | ${num(ov7.change_pct?.impressions, 0)}% | ${delta(w.impressions, pw?.impressions)} |`,
    `| CTR | ${num(w.ctr, 2)}% | | |`,
    `| avg position | ${num(w.position, 1)} | | |`)
} else L.push('No 7-day data (GSC pull failed).')
if (ov28) {
  const m = ov28.totals
  L.push('', `28 days: **${int(m.clicks)} clicks / ${int(m.impressions)} impressions**, avg position ${num(m.position, 1)} (clicks ${num(ov28.change_pct?.clicks, 0)}%, impressions ${num(ov28.change_pct?.impressions, 0)}% vs the previous 28).`)
  const d = ov28.daily || []
  if (d.length >= 14) {
    L.push('', 'Weekly impressions inside the 28-day window:', '')
    for (let i = 0; i < d.length; i += 7) { const wk = d.slice(i, i + 7); L.push(`- wk ${wk[0].date}: ${int(wk.reduce((n, x) => n + x.clicks, 0))} clicks / ${int(wk.reduce((n, x) => n + x.impressions, 0))} impressions`) }
  }
}
if (sec7.length) {
  L.push('', '**By section, last 7 days** (clicks / impressions):', '')
  for (const [s, v] of sec7) L.push(`- \`${s}\`: ${v.clicks} / ${v.impressions}`)
  const orig = ['/templates', '/automate', '/mcp', '/blog', '/bundles', '/collections'].map((s) => sec7.find((x) => x[0] === s)?.[1]?.clicks || 0).reduce((a, b) => a + b, 0)
  L.push('', `Original-content sections (templates, automate, mcp, blog, bundles, collections) clicks this week: **${orig}**.`)
}
if (p7?.rows?.length) {
  L.push('', '**Top pages, 7 days:**', '', '| clicks | impr | pos | page |', '|---|---|---|---|')
  for (const r of [...p7.rows].sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions).slice(0, 15)) L.push(`| ${r.clicks} | ${r.impressions} | ${num(r.position, 1)} | ${strip(r.key)} |`)
}
if (q7?.rows?.length) {
  L.push('', '**Top queries, 7 days:**', '', '| clicks | impr | pos | query |', '|---|---|---|---|')
  for (const r of [...q7.rows].sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions).slice(0, 15)) L.push(`| ${r.clicks} | ${r.impressions} | ${num(r.position, 1)} | ${r.key} |`)
}

h('Crawl')
if (crawl?.crawl) {
  const c = crawl.crawl, pc = prev?.crawl
  L.push(`${c.pages_crawled} pages crawled from \`/\`, max depth ${c.max_depth}. Depth distribution: ${Object.entries(c.depth_distribution).map(([k, v]) => `d${k}=${v}`).join(', ')}.`, '',
    `- \`/skills\` links to **${c.skills_index_anchor_count}** skill pages (last report: ${pc?.skills_index_anchor_count ?? '—'}); \`/skills/page/2\` → HTTP ${c.skills_page2_status}, ${c.skills_page2_anchor_count} anchors.`,
    `- Homepage skill links: ${c.homepage_skill_links?.length ? c.homepage_skill_links.join(', ') : 'none'}.`,
    `- Pages linked internally but not 200: **${c.non_200_linked.length}**${c.non_200_linked.length ? ' — ' + c.non_200_linked.slice(0, 8).map((x) => `${x.url} (${x.status}${x.location ? ' → ' + strip(x.location) : ''})`).join('; ') : ''}.`,
    `- Pages with ≤1 inbound link: **${c.weak_inbound.length}** (last report: ${pc?.weak_inbound?.length ?? '—'}).`,
    `- UUID URLs still linked: **${c.uuid_urls_linked.length}**.`)
  if (crawl.sitemap) L.push(`- Sitemap: **${crawl.sitemap.count}** URLs (last report: ${prev?.sitemap?.count ?? '—'}), ${crawl.sitemap.uuid_urls} UUID, ${crawl.sitemap.has_pagination} pagination pages. By section: ${Object.entries(crawl.sitemap.by_section).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k}=${v}`).join(', ')}.`)
  if (crawl.llms_top10?.length) L.push(`- llms.txt top 10: ${crawl.llms_top10.join(', ')}.`)
  L.push('', '**Structured data by section (first page sampled):**', '')
  for (const [s, v] of Object.entries(c.schema_by_section)) L.push(`- \`${s}\` → ${v.types.join(', ')} (${v.sample})`)
} else L.push('Crawl did not run.')

h('Indexation sample (Search Console URL inspection)')
if (crawl?.inspect && !crawl.inspect.skipped) {
  L.push('| page | verdict | coverage | last crawl |', '|---|---|---|---|')
  for (const [u, v] of Object.entries(crawl.inspect)) L.push(`| ${u} | ${v.verdict || v.error || '—'} | ${v.coverage || v.message || '—'} | ${v.last_crawl ? v.last_crawl.slice(0, 10) : '—'} |`)
} else L.push(`Skipped: ${crawl?.inspect?.skipped || 'no data'}.`)

h('Scored audit (scripts/seo-check.mjs)')
L.push(audit ? `Score **${audit.score ?? '—'}/10**, high-severity failures: **${audit.high_failures ?? '—'}** (last report: ${prev?.audit?.score ?? '—'}/10).` : 'Audit did not run.')

h('Blog engine')
L.push(`- Published in the last 7 days: **${publishedWeek.length}**${publishedWeek.length ? ' — ' + publishedWeek.map((p) => `${p.slug} (judge ${p.judge?.score ?? '?'})`).join(', ') : ' — **stopped**'}.`,
  `- Last published: ${lastPublished ? `${lastPublished.slug} on ${String(lastPublished.published_at).slice(0, 10)}` : 'none'}.`,
  `- Held: **${held.length}**${held.length ? ' (' + held.slice(0, 6).map((p) => `${p.slug}:${p.judge?.score ?? '?'}`).join(', ') + ')' : ''}. In flight: ${inflight.length ? inflight.map((p) => `${p.slug}:${p.status}`).join(', ') : 'none'}.`,
  `- Recent judge scores: ${recentJudged.length ? recentJudged.map((p) => `${p.judge.score}`).join(', ') : '—'}. Providers: ${bstatus?.providers ? JSON.stringify(bstatus.providers) : '—'}.`,
  `- Daily runs, last 7: ${Array.isArray(bruns) ? bruns.map((r) => r.conclusion).join(', ') : '—'}.`)

h('Shipped since last report')
L.push('_(filled by the workflow from git log)_')

writeFileSync(join(OUT, `${DATE}.md`), L.join('\n') + '\n')
console.log(`wrote ${OUT}/${DATE}.json and .md (prev: ${prevName || 'none'})`)
