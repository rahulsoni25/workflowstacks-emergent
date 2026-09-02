// RFC 8414 authorization-server metadata for the MCP connector's OAuth.
// claude.ai (and other MCP clients) fetch this to discover our endpoints.
// The issuer is derived from the request origin so previews stay
// self-consistent.

export const dynamic = 'force-dynamic'

export function GET(request) {
  const base = new URL(request.url).origin
  return Response.json(
    {
      issuer: base,
      authorization_endpoint: `${base}/oauth/authorize`,
      token_endpoint: `${base}/api/oauth/token`,
      registration_endpoint: `${base}/api/oauth/register`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
      scopes_supported: ['mcp'],
    },
    { headers: { 'Cache-Control': 'public, max-age=3600' } }
  )
}
