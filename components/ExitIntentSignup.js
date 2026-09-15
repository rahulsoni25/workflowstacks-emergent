'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import NewsletterSignup from '@/components/NewsletterSignup'

// One prompt, desktop pointer devices only, at most once every 30 days per
// browser, never for anyone who already subscribed. Fires on exit intent (the
// cursor leaving through the top of the viewport) or once the reader has
// scrolled 70% of the page — both after an 8-second grace period so it never
// interrupts someone who just arrived. Mobile never sees it.
const SEEN_KEY = 'ws_exit_prompt_at'
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

export default function ExitIntentSignup({ source = 'exit-intent', headline, sub }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    if (!window.matchMedia || !window.matchMedia('(pointer: fine)').matches || window.innerWidth < 1024) return undefined
    try {
      if (localStorage.getItem('ws_subscribed')) return undefined
      const at = Number(localStorage.getItem(SEEN_KEY) || 0)
      if (Date.now() - at < THIRTY_DAYS) return undefined
    } catch {}

    let fired = false
    const onLeave = (e) => { if (e.clientY <= 0) fire() }
    const onScroll = () => {
      const h = document.documentElement.scrollHeight || 1
      if ((window.scrollY + window.innerHeight) / h > 0.7) fire()
    }
    const detach = () => {
      document.documentElement.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('scroll', onScroll)
    }
    function fire() {
      if (fired) return
      fired = true
      try { localStorage.setItem(SEEN_KEY, String(Date.now())) } catch {}
      detach()
      setOpen(true)
    }
    const armed = setTimeout(() => {
      document.documentElement.addEventListener('mouseleave', onLeave)
      window.addEventListener('scroll', onScroll, { passive: true })
    }, 8000)
    return () => { clearTimeout(armed); detach() }
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label="Subscribe to the Monday digest">
      <div className="relative w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute -right-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[#262B2D] bg-[#0A0C0D] text-text-muted hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
        <NewsletterSignup
          source={source}
          variant="card"
          headline={headline || 'Before you go: the five fastest-growing AI skills, every Monday.'}
          sub={sub || 'Ranked by GitHub star growth, not total stars. One email a week, unsubscribe anytime.'}
          className="shadow-2xl shadow-black/60"
        />
      </div>
    </div>
  )
}
