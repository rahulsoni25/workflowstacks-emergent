// Talking Codes: the platform behind Print That Talks.
//
// Every printed QR points at workflowstacks.com/t/<CODE>, never at a video
// file. The code is a record in the `talk_codes` collection that says which
// video plays now, so the video can be swapped without reprinting. Each scan
// is logged in `talk_scans` (city and device only, no IP) for the scan report,
// and can trigger a WhatsApp alert to the card's owner.
//
// Shared by app/t/[code]/route.js and the admin routes under app/api/talk/.
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const CODES = 'talk_codes'
export const SCANS = 'talk_scans'

// Codes are short, uppercase and unambiguous on print (no 0/O, 1/I/L).
export const CODE_RE = /^[A-Z0-9][A-Z0-9-]{1,23}$/
const SAFE = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function normCode(v) {
  return String(v || '').trim().toUpperCase()
}

export function randomCode(prefix = '') {
  const bytes = randomBytes(6)
  let s = ''
  for (const b of bytes) s += SAFE[b % SAFE.length]
  const p = normCode(prefix).replace(/[^A-Z0-9]/g, '').slice(0, 8)
  return p ? `${p}-${s}` : s
}

export function newReportKey() {
  return randomBytes(16).toString('hex')
}

// Indexes, created once per server instance: unique codes, and scans by code
// and time for the report.
let indexed = false
export async function ensureIndexes(db) {
  if (indexed) return
  await db.collection(CODES).createIndex({ code: 1 }, { unique: true })
  await db.collection(SCANS).createIndex({ code: 1, at: -1 })
  indexed = true
}

export const clip = (v, n) => (v == null ? '' : String(v)).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n)

// A video or poster link: https only, or a path on this site (/sites/...).
export function cleanMediaUrl(v) {
  const s = clip(v, 600)
  if (!s) return ''
  if (s.startsWith('/') && !s.startsWith('//')) return s
  try {
    const u = new URL(s)
    return u.protocol === 'https:' ? u.toString() : ''
  } catch {
    return ''
  }
}

// WhatsApp numbers in international form, digits only (e.g. 971522086253).
export function cleanPhone(v) {
  const d = String(v || '').replace(/[^\d]/g, '')
  return d.length >= 8 && d.length <= 15 ? d : ''
}

export function isAdmin(request) {
  const secret = process.env.ADMIN_SECRET || ''
  const given = request.headers.get('x-admin-secret') || ''
  if (!secret || given.length !== secret.length) return false
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret))
}

export function sameKey(a, b) {
  const x = String(a || ''), y = String(b || '')
  if (!x || x.length !== y.length) return false
  return timingSafeEqual(Buffer.from(x), Buffer.from(y))
}

// Link-preview fetchers (WhatsApp, Facebook, Slack…) and crawlers request the
// page when someone shares a link. They are not scans.
const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|slack|discord|preview|embedly|headless|lighthouse|curl|wget|python-requests|axios|node-fetch/i
export function isBot(ua) {
  return !ua || BOT_RE.test(ua)
}

export function deviceOf(ua) {
  if (/iphone|ipad|ipod/i.test(ua)) return 'iPhone'
  if (/android/i.test(ua)) return 'Android'
  if (/mobile/i.test(ua)) return 'Mobile'
  return 'Desktop'
}

function header(request, name) {
  const v = request.headers.get(name) || ''
  try { return decodeURIComponent(v) } catch { return v }
}

// Vercel adds approximate location headers from the visitor's IP. Only the
// city, region and country are kept; the IP itself is never stored.
export function locationOf(request) {
  return {
    city: clip(header(request, 'x-vercel-ip-city'), 60),
    region: clip(header(request, 'x-vercel-ip-country-region'), 20),
    country: clip(header(request, 'x-vercel-ip-country'), 4),
  }
}

// An anonymous per-day visitor id so the report can count unique scanners.
// Salted and rotated daily: it cannot be traced back to an IP or a person.
export function visitorId(request) {
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim()
  const ua = request.headers.get('user-agent') || ''
  const day = new Date().toISOString().slice(0, 10)
  const salt = process.env.ADMIN_SECRET || 'talk'
  return createHash('sha256').update(`${salt}|${day}|${ip}|${ua}`).digest('hex').slice(0, 16)
}

export function prefersArabic(request) {
  const al = (request.headers.get('accept-language') || '').toLowerCase()
  return /^ar\b/.test(al.trim())
}

// ---------------------------------------------------------------- R2 upload
// A presigned PUT URL lets the admin page upload a video straight from the
// browser to Cloudflare R2. Signing is local (AWS Signature V4, query auth):
// no network call, so nothing here touches Next's fetch cache.
// Env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET,
//      R2_PUBLIC_BASE (e.g. https://media.workflowstacks.com).
export function r2Configured() {
  const e = process.env
  return Boolean(e.R2_ACCOUNT_ID && e.R2_ACCESS_KEY_ID && e.R2_SECRET_ACCESS_KEY && e.R2_BUCKET && e.R2_PUBLIC_BASE)
}

const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
const sha256hex = (s) => createHash('sha256').update(s).digest('hex')
const hmac = (k, s) => createHmac('sha256', k).update(s).digest()

export function presignPut({ accountId, accessKeyId, secretAccessKey, bucket, key, expires = 900, now = new Date() }) {
  const host = `${accountId}.r2.cloudflarestorage.com`
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const date = amzDate.slice(0, 8)
  const region = 'auto'
  const scope = `${date}/${region}/s3/aws4_request`
  const path = `/${enc(bucket)}/${key.split('/').map(enc).join('/')}`
  const params = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKeyId}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expires),
    'X-Amz-SignedHeaders': 'host',
  }
  const query = Object.keys(params).sort().map((k) => `${enc(k)}=${enc(params[k])}`).join('&')
  const canonical = ['PUT', path, query, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n')
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256hex(canonical)].join('\n')
  let k = hmac('AWS4' + secretAccessKey, date)
  k = hmac(k, region); k = hmac(k, 's3'); k = hmac(k, 'aws4_request')
  const sig = createHmac('sha256', k).update(toSign).digest('hex')
  return `https://${host}${path}?${query}&X-Amz-Signature=${sig}`
}

// ------------------------------------------------------------ WhatsApp alert
// Sends the card owner a WhatsApp template message when their card is
// scanned. Off unless WHATSAPP_TOKEN, WHATSAPP_PHONE_ID and WHATSAPP_TEMPLATE
// are set. The template must be approved in Meta Business Manager with two
// body parameters: {{1}} card name, {{2}} place and time.
// Env: WHATSAPP_TEMPLATE_LANG (default en).
export function whatsappConfigured() {
  const e = process.env
  return Boolean(e.WHATSAPP_TOKEN && e.WHATSAPP_PHONE_ID && e.WHATSAPP_TEMPLATE)
}

export async function sendScanAlert({ to, cardName, place }) {
  if (!whatsappConfigured() || !to) return false
  const e = process.env
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 2500)
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${e.WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      cache: 'no-store',
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${e.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: e.WHATSAPP_TEMPLATE,
          language: { code: e.WHATSAPP_TEMPLATE_LANG || 'en' },
          components: [{ type: 'body', parameters: [{ type: 'text', text: cardName.slice(0, 60) }, { type: 'text', text: place.slice(0, 80) }] }],
        },
      }),
    })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}
