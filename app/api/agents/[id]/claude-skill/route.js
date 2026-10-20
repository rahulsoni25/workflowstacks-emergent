// GET /api/agents/:id/claude-skill        → agent blueprint as SKILL.md
// GET /api/agents/:id/claude-skill?format=zip → installable skill package
//
// Loads the agent through the PUBLIC /api/agents endpoint (never Mongo
// directly) so paid-agent blueprint redaction is inherited: that endpoint
// withholds a paid blueprint unless ?unlock= carries a valid purchase token
// (lib/agent-access), and this route forwards the token it was given. No
// valid token → no blueprint in the response → 403 here.

import { compileAgentSkillMd, buildAgentSkillZip, checkAgentSafety, SITE } from '@/lib/claude-skill'
import { readUnlockToken } from '@/lib/agent-access'

export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  const unlock = readUnlockToken(request)
  let agent = null
  try {
    // A tokenised URL is unique per buyer: never let it into the fetch cache
    // (each miss would be an ISR write that is never read back).
    const res = await fetch(
      `${SITE}/api/agents/${encodeURIComponent(params.id)}${unlock ? `?unlock=${encodeURIComponent(unlock)}` : ''}`,
      unlock
        ? { cache: 'no-store', signal: AbortSignal.timeout(10_000) }
        : { next: { revalidate: 300 }, signal: AbortSignal.timeout(10_000) }
    )
    if (res.ok) {
      const data = await res.json()
      agent = data?.agent || data || null
    }
  } catch {}

  if (!agent?.id) return Response.json({ error: 'Agent not found' }, { status: 404 })
  if (!agent.agentBlueprint) {
    return Response.json({ error: 'Blueprint locked — purchase required' }, { status: 403 })
  }

  const safety = checkAgentSafety(agent)
  if (safety.blocked) {
    return Response.json(
      { error: 'This agent did not pass automated content-safety review and cannot be installed.', reasons: safety.reasons },
      { status: 422 }
    )
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
