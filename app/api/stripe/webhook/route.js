import { randomUUID } from 'crypto'
import { getStripe, PLATFORM_FEE_PCT, SITE_URL } from '@/lib/stripe'
import { getBundle } from '@/lib/bundles'
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

    // Premium bundle purchased — mint a download token and email the unlock link
    if (s.metadata?.type === 'bundle' && s.metadata?.bundleId) {
      const bundle = getBundle(s.metadata.bundleId)
      const email = s.customer_details?.email || null
      const token = randomUUID()
      // Idempotent by session id — Stripe may retry the webhook
      const existing = await db.collection('bundle_purchases').findOne({ sessionId: s.id })
      const finalToken = existing?.token || token
      await db.collection('bundle_purchases').updateOne(
        { sessionId: s.id },
        {
          $setOnInsert: {
            sessionId: s.id,
            bundleId: s.metadata.bundleId,
            token: finalToken,
            email,
            amount: s.amount_total || 0,
            created_at: new Date(),
          },
        },
        { upsert: true }
      )
      if (email && bundle && process.env.RESEND_API_KEY && !existing) {
        const unlockUrl = `${SITE_URL}/bundles/${bundle.slug}/unlock?token=${finalToken}`
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'WorkflowStacks <hello@workflowstacks.com>',
              to: [email],
              subject: `Your ${bundle.title} is ready to download`,
              html: `<div style="font-family:system-ui;max-width:560px;margin:0 auto;padding:24px;background:#0A0C0D;color:#ECEFEA"><h2 style="color:#C6F24E">Thanks for your purchase!</h2><p>${bundle.title} is unlocked. Download your workflow(s) here — the link is yours, keep it:</p><p><a href="${unlockUrl}" style="display:inline-block;background:#C6F24E;color:#0A0C0D;font-weight:600;text-decoration:none;padding:11px 22px;border-radius:8px">Download ${bundle.title}</a></p><p style="color:#8B928D;font-size:13px">Setup instructions are inside each workflow. Reply to this email if you need a hand.</p></div>`,
            }),
          })
        } catch (e) {
          console.error('bundle delivery email failed:', e.message)
        }
      }
      return Response.json({ received: true })
    }

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
