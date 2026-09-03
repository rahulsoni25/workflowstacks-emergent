// GET /api/skills/:id/claude-skill        → compiled SKILL.md (text/markdown)
// GET /api/skills/:id/claude-skill?format=zip → installable skill package
// GET /api/skills/:id/claude-skill?format=prompt → compact starter prompt (text)
//
// This is the install surface behind the "Use with Claude" panel: Claude Code
// curls the markdown straight into ~/.claude/skills/<slug>/SKILL.md, the
// Claude apps take the zip via Settings → Capabilities → Skills, and deep
// links / the MCP connector use the prompt and markdown forms.

import { loadSkill, compileSkillMd, buildSkillZip, starterPrompt, setupPrompt, checkSkillSafety } from '@/lib/claude-skill'

export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  const skill = await loadSkill(params.id)
  if (!skill) {
    return Response.json({ error: 'Skill not found' }, { status: 404 })
  }

  // Every compiler below fails safe on its own (never leaks flagged content),
  // but a real 422 here — instead of a 200 whose body happens to be a refusal
  // notice — is what lets a caller (the install UI, an MCP client) show a
  // clear "this was withheld" state rather than silently pasting whatever
  // text came back.
  const safety = checkSkillSafety(skill)
  if (safety.blocked) {
    return Response.json(
      { error: 'This listing did not pass automated content-safety review and cannot be installed.', reasons: safety.reasons },
      { status: 422 }
    )
  }

  const format = new URL(request.url).searchParams.get('format') || 'md'

  if (format === 'zip') {
    const { filename, buffer } = buildSkillZip(skill)
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=0, s-maxage=3600',
      },
    })
  }

  // 'prompt' = act as the skill in a chat; 'setup' = clone the repo and get
  // the underlying tool running (for agentic editors: Cursor, Antigravity…).
  if (format === 'prompt' || format === 'setup') {
    return new Response(format === 'setup' ? setupPrompt(skill) : starterPrompt(skill), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=0, s-maxage=3600',
      },
    })
  }

  const { markdown } = compileSkillMd(skill)
  return new Response(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  })
}
