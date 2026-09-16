// Push every URL in the live sitemap to IndexNow (Bing, Yandex, Seznam, Naver).
//
//   node scripts/indexnow-submit.mjs            # submit
//   node scripts/indexnow-submit.mjs --dry-run  # fetch + batch, no POST
//
// The key is read from the file that serves it (public/<32-hex>.txt) so the
// script and the site can never disagree about it. Run weekly by
// .github/workflows/indexnow.yml and on demand; single new URLs (a published
// post) are pushed by the pipeline itself via lib/indexnow.js.

import { readdirSync, readFileSync } from 'node:fs'

const BASE = (process.env.BASE_URL || 'https://workflowstacks.com').replace(/\/$/, '')
const HOST = new URL(BASE).hostname
const DRY = process.argv.includes('--dry-run')
const ENDPOINT = 'https://api.indexnow.org/IndexNow'

const keyFile = readdirSync('public').find((f) => /^[0-9a-f]{32}\.txt$/.test(f))
if (!keyFile) { console.error('no IndexNow key file in public/'); process.exit(1) }
const KEY = readFileSync(`public/${keyFile}`, 'utf8').trim()
if (KEY !== keyFile.replace('.txt', '')) { console.error('key file content does not match its name'); process.exit(1) }

const xml = await (await fetch(`${BASE}/sitemap.xml`, { signal: AbortSignal.timeout(30_000) })).text()
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()).filter((u) => u.startsWith(`https://${HOST}/`))
console.log(`sitemap: ${urls.length} URLs on ${HOST}; key ${KEY.slice(0, 6)}… served at /${keyFile}`)

// Confirm the key is actually live before submitting — a 403 from IndexNow
// is silent about why, and a missing key file is the usual reason.
const probe = await fetch(`${BASE}/${keyFile}`, { signal: AbortSignal.timeout(15_000) })
const served = (await probe.text()).trim()
if (probe.status !== 200 || served !== KEY) { console.error(`key not served correctly: HTTP ${probe.status}, body "${served.slice(0, 40)}"`); process.exit(1) }
console.log('key file verified live')

if (DRY) { console.log(`dry run: would submit ${urls.length} URLs in ${Math.ceil(urls.length / 500)} batch(es)`); process.exit(0) }

let ok = 0, failed = 0
for (let i = 0; i < urls.length; i += 500) {
  const batch = urls.slice(i, i + 500)
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${BASE}/${keyFile}`, urlList: batch }),
    signal: AbortSignal.timeout(30_000),
  })
  const good = res.status === 200 || res.status === 202
  if (good) ok += batch.length; else failed += batch.length
  console.log(`batch ${i / 500 + 1}: ${batch.length} URLs -> HTTP ${res.status}${good ? '' : ' ' + (await res.text()).slice(0, 160)}`)
  if (res.status === 429) { console.log('rate limited; stopping'); break }
}
console.log(`done: ${ok} accepted, ${failed} failed`)
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import('node:fs')
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### IndexNow\n${ok} URLs accepted, ${failed} failed, from a ${urls.length}-URL sitemap.\n`)
}
process.exit(failed && !ok ? 1 : 0)
