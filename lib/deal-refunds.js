// Refund path for group-buy seats ("Fully refunded if the deal doesn't reach
// its target" on /deals).
//
// Three things can take a paid seat back: the admin cancelling a deal
// (/api/deal-update { status: 'cancelled' }, which issues the refunds), Stripe
// reporting a refund made elsewhere (charge.refunded) and a chargeback
// (charge.dispute.created). All three end in releasePurchase(), which marks
// the purchase and decrements the deal's paid-seat counter exactly once, so
// retried webhooks and an admin re-run cannot release the same seat twice.

// Marks a purchase as refunded/disputed and gives its seat back. `filter`
// picks the purchase, `set` carries the fields to record (refunded_at,
// refundId, disputed_at, ...). Returns the purchase the first time it is
// released, null when it was already released (or not found).
export async function releasePurchase(db, filter, set) {
  const purchase = await db.collection('purchases').findOneAndUpdate(
    { ...filter, seat_released: { $ne: true } },
    { $set: { ...set, seat_released: true, seat_released_at: new Date() } },
    { returnDocument: 'after' }
  )
  if (!purchase) return null
  if (purchase.type === 'deal' && purchase.dealId) {
    await db.collection('deals').updateOne(
      { id: purchase.dealId, slotsTaken: { $gt: 0 } },
      { $inc: { slotsTaken: -1, paidSeats: -1 } }
    )
  }
  return purchase
}

// The payment_intent for a purchase recorded before the webhook stored it.
async function paymentIntentForSession(stripe, sessionId) {
  try {
    const s = await stripe.checkout.sessions.retrieve(sessionId)
    return typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id || null
  } catch {
    return null
  }
}

// Finds the purchase a charge/dispute belongs to: by the stored
// payment_intent first, then via the Checkout session that created it (one
// Stripe call, only for purchases recorded before paymentIntent was stored).
export async function findPurchaseByPaymentIntent(db, stripe, paymentIntent) {
  if (!paymentIntent) return null
  const direct = await db.collection('purchases').findOne({ paymentIntent })
  if (direct) return direct
  try {
    const list = await stripe.checkout.sessions.list({ payment_intent: paymentIntent, limit: 1 })
    const sessionId = list?.data?.[0]?.id
    if (!sessionId) return null
    const purchase = await db.collection('purchases').findOne({ sessionId })
    if (purchase) await db.collection('purchases').updateOne({ sessionId }, { $set: { paymentIntent } })
    return purchase
  } catch {
    return null
  }
}

// Refunds every paid seat of a deal that has not been refunded or disputed
// yet, up to `limit` per call (a cancelled deal with many seats is finished
// by calling again — the response says how many remain). Each refund uses the
// session id as its Stripe idempotency key, so a retry can never refund a
// seat twice.
export async function refundDealPurchases(db, stripe, dealId, { limit = 25 } = {}) {
  const pending = await db.collection('purchases')
    .find({ dealId, type: 'deal', seat_released: { $ne: true } })
    .sort({ created_at: 1 })
    .limit(limit)
    .toArray()

  let refunded = 0
  const failed = []
  for (const p of pending) {
    const paymentIntent = p.paymentIntent || (await paymentIntentForSession(stripe, p.sessionId))
    if (!paymentIntent) {
      failed.push({ sessionId: p.sessionId, error: 'no payment_intent on record' })
      continue
    }
    try {
      const refund = await stripe.refunds.create(
        { payment_intent: paymentIntent, reason: 'requested_by_customer', metadata: { dealId, sessionId: p.sessionId, why: 'deal_cancelled' } },
        { idempotencyKey: `deal-cancel-${p.sessionId}` }
      )
      await releasePurchase(db, { sessionId: p.sessionId }, {
        paymentIntent,
        refunded_at: new Date(),
        refundId: refund.id,
        amount_refunded: refund.amount,
        refund_reason: 'deal_cancelled',
      })
      refunded++
    } catch (e) {
      await db.collection('purchases').updateOne(
        { sessionId: p.sessionId },
        { $set: { refund_error: String(e.message || e).slice(0, 300), refund_error_at: new Date() } }
      )
      failed.push({ sessionId: p.sessionId, error: String(e.message || e).slice(0, 300) })
    }
  }
  const remaining = await db.collection('purchases').countDocuments({ dealId, type: 'deal', seat_released: { $ne: true } })
  return { refunded, failed, remaining }
}
