// RFC 9728 protected-resource metadata: tells OAuth clients which
// authorization server protects the MCP endpoint.

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
