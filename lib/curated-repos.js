// Flagship repos the catalog must always carry, fetched by URL.
//
// The topic scrape (/api/ingest and the refresh-skills cron) asks GitHub for
// the eight most recently pushed repos per query, so whether a given repo is
// listed depends on what else was pushed that week. A live check on
// 2026-09-25 found nextlevelbuilder/ui-ux-pro-max-skill — one of the most
// starred Claude Code skills on GitHub — absent from the catalog, and a
// search for its name returned a crypto miner. Repos listed here are looked
// up directly (GET /repos/:owner/:repo) on every ingest run, inserted
// published, and have their live metadata refreshed on each pass. Curated
// fields (title_human, description_human, category, use_guide) are never
// overwritten once set, so the rewrite pipeline still polishes them.
//
// Add a repo: one line with its GitHub URL and the catalog category. It
// lands on the next daily refresh, or immediately via
// GET /api/ingest-curated with the admin secret.
import { v4 as uuidv4 } from 'uuid'
// Explicit extensions so this module also loads under plain Node (the unit
// tests); Next's bundler resolves them the same way.
import { isSpamRepo, classifyContentType } from './catalog-gates.js'
import { uniqueSlug } from './slugs.js'

export const CURATED_REPOS = [
  { url: 'https://github.com/nextlevelbuilder/ui-ux-pro-max-skill', category: 'claude-skill' },
]

export function parseRepoUrl(url) {
  const m = String(url || '').match(/github\.com\/([^/]+)\/([^/#?]+)/i)
  if (!m) return null
  return { owner: m[1], repo: m[2].replace(/\.git$/, '') }
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Same formula as the topic scraper, so a curated listing sorts among the
// rest of the catalog on the default "trending" order rather than above or
// below it by construction.
export function popularityScore(repo) {
  const daysSinceUpdate = (Date.now() - new Date(repo.pushed_at || repo.updated_at || 0)) / 86400000
  const recencyBonus = daysSinceUpdate < 7 ? 20 : daysSinceUpdate < 30 ? 10 : 0
  const starScore = Math.min(50, ((repo.stargazers_count || 0) / 1000) * 10)
  const forkScore = Math.min(20, ((repo.forks_count || 0) / 100) * 10)
  return parseFloat((starScore + forkScore + recencyBonus).toFixed(2))
}

// Mongo update for one curated repo. $set carries the live GitHub metadata
// (refreshed every run) and the publish flag; $setOnInsert carries the
// identity and defaults that must survive later runs untouched.
export function curatedSkillUpdate(data, entry, { id, slug }) {
  const now = new Date()
  return {
    $set: {
      name: data.name,
      description: data.description || '',
      github_url: data.html_url,
      github_stars: data.stargazers_count,
      github_forks: data.forks_count,
      github_topics: data.topics || [],
      language: data.language,
      popularity_score: popularityScore(data),
      last_updated: data.pushed_at ? new Date(data.pushed_at) : now,
      updated_at: now,
      // Curated means "must be findable": a listing the scrape had parked
      // as unpublished pending rewrite goes live now, and stays live.
      published: true,
      curated: true,
    },
    $setOnInsert: {
      id,
      slug,
      category: entry.category || 'claude-skill',
      content_type: classifyContentType(data),
      price: 0,
      is_premium: false,
      source_url: data.html_url,
      readme_preview: data.description || '',
      creator: data.owner?.login,
      creator_type: data.owner?.type,
      creator_avatar: data.owner?.avatar_url,
      created_at: data.created_at ? new Date(data.created_at) : now,
      added_at: now,
      rewrite_status: 'pending',
    },
  }
}

// Upsert every curated repo. `headers` are the GitHub API headers (token
// optional). Returns counts plus a reason per repo that was not written, so
// the workflow log shows why a flagship is still missing.
export async function ingestCuratedRepos(database, { headers = {}, repos = CURATED_REPOS } = {}) {
  const out = { considered: repos.length, inserted: 0, refreshed: 0, skipped: [] }
  const col = database.collection('skills')
  for (const entry of repos) {
    const ref = parseRepoUrl(entry.url)
    if (!ref) { out.skipped.push({ url: entry.url, reason: 'invalid-url' }); continue }

    let data
    try {
      const r = await fetch(`https://api.github.com/repos/${ref.owner}/${ref.repo}`, {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'WorkflowStacks', ...headers },
        signal: AbortSignal.timeout(8_000),
      })
      if (!r.ok) {
        out.skipped.push({ url: entry.url, reason: `github-${r.status}` })
        // Out of quota: every further call fails the same way.
        if (r.status === 403 || r.status === 429) { out.rateLimited = true; break }
        continue
      }
      data = await r.json()
    } catch (e) {
      out.skipped.push({ url: entry.url, reason: e?.message || 'fetch-failed' })
      continue
    }
    if (!data?.html_url || typeof data.stargazers_count !== 'number') {
      out.skipped.push({ url: entry.url, reason: 'unexpected-response' }); continue
    }
    if (data.archived) { out.skipped.push({ url: entry.url, reason: 'archived' }); continue }
    const spam = isSpamRepo(data)
    if (spam) { out.skipped.push({ url: entry.url, reason: `trust-gate:${spam}` }); continue }

    // Match the stored URL case-insensitively (a user submission may have
    // typed it differently) so the unique github_url index never sees two
    // rows for one repo.
    const filter = { github_url: { $regex: `^${escapeRegex(data.html_url)}/?$`, $options: 'i' } }
    const existing = await col.findOne(filter, { projection: { _id: 1, id: 1, slug: 1 } })
    const id = existing?.id || uuidv4()
    const slug = existing?.slug || await uniqueSlug(database, data.name, ref.owner, existing?.id || null)
    const res = await col.updateOne(filter, curatedSkillUpdate(data, entry, { id, slug }), { upsert: true })
    // A row the scrape inserted without a slug (the cron path never set one)
    // would otherwise keep resolving to /skills/<uuid>.
    if (existing && !existing.slug) await col.updateOne({ _id: existing._id }, { $set: { slug } })
    if (res.upsertedCount > 0) out.inserted += 1
    else out.refreshed += 1
  }
  return out
}
