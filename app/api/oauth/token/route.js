// OAuth 2.1 token endpoint for the MCP connector.
// Accepts application/x-www-form-urlencoded per RFC 6749 (what claude.ai
// sends). Public clients + mandatory PKCE; refresh tokens rotate on use.

import {
  consumeCode,
  saveAccessToken,
  saveRefreshToken,
  consumeRefreshToken,
  getClient,
  newSecret,
  sha256b64url,
  ACCESS_TTL_SECONDS,
} from '@/lib/oauth-store'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store', Pragma: 'no-cache' }

function err(code, description, status = 400) {
  return Response.json({ error: code, error_description: description }, { status, headers: NO_STORE })
}

async function issuePair(libraryId, clientId, scope) {
  const accessToken = newSecret(32)
  const refreshToken = newSecret(32)
  await saveAccessToken(accessToken, { library_id: libraryId, client_id: clientId, scope })
  await saveRefreshToken(refreshToken, { library_id: libraryId, client_id: clientId, scope })
  return Response.json(
    {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: ACCESS_TTL_SECONDS,
      refresh_token: refreshToken,
      scope,
    },
    { headers: NO_STORE }
  )
}

export async function POST(request) {
  let form
  try {
    form = await request.formData() // handles x-www-form-urlencoded
  } catch {
    return err('invalid_request', 'Body must be application/x-www-form-urlencoded')
  }
  const get = (k) => String(form.get(k) || '')
  const grantType = get('grant_type')
  const clientId = get('client_id')

  if (grantType === 'authorization_code') {
    const code = get('code')
    const verifier = get('code_verifier')
    const redirectUri = get('redirect_uri')
    if (!code || !verifier || !clientId) return err('invalid_request', 'code, code_verifier and client_id are required')

    const grant = await consumeCode(code) // single use — gone even on failure below
    if (!grant) return err('invalid_grant', 'Authorization code is invalid or expired')
    if (grant.client_id !== clientId) return err('invalid_grant', 'Code was issued to a different client')
    if (grant.redirect_uri !== redirectUri) return err('invalid_grant', 'redirect_uri does not match')
    if (sha256b64url(verifier) !== grant.code_challenge) return err('invalid_grant', 'PKCE verification failed')

    return issuePair(grant.library_id, clientId, grant.scope || 'mcp')
  }

  if (grantType === 'refresh_token') {
    const refresh = get('refresh_token')
    if (!refresh) return err('invalid_request', 'refresh_token is required')
    const grant = await consumeRefreshToken(refresh) // rotation: old one is now dead
    if (!grant) return err('invalid_grant', 'Refresh token is invalid or expired')
    if (clientId && grant.client_id !== clientId) return err('invalid_grant', 'Token was issued to a different client')
    // Sanity: the client must still exist (deleted registrations lose access).
    if (!(await getClient(grant.client_id))) return err('invalid_grant', 'Client no longer registered')
    return issuePair(grant.library_id, grant.client_id, grant.scope || 'mcp')
  }

  return err('unsupported_grant_type', 'Use authorization_code or refresh_token')
}
