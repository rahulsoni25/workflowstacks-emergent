import { timingSafeEqual } from 'node:crypto'
import { getDb } from '../../../lib/mongo'
import { rateLimit } from '../../../lib/rate-limit'
import { EMAIL_RE } from '../../../lib/email'

// Contact swap behind Rahul's digital card (public/sites/rahul/, served at
// /rahul). A visitor who saves his contact can leave theirs; it lands in the
// `card_leads` collection, a small CRM he reads at /sites/rahul/leads.html.
// No outbound fetch() here, only MongoDB, so nothing for Next's fetch cache.
export const dynamic = 'force-dynamic'

const COLL = 'card_leads'
const clip = (v, n) => (v == null ? '' : String(v)).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n)

function isAdmin(request) {
  const secret = process.env.ADMIN_SECRET || ''
  const given = request.headers.get('x-admin-secret') || ''
  if (!secret || given.length !== secret.length) return false
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret))
}

// Public: a visitor leaves their details.
export async function POST(request) {
  const rl = rateLimit(request, 5, 60_000, 'card-leads'); if (rl) return rl
  const body = await request.json().catch(() => ({}))
  // Honeypot: real visitors never see or fill this field.
  if (clip(body.website, 200)) return Response.json({ ok: true })

  const name = clip(body.name, 80)
  const phone = clip(body.phone, 30)
  const email = clip(body.email, 120).toLowerCase()
  const company = clip(body.company, 100)
  const note = clip(body.note, 500)
  const source = clip(body.source, 40) || 'card'

  if (!name) return Response.json({ ok: false, error: 'Please add your name' }, { status: 400 })
  if (!phone && !email) return Response.json({ ok: false, error: 'Please add a phone number or email' }, { status: 400 })
  if (email && !EMAIL_RE.test(email)) return Response.json({ ok: false, error: 'That email looks off' }, { status: 400 })
  if (phone && !/^[+()\d\s.-]{6,30}$/.test(phone)) return Response.json({ ok: false, error: 'That phone number looks off' }, { status: 400 })

  const db = await getDb()
  await db.collection(COLL).insertOne({ name, phone, email, company, note, source, status: 'new', at: new Date() })
  return Response.json({ ok: true })
}

// Admin: list leads, newest first. ?format=csv returns a spreadsheet file.
export async function GET(request) {
  if (!isAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const db = await getDb()
  const leads = await db.collection(COLL).find({}, { projection: { _id: 0 } }).sort({ at: -1 }).limit(1000).toArray()
  const url = new URL(request.url)
  if (url.searchParams.get('format') === 'csv') {
    const cols = ['at', 'name', 'phone', 'email', 'company', 'note', 'source', 'status']
    const cell = (v) => {
      let s = v instanceof Date ? v.toISOString() : String(v ?? '')
      if (/^[=+\-@]/.test(s)) s = "'" + s // keep spreadsheet formulas out
      return '"' + s.replace(/"/g, '""') + '"'
    }
    const csv = [cols.join(','), ...leads.map((l) => cols.map((c) => cell(l[c])).join(','))].join('\n')
    return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="card-leads.csv"', 'Cache-Control': 'no-store' } })
  }
  return Response.json({ leads }, { headers: { 'Cache-Control': 'no-store' } })
}
