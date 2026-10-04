import { getStripe } from '@/lib/stripe'

// Confirms a Checkout Session was actually paid, so the client only records a
// `purchase` analytics event for a real sale -- not for a reload or a
// hand-typed ?purchased=1. Bundles already do this through /api/bundles/claim;
// this is the same check for agent and deal checkouts, which previously
// recorded no sale at all.
//
// Returns only what the purchase event needs. Never the buyer's email or any
// other customer field. Session ids are unguessable and single-purpose.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SESSION_RE = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/

export async function GET(request) {
  const sessionId = new URL(request.url).searchParams.get('session_id') || ''
  if (!SESSION_RE.test(sessionId)) return Response.json({ paid: false, error: 'bad session_id' }, { status: 400 })

  const stripe = getStripe()
  if (!stripe) return Response.json({ paid: false, error: 'Stripe not configured' }, { status: 500 })

  try {
    const s = await stripe.checkout.sessions.retrieve(sessionId)
    const m = s.metadata || {}
    return Response.json({
      paid: s.payment_status === 'paid',
      value: typeof s.amount_total === 'number' ? s.amount_total / 100 : 0,
      currency: (s.currency || 'usd').toUpperCase(),
      type: m.type || '',
      item_id: m.agentId || m.dealId || m.bundleId || '',
      item_name: m.tool || '',
    })
  } catch {
    return Response.json({ paid: false, error: 'not found' }, { status: 404 })
  }
}
