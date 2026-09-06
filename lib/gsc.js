// Google Search Console — the Google ground truth the rest of the codebase
// already defers to (lib/blog/serp.js, app/sitemap.js, middleware.js all say
// "GSC is the source of truth" but nothing could actually read it until now).
//
// Deliberately dependency-free: no `googleapis` SDK (~50MB of transitive deps
// for two endpoints). Auth is a signed JWT via node:crypto, which is why every
// caller must run on the Node runtime, not Edge.
//
// Two auth modes, checked in this order:
//   1. Service account — GSC_SERVICE_ACCOUNT_JSON (raw or base64 JSON), or
//      GSC_CLIENT_EMAIL + GSC_PRIVATE_KEY. The service account's email must be
//      added as a user on the GSC property (Settings → Users and permissions).
//   2. OAuth user — GSC_OAUTH_CLIENT_ID + GSC_OAUTH_CLIENT_SECRET +
//      GSC_OAUTH_REFRESH_TOKEN. Use this when the property is a Domain
//      property you can't add a service account to.
//
// Everything here returns null / empty rather than throwing on a missing
// config, so callers can treat GSC as optional the same way they treat the
// Brave key — see isConfigured().
import crypto from 'node:crypto'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const API_BASE = 'https://searchconsole.googleapis.com/webmasters/v3'
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'

// GSC properties are addressed either as a Domain property ("sc-domain:x.com")
// or a URL-prefix property ("https://x.com/"). They are different properties
// with different data — set GSC_SITE_URL to whichever one you verified.
export const GSC_SITE_URL = process.env.GSC_SITE_URL || 'sc-domain:workflowstacks.com'

// Search Console finalises data on a ~2-3 day lag. Asking for "yesterday"
// returns partial rows that look like a traffic collapse, so every default
// range here ends LAG_DAYS back and requests dataState=final.
const LAG_DAYS = 3

function serviceAccountCreds() {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON
  if (raw) {
    try {
      // Vercel env vars mangle multi-line values, so base64 is the safer form.
      const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')
      const json = JSON.parse(text)
      if (json.client_email && json.private_key) {
        return { clientEmail: json.client_email, privateKey: json.private_key }
      }
    } catch {
      return null
    }
    return null
  }
  const clientEmail = process.env.GSC_CLIENT_EMAIL
  const privateKey = process.env.GSC_PRIVATE_KEY
  if (clientEmail && privateKey) {
    // Env vars carry the PEM newlines escaped; restore them or the sign fails.
    return { clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') }
  }
  return null
}

function oauthCreds() {
  const clientId = process.env.GSC_OAUTH_CLIENT_ID
  const clientSecret = process.env.GSC_OAUTH_CLIENT_SECRET
  const refreshToken = process.env.GSC_OAUTH_REFRESH_TOKEN
  if (clientId && clientSecret && refreshToken) return { clientId, clientSecret, refreshToken }
  return null
}

// Which auth mode is live, if any. Exported so routes and dashboards can say
// "not connected" instead of reporting zeroes that look like real data.
export function authMode() {
  if (serviceAccountCreds()) return 'service_account'
  if (oauthCreds()) return 'oauth'
  return null
}

export function isConfigured() {
  return authMode() !== null
}

const b64url = (buf) => Buffer.from(buf).toString('base64url')

function signJwt({ clientEmail, privateKey }) {
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = b64url(JSON.stringify({
    iss: clientEmail,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }))
  const signature = crypto.createSign('RSA-SHA256').update(`${header}.${claim}`).sign(privateKey, 'base64url')
  return `${header}.${claim}.${signature}`
}

// Access tokens last an hour; cache in module scope so a burst of dashboard
// calls in one warm lambda costs one token exchange, not one per query.
let cachedToken = null // { token, expiresAt }

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token

  const sa = serviceAccountCreds()
  const oauth = sa ? null : oauthCreds()
  if (!sa && !oauth) throw new Error('Google Search Console is not configured (no service account or OAuth credentials)')

  const body = sa
    ? new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: signJwt(sa) })
    : new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: oauth.clientId,
        client_secret: oauth.clientSecret,
        refresh_token: oauth.refreshToken,
      })

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(10_000),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.access_token) {
    // Google returns { error, error_description } — surface it verbatim; the
    // usual cause is a clock skew, a mangled private key, or a revoked grant.
    throw new Error(`GSC auth failed (${res.status}): ${data.error_description || data.error || 'no access_token'}`)
  }
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 }
  return cachedToken.token
}

const isoDay = (d) => d.toISOString().slice(0, 10)

// Default window: the last `days` finalised days, ending LAG_DAYS ago.
export function defaultRange(days = 28) {
  const end = new Date(Date.now() - LAG_DAYS * 86_400_000)
  const start = new Date(end.getTime() - (days - 1) * 86_400_000)
  return { startDate: isoDay(start), endDate: isoDay(end) }
}

/**
 * Raw Search Analytics query. Returns { rows, meta } — never throws for an
 * unconfigured install; check `meta.error` / `meta.configured` instead, so a
 * caller can render "not connected" rather than a fabricated zero.
 *
 * Rows are shaped { keys: [...], clicks, impressions, ctr, position }.
 */
export async function searchAnalytics({
  siteUrl = GSC_SITE_URL,
  startDate,
  endDate,
  days = 28,
  dimensions = ['query'],
  rowLimit = 100,
  startRow = 0,
  dimensionFilterGroups,
  searchType = 'web',
  dataState = 'final',
} = {}) {
  const range = startDate && endDate ? { startDate, endDate } : defaultRange(days)
  const meta = {
    source: 'google_search_console',
    property: siteUrl,
    ...range,
    dimensions,
    search_type: searchType,
    data_state: dataState,
    configured: isConfigured(),
    fetched_at: new Date().toISOString(),
  }
  if (!meta.configured) return { rows: [], meta: { ...meta, error: 'not_configured' } }

  try {
    const token = await getAccessToken()
    const res = await fetch(`${API_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...range,
        dimensions,
        rowLimit,
        startRow,
        type: searchType,
        dataState,
        ...(dimensionFilterGroups ? { dimensionFilterGroups } : {}),
      }),
      signal: AbortSignal.timeout(20_000),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const detail = data?.error?.message || `http ${res.status}`
      // 403 here almost always means the credential is valid but has no access
      // to THIS property — the most common setup mistake, so name it.
      const hint = res.status === 403
        ? ' (credential authenticated but lacks access to this property — add it under GSC → Settings → Users and permissions)'
        : ''
      return { rows: [], meta: { ...meta, error: `${detail}${hint}` } }
    }
    return { rows: data.rows || [], meta: { ...meta, row_count: (data.rows || []).length } }
  } catch (e) {
    return { rows: [], meta: { ...meta, error: e.message } }
  }
}

// Flatten a one-dimension result into plain rows keyed by that dimension.
function flatten(rows, key) {
  return rows.map((r) => ({
    [key]: r.keys?.[0] ?? null,
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    ctr: r.ctr ?? 0,
    position: r.position ?? null,
  }))
}

export async function topQueries({ days = 28, limit = 100, ...rest } = {}) {
  const { rows, meta } = await searchAnalytics({ days, dimensions: ['query'], rowLimit: limit, ...rest })
  return { rows: flatten(rows, 'query'), meta }
}

export async function topPages({ days = 28, limit = 100, ...rest } = {}) {
  const { rows, meta } = await searchAnalytics({ days, dimensions: ['page'], rowLimit: limit, ...rest })
  return { rows: flatten(rows, 'page'), meta }
}

export async function byDate({ days = 28, ...rest } = {}) {
  const { rows, meta } = await searchAnalytics({ days, dimensions: ['date'], rowLimit: days, ...rest })
  return { rows: flatten(rows, 'date'), meta }
}

export async function byCountry({ days = 28, limit = 25, ...rest } = {}) {
  const { rows, meta } = await searchAnalytics({ days, dimensions: ['country'], rowLimit: limit, ...rest })
  return { rows: flatten(rows, 'country'), meta }
}

export async function byDevice({ days = 28, ...rest } = {}) {
  const { rows, meta } = await searchAnalytics({ days, dimensions: ['device'], rowLimit: 10, ...rest })
  return { rows: flatten(rows, 'device'), meta }
}

// Site-wide totals for the window. Dimension-less query = one summary row.
export async function siteTotals({ days = 28, ...rest } = {}) {
  const { rows, meta } = await searchAnalytics({ days, dimensions: [], rowLimit: 1, ...rest })
  const r = rows[0]
  return {
    totals: r
      ? { clicks: r.clicks ?? 0, impressions: r.impressions ?? 0, ctr: r.ctr ?? 0, position: r.position ?? null }
      : null,
    meta,
  }
}

/**
 * Google's real average position for one keyword over the window — the
 * ground-truth counterpart to lib/blog/serp.js's Brave/DDG proxy.
 *
 * Returns null position when GSC has no rows for the keyword. That is NOT the
 * same as "ranks nowhere": GSC omits queries below its privacy threshold, so
 * a null here means "no impressions recorded", and the caller should say so
 * rather than infer a rank.
 */
export async function gscRankFor(keyword, { days = 28, siteUrl = GSC_SITE_URL } = {}) {
  const { rows, meta } = await searchAnalytics({
    siteUrl,
    days,
    dimensions: ['query', 'page'],
    rowLimit: 5,
    dimensionFilterGroups: [{ filters: [{ dimension: 'query', operator: 'equals', expression: keyword }] }],
  })
  if (meta.error) {
    return { engine: 'gsc', keyword, position: null, error: meta.error, checked_at: new Date(), meta }
  }
  if (!rows.length) {
    return { engine: 'gsc', keyword, position: null, no_data: true, checked_at: new Date(), meta }
  }
  // Most-clicked page for the query is the one Google actually ranks.
  const best = rows.slice().sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0))[0]
  return {
    engine: 'gsc',
    keyword,
    // GSC position is a decimal average across impressions, not an integer
    // SERP slot. Rounded to one place; never present it as "we rank #N today".
    position: best.position != null ? Math.round(best.position * 10) / 10 : null,
    url: best.keys?.[1] || null,
    clicks: best.clicks ?? 0,
    impressions: best.impressions ?? 0,
    ctr: best.ctr ?? 0,
    checked_at: new Date(),
    meta,
  }
}

/**
 * Bulk variant of gscRankFor: one API call for the whole keyword set instead
 * of one per keyword. GSC has no "IN" filter, so this pulls the top queries
 * for the window and matches locally — keywords outside that slice come back
 * absent (Map miss), which callers must treat as "no GSC data", not rank 0.
 */
export async function gscRanksForKeywords(keywords, { days = 28, limit = 5000, siteUrl = GSC_SITE_URL } = {}) {
  const wanted = new Set(keywords.map((k) => String(k).toLowerCase().trim()))
  const { rows, meta } = await searchAnalytics({
    siteUrl, days, dimensions: ['query', 'page'], rowLimit: Math.min(limit, 25_000),
  })
  const byKeyword = new Map()
  for (const r of rows) {
    const q = String(r.keys?.[0] || '').toLowerCase().trim()
    if (!wanted.has(q)) continue
    const prev = byKeyword.get(q)
    if (prev && (prev.clicks ?? 0) >= (r.clicks ?? 0)) continue
    byKeyword.set(q, {
      engine: 'gsc',
      keyword: r.keys[0],
      position: r.position != null ? Math.round(r.position * 10) / 10 : null,
      url: r.keys?.[1] || null,
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      ctr: r.ctr ?? 0,
      checked_at: new Date(),
    })
  }
  return { byKeyword, meta }
}

// The verified properties this credential can see. Handy for setup: if your
// GSC_SITE_URL isn't in this list, the credential can't read it.
export async function listSites() {
  if (!isConfigured()) return { sites: [], error: 'not_configured' }
  try {
    const token = await getAccessToken()
    const res = await fetch(`${API_BASE}/sites`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { sites: [], error: data?.error?.message || `http ${res.status}` }
    return {
      sites: (data.siteEntry || []).map((s) => ({ siteUrl: s.siteUrl, permissionLevel: s.permissionLevel })),
    }
  } catch (e) {
    return { sites: [], error: e.message }
  }
}

// URL Inspection — is this exact URL indexed, and what did Google last see?
// Needs the same credential to have at least "Full" access on the property.
export async function inspectUrl(inspectionUrl, { siteUrl = GSC_SITE_URL } = {}) {
  if (!isConfigured()) return { result: null, error: 'not_configured' }
  try {
    const token = await getAccessToken()
    const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inspectionUrl, siteUrl, languageCode: 'en-US' }),
      signal: AbortSignal.timeout(20_000),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { result: null, error: data?.error?.message || `http ${res.status}` }
    const idx = data.inspectionResult?.indexStatusResult || {}
    return {
      result: {
        url: inspectionUrl,
        verdict: idx.verdict || null,                 // PASS | PARTIAL | FAIL | NEUTRAL
        coverage_state: idx.coverageState || null,    // e.g. "Submitted and indexed"
        indexing_state: idx.indexingState || null,
        robots_state: idx.robotsTxtState || null,
        canonical_google: idx.googleCanonical || null,
        canonical_user: idx.userCanonical || null,
        last_crawl: idx.lastCrawlTime || null,
        page_fetch_state: idx.pageFetchState || null,
      },
      meta: { source: 'google_search_console_url_inspection', property: siteUrl, fetched_at: new Date().toISOString() },
    }
  } catch (e) {
    return { result: null, error: e.message }
  }
}
