import Stripe from 'stripe'

let _stripe = null

// Lazily construct so the build doesn't fail when the key is absent.
export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  return _stripe
}

export const PLATFORM_FEE_PCT = 0.15 // WorkflowStacks takes 15%, creator keeps 85%

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks-emergent.vercel.app'
export { BASE as SITE_URL }
