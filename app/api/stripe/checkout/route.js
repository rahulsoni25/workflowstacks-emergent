import { getStripe, SITE_URL, PLATFORM_FEE_PCT } from '@/lib/stripe'
import { getDb } from '@/lib/mongo'

export const runtime = 'nodejs'

// Create a Checkout Session to buy a paid agent (creator gets paid via Connect; platform takes a fee).
export async function POST(request) {
  const stripe = getStripe()
  if (!stripe) return Response.json({ error: 'Stripe not configured' }, { status: 500 })

  const body = await request.json().catch(() => ({}))
  const db = await getDb()

  // --- Group-buy deal: lock a seat (charged now, refundable if it doesn't fill) ---
  if (body.dealId) {
    const deal = await db.collection('deals').findOne({ id: body.dealId })
    if (!deal) return Response.json({ error: 'Deal not found' }, { status: 400 })
    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: `${deal.tool} — group-buy seat`, description: `Group rate, ${deal.savingsPct}% off retail. Refunded if the group doesn't reach its target.` },
            unit_amount: Math.round(Number(deal.groupPrice) * 100),
          },
          quantity: 1,
        }],
        success_url: `${SITE_URL}/deals?locked=1`,
        cancel_url: `${SITE_URL}/deals`,
        metadata: { dealId: body.dealId, type: 'deal', tool: deal.tool },
      })
      return Response.json({ url: session.url })
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500 })
    }
  }

  const agentId = body.agentId
  if (!agentId) return Response.json({ error: 'agentId or dealId required' }, { status: 400 })

  const agent = await db.collection('agent_templates').findOne({ id: agentId, isPublic: true })
  if (!agent || !agent.isPaid || !agent.price) {
    return Response.json({ error: 'This agent is not for sale' }, { status: 400 })
  }

  const amount = Math.round(Number(agent.price) * 100)
  const fee = Math.round(amount * PLATFORM_FEE_PCT)
  const creator = await db.collection('creators').findOne({ key: agent.creatorName })

  const params = {
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: agent.name, description: (agent.goal || '').slice(0, 200) },
        unit_amount: amount,
      },
      quantity: 1,
    }],
    success_url: `${SITE_URL}/a/${agentId}?purchased=1`,
    cancel_url: `${SITE_URL}/a/${agentId}`,
    metadata: { agentId, type: 'agent', creator: agent.creatorName || '' },
  }
  // Route money to the creator (minus platform fee) when they've connected payouts.
  if (creator?.stripeAccountId) {
    params.payment_intent_data = {
      application_fee_amount: fee,
      transfer_data: { destination: creator.stripeAccountId },
    }
  }

  try {
    const session = await stripe.checkout.sessions.create(params)
    return Response.json({ url: session.url })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
