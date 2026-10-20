import { createHash, timingSafeEqual } from 'crypto'
import { getStripe, SITE_URL } from '@/lib/stripe'
import { getDb } from '@/lib/mongo'
import { rateLimit } from '@/lib/rate-limit'
import { readLibraryCookie, libraryCookieHeader, newLibraryId } from '@/lib/library'

export const runtime = 'nodejs'

// Create / continue Stripe Express onboarding so a creator can receive payouts.
//
// Who is allowed to connect a handle? The site has no login: a creator handle
// is a name typed into localStorage (lib/identity.js), and the README claim in
// lib/creators.js proves GitHub-repo control once, server-side, without
// leaving the browser any credential. So the one thing the server can tie a
// handle to is the device that first connected it: the HttpOnly `ws_lib`
// cookie (the same anonymous id behind My Library and the MCP connector).
//
//   - first connect for a handle: bind it to this browser's ws_lib (hashed),
//     setting the cookie if the browser has none yet;
//   - any later request for that handle must present the same cookie, or it
//     is refused — nobody else can create a new account for it or obtain an
//     onboarding link into the existing Express account (which would let them
//     change the payout bank account);
//   - a handle connected before this check (no binding on record) is closed
//     to re-onboarding altogether; the earnings page never offers the button
//     once payouts are connected, so legitimate creators do not hit this.
//
// This stops an arbitrary POST from attaching a Stripe account to someone
// else's handle. It does not stop someone connecting an unused handle first
// (there is no identity to check it against) — see the report for that gap.

function ownerHash(libraryId) {
  return createHash('sha256').update(`connect-owner:${libraryId}`).digest('hex')
}

function sameOwner(stored, libraryId) {
  if (!stored || !libraryId) return false
  const a = Buffer.from(String(stored))
  const b = Buffer.from(ownerHash(libraryId))
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(request) {
  const rl = rateLimit(request, 5, 60_000)
  if (rl) return rl

  const stripe = getStripe()
  if (!stripe) return Response.json({ error: 'Stripe not configured' }, { status: 500 })

  const body = await request.json().catch(() => ({}))
  const key = (body.handle || body.userId || '').toString().trim().replace(/^@/, '').slice(0, 40)
  if (!key) return Response.json({ error: 'handle or userId required' }, { status: 400 })

  let libraryId = readLibraryCookie(request)
  const newLib = !libraryId
  if (newLib) libraryId = newLibraryId()

  const db = await getDb()
  const creator = await db.collection('creators').findOne({ key })
  let accountId = creator?.stripeAccountId

  if (accountId && !sameOwner(creator.connectOwner, libraryId)) {
    // Someone else's connected handle (or one connected before ownership was
    // recorded). Say nothing about the account.
    return Response.json(
      { error: 'Payouts for this handle are already connected from another browser. If that was you, use the browser you connected with, or reply to any WorkflowStacks email for help.' },
      { status: 403 }
    )
  }

  try {
    if (!accountId) {
      const account = await stripe.accounts.create({ type: 'express', metadata: { key } })
      accountId = account.id
      // Bind the handle to this browser only if nobody bound it in between.
      const bound = await db.collection('creators').updateOne(
        { key, stripeAccountId: { $in: [null, ''] } },
        {
          $set: { key, handle: body.handle || null, stripeAccountId: accountId, connectOwner: ownerHash(libraryId), connect_bound_at: new Date(), updated_at: new Date() },
          $setOnInsert: { created_at: new Date() },
        },
        { upsert: true }
      )
      if (!bound.matchedCount && !bound.upsertedCount) {
        return Response.json({ error: 'Payouts for this handle were just connected from another browser.' }, { status: 409 })
      }
    }
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${SITE_URL}/earnings?refresh=1`,
      return_url: `${SITE_URL}/earnings?connected=1`,
      type: 'account_onboarding',
    })
    const headers = { 'Cache-Control': 'no-store' }
    if (newLib) headers['Set-Cookie'] = libraryCookieHeader(libraryId)
    return Response.json({ url: link.url }, { headers })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
