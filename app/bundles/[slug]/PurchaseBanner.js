'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

// Split out of BundleSalesClient purely so that useSearchParams lives behind a
// Suspense boundary. Without one, Next 14 bails the WHOLE route out of static
// rendering: the sales copy, the price and the Product JSON-LD were all absent
// from the served HTML, leaving Google and AI crawlers a blank page on the only
// pages that carry a price. Everything a crawler needs now renders on the
// server; only this post-checkout banner waits for the query string.
export default function PurchaseBanner({ bundleTitle }) {
  const searchParams = useSearchParams()
  const justPurchased = searchParams.get('purchased') === '1'
  const sessionId = searchParams.get('session_id') || ''
  const [unlockUrl, setUnlockUrl] = useState('')

  useEffect(() => {
    if (justPurchased) window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [justPurchased])

  // Claim the purchase straight from the checkout redirect so the buyer gets
  // their download immediately, without waiting on the delivery email.
  useEffect(() => {
    if (!justPurchased || !sessionId) return
    fetch('/api/bundles/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.unlock_url) setUnlockUrl(d.unlock_url) })
      .catch(() => {})
  }, [justPurchased, sessionId])

  if (!justPurchased) return null

  return (
    <Card className="bg-[#C6F24E]/10 border-[#C6F24E]/40 mb-8">
      <CardContent className="py-5 text-center">
        <Check className="w-8 h-8 text-[#C6F24E] mx-auto mb-2" />
        <p className="text-white font-semibold">Purchase complete!</p>
        {unlockUrl ? (
          <>
            <p className="text-slate-300 text-sm mt-1 mb-4">Your download is ready — the link is yours to keep.</p>
            <Link href={unlockUrl}>
              <Button className="bg-[#C6F24E] hover:bg-[#A6D62E] text-[#0A0C0D] font-semibold">
                Download {bundleTitle} →
              </Button>
            </Link>
          </>
        ) : (
          <p className="text-slate-300 text-sm mt-1">Preparing your download… We&apos;ll also email your private link so you never lose it.</p>
        )}
      </CardContent>
    </Card>
  )
}
