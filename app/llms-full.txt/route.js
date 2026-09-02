// /llms-full.txt — the deep companion to /llms.txt: the actual skill catalog
// as a machine-readable feed, with per-skill install endpoints. This is what
// lets AI assistants not just cite WorkflowStacks but INSTALL from it — each
// entry links the compiled SKILL.md, so an agent can fetch instructions
// directly.

import { SITE_URL } from '@/lib/schema'

export const revalidate = 86400

async function topSkills() {
  try {
    const res = await fetch(`${SITE_URL}/api/skills?sort=popular&limit=300`, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.skills || []
  } catch {
    return []
  }
}

export async function GET() {
  const skills = await topSkills()
  const lines = [
    '# WorkflowStacks — full skill catalog',
    '',
    '> Free, open-source AI skills installable into Claude, Cursor, and other AI tools.',
    `> Connector for agents: add ${SITE_URL}/api/mcp as an MCP server (tools: search_skills, get_skill, install_skill, list_my_skills).`,
    `> Per-skill install: GET {skill_md} returns a ready-to-use SKILL.md; append ?format=zip for a Claude-app package, ?format=setup for a clone-and-build prompt.`,
    '',
    '## Skills',
    '',
  ]
  for (const s of skills) {
    const slug = s.slug || s.id
    const desc = (s.description_human || s.description || '').replace(/\s+/g, ' ').slice(0, 160)
    lines.push(`- [${s.title_human || s.name}](${SITE_URL}/skills/${slug}): ${desc}`)
    lines.push(`  skill_md: ${SITE_URL}/api/skills/${slug}/claude-skill`)
  }
  lines.push('', `Generated from the live catalog. Directory: ${SITE_URL}/skills · About: ${SITE_URL}/llms.txt`, '')
  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=86400' },
  })
}
