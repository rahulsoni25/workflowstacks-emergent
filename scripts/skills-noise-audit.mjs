// Lists catalog rows that are published but should not be, and — only when
// told to, for slugs the owner approved — unpublishes them.
//
// What it flags (all of these are `published` != false):
//   - any row with a `hidden_reason` recorded, and
//   - rows the GitHub auto-ingest added (`auto_discovered: true`) whose
//     `rewrite_score` is under 8 (or missing), or that fail isAiRelevant()
//     from lib/skill-relevance.js.
//
// Why: on 2026-11-19 GET /api/skills?sort=trending returned torvalds/linux
// first with published:true, auto_discovered:true, discovered_for_query
// "ai code review" and hidden_reason "auto-discovered noise (curated list, not
// a tool)". The reason was recorded; `published` was never set to false. The
// auto_discovered rows came from the public GET /api/search fallback in
// app/api/[[...path]]/route.js, which upserted GitHub results with
// published:true before any rewrite or relevance check.
//
// READ-ONLY BY DEFAULT. Writes happen only with --apply AND --slugs=..., and
// only to rows that are in that list AND still flagged when the run starts —
// a row fixed since the owner reviewed the report is left alone.
//
// Runs in the GitHub runner against Mongo directly, like
// scripts/refresh-stars.mjs (docs/COSTS.md rule 6). The one call to the site
// is the --apply revalidation of /skills.
//
//   MONGO_URL=... node scripts/skills-noise-audit.mjs
//   MONGO_URL=... ADMIN_SECRET=... BASE_URL=https://workflowstacks.com \
//     node scripts/skills-noise-audit.mjs --apply --slugs=linux,some-other-slug
//
// --slugs takes slugs as printed in the report (rows without a slug print
// their id; pass that). Undo one --apply run with the `unpublished_at` value
// it prints:
//   db.skills.updateMany(
//     { unpublished_by: 'scripts/skills-noise-audit.mjs', unpublished_at: ISODate('<value>') },
//     { $set: { published: true }, $unset: { unpublished_at: '', unpublished_by: '', unpublished_reason: '' } })
// (A row that also has a hidden_reason stays off /api/skills after that —
// see NOT_HIDDEN in lib/catalog-gates.js.)

import { appendFileSync } from 'node:fs'
import { MongoClient } from 'mongodb'
import { isAiRelevant } from '../lib/skill-relevance.js'

const MONGO_URL = process.env.MONGO_URL
// See scripts/refresh-stars.mjs: 'workflowstacks' is a separate legacy/test
// database; production is 'workflowstacks-emergent'.
const DB_NAME = process.env.DB_NAME || 'workflowstacks-emergent'
const BASE_URL = (process.env.BASE_URL || 'https://workflowstacks.com').replace(/\/+$/, '')
const ADMIN_SECRET = process.env.ADMIN_SECRET || ''
const SCRIPT = 'scripts/skills-noise-audit.mjs'

// Same threshold as SKILL_GATE.minRewriteScore in lib/skill-gate.js (the
// publish gate). Not imported: that file's extensionless relative import does
// not resolve under plain Node ESM.
const MIN_REWRITE_SCORE = 8

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/)
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), 'true']
  })
)
const APPLY = args.apply === 'true'
const APPROVED = String(args.slugs || '')
  .split(/[\s,]+/)
  .map((s) => s.trim())
  .filter(Boolean)

if (!MONGO_URL) {
  console.error('MONGO_URL is not set')
  process.exit(1)
}
if (APPLY && !APPROVED.length) {
  console.error('--apply needs --slugs=<comma-separated slugs approved from a report run>. Nothing was changed.')
  process.exit(1)
}
if (!APPLY && APPROVED.length) {
  console.log('Note: --slugs is ignored without --apply. This run is read-only.\n')
}

const hasHiddenReason = (s) => s.hidden_reason != null && s.hidden_reason !== ''

// Why a row is flagged; an empty list means it is not.
function reasonsFor(s) {
  const out = []
  if (hasHiddenReason(s)) out.push('hidden_reason set')
  if (s.auto_discovered === true) {
    if (typeof s.rewrite_score !== 'number') out.push('auto-discovered, no rewrite_score')
    else if (s.rewrite_score < MIN_REWRITE_SCORE) out.push(`auto-discovered, rewrite_score ${s.rewrite_score} < ${MIN_REWRITE_SCORE}`)
    if (!isAiRelevant(s)) out.push('auto-discovered, not AI-relevant')
  }
  return out
}

async function loadFlagged(col) {
  // Mongo narrows to the two populations; reasonsFor() is the authority
  // (isAiRelevant needs JS). `published: { $ne: false }` is the site's own
  // definition of published — a row with no `published` field is listed.
  const candidates = await col.find(
    {
      published: { $ne: false },
      $or: [{ hidden_reason: { $nin: [null, ''] } }, { auto_discovered: true }],
    },
    {
      projection: {
        _id: 1, id: 1, slug: 1, name: 1, title_human: 1, description: 1, github_topics: 1,
        github_stars: 1, rewrite_score: 1, hidden_reason: 1, auto_discovered: 1, discovered_for_query: 1,
      },
    }
  ).toArray()

  return candidates
    .map((s) => ({ ...s, key: s.slug || s.id || String(s._id), reasons: reasonsFor(s), aiRelevant: isAiRelevant(s) }))
    .filter((s) => s.reasons.length)
    .sort((a, b) => (b.github_stars || 0) - (a.github_stars || 0) || String(a.key).localeCompare(String(b.key)))
}

const cell = (v) => (v == null || v === '' ? '—' : String(v).replace(/[\r\n]+/g, ' ').replace(/\|/g, '\\|'))

function table(rows) {
  const head = '| # | slug | name | stars | rewrite_score | AI-relevant | hidden_reason | discovered_for_query | why listed |'
  const sep = '|---:|---|---|---:|---:|---|---|---|---|'
  const body = rows.map((s, i) => '| ' + [
    i + 1, s.key, s.name, s.github_stars ?? '—', s.rewrite_score ?? '—', s.aiRelevant ? 'yes' : 'no',
    s.hidden_reason, s.discovered_for_query, s.reasons.join('; '),
  ].map(cell).join(' | ') + ' |')
  return [head, sep, ...body].join('\n')
}

function countReasons(rows) {
  const counts = {}
  for (const s of rows) for (const r of s.reasons) {
    const k = r.replace(/rewrite_score [\d.]+ </, 'rewrite_score <')
    counts[k] = (counts[k] || 0) + 1
  }
  return counts
}

function summary(md) {
  if (process.env.GITHUB_STEP_SUMMARY) {
    try { appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n') } catch {}
  }
}

async function revalidateSkillsPage() {
  if (!ADMIN_SECRET) {
    return { ok: false, detail: 'ADMIN_SECRET is not set, so revalidation was skipped' }
  }
  try {
    const r = await fetch(`${BASE_URL}/api/revalidate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
      body: JSON.stringify({ paths: ['/skills'] }),
      signal: AbortSignal.timeout(20_000),
    })
    const text = await r.text()
    return { ok: r.ok, detail: `HTTP ${r.status} ${text.slice(0, 300)}` }
  } catch (e) {
    return { ok: false, detail: String(e && e.message || e) }
  }
}

async function main() {
  const client = new MongoClient(MONGO_URL, { serverSelectionTimeoutMS: 15000 })
  await client.connect()
  const col = client.db(DB_NAME).collection('skills')
  try {
    const flagged = await loadFlagged(col)
    const counts = countReasons(flagged)
    const stamp = new Date().toISOString()

    const header = `### Published rows that should not be listed: ${flagged.length}\n\nDB \`${DB_NAME}\`, read ${stamp}. ${APPLY ? 'Mode: **apply**.' : 'Mode: report (read-only, nothing written).'}`
    const md = flagged.length ? `${header}\n\n${table(flagged)}\n` : `${header}\n\nNothing to report.\n`
    console.log(md)
    summary(md)
    if (flagged.length) {
      // One line the owner can copy into the workflow's `slugs` input after
      // deleting the rows they want to keep.
      console.log(`APPROVE_LIST=${flagged.map((s) => s.key).join(',')}\n`)
    }

    if (!APPLY) {
      console.log(JSON.stringify({ summary: true, mode: 'report', db: DB_NAME, flagged: flagged.length, byReason: counts }))
      return
    }

    // --apply: approved ∩ still-flagged.
    const byKey = new Map()
    for (const s of flagged) {
      for (const k of [s.slug, s.id, String(s._id)]) if (k) byKey.set(k, s)
    }
    const targets = new Map()
    const notFlagged = []
    for (const k of APPROVED) {
      const s = byKey.get(k)
      if (s) targets.set(String(s._id), s)
      else notFlagged.push(k)
    }
    if (notFlagged.length) {
      console.log(`Not changed — not in this run's report (already unpublished, no longer flagged, or not a slug/id): ${notFlagged.join(', ')}\n`)
    }
    if (!targets.size) {
      console.log(JSON.stringify({ summary: true, mode: 'apply', db: DB_NAME, approved: APPROVED.length, unpublished: 0, notFlagged }))
      return
    }

    const unpublishedAt = new Date()
    const ops = [...targets.values()].map((s) => ({
      updateOne: {
        // Re-check published in the filter so a concurrent edit can't be overwritten.
        filter: { _id: s._id, published: { $ne: false } },
        update: {
          $set: {
            published: false,
            unpublished_at: unpublishedAt,
            unpublished_by: SCRIPT,
            unpublished_reason: s.reasons.join('; '),
          },
        },
      },
    }))
    const res = await col.bulkWrite(ops, { ordered: false })
    const matched = [...targets.values()].map((s) => s.key)
    console.log(`Approved and still flagged: ${matched.join(', ')}`)
    console.log(`Unpublished ${res.modifiedCount} of those ${targets.size} (a row unpublished by something else meanwhile is not counted).`)
    console.log(`unpublished_at=${unpublishedAt.toISOString()}  (use this to undo — see the header of ${SCRIPT})\n`)
    summary(`\n**Unpublished ${res.modifiedCount} of ${targets.size}** at \`${unpublishedAt.toISOString()}\`: ${matched.join(', ')}\n`)

    let reval = { ok: false, detail: 'skipped: nothing was modified' }
    if (res.modifiedCount > 0) {
      reval = await revalidateSkillsPage()
      if (reval.ok) {
        console.log(`Revalidated /skills: ${reval.detail}`)
      } else {
        // The Mongo write stands either way: /api/skills reads Mongo on every
        // request, and the /skills page refreshes on its own 6h timer.
        console.log(`::warning::/skills revalidation did not run (${reval.detail}). The unpublish is saved; /skills will drop these rows within 6 hours on its own.`)
      }
    }

    console.log(JSON.stringify({
      summary: true, mode: 'apply', db: DB_NAME, approved: APPROVED.length,
      matched: targets.size, unpublished: res.modifiedCount, notFlagged,
      unpublished_at: unpublishedAt.toISOString(), revalidated: reval.ok,
    }))
  } finally {
    await client.close()
  }
}

main().catch((e) => {
  console.error(String(e && e.stack || e))
  process.exit(1)
})
