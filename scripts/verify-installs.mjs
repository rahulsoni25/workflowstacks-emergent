#!/usr/bin/env node
// Verified-install runner. Executed by .github/workflows/verify-installs.yml
// in a throwaway CI runner: pulls candidates from the site's admin API,
// actually performs each allowlisted package install (pip into a fresh venv,
// npm into a local prefix — never -g, never a shell string), and reports
// pass/fail back so the site can show a "✓ Install verified" badge.
//
// Env: VERIFY_BASE (default https://workflowstacks.com), ADMIN_SECRET,
//      VERIFY_LIMIT (default 10).

import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseSafeInstall } from '../lib/safe-install.mjs'

const BASE = process.env.VERIFY_BASE || 'https://workflowstacks.com'
const SECRET = process.env.ADMIN_SECRET
const LIMIT = parseInt(process.env.VERIFY_LIMIT || '10', 10)
const TIMEOUT_MS = 5 * 60 * 1000

if (!SECRET) {
  console.error('ADMIN_SECRET is required')
  process.exit(1)
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const started = Date.now()
    execFile(cmd, args, { timeout: TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024, ...opts }, (err, stdout, stderr) => {
      resolve({ ok: !err, durationMs: Date.now() - started, log: `${stdout || ''}\n${stderr || ''}${err ? `\n${err.message}` : ''}` })
    })
  })
}

async function verifyOne(c) {
  // Defense in depth: re-parse locally; never trust the API's kind/pkg blindly.
  const parsed = parseSafeInstall(c.install)
  if (!parsed) return { ok: false, method: 'skipped: install command not in allowlist', durationMs: 0, log: c.install }

  const dir = await mkdtemp(join(tmpdir(), 'ws-verify-'))
  try {
    if (parsed.kind === 'pip') {
      const venv = join(dir, 'venv')
      const mk = await run('python3', ['-m', 'venv', venv])
      if (!mk.ok) return { ok: false, method: 'python3 -m venv', ...mk }
      const res = await run(join(venv, 'bin', 'pip'), ['install', '--no-input', '--disable-pip-version-check', parsed.pkg])
      return { ...res, method: `pip install ${parsed.pkg} (fresh venv)` }
    }
    // npm: local prefix, no scripts — install-time scripts are the attack surface.
    const res = await run('npm', ['install', '--prefix', dir, '--no-audit', '--no-fund', '--ignore-scripts', parsed.pkg])
    return { ...res, method: `npm install ${parsed.pkg} (local prefix, --ignore-scripts)` }
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

async function main() {
  const res = await fetch(`${BASE}/api/verify-install?limit=${LIMIT}`, { headers: { 'x-admin-secret': SECRET } })
  if (!res.ok) {
    console.error(`candidates fetch failed: ${res.status}`)
    process.exit(1)
  }
  const { candidates = [] } = await res.json()
  console.log(`${candidates.length} candidates`)

  let failures = 0
  for (const c of candidates) {
    console.log(`\n→ ${c.name} (${c.slug || c.id}): ${c.install}`)
    const result = await verifyOne(c)
    console.log(result.ok ? `  ✓ ok in ${result.durationMs}ms` : `  ✗ failed`)
    if (!result.ok) failures++
    const post = await fetch(`${BASE}/api/verify-install`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': SECRET },
      body: JSON.stringify({
        skillId: c.id,
        ok: result.ok,
        method: result.method,
        durationMs: result.durationMs,
        log: (result.log || '').slice(-2000),
      }),
    })
    if (!post.ok) console.error(`  report failed: ${post.status}`)
  }
  console.log(`\ndone: ${candidates.length - failures}/${candidates.length} verified`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
