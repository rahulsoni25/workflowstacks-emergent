import { getStripe, SITE_URL } from '@/lib/stripe'
import { getDb } from '@/lib/mongo'

export const runtime = 'nodejs'

// Create / continue Stripe Express onboarding so a creator can receive payouts.
export async function POST(request) {
  const stripe = getStripe()
  if (!stripe) return Response.json({ error: 'Stripe not configured' }, { status: 500 })

  const body = await request.json().catch(() => ({}))
  const key = (body.handle || body.userId || '').toString().replace(/^@/, '').slice(0, 40)
  if (!key) return Response.json({ error: 'handle or userId required' }, { status: 400 })

  const db = await getDb()
  let creator = await db.collection('creators').findOne({ key })
  let accountId = creator?.stripeAccountId

  try {
    if (!accountId) {
      const account = await stripe.accounts.create({ type: 'express', metadata: { key } })
      accountId = account.id
      await db.collection('creators').updateOne(
        { key },
        { $set: { key, handle: body.handle || null, userId: body.userId || null, stripeAccountId: accountId, updated_at: new Date() } },
        { upsert: true }
      )
    }
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${SITE_URL}/earnings?refresh=1`,
      return_url: `${SITE_URL}/earnings?connected=1`,
      type: 'account_onboarding',
    })
    return Response.json({ url: link.url })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
