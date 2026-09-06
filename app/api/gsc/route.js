import { GscError, authMode, isConfigured, siteUrl, listSites, overview, topRows, inspect, getAccessToken } from '@/lib/gsc'

export const dynamic = 'force-dynamic'

// Search Console, read-only, behind the same admin secret the rest of the
// admin endpoints use. Actions:
//   status   — is it wired up, and which credential is in play
//   sites    — what the credential can actually READ (the real access test)
//   overview — totals + daily series + change vs the previous period
//   queries | pages | countries | devices — top rows for that dimension
//   inspect  — URL Inspection for one URL (needs Full permission in GSC)

function requireAdmin(request) {
  const secret = process.env.ADMIN_SECRET
  if (!secret || request.headers.get('x-admin-secret') !== secret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

const DIMENSIONS = { queries: 'query', pages: 'page', countries: 'country', devices: 'device' }

export async function GET(request) {
  const denied = requireAdmin(request)
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'status'
  const days = Math.min(Math.max(parseInt(searchParams.get('days') || '28', 10) || 28, 1), 480)
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '25', 10) || 25, 1), 500)

  try {
    if (action === 'status') {
      const mode = authMode()
      if (!mode) {
        return Response.json({
          configured: false,
          connected: false,
          auth_mode: null,
          site_url: siteUrl(),
          error: 'not_configured',
          hint: 'Set GSC_SERVICE_ACCOUNT_JSON (or GSC_OAUTH_CLIENT_ID/_SECRET/_REFRESH_TOKEN) in Vercel, then redeploy — env vars do not reach a running deployment.',
        }, { status: 503 })
      }
      // Fetching a token is the only honest way to say "connected".
      await getAccessToken()
      return Response.json({ configured: true, connected: true, auth_mode: mode, site_url: siteUrl() })
    }

    if (!isConfigured()) {
      return Response.json({
        error: 'not_configured',
        hint: 'Set GSC_SERVICE_ACCOUNT_JSON (or the OAuth trio) in Vercel, then redeploy.',
      }, { status: 503 })
    }

    if (action === 'sites') {
      const sites = await listSites()
      const target = siteUrl()
      return Response.json({
        site_url: target,
        has_access: sites.some((s) => s.site_url === target),
        sites,
        hint: sites.some((s) => s.site_url === target)
          ? undefined
          : 'GSC_SITE_URL is not in this list. Either the credential was never added under Search Console -> Settings -> Users and permissions, or GSC_SITE_URL names the wrong property form (sc-domain:example.com vs https://example.com/, trailing slash included).',
      })
    }

    if (action === 'overview') return Response.json(await overview(days))

    if (DIMENSIONS[action]) return Response.json(await topRows(DIMENSIONS[action], { days, limit }))

    if (action === 'inspect') {
      const url = searchParams.get('url')
      if (!url) return Response.json({ error: 'Pass ?url= the page to inspect' }, { status: 400 })
      return Response.json(await inspect(url))
    }

    return Response.json({
      error: `Unknown action "${action}"`,
      actions: ['status', 'sites', 'overview', 'queries', 'pages', 'countries', 'devices', 'inspect'],
    }, { status: 400 })
  } catch (e) {
    if (e instanceof GscError) {
      const hint = e.code === 'forbidden'
        ? 'The credential authenticated but cannot read this property. Add its client_email under Search Console -> Settings -> Users and permissions, and check GSC_SITE_URL matches the property form exactly.'
        : undefined
      return Response.json({ error: e.code, message: e.message, hint }, { status: e.status })
    }
    return Response.json({ error: 'unexpected', message: e.message }, { status: 500 })
  }
}
