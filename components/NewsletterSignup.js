'use client'

import { useState } from 'react'
import { Mail, Check } from 'lucide-react'

// The one newsletter form. Every surface (footer, skill page, blog, /hot,
// homepage, exit prompt) uses it with a different `source`, which is how
// /api/subscribers can say which surface actually converts.
//
// Default frequency is 'weekly' (Monday digests only). The daily Skill of the
// Day is opt-in via `showDailyOption` — daily volume is the most common reason
// a small list shrinks, so nobody gets it without asking.

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const X_SHARE_URL =
  'https://twitter.com/intent/tweet?text=' +
  encodeURIComponent('🔥 The fastest-growing open-source AI skills this week, ranked by GitHub star growth:') +
  '&url=' +
  encodeURIComponent('https://workflowstacks.com/hot?ref=share')

export default function NewsletterSignup({
  source = 'newsletter',
  variant = 'card', // 'card' | 'inline'
  headline = 'The five fastest-growing AI skills, every Monday.',
  sub = 'Ranked by GitHub star growth, not total stars — plus the top overall and what’s new. No filler, unsubscribe anytime.',
  cta = 'Get the Monday digest',
  showDailyOption = false,
  className = '',
}) {
  const [email, setEmail] = useState('')
  const [daily, setDaily] = useState(false)
  const [state, setState] = useState('idle') // idle | working | done | error

  async function onSubmit(e) {
    e.preventDefault()
    if (!EMAIL_RE.test(email)) { setState('error'); return }
    setState('working')
    let ref = null
    try { ref = new URLSearchParams(window.location.search).get('ref') } catch {}
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source, frequency: daily ? 'all' : 'weekly', ...(ref ? { ref: ref.slice(0, 80) } : {}) }),
      })
      if (!res.ok) throw new Error('subscribe failed')
      setState('done')
      try { localStorage.setItem('ws_subscribed', '1') } catch {}
    } catch {
      setState('error')
    }
  }

  const inline = variant === 'inline'

  const form = state === 'done' ? (
    <div className={`flex items-start gap-2.5 ${inline ? 'text-[13px]' : 'text-sm'}`} role="status">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C6F24E] text-[#0A0C0D]"><Check className="h-3 w-3" /></span>
      <div>
        <div className="font-semibold text-text-primary">You’re in — check your inbox for this week’s list.</div>
        <div className="mt-1 text-text-muted">
          Know a builder who’d want it?{' '}
          <a href={X_SHARE_URL} target="_blank" rel="noopener noreferrer" className="text-[#C6F24E] hover:underline">Share the Hot list on X</a>
          {' '}or forward the email.
        </div>
      </div>
    </div>
  ) : (
    <form onSubmit={onSubmit} className={inline ? 'flex flex-col gap-2 sm:flex-row' : 'flex flex-col gap-2.5 sm:flex-row'} noValidate>
      <label className="relative flex-1">
        <span className="sr-only">Email address</span>
        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (state === 'error') setState('idle') }}
          placeholder="you@company.com"
          aria-invalid={state === 'error'}
          className={`w-full rounded-md border bg-[#0A0C0D] py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-text-muted focus:outline-none ${state === 'error' ? 'border-red-500/60' : 'border-[#262B2D] focus:border-[#C6F24E]/60'}`}
        />
      </label>
      <button
        type="submit"
        disabled={state === 'working'}
        className="whitespace-nowrap rounded-md bg-[#C6F24E] px-4 py-2.5 text-sm font-semibold text-[#0A0C0D] hover:bg-[#A6D62E] disabled:opacity-60"
      >
        {state === 'working' ? 'Adding…' : cta}
      </button>
    </form>
  )

  if (inline) {
    return (
      <div className={className}>
        {headline && <div className="text-[13.5px] font-semibold text-text-primary">{headline}</div>}
        {sub && <p className="mb-3 mt-1 text-[12.5px] leading-relaxed text-text-muted">{sub}</p>}
        {form}
        {state === 'error' && <p className="mt-2 text-xs text-red-400">Please enter a valid email address.</p>}
      </div>
    )
  }

  return (
    <div className={`rounded-xl border border-[#262B2D] bg-[#101314] p-6 ${className}`}>
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-[#C6F24E]">🔥 Hot this week, in your inbox</div>
      <div className="text-[17px] font-semibold leading-snug text-text-primary">{headline}</div>
      {sub && <p className="mb-4 mt-1.5 text-[13.5px] leading-relaxed text-text-muted">{sub}</p>}
      {form}
      {state === 'error' && <p className="mt-2 text-xs text-red-400">Please enter a valid email address.</p>}
      {state !== 'done' && showDailyOption && (
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-text-muted">
          <input type="checkbox" checked={daily} onChange={(e) => setDaily(e.target.checked)} className="h-3.5 w-3.5 accent-[#C6F24E]" />
          Also send the daily Skill of the Day
        </label>
      )}
    </div>
  )
}
