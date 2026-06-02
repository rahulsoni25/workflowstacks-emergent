import { getStripe, PLATFORM_FEE_PCT } from '@/lib/stripe'
import { getDb } from '@/lib/mongo'

export const runtime = 'nodejs'

// Stripe webhook — records completed purchases + creator earnings.
export async function POST(request) {
  const stripe = getStripe()
  if (!stripe) return Response.json({ error: 'Stripe not configured' }, { status: 500 })

  const sig = request.headers.get('stripe-signature')
  const raw = await request.text() // raw body required for signature verification
  let event
  try {
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (e) {
    return Response.json({ error: `Webhook signature failed: ${e.message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object
    const db = await getDb()

    // Group-buy deal seat purchased
    if (s.metadata?.type === 'deal' && s.metadata?.dealId) {
      await db.collection('purchases').updateOne(
        { sessionId: s.id },
        { $setOnInsert: { sessionId: s.id, dealId: s.metadata.dealId, type: 'deal', tool: s.metadata.tool || null, amount: s.amount_total || 0, buyerEmail: s.customer_details?.email || null, created_at: new Date() } },
        { upsert: true }
      )
      await db.collection('deals').updateOne({ id: s.metadata.dealId }, { $inc: { slotsTaken: 1, paidSeats: 1 } })
      return Response.json({ received: true })
    }

    const agentId = s.metadata?.agentId
    const amount = s.amount_total || 0
    const platformFee = Math.round(amount * PLATFORM_FEE_PCT)
    const creatorShare = amount - platformFee

    // Idempotent insert (dedupe by session id)
    await db.collection('purchases').updateOne(
      { sessionId: s.id },
      {
        $setOnInsert: {
          sessionId: s.id,
          agentId: agentId || null,
          creator: s.metadata?.creator || null,
          type: s.metadata?.type || 'agent',
          amount,
          platformFee,
          creatorShare,
          buyerEmail: s.customer_details?.email || null,
          created_at: new Date(),
        },
      },
      { upsert: true }
    )

    if (agentId) {
      await db.collection('agent_templates').updateOne(
        { id: agentId },
        { $inc: { sales: 1, revenue: amount } }
      )
    }
    if (s.metadata?.creator) {
      await db.collection('creators').updateOne(
        { key: s.metadata.creator },
        { $inc: { earnings: creatorShare, salesCount: 1 } },
        { upsert: true }
      )
    }
  }

  return Response.json({ received: true })
}
