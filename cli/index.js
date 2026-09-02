#!/usr/bin/env node
// workflowstacks — terminal installer for WorkflowStacks skills.
//
//   npx workflowstacks add <slug> [--project]   install a skill
//   npx workflowstacks mcp                      print the connector command
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
`)
  process.exit(code)
}

if (!cmd || cmd === 'help' || cmd === '--help') usage()

if (cmd === 'mcp') {
  console.log(`Add the whole catalog to Claude Code:\n\n  claude mcp add --transport http workflowstacks ${BASE}/api/mcp\n`)
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
