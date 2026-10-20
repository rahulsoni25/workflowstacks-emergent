import { randomUUID } from 'crypto'
import { getStripe, PLATFORM_FEE_PCT, SITE_URL } from '@/lib/stripe'
import { getBundle } from '@/lib/bundles'
import { getDb } from '@/lib/mongo'
import { releasePurchase, findPurchaseByPaymentIntent } from '@/lib/deal-refunds'

// checkout.session.completed carries payment_intent as an id (not expanded).
const paymentIntentId = (pi) => (typeof pi === 'string' ? pi : pi?.id || null)

// Next 14 caches every fetch() in a route handler by default ("auto cache"),
// including the GitHub, Groq and Resend calls below. Each cache miss is a
// write to Vercel's ISR store (billed per 8 KB), and these calls almost never
// hit: the star-refresh job sends a per-run GitHub token (new cache key every
// run) and the LLM calls carry unique bodies. That was most of the Hobby-plan
// ISR-write overage (usage window Aug 25 -> Sep 24, 2026). Nothing here needs
// caching, so default fetch() to no-store; an explicit cache option still wins.
export const fetchCache = 'default-no-store'

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

    // Group-buy deal seat purchased. paymentIntent is what a refund needs
    // (lib/deal-refunds). slotsTaken counts paid seats only — free
    // reservations live in deals.reservedFree (/api/deals/join).
    if (s.metadata?.type === 'deal' && s.metadata?.dealId) {
      const ins = await db.collection('purchases').updateOne(
        { sessionId: s.id },
        { $setOnInsert: { sessionId: s.id, dealId: s.metadata.dealId, type: 'deal', tool: s.metadata.tool || null, amount: s.amount_total || 0, paymentIntent: paymentIntentId(s.payment_intent), buyerEmail: s.customer_details?.email || null, created_at: new Date() } },
        { upsert: true }
      )
      // Only the first delivery of this session counts a seat (Stripe retries).
      if (ins.upsertedCount) {
        await db.collection('deals').updateOne({ id: s.metadata.dealId }, { $inc: { slotsTaken: 1, paidSeats: 1 } })
      }
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
          paymentIntent: paymentIntentId(s.payment_intent),
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

  // A refund issued anywhere (admin cancel, Stripe dashboard, API) — mark the
  // purchase and, for a deal seat, give the seat back. releasePurchase is
  // idempotent, so the admin-cancel path and this event cannot double-count.
  // Both event types must be enabled on the webhook endpoint in Stripe.
  if (event.type === 'charge.refunded') {
    const charge = event.data.object
    const db = await getDb()
    const paymentIntent = paymentIntentId(charge.payment_intent)
    const purchase = await findPurchaseByPaymentIntent(db, stripe, paymentIntent)
    if (purchase) {
      if (charge.refunded === true) {
        await releasePurchase(db, { sessionId: purchase.sessionId }, {
          paymentIntent,
          refunded_at: new Date(),
          refundId: charge.refunds?.data?.[0]?.id || null,
          amount_refunded: charge.amount_refunded || 0,
          refund_reason: purchase.refund_reason || 'stripe_refund',
        })
      } else {
        // Partial refund: the seat stays, the amount is recorded.
        await db.collection('purchases').updateOne(
          { sessionId: purchase.sessionId },
          { $set: { paymentIntent, amount_refunded: charge.amount_refunded || 0, partial_refund_at: new Date() } }
        )
      }
    }
    return Response.json({ received: true })
  }

  // Chargeback: the money is on hold, so the seat is released now rather
  // than when the dispute closes.
  if (event.type === 'charge.dispute.created') {
    const dispute = event.data.object
    const db = await getDb()
    const paymentIntent = paymentIntentId(dispute.payment_intent)
    const purchase = await findPurchaseByPaymentIntent(db, stripe, paymentIntent)
    if (purchase) {
      await releasePurchase(db, { sessionId: purchase.sessionId }, {
        paymentIntent,
        disputed_at: new Date(),
        disputeId: dispute.id,
        dispute_reason: dispute.reason || null,
      })
    }
    return Response.json({ received: true })
  }

  return Response.json({ received: true })
}
