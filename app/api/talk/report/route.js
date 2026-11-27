import { getDb } from '../../../../lib/mongo'
import { CODES, SCANS, CODE_RE, normCode, isAdmin, sameKey } from '../../../../lib/talk'

// Scan report for a Talking Code.
//   Admin (x-admin-secret header): any code, or all codes when none is given.
//   Client: ?code=<CODE>&key=<reportKey> for that one code only, so a client
//   can bookmark their own report without the admin secret.
// ?days=7|30|90 (default 30). ?format=csv returns the scans as a spreadsheet.
// Only MongoDB here, no outbound fetch.
export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

function count(rows, key, limit = 20) {
  const m = new Map()
  for (const r of rows) {
    const k = r[key] || 'Unknown'
    m.set(k, (m.get(k) || 0) + 1)
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([label, n]) => ({ label, n }))
}

function dayKey(d) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(d) // YYYY-MM-DD, Dubai days
}

export async function GET(request) {
  const url = new URL(request.url)
  const admin = isAdmin(request)
  const code = normCode(url.searchParams.get('code'))
  const days = [7, 30, 90, 365].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 30
  if (code && !CODE_RE.test(code)) return Response.json({ error: 'Unknown code' }, { status: 404 })

  const db = await getDb()
  let card = null
  if (code) {
    card = await db.collection(CODES).findOne({ code }, { projection: { _id: 0 } })
    if (!card) return Response.json({ error: 'Unknown code' }, { status: 404 })
  }
  if (!admin && !(card && sameKey(url.searchParams.get('key'), card.reportKey))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const since = new Date(Date.now() - days * 86_400_000)
  const filter = { at: { $gte: since }, ...(code ? { code } : {}) }
  const scans = await db.collection(SCANS)
    .find(filter, { projection: { _id: 0 } })
    .sort({ at: -1 }).limit(50_000).toArray()

  if (url.searchParams.get('format') === 'csv') {
    const cols = ['at', 'code', 'city', 'region', 'country', 'device', 'lang', 'src']
    const cell = (v) => {
      let s = v instanceof Date ? v.toISOString() : String(v ?? '')
      if (/^[=+\-@]/.test(s)) s = "'" + s
      return '"' + s.replace(/"/g, '""') + '"'
    }
    const csv = [cols.join(','), ...scans.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n')
    return new Response(csv, { headers: { ...NO_STORE, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="scans-${code || 'all'}.csv"` } })
  }

  // Scans per Dubai day, every day in the window (zeros included).
  const perDay = new Map()
  for (let i = days - 1; i >= 0; i--) perDay.set(dayKey(new Date(Date.now() - i * 86_400_000)), 0)
  for (const r of scans) {
    const k = dayKey(r.at)
    if (perDay.has(k)) perDay.set(k, perDay.get(k) + 1)
  }
  const unique = new Set(scans.map((r) => `${dayKey(r.at)}|${r.vid}`)).size

  const out = {
    days,
    total: scans.length,
    unique,
    allTime: code ? (card.scans || 0) : undefined,
    byDay: [...perDay.entries()].map(([day, n]) => ({ day, n })),
    byCity: count(scans, 'city'),
    byCountry: count(scans, 'country'),
    byDevice: count(scans, 'device'),
    byLang: count(scans, 'lang'),
    bySource: count(scans, 'src'),
    recent: scans.slice(0, 25).map(({ vid, ...r }) => r),
  }
  if (code) {
    out.card = { code: card.code, name: card.name, client: card.client, title: card.title, active: card.active, createdAt: card.createdAt }
  } else {
    out.byCode = count(scans, 'code', 200)
  }
  return Response.json(out, { headers: NO_STORE })
}
