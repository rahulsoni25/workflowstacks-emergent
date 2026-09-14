#!/usr/bin/env node
// workflowstacks — terminal installer for WorkflowStacks skills.
//
//   npx workflowstacks add <slug> [--project]   install a skill
//   npx workflowstacks mcp                      print the connector command
//   npx workflowstacks hot                      this week's fastest-growing skills
//   npx workflowstacks subscribe <email>        the Monday digest, in your inbox
//
// Zero dependencies; Node 18+ (built-in fetch).

import { mkdir, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

const BASE = process.env.WORKFLOWSTACKS_BASE || 'https://workflowstacks.com'
const [cmd, arg, ...rest] = process.argv.slice(2)

function usage(code = 0) {
  console.log(`workflowstacks — install AI skills from ${BASE}

  npx workflowstacks add <slug>       install into ~/.claude/skills/
  npx workflowstacks add <slug> --project   install into ./.claude/skills/
  npx workflowstacks mcp              show the MCP connector command
  npx workflowstacks hot              the five skills gaining the most GitHub stars this week
  npx workflowstacks subscribe <email>   get that list every Monday
`)
  process.exit(code)
}

if (!cmd || cmd === 'help' || cmd === '--help') usage()

if (cmd === 'mcp') {
  console.log(`Add the whole catalog to Claude Code:\n\n  claude mcp add --transport http workflowstacks ${BASE}/api/mcp\n`)
  process.exit(0)
}

if (cmd === 'hot') {
  const res = await fetch(`${BASE}/api/hot`)
  if (!res.ok) { console.error(`✗ Could not load the Hot list (${res.status}). See ${BASE}/hot`); process.exit(1) }
  const { hot = [] } = await res.json()
  if (!hot.length) { console.log(`Velocity data is still accumulating — see ${BASE}/hot`); process.exit(0) }
  console.log('🔥 Hot this week — ranked by GitHub stars gained in the last 7 days\n')
  for (const [i, s] of hot.slice(0, 5).entries()) {
    console.log(`  ${i + 1}. ${s.title_human || s.name}  +${s.velocity_7d}★  (${(s.github_stars || 0).toLocaleString('en-US')} total)`)
    console.log(`     npx workflowstacks add ${s.slug || s.id}`)
  }
  console.log(`\nFull list: ${BASE}/hot · every Monday: npx workflowstacks subscribe you@example.com`)
  process.exit(0)
}

if (cmd === 'subscribe') {
  const email = String(arg || '').trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error('Usage: npx workflowstacks subscribe you@example.com')
    process.exit(1)
  }
  const res = await fetch(`${BASE}/api/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, source: 'cli', frequency: 'weekly' }),
  })
  if (!res.ok) { console.error(`✗ Could not subscribe right now (${res.status}). Try ${BASE}/newsletter`); process.exit(1) }
  console.log(`✓ ${email} gets the Monday digest: the five fastest-growing open-source AI skills, ranked by GitHub star growth.`)
  console.log('  Every email has a one-click unsubscribe.')
  process.exit(0)
}

if (cmd !== 'add' || !arg) usage(1)

const slug = arg.replace(/[^A-Za-z0-9._-]/g, '')
if (!slug) usage(1)

const res = await fetch(`${BASE}/api/skills/${slug}/claude-skill`)
if (!res.ok) {
  console.error(`✗ Skill "${slug}" not found (${res.status}). Browse ${BASE}/skills`)
  process.exit(1)
}
const markdown = await res.text()

const root = rest.includes('--project') || arg === '--project' ? process.cwd() : homedir()
const dir = join(root, '.claude', 'skills', slug)
await mkdir(dir, { recursive: true })
await writeFile(join(dir, 'SKILL.md'), markdown, 'utf8')

console.log(`✓ Installed "${slug}" → ${join(dir, 'SKILL.md')}`)
console.log(`  Claude Code picks it up automatically. Full guide: ${BASE}/skills/${slug}`)
console.log(`  Tip: the five skills gaining the most stars each week → npx workflowstacks hot`)
