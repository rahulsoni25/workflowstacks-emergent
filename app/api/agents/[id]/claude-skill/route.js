// GET /api/agents/:id/claude-skill        → agent blueprint as SKILL.md
// GET /api/agents/:id/claude-skill?format=zip → installable skill package
//
// Loads the agent through the PUBLIC /api/agents endpoint (never Mongo
// directly) so paid-agent blueprint redaction is inherited: if the public
// API withholds the blueprint, this route refuses too.

import { compileAgentSkillMd, buildAgentSkillZip, SITE } from '@/lib/claude-skill'

export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  let agent = null
  try {
    const res = await fetch(`${SITE}/api/agents/${encodeURIComponent(params.id)}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(10_000),
    })
    if (res.ok) {
      const data = await res.json()
      agent = data?.agent || data || null
    }
  } catch {}

  if (!agent?.id) return Response.json({ error: 'Agent not found' }, { status: 404 })
  if (!agent.agentBlueprint) {
    return Response.json({ error: 'Blueprint locked — purchase required' }, { status: 403 })
  }

  const format = new URL(request.url).searchParams.get('format') || 'md'
  if (format === 'zip') {
    const { filename, buffer } = buildAgentSkillZip(agent)
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  }
  const { markdown } = compileAgentSkillMd(agent)
  return new Response(markdown, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
