import crypto from 'crypto'

// Google Search Console client.
//
// No SDK on purpose: googleapis is ~40MB and we need three endpoints. A signed
// JWT plus fetch does the same job inside the serverless bundle budget.
//
// Credentials, in the order they are tried:
//   1. GSC_SERVICE_ACCOUNT_JSON  — the downloaded key, raw JSON or base64
//   2. GSC_CLIENT_EMAIL + GSC_PRIVATE_KEY  — the same two fields, split out
//   3. GSC_OAUTH_CLIENT_ID + _SECRET + _REFRESH_TOKEN  — fallback when a
//      Domain property refuses to add a service account as a user
//
// Either way the credential must be granted access inside Search Console
// itself (Settings -> Users and permissions). Project-level IAM roles do
// nothing here, which is the single most common reason for a 403.

const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const V3 = 'https://www.googleapis.com/webmasters/v3'
const INSPECT_URL = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect'

export class GscError extends Error {
  constructor(message, status = 500, code = 'gsc_error') {
    super(message)
    this.name = 'GscError'
    this.status = status
    this.code = code
  }
}

export function siteUrl() {
  return process.env.GSC_SITE_URL || 'sc-domain:workflowstacks.com'
}

// Vercel mangles the multi-line PEM inside a private key, so keys arrive with
// literal \n sequences more often than not. Normalise both shapes.
function normaliseKey(key) {
  return String(key).replace(/\\n/g, '\n').trim()
}

function serviceAccount() {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON
  if (raw && raw.trim()) {
    let text = raw.trim()
    if (!text.startsWith('{')) {
      try { text = Buffer.from(text, 'base64').toString('utf8').trim() } catch { /* fall through to the parse error */ }
    }
    let json
    try {
      json = JSON.parse(text)
    } catch {
      throw new GscError('GSC_SERVICE_ACCOUNT_JSON is neither valid JSON nor valid base64-encoded JSON', 500, 'bad_service_account_json')
    }
    if (json.client_email && json.private_key) {
      return { client_email: json.client_email, private_key: normaliseKey(json.private_key) }
    }
    throw new GscError('GSC_SERVICE_ACCOUNT_JSON parsed but has no client_email/private_key', 500, 'bad_service_account_json')
  }
  const email = process.env.GSC_CLIENT_EMAIL
  const key = process.env.GSC_PRIVATE_KEY
  if (email && key) return { client_email: email, private_key: normaliseKey(key) }
  return null
}

function oauthCreds() {
  const id = process.env.GSC_OAUTH_CLIENT_ID
  const secret = process.env.GSC_OAUTH_CLIENT_SECRET
  const refresh = process.env.GSC_OAUTH_REFRESH_TOKEN
  if (id && secret && refresh) return { id, secret, refresh }
  return null
}

export function authMode() {
  // A malformed service-account blob is still an attempt to use one — report
  // the mode so /api/gsc?action=status can surface the parse error itself.
  try {
    if (serviceAccount()) return 'service_account'
  } catch {
    return 'service_account'
  }
  if (oauthCreds()) return 'oauth'
  return null
}

export function isConfigured() {
  return authMode() !== null
}

function b64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

let cachedToken = null

export async function getAccessToken() {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.token

  const sa = serviceAccount()
  const oauth = sa ? null : oauthCreds()
  if (!sa && !oauth) {
    throw new GscError('Search Console is not configured. Set GSC_SERVICE_ACCOUNT_JSON (or the OAuth trio) and redeploy.', 503, 'not_configured')
  }

  let body
  if (sa) {
    const now = Math.floor(Date.now() / 1000)
    const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    const claims = b64url(JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: TOKEN_URL, exp: now + 3600, iat: now }))
    let signature
    try {
      const signer = crypto.createSign('RSA-SHA256')
      signer.update(header + '.' + claims)
      signer.end()
      signature = b64url(signer.sign(sa.private_key))
    } catch {
      throw new GscError('Invalid grant: the private key could not be parsed. That is almost always a mangled PEM — re-set GSC_SERVICE_ACCOUNT_JSON as base64.', 500, 'bad_private_key')
    }
    body = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: header + '.' + claims + '.' + signature,
    })
  } else {
    body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: oauth.id,
      client_secret: oauth.secret,
      refresh_token: oauth.refresh,
    })
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json.access_token) {
    const detail = json.error_description || json.error || `HTTP ${res.status}`
    const hint = /invalid_grant/i.test(String(json.error))
      ? ' (invalid_grant: mangled private key, a revoked grant, or — on OAuth — a refresh token Google expired because the consent screen is still in Testing)'
      : ''
    throw new GscError(`Token request failed: ${detail}${hint}`, 502, 'token_failed')
  }

  cachedToken = { token: json.access_token, expires: Date.now() + (json.expires_in || 3600) * 1000 }
  return cachedToken.token
}

async function api(url, { method = 'GET', body } = {}) {
  const token = await getAccessToken()
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  const text = await res.text()
  let json
  try { json = text ? JSON.parse(text) : {} } catch { json = { raw: text.slice(0, 500) } }
  if (!res.ok) {
    const message = json?.error?.message || `Search Console API returned ${res.status}`
    const code = res.status === 403 ? 'forbidden' : res.status === 404 ? 'not_found' : 'api_error'
    throw new GscError(message, res.status, code)
  }
  return json
}

export async function listSites() {
  const json = await api(`${V3}/sites`)
  return (json.siteEntry || []).map((s) => ({ site_url: s.siteUrl, permission: s.permissionLevel }))
}

// Search Console finalises data on a ~2-3 day lag, so a window ending today is
// always short a couple of near-empty days. End two days back instead, and say
// so in the response rather than quietly reporting a dip.
const LAG_DAYS = 2

function ymd(date) {
  return date.toISOString().slice(0, 10)
}

export function windowFor(days, offsetPeriods = 0) {
  const end = new Date()
  end.setUTCHours(0, 0, 0, 0)
  end.setUTCDate(end.getUTCDate() - LAG_DAYS - offsetPeriods * days)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - (days - 1))
  return { startDate: ymd(start), endDate: ymd(end) }
}

export async function searchAnalytics({ days = 28, dimensions = [], rowLimit = 25, offsetPeriods = 0, filters } = {}) {
  const { startDate, endDate } = windowFor(days, offsetPeriods)
  const body = { startDate, endDate, dimensions, rowLimit, dataState: 'final' }
  if (filters?.length) body.dimensionFilterGroups = [{ filters }]
  const json = await api(
    `${V3}/sites/${encodeURIComponent(siteUrl())}/searchAnalytics/query`,
    { method: 'POST', body }
  )
  return { window: { startDate, endDate }, rows: json.rows || [] }
}

function totalsFrom(rows) {
  const clicks = rows.reduce((n, r) => n + (r.clicks || 0), 0)
  const impressions = rows.reduce((n, r) => n + (r.impressions || 0), 0)
  // CTR and position get recomputed, never averaged: a mean of per-row rates
  // weights a 1-impression query the same as a 10,000-impression one.
  const ctr = impressions ? clicks / impressions : 0
  const position = impressions
    ? rows.reduce((n, r) => n + (r.position || 0) * (r.impressions || 0), 0) / impressions
    : 0
  return { clicks, impressions, ctr, position }
}

export async function overview(days = 28) {
  const [current, previous, byDate] = await Promise.all([
    searchAnalytics({ days, dimensions: [], rowLimit: 1 }),
    searchAnalytics({ days, dimensions: [], rowLimit: 1, offsetPeriods: 1 }),
    searchAnalytics({ days, dimensions: ['date'], rowLimit: 500 }),
  ])

  const now = totalsFrom(current.rows)
  const then = totalsFrom(previous.rows)
  const delta = (a, b) => (b ? Number((((a - b) / b) * 100).toFixed(1)) : null)

  return {
    site_url: siteUrl(),
    window: current.window,
    previous_window: previous.window,
    lag_days: LAG_DAYS,
    totals: {
      clicks: now.clicks,
      impressions: now.impressions,
      ctr: Number((now.ctr * 100).toFixed(2)),
      position: Number(now.position.toFixed(1)),
    },
    change_pct: {
      clicks: delta(now.clicks, then.clicks),
      impressions: delta(now.impressions, then.impressions),
      ctr: delta(now.ctr, then.ctr),
      // Position improves as it falls, so flip the sign to keep "up = better".
      position: then.position ? Number((((then.position - now.position) / then.position) * 100).toFixed(1)) : null,
    },
    daily: byDate.rows.map((r) => ({
      date: r.keys[0],
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: Number(((r.ctr || 0) * 100).toFixed(2)),
      position: Number((r.position || 0).toFixed(1)),
    })),
  }
}

export async function topRows(dimension, { days = 28, limit = 25 } = {}) {
  const { window, rows } = await searchAnalytics({ days, dimensions: [dimension], rowLimit: limit })
  return {
    site_url: siteUrl(),
    window,
    dimension,
    rows: rows.map((r) => ({
      key: r.keys[0],
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: Number(((r.ctr || 0) * 100).toFixed(2)),
      position: Number((r.position || 0).toFixed(1)),
    })),
  }
}

export async function inspect(url) {
  const json = await api(INSPECT_URL, {
    method: 'POST',
    body: { inspectionUrl: url, siteUrl: siteUrl() },
  })
  return json.inspectionResult || json
}
