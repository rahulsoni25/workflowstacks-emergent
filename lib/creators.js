import { getDb } from './mongo'
import { TOOLS_ONLY } from './catalog-gates'
import { SITE_URL } from './site-url'

// The creators directory.
//
// Every catalog skill already carries `creator` (the GitHub owner login) and
// `creator_avatar`, written at ingest. This module turns that into a public
// directory with two honest states:
//
//   listed   — we auto-imported their open-source repo. They have not signed
//              up for anything and the UI must never imply they have.
//   verified — they proved control of a listed repo by adding a link to
//              workflowstacks.com to its README (normally the badge). No
//              login, no OAuth app: write access to the repo IS the proof.
//
// Claims live in `creator_claims`, keyed by lowercase handle.

export const HANDLE_RE = /^[a-z\d](?:[a-z\d-]{0,38})$/i

export function normHandle(h) {
  const s = String(h || '').trim().replace(/^@/, '')
  return HANDLE_RE.test(s) ? s.toLowerCase() : null
}

export function badgeMarkdown(slug) {
  const url = `${SITE_URL}/skills/${slug}`
  return `[![Featured on WorkflowStacks](${SITE_URL}/api/badge/${slug}.svg)](${url}?utm_source=github&utm_medium=badge)`
}

const PUBLISHED = { published: { $ne: false }, ...TOOLS_ONLY }

// One row per GitHub owner. ~2k rows, a few hundred ms on Atlas free — the
// route that serves this is CDN-cached, so it runs a handful of times an hour.
export async function listCreators() {
  const db = await getDb()
  const [rows, claims] = await Promise.all([
    db.collection('skills').aggregate([
      { $match: { ...PUBLISHED, creator: { $type: 'string', $ne: '' }, github_url: { $type: 'string' } } },
      { $sort: { github_stars: -1 } },
      {
        $group: {
          _id: { $toLower: '$creator' },
          handle: { $first: '$creator' },
          avatar: { $first: '$creator_avatar' },
          type: { $max: '$creator_type' },
          skills: { $sum: 1 },
          stars: { $sum: { $ifNull: ['$github_stars', 0] } },
          top_name: { $first: { $ifNull: ['$title_human', '$name'] } },
          top_slug: { $first: { $ifNull: ['$slug', '$id'] } },
        },
      },
    ]).toArray(),
    db.collection('creator_claims').find({ verified: true }).project({ _id: 0, handle: 1, verified_at: 1, founding: 1 }).toArray(),
  ])
  const claimed = new Map(claims.map((c) => [c.handle, c]))
  const creators = rows
    .filter((r) => HANDLE_RE.test(r.handle || ''))
    .map((r) => ({
      handle: r.handle,
      avatar: r.avatar || `https://github.com/${r.handle}.png?size=96`,
      org: r.type === 'Organization',
      skills: r.skills,
      stars: r.stars,
      top_name: r.top_name,
      top_slug: r.top_slug,
      verified: claimed.has(r._id),
      founding: !!claimed.get(r._id)?.founding,
    }))
    // Verified first (they chose to be here), then by catalog footprint.
    .sort((a, b) => (b.verified - a.verified) || (b.skills - a.skills) || (b.stars - a.stars))
  return {
    creators,
    total: creators.length,
    verified: creators.filter((c) => c.verified).length,
    generated_at: new Date().toISOString(),
  }
}

export async function getCreator(rawHandle) {
  const key = normHandle(rawHandle)
  if (!key) return null
  const db = await getDb()
  const [skills, claim] = await Promise.all([
    db.collection('skills')
      .find({ ...PUBLISHED, creator: { $regex: `^${key}$`, $options: 'i' }, github_url: { $type: 'string' } })
      .project({ _id: 0, id: 1, slug: 1, name: 1, title_human: 1, description_human: 1, description: 1, category: 1, github_stars: 1, github_url: 1, creator: 1, creator_avatar: 1, creator_type: 1 })
      .sort({ github_stars: -1 })
      .limit(60)
      .toArray(),
    db.collection('creator_claims').findOne({ handle: key }, { projection: { _id: 0 } }),
  ])
  if (!skills.length) return null
  const handle = skills[0].creator
  const verified = !!claim?.verified
  return {
    handle,
    avatar: skills[0].creator_avatar || `https://github.com/${handle}.png?size=160`,
    org: skills[0].creator_type === 'Organization',
    github: `https://github.com/${handle}`,
    verified,
    founding: !!claim?.founding,
    verified_at: claim?.verified_at || null,
    // Only ever shown for verified creators, and only what they publish on
    // their own GitHub profile — we never accept free-text profile edits.
    profile: verified ? (claim.profile || null) : null,
    stars: skills.reduce((n, s) => n + (s.github_stars || 0), 0),
    skills: skills.map((s) => ({
      slug: s.slug || s.id,
      name: s.title_human || s.name,
      description: s.description_human || s.description || '',
      category: s.category || '',
      stars: s.github_stars || 0,
      github_url: s.github_url,
    })),
  }
}

function ghHeaders() {
  const h = { Accept: 'application/vnd.github+json', 'User-Agent': 'workflowstacks-claim' }
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  return h
}

const FOUNDING_SLOTS = 100

// Verify a claim: look for a workflowstacks.com link in the README of any of
// the creator's listed repos. Bounded to 5 repos so one claim is at most ~6
// GitHub calls even on the anonymous 60/h budget.
export async function verifyClaim(rawHandle, ref) {
  const creator = await getCreator(rawHandle)
  if (!creator) return { ok: false, status: 404, error: 'No listed repos found for that GitHub handle.' }
  const key = creator.handle.toLowerCase()
  const db = await getDb()
  const existing = await db.collection('creator_claims').findOne({ handle: key })
  if (existing?.verified) return { ok: true, already: true, handle: creator.handle }

  let matchedRepo = null
  let rateLimited = false
  for (const s of creator.skills.slice(0, 5)) {
    const m = (s.github_url || '').match(/github\.com\/([^/]+)\/([^/#?]+)/i)
    if (!m) continue
    try {
      const r = await fetch(`https://api.github.com/repos/${m[1]}/${m[2]}/readme`, {
        headers: { ...ghHeaders(), Accept: 'application/vnd.github.raw+json' },
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      })
      if (r.status === 403 || r.status === 429) { rateLimited = true; break }
      if (!r.ok) continue
      const text = await r.text()
      if (/workflowstacks\.com/i.test(text)) { matchedRepo = `${m[1]}/${m[2]}`; break }
    } catch {
      // Network hiccup on one repo — try the next.
    }
  }
  if (rateLimited) return { ok: false, status: 503, error: 'GitHub is rate-limiting us right now — please try again in a few minutes.' }
  if (!matchedRepo) {
    return { ok: false, status: 422, error: 'We could not find a workflowstacks.com link in your README yet. Add the badge, push, then check again (GitHub can take a minute to update).' }
  }

  // Public profile fields, straight from GitHub — owner-controlled, no free text from us.
  let profile = null
  try {
    const r = await fetch(`https://api.github.com/users/${creator.handle}`, { headers: ghHeaders(), signal: AbortSignal.timeout(8000), cache: 'no-store' })
    if (r.ok) {
      const u = await r.json()
      const blog = String(u.blog || '').trim()
      profile = {
        name: u.name || null,
        bio: u.bio ? String(u.bio).slice(0, 280) : null,
        website: /^https?:\/\//i.test(blog) ? blog.slice(0, 200) : blog ? `https://${blog}`.slice(0, 200) : null,
        x: u.twitter_username ? `https://x.com/${u.twitter_username}` : null,
        location: u.location ? String(u.location).slice(0, 80) : null,
        type: u.type || null,
      }
    }
  } catch {
    // Profile enrichment is optional.
  }

  const verifiedSoFar = await db.collection('creator_claims').countDocuments({ verified: true })
  const refKey = normHandle(ref)
  await db.collection('creator_claims').updateOne(
    { handle: key },
    {
      $set: { handle: key, display: creator.handle, verified: true, verified_at: new Date(), verified_via: matchedRepo, profile },
      $setOnInsert: {
        created_at: new Date(),
        founding: verifiedSoFar < FOUNDING_SLOTS,
        // First-touch referral: who sent them. Self-referrals are dropped.
        ref: refKey && refKey !== key ? refKey : null,
      },
    },
    { upsert: true }
  )
  return { ok: true, handle: creator.handle, repo: matchedRepo, founding: verifiedSoFar < FOUNDING_SLOTS }
}

export async function foundingSlotsLeft() {
  const db = await getDb()
  const n = await db.collection('creator_claims').countDocuments({ verified: true })
  return Math.max(0, FOUNDING_SLOTS - n)
}

// Admin view: who referred whom.
export async function referralReport() {
  const db = await getDb()
  const [claims, submissions] = await Promise.all([
    db.collection('creator_claims').find({ verified: true, ref: { $type: 'string' } }).project({ _id: 0, handle: 1, ref: 1, verified_at: 1 }).toArray(),
    db.collection('skills').find({ source: 'user', ref: { $type: 'string' } }).project({ _id: 0, name: 1, creator: 1, ref: 1, published: 1, created_at: 1 }).toArray(),
  ])
  const by = {}
  for (const c of claims) (by[c.ref] ||= { ref: c.ref, verified_creators: [], submissions: [] }).verified_creators.push(c.handle)
  for (const s of submissions) (by[s.ref] ||= { ref: s.ref, verified_creators: [], submissions: [] }).submissions.push({ name: s.name, creator: s.creator, published: s.published !== false })
  return Object.values(by).sort((a, b) => b.verified_creators.length - a.verified_creators.length)
}

// Admin: fill `creator_type` (User | Organization) for skills ingested before
// the field existed. One GitHub call per distinct owner; stops cleanly on a
// rate limit so the daily Action can just call it again tomorrow.
export async function backfillCreatorTypes(limit = 40) {
  const db = await getDb()
  const owners = await db.collection('skills').distinct('creator', { creator: { $type: 'string', $ne: '' }, creator_type: { $exists: false }, github_url: { $type: 'string' } })
  let done = 0, stopped = null
  for (const owner of owners.slice(0, Math.min(Number(limit) || 40, 200))) {
    if (!HANDLE_RE.test(owner)) continue
    const r = await fetch(`https://api.github.com/users/${owner}`, { headers: ghHeaders(), signal: AbortSignal.timeout(8000), cache: 'no-store' }).catch(() => null)
    if (!r) continue
    if (r.status === 403 || r.status === 429) { stopped = 'rate-limited'; break }
    // 404 = renamed/deleted account; mark it so we do not retry forever.
    const type = r.ok ? ((await r.json()).type || 'User') : 'Unknown'
    await db.collection('skills').updateMany({ creator: owner, creator_type: { $exists: false } }, { $set: { creator_type: type } })
    done++
  }
  return { updated_owners: done, remaining: Math.max(0, owners.length - done), stopped }
}
