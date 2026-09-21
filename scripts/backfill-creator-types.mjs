// One-off / occasional: label each catalog owner as a GitHub User or
// Organization (`creator_type` on every skill) so /creators can tag teams.
// New skills get the field at ingest; this fills the ones from before.
//
// Runs on your own machine or a GitHub Action — deliberately NOT a Vercel
// function, so ~2k GitHub lookups cost zero function time.
//
//   MONGO_URL=... GITHUB_TOKEN=$(gh auth token) node scripts/backfill-creator-types.mjs
//   (add --dry to only count)
//
// Reads MONGO_URL / DB_NAME / GITHUB_TOKEN from the environment, falling back
// to .env.local. Stops cleanly on a GitHub rate limit; just run it again.
import fs from 'fs'
import { MongoClient } from 'mongodb'

const fileEnv = fs.existsSync('.env.local')
  ? Object.fromEntries(
      fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
        .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
        .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')])
    )
  : {}
const env = (k) => process.env[k] || fileEnv[k] || ''
const dry = process.argv.includes('--dry')
const HANDLE_RE = /^[a-z\d](?:[a-z\d-]{0,38})$/i

if (!env('MONGO_URL')) { console.error('MONGO_URL missing'); process.exit(1) }
const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'workflowstacks-backfill' }
if (env('GITHUB_TOKEN')) headers.Authorization = `Bearer ${env('GITHUB_TOKEN')}`
else console.warn('No GITHUB_TOKEN: limited to 60 lookups/hour. Use GITHUB_TOKEN=$(gh auth token).')

const client = new MongoClient(env('MONGO_URL'))
await client.connect()
const skills = client.db(env('DB_NAME') || 'workflowstacks').collection('skills')
const owners = (await skills.distinct('creator', { creator: { $type: 'string', $ne: '' }, creator_type: { $exists: false }, github_url: { $type: 'string' } }))
  .filter((o) => HANDLE_RE.test(o))
console.log(`${owners.length} owners without a type${dry ? ' (dry run)' : ''}`)

let done = 0, orgs = 0
if (!dry) {
  for (const owner of owners) {
    const r = await fetch(`https://api.github.com/users/${owner}`, { headers }).catch(() => null)
    if (!r) continue
    if (r.status === 403 || r.status === 429) { console.log('GitHub rate limit reached — run again later.'); break }
    // 404 = renamed or deleted account; mark it so it is not retried forever.
    const type = r.ok ? ((await r.json()).type || 'User') : 'Unknown'
    await skills.updateMany({ creator: owner, creator_type: { $exists: false } }, { $set: { creator_type: type } })
    done++
    if (type === 'Organization') orgs++
    if (done % 100 === 0) console.log(`${done}/${owners.length}…`)
  }
}
console.log(`updated ${done} owners (${orgs} organizations), ${owners.length - done} left`)
await client.close()
