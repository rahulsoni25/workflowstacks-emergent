// Star/fork refresh + 7-day velocity snapshot, run directly against Mongo
// from the GitHub Actions runner instead of curling the Vercel-hosted
// /api/refresh-stars route.
//
// Why: this job runs every 6 hours, up to 10 passes of 80 repos each — up to
// 800 Vercel Function invocations a day, each one billing its own Fluid
// Active CPU on a Hobby plan that's already 145% over its cap (checked
// 2026-09-28: 5h47m/4h). None of this work needs to run on Vercel: it only
// reads/writes Mongo and calls the public GitHub API. Moving it here removes
// it from the Vercel budget entirely and costs nothing (GitHub Actions free
// minutes on a public repo).
//
// Same logic as the /api/refresh-stars handler in
// app/api/[[...path]]/route.js — kept in sync by hand; that route stays in
// place for manual/admin use (e.g. a one-off refresh from the admin panel),
// it's just no longer what the scheduled workflow calls.
//
//   MONGO_URL=... DB_NAME=... GITHUB_TOKEN=... \
//     node scripts/refresh-stars.mjs --max=80 --scope=published --passes=10

import { MongoClient } from 'mongodb'

const MONGO_URL = process.env.MONGO_URL
// The real production database is 'workflowstacks-emergent'. 'workflowstacks'
// (this script's old default, copied from lib/mongo.js's own fallback -- safe
// THERE only because Vercel always sets DB_NAME explicitly) is a separate,
// ~89-document legacy/test database. Confirmed 2026-09-29: this script had
// been writing real star/velocity data into that wrong database on every run
// since it shipped -- /hot's real entries came from a different, still-active
// Vercel-hosted fallback pass, not from here. No GitHub secret ever set
// DB_NAME, so every run silently used the wrong default.
const DB_NAME = process.env.DB_NAME || 'workflowstacks-emergent'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''

if (!MONGO_URL) {
  console.error('MONGO_URL is not set')
  process.exit(1)
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/)
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), 'true']
  })
)
const MAX = Math.min(120, parseInt(args.max || '80', 10))
const SCOPE = args.scope || null // 'published' | null (whole catalog)
const PASSES = Math.max(1, parseInt(args.passes || '1', 10))

// Same shape as lib/catalog-gates.js TOOLS_ONLY — duplicated rather than
// imported so this script has zero dependency on the Next app's module graph.
const TOOLS_ONLY = { content_type: { $ne: 'resource' } }

function ghHeaders() {
  const h = { Accept: 'application/vnd.github+json', 'User-Agent': 'WorkflowStacks' }
  if (GITHUB_TOKEN) h.Authorization = `token ${GITHUB_TOKEN}`
  return h
}

async function runPass(col, max, scope) {
  const query = { github_url: { $exists: true, $ne: null } }
  if (scope === 'published') Object.assign(query, { published: { $ne: false }, ...TOOLS_ONLY })

  const skills = await col.find(query).sort({ stars_refreshed_at: 1 }).limit(max).toArray()

  let refreshed = 0, skipped = 0, changed = 0, hidden = 0, rateLimited = false
  for (const s of skills) {
    const m = (s.github_url || '').match(/github\.com\/([^/]+)\/([^/#?]+)/i)
    if (!m) { skipped++; continue }
    const owner = m[1]
    const repo = m[2].replace(/\.git$/, '')
    try {
      const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: ghHeaders() })
      if ((r.status === 403 || r.status === 429) && r.headers.get('x-ratelimit-remaining') === '0') { rateLimited = true; break }
      if (r.status === 404) {
        await col.updateOne({ id: s.id }, { $set: { published: false, dead_repo: true, stars_refreshed_at: new Date() } })
        hidden++; continue
      }
      if (!r.ok) { skipped++; continue }
      const data = await r.json()
      if (typeof data.stargazers_count !== 'number') { skipped++; continue }
      const set = {
        github_stars: data.stargazers_count,
        github_forks: data.forks_count ?? s.github_forks ?? 0,
        stars_refreshed_at: new Date(),
        dead_repo: false,
      }
      if (data.pushed_at) set.last_updated = data.pushed_at
      if (data.stargazers_count !== s.github_stars) changed++

      let velocity_7d = null, provisional = true
      const history = s.stars_history || []
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      const weekAgoEntry = history.filter((h) => new Date(h.date).getTime() <= sevenDaysAgo).slice(-1)[0] || history[0]
      if (weekAgoEntry) {
        velocity_7d = data.stargazers_count - weekAgoEntry.stars
        provisional = !history.some((h) => new Date(h.date).getTime() <= sevenDaysAgo)
      }
      set.velocity_7d = velocity_7d
      set.velocity_provisional = provisional

      await col.updateOne(
        { id: s.id },
        { $set: set, $push: { stars_history: { $each: [{ date: new Date(), stars: data.stargazers_count }], $slice: -90 } } }
      )
      refreshed++
    } catch {
      skipped++
    }
    // No sleep: this script's own GitHub calls are the only thing hitting the
    // API from this process, so the authenticated 5,000/hour cap is nowhere
    // near a concern at 80-120 calls per pass. (The old Vercel route slept
    // because it shared an egress IP's 60/hour unauthenticated cap with the
    // rest of that day's workflow steps.)
  }
  return { refreshed, skipped, changed, hidden, rateLimited, considered: skills.length }
}

async function main() {
  const client = new MongoClient(MONGO_URL)
  await client.connect()
  const col = client.db(DB_NAME).collection('skills')

  let totals = { refreshed: 0, skipped: 0, changed: 0, hidden: 0, passes: 0 }
  try {
    for (let i = 0; i < PASSES; i++) {
      const r = await runPass(col, MAX, SCOPE)
      totals.refreshed += r.refreshed
      totals.skipped += r.skipped
      totals.changed += r.changed
      totals.hidden += r.hidden
      totals.passes++
      console.log(JSON.stringify({ pass: i + 1, ...r }))
      if (r.rateLimited) { console.log('GitHub rate-limited — stopping'); break }
      if (r.considered < MAX) break // rotation exhausted this scope
    }
  } finally {
    await client.close()
  }
  console.log(JSON.stringify({ summary: true, ...totals }))
}

main().catch((e) => {
  console.error(String(e && e.stack || e))
  process.exit(1)
})
