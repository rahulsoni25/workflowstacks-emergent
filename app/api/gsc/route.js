// Google Search Console read API — admin-gated, same x-admin-secret contract as
// /api/validation-stats. Everything here is a straight pass-through of GSC's
// own numbers plus the meta block that says which property, which window and
// which data state they came from, so nothing downstream has to guess.
//
// GET /api/gsc?action=<action>&days=28
//   overview   — totals + daily series + top queries/pages (the dashboard call)
//   queries    — top queries          (&limit=)
//   pages      — top pages            (&limit=)
//   dates      — daily series
//   countries  — by country
//   devices    — by device
//   rank       — one keyword's real Google position (&keyword=)
//   inspect    — URL Inspection for one URL (&url=)
//   sites      — properties this credential can read (setup check)
//   status     — is GSC connected, and as what
import {
  isConfigured, authMode, GSC_SITE_URL, defaultRange,
  topQueries, topPages, byDate, byCountry, byDevice, siteTotals,
  gscRankFor, inspectUrl, listSites,
} from '@/lib/gsc'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs' // node:crypto signs the service-account JWT

function requireAdmin(request) {
  const secret = process.env.ADMIN_SECRET
  if (!secret || request.headers.get('x-admin-secret') !== secret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

const clampDays = (v, d = 28) => {
  const n = parseInt(v ?? '', 10)
  if (!Number.isFinite(n)) return d
  return Math.min(Math.max(n, 1), 480) // GSC retains ~16 months
}
const clampLimit = (v, d = 100) => {
  const n = parseInt(v ?? '', 10)
  if (!Number.isFinite(n)) return d
  return Math.min(Math.max(n, 1), 5000)
}

export async function GET(request) {
  const denied = requireAdmin(request)
  if (denied) return denied

  const url = new URL(request.url)
  const action = url.searchParams.get('action') || 'overview'
  const days = clampDays(url.searchParams.get('days'))
  const limit = clampLimit(url.searchParams.get('limit'))
  const siteUrl = url.searchParams.get('site') || GSC_SITE_URL

  // Answer the "is this even wired up?" question without an API round-trip.
  if (action === 'status') {
    return Response.json({
      connected: isConfigured(),
      auth_mode: authMode(),
      property: GSC_SITE_URL,
      default_window: defaultRange(days),
      note: 'Search Console finalises data on a ~3-day lag; windows end 3 days back and request dataState=final.',
    })
  }

  if (!isConfigured()) {
    return Response.json({
      error: 'not_configured',
      connected: false,
      message: 'Set GSC_SERVICE_ACCOUNT_JSON (or GSC_CLIENT_EMAIL + GSC_PRIVATE_KEY), or the GSC_OAUTH_* trio. See docs/GOOGLE-SEARCH-CONSOLE.md.',
    }, { status: 503 })
  }

  try {
    switch (action) {
      case 'overview': {
        // One dashboard payload. Parallel because they are independent calls
        // against the same window and each is a separate GSC request anyway.
        const [totals, dates, queries, pages] = await Promise.all([
          siteTotals({ days, siteUrl }),
          byDate({ days, siteUrl }),
          topQueries({ days, limit: Math.min(limit, 50), siteUrl }),
          topPages({ days, limit: Math.min(limit, 50), siteUrl }),
        ])
        return Response.json({
          connected: true,
          meta: totals.meta,
          totals: totals.totals,
          by_date: dates.rows,
          top_queries: queries.rows,
          top_pages: pages.rows,
          // Surface per-call errors rather than silently shipping empty arrays.
          errors: [totals.meta, dates.meta, queries.meta, pages.meta]
            .map((m) => m.error).filter(Boolean),
        })
      }
      case 'queries':   return Response.json(await topQueries({ days, limit, siteUrl }))
      case 'pages':     return Response.json(await topPages({ days, limit, siteUrl }))
      case 'dates':     return Response.json(await byDate({ days, siteUrl }))
      case 'countries': return Response.json(await byCountry({ days, limit: Math.min(limit, 250), siteUrl }))
      case 'devices':   return Response.json(await byDevice({ days, siteUrl }))
      case 'totals':    return Response.json(await siteTotals({ days, siteUrl }))
      case 'sites':     return Response.json(await listSites())
      case 'rank': {
        const keyword = url.searchParams.get('keyword')
        if (!keyword) return Response.json({ error: 'keyword is required' }, { status: 400 })
        return Response.json(await gscRankFor(keyword, { days, siteUrl }))
      }
      case 'inspect': {
        const target = url.searchParams.get('url')
        if (!target) return Response.json({ error: 'url is required' }, { status: 400 })
        return Response.json(await inspectUrl(target, { siteUrl }))
      }
      default:
        return Response.json({ error: `unknown action ${action}` }, { status: 400 })
    }
  } catch (e) {
    return Response.json({ error: e.message, action }, { status: 500 })
  }
}
