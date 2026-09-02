// OAuth 2.1 authorization endpoint for the MCP connector.
//
// GET renders a one-button consent page ("Connect WorkflowStacks to
// Claude"); POST (the button) mints a single-use authorization code and
// redirects back to the client. There are no user accounts: approving binds
// the connection to an anonymous library id kept in a long-lived cookie, so
// reconnecting later resumes the same library.
//
// Security: PKCE (S256) is mandatory; redirect_uri must exactly match one
// registered for the client; invalid client/redirect renders an error page
// and NEVER redirects; a double-submit CSRF cookie guards the consent POST.

import { getClient, saveCode, newSecret, randomUUID } from '@/lib/oauth-store'

export const dynamic = 'force-dynamic'

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

function page(inner, status = 200, headers = {}) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="robots" content="noindex"/>
<title>Connect WorkflowStacks</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0c0d;font-family:system-ui,-apple-system,sans-serif;color:#e2e8f0}
.card{max-width:26rem;width:100%;margin:1rem;background:#0f172acc;border:1px solid #334155;border-radius:1rem;padding:2rem;text-align:center}
h1{font-size:1.25rem;margin:0 0 .5rem}p{color:#94a3b8;font-size:.9rem;line-height:1.5}
.logo{font-weight:800;font-size:1.05rem;margin-bottom:1.25rem}.logo b{color:#a3e635}
button{width:100%;margin-top:1.25rem;padding:.7rem 1rem;border:0;border-radius:.6rem;font-weight:600;font-size:.95rem;cursor:pointer;background:linear-gradient(90deg,#14b8a6,#06b6d4);color:#fff}
.deny{background:none;border:1px solid #334155;color:#94a3b8;margin-top:.6rem}
.err{color:#fca5a5}</style></head><body><div class="card"><div class="logo">workflow<b>stacks</b></div>${inner}</div></body></html>`
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...headers } })
}

// Validate the request against the registered client. Returns
// { error } (render, never redirect) or the validated params.
async function validate(params) {
  const clientId = params.get('client_id') || ''
  const redirectUri = params.get('redirect_uri') || ''
  const client = await getClient(clientId)
  if (!client) return { error: 'Unknown client. Start the connection again from your Claude app.' }
  if (!client.redirect_uris.includes(redirectUri)) return { error: 'Redirect URL does not match this client’s registration.' }
  if ((params.get('response_type') || '') !== 'code') return { error: 'Unsupported response_type — only "code" is supported.' }
  const challenge = params.get('code_challenge') || ''
  const method = params.get('code_challenge_method') || ''
  if (!challenge || method !== 'S256') return { error: 'PKCE (S256 code_challenge) is required.' }
  return {
    client,
    redirectUri,
    challenge,
    state: params.get('state') || '',
    resource: params.get('resource') || '',
    scope: params.get('scope') || 'mcp',
  }
}

function readCookie(request, name) {
  const raw = request.headers.get('cookie') || ''
  const m = raw.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
  return m ? decodeURIComponent(m[1]) : ''
}

export async function GET(request) {
  const params = new URL(request.url).searchParams
  const v = await validate(params)
  if (v.error) return page(`<h1 class="err">Can’t connect</h1><p>${esc(v.error)}</p>`, 400)

  const csrf = newSecret(16)
  const hidden = ['client_id', 'redirect_uri', 'response_type', 'code_challenge', 'code_challenge_method', 'state', 'resource', 'scope']
    .map((k) => `<input type="hidden" name="${k}" value="${esc(params.get(k) || '')}"/>`)
    .join('')
  return page(
    `<h1>Connect WorkflowStacks to ${esc(v.client.client_name || 'your Claude app')}</h1>
     <p>Your AI assistant will be able to <b>search the WorkflowStacks catalog</b> and <b>load skill instructions</b> on your behalf. No account needed — the connection is anonymous.</p>
     <form method="POST">${hidden}<input type="hidden" name="csrf" value="${esc(csrf)}"/>
       <button type="submit" name="decision" value="approve">Connect</button>
       <button type="submit" name="decision" value="deny" class="deny">Cancel</button>
     </form>`,
    200,
    { 'Set-Cookie': `ws_oauth_csrf=${csrf}; Path=/oauth; HttpOnly; Secure; SameSite=Lax; Max-Age=600` }
  )
}

export async function POST(request) {
  const form = await request.formData()
  const params = new URLSearchParams()
  for (const [k, val] of form.entries()) params.set(k, String(val))

  const v = await validate(params)
  if (v.error) return page(`<h1 class="err">Can’t connect</h1><p>${esc(v.error)}</p>`, 400)

  const cookieCsrf = readCookie(request, 'ws_oauth_csrf')
  if (!cookieCsrf || cookieCsrf !== params.get('csrf')) {
    return page('<h1 class="err">Session expired</h1><p>Please restart the connection from your Claude app.</p>', 400)
  }

  const sep = v.redirectUri.includes('?') ? '&' : '?'
  if (params.get('decision') !== 'approve') {
    const url = `${v.redirectUri}${sep}error=access_denied${v.state ? `&state=${encodeURIComponent(v.state)}` : ''}`
    return new Response(null, { status: 302, headers: { Location: url, 'Cache-Control': 'no-store' } })
  }

  // Anonymous, durable library identity — same cookie the site will use for
  // future "my library" features.
  let libraryId = readCookie(request, 'ws_lib')
  const newLib = !libraryId
  if (newLib) libraryId = randomUUID()

  const code = newSecret(32)
  await saveCode(code, {
    client_id: v.client.client_id,
    redirect_uri: v.redirectUri,
    code_challenge: v.challenge,
    library_id: libraryId,
    scope: v.scope,
    resource: v.resource,
  })

  const url = `${v.redirectUri}${sep}code=${encodeURIComponent(code)}${v.state ? `&state=${encodeURIComponent(v.state)}` : ''}`
  const headers = { Location: url, 'Cache-Control': 'no-store' }
  if (newLib) headers['Set-Cookie'] = `ws_lib=${libraryId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`
  return new Response(null, { status: 302, headers })
}
