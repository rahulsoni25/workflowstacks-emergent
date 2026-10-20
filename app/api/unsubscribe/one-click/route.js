import { getDb } from '@/lib/mongo'
import { normalizeEmail, verifyUnsubscribeToken } from '@/lib/email'
import { SITE_URL } from '@/lib/site-url'

// RFC 8058 one-click unsubscribe — the https URL in every email's
// List-Unsubscribe header (lib/email.js). When the person clicks
// "Unsubscribe" in Gmail / Apple Mail / Outlook, the client POSTs here with
// the form body `List-Unsubscribe=One-Click`; nothing is shown to the person.
// The signed token is what authorises it: a bare email is refused, and a GET
// (link scanners, previews) never changes anything — it is sent to the page,
// which needs a click.
export const dynamic = 'force-dynamic'

export async function POST(request) {
  const { searchParams } = new URL(request.url)
  const email = normalizeEmail(searchParams.get('email'))
  const t = (searchParams.get('t') || '').trim()
  if (!email || !verifyUnsubscribeToken(email, t)) {
    return new Response('Invalid unsubscribe link', { status: 400, headers: { 'Cache-Control': 'no-store' } })
  }
  // The RFC body is informational here — the token already proves this came
  // from a link we sent — so an unexpected body is logged, not refused.
  const body = await request.text().catch(() => '')
  if (!/List-Unsubscribe=One-Click/i.test(body)) console.warn('one-click unsubscribe without RFC 8058 body for', email)

  const db = await getDb()
  const now = new Date()
  // Mark, never delete: a later upsert from a signup path cannot resurrect
  // the address as active. A verified token proves we mailed this address,
  // so a suppression record is created even if no document exists.
  await db.collection('subscribers').updateOne(
    { email },
    {
      $set: { status: 'unsubscribed', unsubscribed_at: now, unsubscribe_via: 'one-click' },
      $unset: { confirm_token: '', pending_at: '' },
      $setOnInsert: { email, created_at: now, source: 'unsubscribe' },
    },
    { upsert: true }
  )
  return new Response('Unsubscribed', { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
}

// A GET must not unsubscribe (RFC 8058 §3.1). Hand the person to the page,
// where the same token is honoured after an explicit click.
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const u = new URL('/unsubscribe', SITE_URL)
  const email = normalizeEmail(searchParams.get('email'))
  const t = (searchParams.get('t') || '').trim()
  if (email) u.searchParams.set('email', email)
  if (t) u.searchParams.set('t', t)
  return Response.redirect(u.toString(), 303)
}
