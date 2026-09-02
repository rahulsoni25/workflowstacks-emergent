// Compile a WorkflowStacks catalog entry into a real Anthropic Agent Skill
// (SKILL.md + zip package) that installs into Claude apps, Claude Code, and
// the API. This powers the "Use with Claude" panel and the MCP connector —
// the no-Agent-Builder install paths.
//
// Server-only: imported by API routes. The client-side panel builds its own
// command strings so this module (and the mongo driver) stays out of the
// browser bundle.

import { getDb } from '@/lib/mongo'

// Canonical public host for links baked into generated skills. Falls back to
// the apex domain so packages compiled locally still point somewhere real.
export const SITE = process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks.com'

// ---------------------------------------------------------------------------
// Loading — Mongo when configured (production), public API otherwise (local
// dev has no Mongo; the pages already use this same fallback pattern).
// ---------------------------------------------------------------------------

export async function loadSkill(key) {
  if (!key) return null
  if (process.env.MONGO_URL) {
    try {
      const db = await getDb()
      const skill =
        (await db.collection('skills').findOne({ slug: key })) ||
        (await db.collection('skills').findOne({ id: key }))
      if (skill) return skill
    } catch {}
  }
  try {
    const res = await fetch(`${SITE}/api/skills/${encodeURIComponent(key)}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.skill || null
  } catch {
    return null
  }
}

export async function searchSkills({ query = '', category = '', limit = 8 } = {}) {
  const params = new URLSearchParams()
  if (query) params.set('search', query)
  if (category) params.set('category', category)
  params.set('limit', String(Math.min(Math.max(1, limit), 20)))
  try {
    const res = await fetch(`${SITE}/api/skills?${params}`, {
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.skills || []
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// SKILL.md compiler
// ---------------------------------------------------------------------------

export function skillSlug(skill) {
  const raw = skill.slug || skill.title_human || skill.name || skill.id || 'skill'
  return String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'skill'
}

// Frontmatter values go in double quotes; YAML needs backslashes and quotes
// escaped, and the spec caps description at 1024 chars.
function yamlString(s, max) {
  const clean = String(s || '').replace(/\s+/g, ' ').trim().slice(0, max)
  return `"${clean.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function frontDescription(skill) {
  const what = skill.description_human || skill.description || skill.explainer?.what_it_is || ''
  const when = skill.use_guide?.whenToUse?.length
    ? ` Use when the user wants to: ${skill.use_guide.whenToUse.slice(0, 3).join('; ')}.`
    : skill.explainer?.use_case_example
      ? ` Use for tasks like: ${skill.explainer.use_case_example}`
      : ''
  return (what + when).slice(0, 1000)
}

export function compileSkillMd(skill) {
  const slug = skillSlug(skill)
  const title = skill.title_human || skill.name || slug
  const guide = skill.use_guide || {}
  const ex = skill.explainer || {}
  const pageUrl = `${SITE}/skills/${skill.slug || skill.id}`

  const lines = []
  lines.push('---')
  lines.push(`name: ${slug}`)
  lines.push(`description: ${yamlString(frontDescription(skill), 1024)}`)
  lines.push('---')
  lines.push('')
  lines.push(`# ${title}`)
  lines.push('')

  const what = guide.whatItDoes || ex.what_it_is || skill.description_human || skill.description
  if (what) {
    lines.push('## What this skill does')
    lines.push(what)
    lines.push('')
  }

  if (guide.whenToUse?.length) {
    lines.push('## When to use it')
    for (const w of guide.whenToUse) lines.push(`- ${w}`)
    lines.push('')
  }

  lines.push('## Instructions')
  if (guide.quickStart?.length) {
    guide.quickStart.forEach((s, i) => lines.push(`${i + 1}. ${s}`))
  } else {
    lines.push(`1. Understand what the user wants to achieve with ${title}.`)
    lines.push('2. Apply the capability described above to their request, step by step.')
    lines.push('3. If setup is required (see below), walk the user through it first.')
  }
  lines.push('')

  lines.push('## When this skill is first used in a conversation')
  lines.push('Introduce yourself before doing anything else:')
  lines.push('1. In one sentence, say what you can now help with thanks to this skill.')
  lines.push('2. Offer 2-3 concrete example requests the user could make right now (draw them from "When to use it" above), phrased as things they can say to you.')
  lines.push('3. Ask which one they want — or what else they have in mind.')
  lines.push('If the underlying tool needs setup that has not happened yet, say exactly what is missing and offer to walk through it — never pretend a capability is ready when it is not.')
  lines.push('')

  if (guide.install || ex.time_to_setup) {
    lines.push('## Setup (if the underlying tool is not installed yet)')
    if (guide.install) {
      lines.push('```bash')
      lines.push(guide.install)
      lines.push('```')
    }
    if (ex.time_to_setup) lines.push(`Typical setup time: ${ex.time_to_setup}.`)
    if (ex.cost_to_run) lines.push(`Typical running cost: ${ex.cost_to_run}.`)
    lines.push('')
  }

  if (guide.examplePrompt) {
    lines.push('## Example request this skill should handle well')
    lines.push('```')
    lines.push(guide.examplePrompt)
    lines.push('```')
    lines.push('')
  }

  if (guide.gotcha || ex.common_confusions) {
    lines.push('## Watch out')
    if (guide.gotcha) lines.push(`- ${guide.gotcha}`)
    if (ex.common_confusions) lines.push(`- ${ex.common_confusions}`)
    lines.push('')
  }

  if (skill.readme_preview) {
    lines.push('## Reference (from the project README)')
    lines.push('```')
    lines.push(String(skill.readme_preview).trim())
    lines.push('```')
    lines.push('')
  }

  lines.push('## Source and attribution')
  if (skill.github_url) {
    const stars = skill.github_stars ? ` (${skill.github_stars.toLocaleString('en-US')} stars)` : ''
    lines.push(`- Open source project: ${skill.github_url}${stars}`)
  }
  if (skill.creator) lines.push(`- Creator: ${skill.creator}`)
  lines.push(`- Full guide on WorkflowStacks: ${pageUrl}`)
  lines.push('')

  return { slug, title, markdown: lines.join('\n') }
}

// Compact prompt for "Try instantly" deep links / copy-paste. Deep links cap
// out around 14k URL-encoded chars; stay well under so mobile handles it too.
export function starterPrompt(skill, { maxChars = 5500 } = {}) {
  const { title, markdown } = compileSkillMd(skill)
  const body = markdown.replace(/^---[\s\S]*?---\n/, '').trim()
  const clipped = body.length > maxChars ? body.slice(0, maxChars) + '\n…(trimmed)' : body
  const pageUrl = `${SITE}/skills/${skill.slug || skill.id}`
  return [
    `Load the following skill for this conversation and follow its instructions whenever they apply. Full version: ${pageUrl}`,
    '',
    clipped,
    '',
    `To start: introduce this skill in 2-3 sentences — what you can now help me do and 2-3 example requests I could make — then ask what I want to tackle first.`,
  ].join('\n')
}

// Tool-agnostic "clone it and get it running" prompt for agentic editors
// (Cursor, Antigravity, Windsurf, VS Code Copilot, Claude Code…). Where the
// starter prompt makes Claude ACT AS the skill, this one makes an agent BUILD
// the underlying tool from its repository.
export function setupPrompt(skill) {
  const title = skill.title_human || skill.name || 'this tool'
  const guide = skill.use_guide || {}
  const ex = skill.explainer || {}
  const pageUrl = `${SITE}/skills/${skill.slug || skill.id}`
  const goal = ex.use_case_example || guide.whenToUse?.[0] || guide.whatItDoes || ''

  const lines = [`Set up ${title} on my machine and get it running.`, '']
  if (skill.github_url) {
    lines.push(`Repository: ${skill.github_url}`, '')
    lines.push('Steps:')
    lines.push(`1. Clone the repository: git clone ${skill.github_url}`)
    lines.push('2. Open the project and read its README — treat it as the source of truth for setup.')
    lines.push(
      guide.install
        ? `3. Install dependencies. Hint from the docs: ${guide.install}`
        : '3. Install dependencies with the project’s standard tooling.'
    )
    lines.push('4. Do any configuration the README requires (env vars, API keys). If anything blocks a complete setup — a missing key, an OS/app requirement this machine does not meet, a paid dependency — STOP and ask me targeted questions: what is needed, why, and what my options are. Never guess credentials or silently skip a step.')
    lines.push('5. Verify it runs end to end: run the README’s own example or smoke test and show me the real output as proof.')
    lines.push(`6. Finish with a short briefing: what this tool can now do for me, 3 concrete things to try first (exact commands or prompts)${goal ? `, starting with: ${goal}` : ''}, and anything it is NOT suited for.`)
  } else {
    lines.push('Follow the setup instructions in the guide below, verify it works, then brief me: what it can now do, 3 things to try first, and anything it is not suited for. If something blocks a complete setup, stop and ask me targeted questions rather than guessing.')
  }
  lines.push('')
  const what = skill.description_human || skill.description || ex.what_it_is
  if (what) lines.push(`Context — what this tool is: ${what}`)
  if (guide.gotcha) lines.push(`Watch out: ${guide.gotcha}`)
  lines.push(`Full guide: ${pageUrl}`)
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Zip packaging — store-only (no compression), zero dependencies. Skill
// packages are a few KB of markdown; simplicity beats a jszip dependency.
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function dosDateTime(d = new Date()) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)
  const date = (((d.getFullYear() - 1980) & 0x7f) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  return { time, date }
}

// files: [{ name: 'folder/SKILL.md', data: Buffer|string }]
export function buildZip(files) {
  const { time, date } = dosDateTime()
  const chunks = []
  const central = []
  let offset = 0

  for (const f of files) {
    const data = Buffer.isBuffer(f.data) ? f.data : Buffer.from(String(f.data), 'utf8')
    const name = Buffer.from(f.name, 'utf8')
    const crc = crc32(data)

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4) // version needed
    local.writeUInt16LE(0x0800, 6) // UTF-8 names
    local.writeUInt16LE(0, 8) // method: store
    local.writeUInt16LE(time, 10)
    local.writeUInt16LE(date, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28)
    chunks.push(local, name, data)

    const dir = Buffer.alloc(46)
    dir.writeUInt32LE(0x02014b50, 0)
    dir.writeUInt16LE(20, 4) // version made by
    dir.writeUInt16LE(20, 6) // version needed
    dir.writeUInt16LE(0x0800, 8)
    dir.writeUInt16LE(0, 10)
    dir.writeUInt16LE(time, 12)
    dir.writeUInt16LE(date, 14)
    dir.writeUInt32LE(crc, 16)
    dir.writeUInt32LE(data.length, 20)
    dir.writeUInt32LE(data.length, 24)
    dir.writeUInt16LE(name.length, 28)
    // extra/comment/disk/attrs stay zero
    dir.writeUInt32LE(offset, 42)
    central.push(Buffer.concat([dir, name]))

    offset += 30 + name.length + data.length
  }

  const centralBuf = Buffer.concat(central)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(files.length, 8)
  eocd.writeUInt16LE(files.length, 10)
  eocd.writeUInt32LE(centralBuf.length, 12)
  eocd.writeUInt32LE(offset, 16)
  chunks.push(centralBuf, eocd)

  return Buffer.concat(chunks)
}

export function buildSkillZip(skill) {
  const { slug, title, markdown } = compileSkillMd(skill)
  return {
    slug,
    title,
    filename: `${slug}-claude-skill.zip`,
    buffer: buildZip([{ name: `${slug}/SKILL.md`, data: markdown }]),
  }
}
