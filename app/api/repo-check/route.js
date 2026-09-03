// GET /api/repo-check?repo=owner/name
//
// Pre-flight for the Submit-a-skill form: reads the public GitHub facts a
// listing is judged on (stars, license, last push, README) and reports which
// of our published gates the repo clears right now. It does NOT invent a
// score — the health score is produced later by the enrichment pass, so the
// form shows the gate checklist instead of a number.
//
// Also reports whether the repo is already in the catalog so a maintainer is
// not asked to resubmit something we list.

import { getDb } from '@/lib/mongo'

export const dynamic = 'force-dynamic'

const PERMISSIVE = new Set(['mit', 'apache-2.0', 'bsd-2-clause', 'bsd-3-clause', 'isc', 'unlicense', 'mpl-2.0', '0bsd', 'cc0-1.0'])
const FRESH_DAYS = 90

function ghHeaders() {
  const h = { Accept: 'application/vnd.github+json', 'User-Agent': 'WorkflowStacks' }
  if (process.env.GITHUB_TOKEN) h.Authorization = `token ${process.env.GITHUB_TOKEN}`
  return h
}

export function parseRepo(input) {
  const raw = String(input || '')
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '')
  const m = raw.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/)
  return m ? `${m[1]}/${m[2]}` : null
}

export function evaluateRepo(repo, readmeOk) {
  const license = repo.license?.spdx_id && repo.license.spdx_id !== 'NOASSERTION' ? repo.license.spdx_id : repo.license?.key ? repo.license.key.toUpperCase() : null
  const pushedAt = repo.pushed_at ? new Date(repo.pushed_at) : null
  const daysSincePush = pushedAt ? Math.max(0, Math.floor((Date.now() - pushedAt.getTime()) / 86400000)) : null
  const checks = [
    { key: 'license', label: 'Permissive license (MIT, Apache, BSD)', ok: !!license && PERMISSIVE.has(String(license).toLowerCase()), detail: license || 'no license detected' },
    { key: 'fresh', label: `Commit in the last ${FRESH_DAYS} days`, ok: daysSincePush !== null && daysSincePush <= FRESH_DAYS, detail: daysSincePush === null ? 'unknown' : daysSincePush === 0 ? 'pushed today' : `${daysSincePush}d ago` },
    { key: 'readme', label: 'README with install + usage', ok: !!readmeOk, detail: readmeOk ? 'found' : 'not found' },
    { key: 'public', label: 'Public, not archived', ok: !repo.private && !repo.archived && !repo.disabled, detail: repo.archived ? 'archived' : 'ok' },
  ]
  return {
    full_name: repo.full_name,
    name: repo.name,
    description: repo.description || '',
    html_url: repo.html_url,
    owner: repo.owner?.login || repo.full_name?.split('/')[0] || '',
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    language: repo.language || '',
    topics: Array.isArray(repo.topics) ? repo.topics.slice(0, 10) : [],
    license,
    pushed_at: repo.pushed_at || null,
    days_since_push: daysSincePush,
    checks,
    passed: checks.filter((c) => c.ok).length,
    total: checks.length,
  }
}

export async function GET(request) {
  const repo = parseRepo(new URL(request.url).searchParams.get('repo'))
  if (!repo) return Response.json({ ok: false, error: 'Use owner/repo or a github.com URL' }, { status: 400 })

  let ghRes
  try {
    ghRes = await fetch(`https://api.github.com/repos/${repo}`, { headers: ghHeaders(), signal: AbortSignal.timeout(10_000) })
  } catch {
    return Response.json({ ok: false, error: 'Could not reach GitHub — try again in a moment' }, { status: 502 })
  }
  if (ghRes.status === 404) return Response.json({ ok: false, error: 'Repository not found (is it public?)' }, { status: 404 })
  if (!ghRes.ok) return Response.json({ ok: false, error: `GitHub returned ${ghRes.status}` }, { status: 502 })
  const data = await ghRes.json()

  let readmeOk = false
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/readme`, { headers: ghHeaders(), signal: AbortSignal.timeout(8_000) })
    readmeOk = r.ok
  } catch {}

  const result = evaluateRepo(data, readmeOk)

  // Already listed? Match on the canonical html_url (what every ingest path stores).
  let listed = null
  if (process.env.MONGO_URL && result.html_url) {
    try {
      const db = await getDb()
      const existing = await db.collection('skills').findOne(
        { github_url: { $in: [result.html_url, result.html_url + '/'] } },
        { projection: { slug: 1, id: 1, published: 1, title_human: 1, name: 1 } }
      )
      if (existing) listed = { slug: existing.slug || existing.id, published: existing.published !== false, title: existing.title_human || existing.name }
    } catch {}
  }

  return Response.json({ ok: true, repo: result, listed })
}
