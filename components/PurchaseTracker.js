'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'

// Records a GA4 / GTM `purchase` after a Stripe checkout redirect -- the same
// rules bundles follow in app/bundles/[slug]/PurchaseBanner.js:
//   - only once the server confirms the session is paid (/api/stripe/verify)
//   - only once per checkout (localStorage key per session id)
// Reads window.location directly rather than useSearchParams, so mounting it
// never pulls a statically rendered page into client-side rendering.
//
// flag: the query param Stripe's success_url sets ('purchased' or 'locked').
export default function PurchaseTracker({ flag = 'purchased', category, itemName = '' }) {
  useEffect(() => {
    let params
    try { params = new URLSearchParams(window.location.search) } catch { return }
    const sessionId = params.get('session_id') || ''
    if (params.get(flag) !== '1' || !sessionId) return

    const key = `ws_purchase_${sessionId}`
    try { if (localStorage.getItem(key)) return } catch {}

    fetch(`/api/stripe/verify?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d || !d.paid) return
        try {
          if (localStorage.getItem(key)) return
          localStorage.setItem(key, '1')
        } catch {}
        const id = d.item_id || ''
        const name = itemName || d.item_name || id
        trackEvent('purchase', {
          transaction_id: sessionId,
          value: d.value,
          currency: d.currency || 'USD',
          content_name: id,
          content_category: category || d.type || '',
          items: [{ item_id: id, item_name: name, item_category: category || d.type || '', price: d.value, quantity: 1 }],
        })
      })
      .catch(() => {})
  }, [flag, category, itemName])

  return null
}
