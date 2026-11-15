#!/usr/bin/env node
// Checks every homepage cheat code (lib/cheat-codes.js) against its official
// source: fetches each `source` page and confirms each `proof` snippet is
// still there. A renamed or removed command shows up here as a FAIL.
//
//   npm run check-cheat-codes            check everything
//   npm run check-cheat-codes -- codex   check one tool
//
// Exit codes: 0 all proofs found; 1 a proof is missing or the data is
// malformed; 2 only network failures (a host could not be reached).
// See docs/CHEAT_CODES.md. No dependencies beyond Node 18+.

import { CHEAT_CODE_TOOLS, CHEAT_CODES_CHECKED, CHEAT_CODES_SEEN } from '../lib/cheat-codes.js'

const MAX_PER_TOOL = 18
const only = process.argv[2]

// Where to actually fetch a cited URL. Card links stay human-readable; the
// checker reads the plain-text form of the same document.
function fetchUrlFor(url) {
  const u = new URL(url)
  u.hash = ''
  if (u.hostname === 'github.com') {
    // github.com/<owner>/<repo>/blob/<ref>/<path> -> raw file
    const m = u.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/(.+)$/)
    if (m) return `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}`
  }
  if (u.hostname === 'code.claude.com' && !u.pathname.endsWith('.md')) {
    u.pathname = `${u.pathname.replace(/\/$/, '')}.md`
  }
  return u.toString()
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(n) ? String.fromCodePoint(n) : m
    }
    return ENTITIES[e.toLowerCase()] ?? m
  })
}

// Same normalisation for page and proof: drop markup and Markdown emphasis,
// straighten quotes, collapse whitespace, ignore case.
function norm(s) {
  // Only real tags: a bare "<" in Markdown text must not swallow everything
  // up to the next ">".
  return decodeEntities(String(s).replace(/<!--[\s\S]*?-->/g, ' ').replace(/<\/?[a-z][^<>]*>/gi, ' '))
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[‘’′]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/​/g, '')
    .replace(/[`*]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?)\]])/g, '$1')
    .replace(/([([])\s+/g, '$1')
    .trim()
    .toLowerCase()
}

const pages = new Map()
async function load(url) {
  const target = fetchUrlFor(url)
  if (!pages.has(target)) {
    pages.set(
      target,
      (async () => {
        let lastErr
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const res = await fetch(target, {
              redirect: 'follow',
              signal: AbortSignal.timeout(30_000),
              headers: { 'user-agent': 'cheat-codes-check/1.0' },
            })
            if (!res.ok) return { status: res.status, text: '' }
            return { status: res.status, text: norm(await res.text()) }
          } catch (e) {
            lastErr = e
          }
        }
        return { status: 0, error: String(lastErr?.cause?.code || lastErr?.message || lastErr) }
      })()
    )
  }
  return pages.get(target)
}

const problems = []
const unreachable = new Set()
let checked = 0

// Shape checks first: they need no network.
if (!/^\d{4}-\d{2}-\d{2}$/.test(CHEAT_CODES_CHECKED)) problems.push(`CHEAT_CODES_CHECKED must be YYYY-MM-DD, got "${CHEAT_CODES_CHECKED}"`)
const toolIds = new Set()
for (const tool of CHEAT_CODE_TOOLS) {
  if (toolIds.has(tool.id)) problems.push(`duplicate tool id ${tool.id}`)
  toolIds.add(tool.id)
  if (!CHEAT_CODES_SEEN[tool.id]) problems.push(`${tool.id}: missing CHEAT_CODES_SEEN entry`)
  if (tool.codes.length > MAX_PER_TOOL) problems.push(`${tool.id}: ${tool.codes.length} codes, max is ${MAX_PER_TOOL}`)
  const keys = new Set()
  for (const c of tool.codes) {
    const label = `${tool.id} ${c.code}${c.where ? ` [${c.where}]` : ''}`
    const key = `${c.code}|${c.where || ''}`
    if (keys.has(key)) problems.push(`${label}: duplicate code+where`)
    keys.add(key)
    if (!['copy', 'key'].includes(c.kind)) problems.push(`${label}: kind must be 'copy' or 'key'`)
    if (!c.does || !c.source) problems.push(`${label}: needs does and source`)
    if (!Array.isArray(c.proof) || c.proof.length === 0) problems.push(`${label}: needs at least one proof snippet`)
    if (c.added && !/^\d{4}-\d{2}-\d{2}$/.test(c.added)) problems.push(`${label}: added must be YYYY-MM-DD`)
  }
}

// Then fetch and look for every proof.
const jobs = []
for (const tool of CHEAT_CODE_TOOLS) {
  if (only && tool.id !== only) continue
  jobs.push(load(tool.docs).then((p) => {
    if (p.status === 0) unreachable.add(`${new URL(tool.docs).hostname} (${p.error})`)
    else if (p.status >= 400) problems.push(`${tool.id}: docs link ${tool.docs} answered ${p.status}`)
  }))
  for (const c of tool.codes) {
    const label = `${tool.id} ${c.code}${c.where ? ` [${c.where}]` : ''}`
    for (const item of c.proof || []) {
      const [url, text] = Array.isArray(item) ? item : [c.source, item]
      jobs.push(
        load(url).then((p) => {
          checked++
          if (p.status === 0) {
            unreachable.add(`${new URL(url).hostname} (${p.error})`)
          } else if (p.status >= 400) {
            problems.push(`${label}: ${url} answered ${p.status}`)
          } else if (!p.text.includes(norm(text))) {
            problems.push(`${label}: proof not found on ${url}\n      "${text}"`)
          }
        })
      )
    }
  }
}
await Promise.all(jobs)

const total = CHEAT_CODE_TOOLS.filter((t) => !only || t.id === only).reduce((n, t) => n + t.codes.length, 0)
if (problems.length) {
  console.error(`check-cheat-codes: ${problems.length} problem(s)\n`)
  for (const p of problems) console.error(`  FAIL ${p}`)
} else {
  console.log(`check-cheat-codes: ok (${total} codes, ${checked} proofs checked against their official sources)`)
}
if (unreachable.size) {
  console.error(`check-cheat-codes: could not reach ${[...unreachable].join(', ')}. Anything on those hosts was not checked.`)
}
if (problems.length) process.exit(1)
if (unreachable.size) process.exit(2)
