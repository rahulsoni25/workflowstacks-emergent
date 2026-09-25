// node --test tests/curated-repos.test.mjs
//
// The pure parts of lib/curated-repos.js (URL parsing and the Mongo update
// it builds) plus the ingest loop against a stub collection and stub fetch.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CURATED_REPOS, parseRepoUrl, popularityScore, curatedSkillUpdate, ingestCuratedRepos,
} from '../lib/curated-repos.js'

const REPO = {
  name: 'ui-ux-pro-max-skill',
  full_name: 'nextlevelbuilder/ui-ux-pro-max-skill',
  html_url: 'https://github.com/nextlevelbuilder/ui-ux-pro-max-skill',
  description: 'An AI skill that provides design intelligence for building professional UI/UX across multiple platforms.',
  stargazers_count: 130000,
  forks_count: 9000,
  topics: ['claude-code', 'skill'],
  language: 'Python',
  archived: false,
  pushed_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  updated_at: new Date().toISOString(),
  created_at: '2025-11-01T00:00:00Z',
  owner: { login: 'nextlevelbuilder', type: 'User', avatar_url: 'https://avatars.githubusercontent.com/u/1' },
}

test('the flagship list carries ui-ux-pro-max-skill as a claude-skill', () => {
  const entry = CURATED_REPOS.find((r) => /ui-ux-pro-max/.test(r.url))
  assert.ok(entry, 'ui-ux-pro-max-skill must stay in CURATED_REPOS')
  assert.equal(entry.category, 'claude-skill')
  for (const r of CURATED_REPOS) assert.ok(parseRepoUrl(r.url), `bad url: ${r.url}`)
})

test('parseRepoUrl accepts the forms people paste', () => {
  assert.deepEqual(parseRepoUrl('https://github.com/nextlevelbuilder/ui-ux-pro-max-skill'), { owner: 'nextlevelbuilder', repo: 'ui-ux-pro-max-skill' })
  assert.deepEqual(parseRepoUrl('https://github.com/a/b.git'), { owner: 'a', repo: 'b' })
  assert.deepEqual(parseRepoUrl('https://github.com/a/b/tree/main#readme'), { owner: 'a', repo: 'b' })
  assert.equal(parseRepoUrl('https://gitlab.com/a/b'), null)
  assert.equal(parseRepoUrl(''), null)
})

test('popularityScore matches the topic scraper formula and its caps', () => {
  assert.equal(popularityScore(REPO), 90) // 50 stars + 20 forks + 20 pushed this week
  assert.equal(popularityScore({ stargazers_count: 500, forks_count: 50, pushed_at: '2020-01-01T00:00:00Z' }), 10)
})

test('curatedSkillUpdate publishes, refreshes live fields, and protects curated ones', () => {
  const u = curatedSkillUpdate(REPO, { url: REPO.html_url, category: 'claude-skill' }, { id: 'id-1', slug: 'ui-ux-pro-max-skill' })
  assert.equal(u.$set.published, true)
  assert.equal(u.$set.curated, true)
  assert.equal(u.$set.github_stars, 130000)
  assert.deepEqual(u.$set.github_topics, ['claude-code', 'skill'])
  assert.equal(u.$setOnInsert.slug, 'ui-ux-pro-max-skill')
  assert.equal(u.$setOnInsert.category, 'claude-skill')
  assert.equal(u.$setOnInsert.content_type, 'tool')
  assert.equal(u.$setOnInsert.creator, 'nextlevelbuilder')
  // Never touched, so the rewrite pipeline's output survives every run.
  for (const k of ['title_human', 'description_human', 'use_guide', 'explainer', 'rewrite_score']) {
    assert.equal(k in u.$set, false, `${k} must not be in $set`)
    assert.equal(k in u.$setOnInsert, false, `${k} must not be in $setOnInsert`)
  }
  // Mongo rejects a path present in both operators.
  for (const k of Object.keys(u.$set)) assert.equal(k in u.$setOnInsert, false, `${k} in both $set and $setOnInsert`)
})

// Minimal stand-ins for the Mongo collection and for fetch.
function stubDb(rows = []) {
  const calls = []
  const col = {
    async findOne(filter) {
      if (filter.github_url?.$regex) {
        const re = new RegExp(filter.github_url.$regex, filter.github_url.$options)
        return rows.find((r) => re.test(r.github_url)) || null
      }
      if (filter.slug) return rows.find((r) => r.slug === filter.slug) || null
      return null
    },
    async updateOne(filter, update, opts) {
      calls.push({ filter, update, opts })
      const hit = filter._id ? rows.find((r) => r._id === filter._id) : await this.findOne(filter)
      if (hit) { Object.assign(hit, update.$set || {}); return { matchedCount: 1, upsertedCount: 0 } }
      rows.push({ _id: `oid-${rows.length}`, ...(update.$setOnInsert || {}), ...(update.$set || {}) })
      return { matchedCount: 0, upsertedCount: 1 }
    },
  }
  return { database: { collection: () => col }, rows, calls }
}

function withFetch(impl, fn) {
  const real = globalThis.fetch
  globalThis.fetch = impl
  return fn().finally(() => { globalThis.fetch = real })
}

test('ingestCuratedRepos inserts a missing flagship as published with a slug', async () => {
  const { database, rows } = stubDb()
  const result = await withFetch(
    async (url) => {
      assert.equal(url, 'https://api.github.com/repos/nextlevelbuilder/ui-ux-pro-max-skill')
      return { ok: true, status: 200, json: async () => REPO }
    },
    () => ingestCuratedRepos(database, { repos: [{ url: REPO.html_url, category: 'claude-skill' }] })
  )
  assert.deepEqual(result, { considered: 1, inserted: 1, refreshed: 0, skipped: [] })
  assert.equal(rows.length, 1)
  assert.equal(rows[0].slug, 'ui-ux-pro-max-skill')
  assert.equal(rows[0].published, true)
  assert.equal(rows[0].github_url, REPO.html_url)
})

test('ingestCuratedRepos refreshes an existing row and backfills a missing slug', async () => {
  const { database, rows, calls } = stubDb([
    { _id: 'oid-0', id: 'old-id', github_url: REPO.html_url.toUpperCase(), github_stars: 5, published: false, title_human: 'Kept' },
  ])
  const result = await withFetch(
    async () => ({ ok: true, status: 200, json: async () => REPO }),
    () => ingestCuratedRepos(database, { repos: [{ url: REPO.html_url, category: 'claude-skill' }] })
  )
  assert.deepEqual(result, { considered: 1, inserted: 0, refreshed: 1, skipped: [] })
  assert.equal(rows.length, 1, 'must not create a second row for a differently-cased URL')
  assert.equal(rows[0].github_stars, 130000)
  assert.equal(rows[0].published, true)
  assert.equal(rows[0].title_human, 'Kept')
  const slugCall = calls.find((c) => c.filter._id === 'oid-0')
  assert.equal(slugCall?.update.$set.slug, 'ui-ux-pro-max-skill')
})

test('ingestCuratedRepos reports why a repo was not written and stops on rate limit', async () => {
  const { database, rows } = stubDb()
  const repos = [
    { url: 'not a url' },
    { url: 'https://github.com/x/archived' },
    { url: 'https://github.com/x/gone' },
    { url: 'https://github.com/x/limited' },
    { url: 'https://github.com/x/never-reached' },
  ]
  const result = await withFetch(
    async (url) => {
      if (url.endsWith('/x/archived')) return { ok: true, status: 200, json: async () => ({ ...REPO, html_url: url, archived: true }) }
      if (url.endsWith('/x/gone')) return { ok: false, status: 404 }
      if (url.endsWith('/x/limited')) return { ok: false, status: 403 }
      throw new Error('should not be called')
    },
    () => ingestCuratedRepos(database, { repos })
  )
  assert.equal(rows.length, 0)
  assert.equal(result.inserted, 0)
  assert.equal(result.rateLimited, true)
  assert.deepEqual(result.skipped.map((s) => s.reason), ['invalid-url', 'archived', 'github-404', 'github-403'])
})
