'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getConsent, setConsent } from '@/lib/analytics'

// Shown only where an opt-in is required (see inConsentRegion) and only until
// a choice is made. Anyone can reopen it from the privacy page, which fires
// the OPEN_EVENT below. Declining is as easy as accepting, on purpose: one
// click each, side by side.
export const OPEN_EVENT = 'ws:consent-open'

export default function ConsentBanner() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (getConsent() === 'unset') setOpen(true)
    const reopen = () => setOpen(true)
    window.addEventListener(OPEN_EVENT, reopen)
    return () => window.removeEventListener(OPEN_EVENT, reopen)
  }, [])

  if (!open) return null

  const choose = (value) => {
    setConsent(value)
    setOpen(false)
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-xl border border-[#262B2D] bg-[#101314] p-4 shadow-2xl shadow-black/60 sm:flex sm:items-center sm:gap-4"
    >
      <p className="text-[13px] leading-relaxed text-text-muted">
        We use cookies to measure which pages help and to show our ads to the right people. No email address is ever shared.{' '}
        <Link href="/privacy" prefetch={false} className="text-[#C6F24E] hover:underline">Privacy</Link>
      </p>
      <div className="mt-3 flex shrink-0 gap-2 sm:mt-0">
        <button
          type="button"
          onClick={() => choose('denied')}
          className="flex-1 rounded-md border border-[#323A3C] px-4 py-2 text-sm font-semibold text-text-primary hover:bg-white/5"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => choose('granted')}
          className="flex-1 rounded-md bg-[#C6F24E] px-4 py-2 text-sm font-semibold text-[#0A0C0D] hover:bg-[#A6D62E]"
        >
          Accept
        </button>
      </div>
    </div>
  )
}
