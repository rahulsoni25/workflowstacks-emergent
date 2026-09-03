import Stripe from 'stripe'

let _stripe = null

// Lazily construct so the build doesn't fail when the key is absent.
export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  return _stripe
}

export const PLATFORM_FEE_PCT = 0.15 // WorkflowStacks takes 15%, creator keeps 85%

import { SITE_URL as BASE } from '@/lib/site-url'
export { BASE as SITE_URL }
