import { getDb } from '../../../../lib/mongo'
import {
  CODES, CODE_RE, ensureIndexes, normCode, randomCode, newReportKey, clip, cleanMediaUrl, cleanPhone, isAdmin,
  r2Configured, whatsappConfigured,
} from '../../../../lib/talk'

// Admin API for Talking Codes (the QR codes behind Print That Talks).
// GET lists every code; POST creates or updates one, or creates a batch of
// personal-greeting codes. Codes are never deleted (scan history stays);
// set active:false to switch one off. Only MongoDB here, no outbound fetch.
export const dynamic = 'force-dynamic'

function cleanCta(cta) {
  const label = clip(cta?.label, 40)
  const raw = clip(cta?.url, 600)
  if (!label || !raw) return null
  try {
    const u = new URL(raw)
    if (!['https:', 'tel:', 'mailto:'].includes(u.protocol)) return null
    return { label, url: u.toString() }
  } catch {
    return null
  }
}

// The fields an admin may set, cleaned. Missing fields are left unchanged.
function fieldsFrom(body) {
  const f = {}
  if ('name' in body) f.name = clip(body.name, 80)
  if ('client' in body) f.client = clip(body.client, 80)
  if ('title' in body) f.title = clip(body.title, 100)
  if ('greeting' in body) f.greeting = clip(body.greeting, 40)
  if ('poster' in body) f.poster = cleanMediaUrl(body.poster)
  if ('videos' in body) f.videos = { en: cleanMediaUrl(body.videos?.en), ar: cleanMediaUrl(body.videos?.ar) }
  if ('cta' in body) f.cta = cleanCta(body.cta)
  if ('alertPhone' in body) f.alertPhone = cleanPhone(body.alertPhone)
  if ('alertMinutes' in body) f.alertMinutes = Math.min(1440, Math.max(1, Number(body.alertMinutes) || 10))
  if ('active' in body) f.active = Boolean(body.active)
  return f
}

export async function GET(request) {
  if (!isAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const db = await getDb()
  const codes = await db.collection(CODES).find({}, { projection: { _id: 0 } }).sort({ updatedAt: -1 }).limit(2000).toArray()
  return Response.json({ codes, r2: r2Configured(), whatsapp: whatsappConfigured() }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request) {
  if (!isAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const db = await getDb()
  await ensureIndexes(db)
  const coll = db.collection(CODES)
  const now = new Date()
  const fields = fieldsFrom(body)

  // Batch: one code per name, each with its own greeting ("Hi Ahmed 👋").
  if (Array.isArray(body.greetings)) {
    const names = body.greetings.map((n) => clip(n, 40)).filter(Boolean).slice(0, 500)
    if (!names.length) return Response.json({ ok: false, error: 'Add at least one name' }, { status: 400 })
    if (!fields.videos?.en && !fields.videos?.ar) return Response.json({ ok: false, error: 'Add a video first' }, { status: 400 })
    const docs = names.map((greeting) => ({
      active: true, scans: 0, ...fields, greeting,
      code: randomCode(body.prefix), reportKey: newReportKey(), createdAt: now, updatedAt: now,
    }))
    await coll.insertMany(docs)
    return Response.json({ ok: true, codes: docs.map(({ _id, ...d }) => d) })
  }

  let code = normCode(body.code)
  if (code && !CODE_RE.test(code)) {
    return Response.json({ ok: false, error: 'Codes use A–Z, 0–9 and dashes, 2–24 characters' }, { status: 400 })
  }
  const existing = code ? await coll.findOne({ code }) : null

  if (existing) {
    await coll.updateOne({ code }, { $set: { ...fields, updatedAt: now } })
  } else {
    if (!fields.videos?.en && !fields.videos?.ar) return Response.json({ ok: false, error: 'Add a video link or upload one' }, { status: 400 })
    if (!code) code = randomCode(body.prefix)
    await coll.insertOne({
      active: true, scans: 0, ...fields,
      code, reportKey: newReportKey(), createdAt: now, updatedAt: now,
    })
  }
  const saved = await coll.findOne({ code }, { projection: { _id: 0 } })
  return Response.json({ ok: true, code: saved })
}
