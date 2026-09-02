// GET /api/commands/:slug — raw command file for one-line installs:
//   mkdir -p .claude/commands && curl -fsSL <here> -o .claude/commands/<slug>.md
// Serves the exact verified content from lib/commands.js (the same text the
// page shows), so the curl path and the copy-paste path can never diverge.

import { getSlashCommand } from '@/lib/commands'

export const dynamic = 'force-dynamic'

export function GET(request, { params }) {
  const cmd = getSlashCommand(params.slug)
  if (!cmd) return Response.json({ error: 'Command not found' }, { status: 404 })
  return new Response(cmd.content, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=86400',
    },
  })
}
