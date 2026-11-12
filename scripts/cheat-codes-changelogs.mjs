#!/usr/bin/env node
// Prints only what is new in each tool's official changelog since the marker
// in CHEAT_CODES_SEEN (lib/cheat-codes.js), so the daily cheat-codes refresh
// reads a few entries instead of whole pages. See docs/CHEAT_CODES.md.
//
//   npm run cheat-codes-changelogs            all tools
//   npm run cheat-codes-changelogs -- codex   one tool
//
// The last line is a JSON object with each tool's newest marker; copy those
// into CHEAT_CODES_SEEN in the same pull request that acts on them.

import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CHEAT_CODES_SEEN } from '../lib/cheat-codes.js'

const only = process.argv[2]
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const newest = {}

async function get(url) {
  const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(45_000), headers: { 'user-agent': 'cheat-codes-changelogs/1.0' } })
  if (!res.ok) throw new Error(`${url} answered ${res.status}`)
  return res.text()
}

// Visible text of an HTML page, one line per block element.
function pageText(html) {
  return html
    .replace(/<(script|style|svg|noscript)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|li|h[1-6]|div|tr|section|article)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[a-z][^<>]*>/gi, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/[ \t ​]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
}

function printEntries(id, seen, entries, url) {
  console.log(`\n=== ${id}: ${entries.length} new entr${entries.length === 1 ? 'y' : 'ies'} since ${seen} (${url}) ===`)
  for (const e of entries) {
    const body = e.body
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !/^no user-facing changes\.?$/i.test(l))
      .join('\n')
    console.log(`\n--- ${e.label} ---\n${body}`)
  }
}

// Claude Code: CHANGELOG.md, one "## <version>" section per release, newest first.
async function claudeCode() {
  const url = 'https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md'
  const seen = CHEAT_CODES_SEEN['claude-code']
  const md = await get(url)
  const parts = md.split(/^## /m).slice(1)
  const entries = []
  let found = false
  for (const p of parts) {
    const version = p.split('\n', 1)[0].trim()
    if (version === seen) {
      found = true
      break
    }
    entries.push({ label: `Claude Code ${version}`, body: p.slice(version.length) })
  }
  newest['claude-code'] = parts[0]?.split('\n', 1)[0].trim() || seen
  if (!found) console.log(`\n!!! claude-code: marker ${seen} not found in CHANGELOG.md; showing everything above it is unsafe, showing the newest 5 only`)
  printEntries('claude-code', seen, found ? entries : entries.slice(0, 5), url)
}

// Entries headed "<version> ... <date>" in a page's text, newest first;
// keeps the ones dated after `seen` (YYYY-MM-DD).
function datedEntries(text, headingRe, toIso, seen, prefix) {
  const marks = [...text.matchAll(headingRe)]
  const entries = []
  let latest = seen
  for (let i = 0; i < marks.length; i++) {
    const iso = toIso(marks[i])
    if (iso > latest) latest = iso
    if (iso <= seen) continue
    const end = i + 1 < marks.length ? marks[i + 1].index : text.length
    entries.push({ label: `${prefix} v${marks[i][1]} (${iso})`, body: text.slice(marks[i].index + marks[i][0].length, end) })
  }
  return { entries, latest }
}

// Claude Desktop release notes (Cowork is a section of each release):
// "v5.1231.2 2026-11-10 ...".
async function cowork() {
  const url = 'https://claude.com/docs/cowork/changelog'
  const seen = CHEAT_CODES_SEEN.cowork
  const text = pageText(await get(url))
  const { entries, latest } = datedEntries(text, /\bv(\d+\.\d+\.\d+)\s+(\d{4}-\d{2}-\d{2})/g, (m) => m[2], seen, 'Claude Desktop')
  newest.cowork = latest
  printEntries('cowork', seen, entries, url)
}

// Antigravity: App, CLI and IDE release streams on one page, each entry
// "v2.31.0 [Latest] November 9, 2026 ...". Dated, so one marker covers all.
async function antigravity() {
  const url = 'https://antigravity.google/docs/changelog/'
  const seen = CHEAT_CODES_SEEN.antigravity
  const text = pageText(await get(url))
  const re = new RegExp(`\\bv(\\d+\\.\\d+\\.\\d+)\\s+(?:Latest\\s+)?(${MONTHS.join('|')}) (\\d{1,2}), (\\d{4})`, 'g')
  const toIso = (m) => `${m[4]}-${String(MONTHS.indexOf(m[2]) + 1).padStart(2, '0')}-${m[3].padStart(2, '0')}`
  const { entries, latest } = datedEntries(text, re, toIso, seen, 'Antigravity')
  newest.antigravity = latest
  printEntries('antigravity', seen, entries, url)
}

// Codex: no readable changelog from this network, so compare the files the
// entries are proven against between the pinned tag and the newest stable tag.
const CODEX_FILES = [
  'codex-rs/tui/src/slash_command.rs',
  'codex-rs/tui/assets/tooltips.txt',
  'codex-rs/tui/src/keymap.rs',
  'codex-rs/tui/src/bottom_pane/shortcut_overlay.rs',
  'codex-rs/cli/src/main.rs',
]
function semver(tag) {
  return tag.replace(/^rust-v/, '').split('.').map(Number)
}
async function codex() {
  const seen = CHEAT_CODES_SEEN.codex
  const r = spawnSync('git', ['ls-remote', '--tags', '--refs', 'https://github.com/openai/codex', 'rust-v*'], { encoding: 'utf8', timeout: 60_000 })
  if (r.status !== 0) throw new Error(`git ls-remote failed: ${r.stderr || r.error}`)
  const stable = r.stdout
    .split('\n')
    .map((l) => l.split('refs/tags/')[1])
    .filter((t) => t && /^rust-v\d+\.\d+\.\d+$/.test(t))
    .sort((a, b) => {
      const [x, y] = [semver(a), semver(b)]
      return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]
    })
  const latest = stable.at(-1) || seen
  newest.codex = latest
  const between = stable.slice(stable.indexOf(seen) + 1)
  console.log(`\n=== codex: pinned ${seen}, newest stable ${latest}${between.length ? ` (new: ${between.join(', ')})` : ''} ===`)
  if (latest === seen) return
  for (const t of between) console.log(`release notes: https://github.com/openai/codex/releases/tag/${t}`)
  const dir = mkdtempSync(join(tmpdir(), 'codex-diff-'))
  for (const f of CODEX_FILES) {
    const [a, b] = await Promise.all(
      [seen, latest].map((t) => get(`https://raw.githubusercontent.com/openai/codex/${t}/${f}`).catch((e) => `!! ${e.message}\n`))
    )
    if (a === b) {
      console.log(`\n--- ${f}: unchanged ---`)
      continue
    }
    writeFileSync(join(dir, 'a'), a)
    writeFileSync(join(dir, 'b'), b)
    const d = spawnSync('diff', ['-u', '--label', `${seen}/${f}`, '--label', `${latest}/${f}`, join(dir, 'a'), join(dir, 'b')], { encoding: 'utf8' })
    const lines = d.stdout.split('\n')
    console.log(`\n--- ${f}: changed ---\n${lines.slice(0, 400).join('\n')}${lines.length > 400 ? `\n... (${lines.length - 400} more diff lines)` : ''}`)
  }
}

const tasks = { 'claude-code': claudeCode, cowork, antigravity, codex }
let failed = false
for (const [id, fn] of Object.entries(tasks)) {
  if (only && id !== only) continue
  try {
    await fn()
  } catch (e) {
    failed = true
    console.log(`\n!!! ${id}: ${e.message}`)
  }
}
console.log(`\nNEWEST_MARKERS ${JSON.stringify(newest)}`)
if (failed) process.exit(2)
