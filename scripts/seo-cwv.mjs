// Core Web Vitals for one URL per page type. Nothing on the site measured
// speed before this; if catalog pages are "crawled - currently not indexed"
// partly because they are slow, this is where it shows.
//
// Two sources, best first:
//   1. PageSpeed Insights API when PSI_API_KEY is set — adds Chrome field data
//      (real-user LCP/INP/CLS) on top of the lab run. Unkeyed calls 429
//      immediately, so no key means no PSI.
//   2. Lighthouse CLI in this process (headless Chrome, mobile emulation) —
//      lab metrics only, no key, works on the GitHub runner as-is.
//
//   BASE_URL=https://workflowstacks.com node scripts/seo-cwv.mjs > cwv.json

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const BASE = (process.env.BASE_URL || 'https://workflowstacks.com').replace(/\/$/, '')
const KEY = process.env.PSI_API_KEY || ''
const API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
const ONLY = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null

// One representative per page type. The number that matters is the
// per-type shape, not per-page noise.
const PAGES = ONLY ? [ONLY] : ['/', '/skills', '/skills/ogcode', '/skills/page/2', '/templates/cold-email-personalizer', '/automate/triage-your-inbox', '/mcp/filesystem', '/blog/seo-brief-n8n-claude', '/collections']

const ms = (v) => (typeof v === 'number' ? Math.round(v) : null)

function fromLighthouse(lh) {
  const a = lh.audits || {}
  return {
    score: lh.categories?.performance?.score != null ? Math.round(lh.categories.performance.score * 100) : null,
    lab: {
      lcp_ms: ms(a['largest-contentful-paint']?.numericValue),
      cls: a['cumulative-layout-shift']?.numericValue != null ? +a['cumulative-layout-shift'].numericValue.toFixed(3) : null,
      tbt_ms: ms(a['total-blocking-time']?.numericValue),
      fcp_ms: ms(a['first-contentful-paint']?.numericValue),
      ttfb_ms: ms(a['server-response-time']?.numericValue),
      speed_index_ms: ms(a['speed-index']?.numericValue),
    },
  }
}

async function viaPsi(path, strategy) {
  const u = new URL(API)
  u.searchParams.set('url', BASE + path)
  u.searchParams.set('strategy', strategy)
  u.searchParams.set('category', 'performance')
  u.searchParams.set('key', KEY)
  const res = await fetch(u, { signal: AbortSignal.timeout(90_000) })
  if (!res.ok) throw new Error(`PSI HTTP ${res.status}`)
  const j = await res.json()
  const out = { source: 'psi', ...fromLighthouse(j.lighthouseResult || {}) }
  const field = j.loadingExperience?.metrics || {}
  out.field = Object.keys(field).length ? {
    lcp_ms: field.LARGEST_CONTENTFUL_PAINT_MS?.percentile ?? null,
    inp_ms: field.INTERACTION_TO_NEXT_PAINT?.percentile ?? null,
    cls: field.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile != null ? field.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100 : null,
    category: j.loadingExperience?.overall_category || null,
  } : null
  return out
}

async function viaLighthouse(path, strategy) {
  const { mkdtempSync, readFileSync, rmSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const dir = mkdtempSync(join(tmpdir(), 'cwv-'))
  const outFile = join(dir, 'lh.json')
  const args = [
    '--yes', 'lighthouse@12', BASE + path,
    '--output=json', `--output-path=${outFile}`, '--quiet', '--only-categories=performance',
    '--chrome-flags=--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage',
    ...(strategy === 'desktop' ? ['--preset=desktop'] : []),
  ]
  // Lighthouse on Windows writes the report and then exits non-zero while
  // deleting its own temp profile (EPERM). The report is what we want, so
  // read it whether or not the process claims success.
  try {
    await exec(process.platform === 'win32' ? 'npx.cmd' : 'npx', args, { maxBuffer: 64 * 1024 * 1024, timeout: 180_000, shell: process.platform === 'win32' })
  } catch (e) { /* inspect the file instead */ }
  let lh
  try { lh = JSON.parse(readFileSync(outFile, 'utf8')) } finally { try { rmSync(dir, { recursive: true, force: true }) } catch {} }
  return { source: 'lighthouse', ...fromLighthouse(lh), field: null }
}

async function run(path, strategy) {
  try {
    if (KEY) {
      try { return await viaPsi(path, strategy) } catch (e) { /* fall through to local Lighthouse */ }
    }
    return await viaLighthouse(path, strategy)
  } catch (e) {
    return { error: String(e.message || e).slice(0, 140) }
  }
}

const out = { generated_at: new Date().toISOString(), base: BASE, keyed: !!KEY, pages: {} }
for (const p of PAGES) {
  out.pages[p] = { mobile: await run(p, 'mobile') }
  // Desktop only for the three that carry the traffic.
  if (['/', '/skills', '/skills/ogcode'].includes(p)) out.pages[p].desktop = await run(p, 'desktop')
}
process.stdout.write(JSON.stringify(out, null, 2) + '\n')
