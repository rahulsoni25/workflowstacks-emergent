// Path-suffixed variant of the protected-resource metadata (RFC 9728 §3.1):
// some clients request /.well-known/oauth-protected-resource/api/mcp for the
// resource at /api/mcp. Same document as the base path. Written out in full —
// Next's route-segment analyzer wants config declared per file.

export const dynamic = 'force-dynamic'

export function GET(request) {
  const base = new URL(request.url).origin
  return Response.json(
    {
      resource: `${base}/api/mcp`,
      authorization_servers: [base],
      bearer_methods_supported: ['header'],
    },
    { headers: { 'Cache-Control': 'public, max-age=3600' } }
  )
}
