import { randomUUID } from 'crypto'
import { getStripe } from '@/lib/stripe'
import { getBundle } from '@/lib/bundles'
import { getDb } from '@/lib/mongo'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

// Post-checkout claim: the success redirect carries ?session_id=, which we
// verify with Stripe directly. This makes delivery independent of webhook
// registration — the webhook (app/api/stripe/webhook) stays the email path,
// this is the instant on-page path. Both are idempotent by sessionId, so
// whichever runs first mints the token and the other reuses it.
export async function POST(request) {
  const rl = rateLimit(request, 10, 60_000)
  if (rl) return rl

  const body = await request.json().catch(() => ({}))
  const sessionId = typeof body.session_id === 'string' ? body.session_id : ''
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    return Response.json({ error: 'Invalid session id' }, { status: 400 })
  }

  const stripe = getStripe()
  if (!stripe) return Response.json({ error: 'Stripe not configured' }, { status: 500 })

  let session
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId)
  } catch {
    return Response.json({ error: 'Session not found' }, { status: 404 })
  }

  if (session.payment_status !== 'paid') {
    return Response.json({ error: 'Payment not completed' }, { status: 402 })
  }
  const bundleId = session.metadata?.type === 'bundle' ? session.metadata?.bundleId : null
  const bundle = bundleId ? getBundle(bundleId) : null
  if (!bundle) return Response.json({ error: 'Not a bundle purchase' }, { status: 400 })

  const db = await getDb()
  const token = randomUUID()
  await db.collection('bundle_purchases').updateOne(
    { sessionId: session.id },
    {
      $setOnInsert: {
        sessionId: session.id,
        bundleId: bundle.slug,
        token,
        email: session.customer_details?.email || null,
        amount: session.amount_total || 0,
        created_at: new Date(),
      },
    },
    { upsert: true }
  )
  const purchase = await db.collection('bundle_purchases').findOne({ sessionId: session.id })

  return Response.json({
    unlock_url: `/bundles/${bundle.slug}/unlock?token=${purchase.token}`,
  })
}
