// RFC 7591 Dynamic Client Registration for the MCP connector.
// claude.ai registers itself here before starting the authorization flow.
// Public clients only (no secret; PKCE is mandatory at /oauth/authorize).
//
// Redirect URIs are restricted to Anthropic surfaces and loopback (for
// Claude Code / desktop clients) so a registration can't point codes at an
// arbitrary site.

import { saveClient, randomUUID } from '@/lib/oauth-store'

export const dynamic = 'force-dynamic'

function redirectAllowed(uri) {
  let u
  try {
    u = new URL(uri)
  } catch {
    return false
  }
  const host = u.hostname.toLowerCase()
  const loopback = host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1'
  if (loopback) return u.protocol === 'http:' || u.protocol === 'https:'
  if (u.protocol !== 'https:') return false
  return (
    host === 'claude.ai' ||
    host === 'claude.com' ||
    host.endsWith('.claude.ai') ||
    host.endsWith('.claude.com') ||
    host === 'anthropic.com' ||
    host.endsWith('.anthropic.com')
  )
}

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_client_metadata', error_description: 'Body must be JSON' }, { status: 400 })
  }
  const uris = Array.isArray(body?.redirect_uris) ? body.redirect_uris.filter((u) => typeof u === 'string') : []
  if (uris.length === 0 || uris.length > 10 || !uris.every(redirectAllowed)) {
    return Response.json(
      { error: 'invalid_redirect_uri', error_description: 'redirect_uris must be Anthropic or loopback URLs' },
      { status: 400 }
    )
  }

  const client = {
    client_id: randomUUID(),
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris: uris,
    client_name: String(body.client_name || '').slice(0, 200) || undefined,
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    created_at: new Date(),
  }
  await saveClient(client)

  const { created_at, ...out } = client
  return Response.json(out, { status: 201, headers: { 'Cache-Control': 'no-store' } })
}
