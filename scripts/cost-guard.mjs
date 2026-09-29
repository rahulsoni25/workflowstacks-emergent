#!/usr/bin/env node
// Fails when a change would put the site back over Vercel's Hobby caps.
// The rules and the reasons are in docs/COSTS.md. No dependencies: run with
// `node scripts/cost-guard.mjs` (or `npm run cost-guard`).
//
// To exempt one line, end it with:  // cost-guard: allow <reason>
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = process.cwd()
const MIN_REVALIDATE = 21600 // 6 hours
const MIN_CRON_HOURS = 6
const problems = []
const rel = (p) => relative(ROOT, p).split(sep).join('/')

function walk(dir, out = []) {
  let names
  try { names = readdirSync(dir) } catch { return out }
  for (const name of names) {
    if (name === 'node_modules' || name === '.next' || name === '.git') continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}
const lines = (file) => readFileSync(file, 'utf8').split(/\r?\n/)
const allowed = (line) => /cost-guard:\s*allow/.test(line)

// Rule 3 — nothing a page is built from revalidates more often than 6 hours.
// Route handlers under app/api are request-time code, not ISR pages.
const pageSide = [...walk(join(ROOT, 'app')), ...walk(join(ROOT, 'lib')), ...walk(join(ROOT, 'components'))]
  .filter((f) => /\.(js|jsx|mjs|ts|tsx)$/.test(f) && !rel(f).startsWith('app/api/'))
for (const file of pageSide) {
  lines(file).forEach((line, i) => {
    if (allowed(line)) return
    const m = line.match(/export const revalidate\s*=\s*(\d+)/) || line.match(/\brevalidate:\s*(\d+)/)
    if (!m) return
    const n = Number(m[1])
    if (n > 0 && n < MIN_REVALIDATE) {
      problems.push(`${rel(file)}:${i + 1}  revalidate ${n}s is under ${MIN_REVALIDATE}s (6h)`)
    }
  })
}

// Rule 4 — a route handler that calls fetch() must not fall back on Next 14's
// default ("auto cache"). Either the file opts out, or every call says what it
// wants: cache: 'no-store', or an explicit next.revalidate (checked by rule 3
// when the route is prerendered, e.g. llms.txt).
const routes = walk(join(ROOT, 'app')).filter((f) => /(^|\/)route\.(js|ts)$/.test(rel(f)))
for (const file of routes) {
  const src = readFileSync(file, 'utf8')
  const calls = (src.match(/(?<![.\w])fetch\(/g) || []).length
  if (!calls) continue
  const fileWide = /export const fetchCache\s*=\s*['"](default-no-store|force-no-store|only-no-store)['"]/.test(src)
    || /export const dynamic\s*=\s*['"]force-dynamic['"]/.test(src)
  if (fileWide) continue
  const explicit = (src.match(/cache:\s*['"]no-store['"]/g) || []).length
    + (src.match(/next:\s*\{\s*revalidate:/g) || []).length
  if (explicit < calls) {
    problems.push(`${rel(file)}  ${calls} fetch() call(s), ${explicit} with an explicit cache setting — add: export const fetchCache = 'default-no-store'`)
  }
}

// Rule 6 — a workflow that calls the site must not run more often than every
// 6 hours. Jobs that do their work in the runner are not limited.
function runsPerDay(cron) {
  const [min, hour] = cron.trim().split(/\s+/)
  const count = (field, span) => {
    if (field === '*') return span
    let n = 0
    for (const part of field.split(',')) {
      const step = part.match(/^(\*|\d+-\d+)\/(\d+)$/)
      if (step) {
        const [lo, hi] = step[1] === '*' ? [0, span - 1] : step[1].split('-').map(Number)
        n += Math.floor((hi - lo) / Number(step[2])) + 1
      } else if (/^\d+-\d+$/.test(part)) {
        const [lo, hi] = part.split('-').map(Number); n += hi - lo + 1
      } else n += 1
    }
    return n
  }
  return count(min, 60) * count(hour, 24)
}
for (const file of walk(join(ROOT, '.github', 'workflows')).filter((f) => /\.ya?ml$/.test(f))) {
  const src = readFileSync(file, 'utf8')
  const callsSite = /\$\{?\{?\s*(env\.)?BASE_URL|\$BASE_URL|workflowstacks\.com\/api/.test(src) && /curl/.test(src)
  if (!callsSite) continue
  lines(file).forEach((line, i) => {
    if (allowed(line)) return
    const m = line.match(/cron:\s*['"]([^'"]+)['"]/)
    if (!m) return
    const perDay = runsPerDay(m[1])
    if (perDay > 24 / MIN_CRON_HOURS) {
      problems.push(`${rel(file)}:${i + 1}  cron '${m[1]}' runs ${perDay}x a day and calls the site — limit is ${24 / MIN_CRON_HOURS}x (move the work into the runner)`)
    }
  })
}

if (problems.length) {
  console.error(`cost-guard: ${problems.length} problem(s) — see docs/COSTS.md\n`)
  for (const p of problems) console.error('  ' + p)
  process.exit(1)
}
console.log(`cost-guard: ok (${pageSide.length} page-side files, ${routes.length} route handlers checked)`)
