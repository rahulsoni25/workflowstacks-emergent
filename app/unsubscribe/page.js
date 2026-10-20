'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

// Nothing happens on load. Link-scanning mail gateways (Outlook Safe Links,
// Proofpoint, Gmail previews) fetch every URL in an email; the previous
// version of this page unsubscribed on mount, so a scan could unsubscribe
// someone. Now the page shows the address and sends the request only when
// the person clicks.
//
// `t` is the signed token from lib/email.js. The API validates it when
// present. When it is absent (emails sent before the tokens existed link here
// with only ?email=) the click is still honoured — legacy compatibility, see
// POST /unsubscribe in app/api/[[...path]]/route.js.

const ICON = {
  check: 'M5 13l4 4L19 7',
  cross: 'M6 18L18 6M6 6l12 12',
  mail: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
}

function Icon({ tone, name }) {
  const ring = tone === 'ok' ? 'bg-teal-400/10' : tone === 'bad' ? 'bg-red-400/10' : 'bg-white/5'
  const color = tone === 'ok' ? 'text-teal-400' : tone === 'bad' ? 'text-red-400' : 'text-text-muted'
  return (
    <div className="flex justify-center mb-5">
      <div className={`w-12 h-12 rounded-full ${ring} flex items-center justify-center`}>
        <svg className={`w-6 h-6 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d={ICON[name]} />
        </svg>
      </div>
    </div>
  )
}

const PRIMARY = 'w-full rounded-md bg-[#C6F24E] px-4 py-2.5 text-sm font-semibold text-[#0A0C0D] hover:bg-[#A6D62E] disabled:opacity-60'
const SECONDARY = 'mt-3 w-full rounded-md border border-[#262B2D] px-4 py-2 text-sm text-text-secondary hover:border-[#C6F24E]/50 hover:text-white disabled:opacity-60'

async function postJson(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  return { httpOk: res.ok, ...data }
}

function UnsubscribeFlow() {
  const searchParams = useSearchParams()
  const email = (searchParams.get('email') || '').trim().toLowerCase()
  const t = (searchParams.get('t') || '').trim()
  const mode = searchParams.get('mode') // 'weekly' switches the daily send off instead of unsubscribing
  // ready | working | success | weekly | pending | bad-token | error | no-email
  const [status, setStatus] = useState(email ? 'ready' : 'no-email')

  async function act(extra, okStatus) {
    setStatus('working')
    try {
      const data = await postJson('/api/unsubscribe', { email, ...(t ? { t } : {}), ...extra })
      if (data.ok) setStatus(okStatus)
      else setStatus(data.error === 'invalid_token' ? 'bad-token' : 'error')
    } catch {
      setStatus('error')
    }
  }
  const unsubscribe = () => act({}, 'success')
  const switchToWeekly = () => act({ mode: 'weekly' }, 'weekly')

  // After unsubscribing, "the Monday digest instead" is a fresh signup: the
  // address goes back through confirmation, never straight to active.
  async function resubscribeWeekly() {
    setStatus('working')
    try {
      const data = await postJson('/api/subscribe', { email, frequency: 'weekly', source: 'switch-weekly' })
      if (!data.success) setStatus('error')
      else setStatus(data.pending ? 'pending' : 'weekly')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <Link href="/" className="inline-block mb-10">
          <span className="text-xl font-semibold text-white tracking-tight">WorkflowStacks</span>
        </Link>

        <div className="bg-[#111111] border border-white/8 rounded-2xl p-8">
          {status === 'ready' && mode === 'weekly' && (
            <>
              <Icon tone="muted" name="mail" />
              <h1 className="text-white text-xl font-semibold mb-3">Switch to the Monday digest only?</h1>
              <p className="text-text-muted text-sm leading-relaxed mb-6">
                <span className="text-white break-all">{email}</span> will keep getting the weekly Hot / Top / Rising list and stop getting the daily Skill of the Day.
              </p>
              <button type="button" onClick={switchToWeekly} className={PRIMARY}>Yes, switch me to weekly</button>
              <button type="button" onClick={unsubscribe} className={SECONDARY}>Unsubscribe from everything instead</button>
            </>
          )}

          {status === 'ready' && mode !== 'weekly' && (
            <>
              <Icon tone="muted" name="mail" />
              <h1 className="text-white text-xl font-semibold mb-3">Unsubscribe from WorkflowStacks emails?</h1>
              <p className="text-text-muted text-sm leading-relaxed mb-6">
                This stops every email to <span className="text-white break-all">{email}</span>: the Monday digest, the templates digest and the daily Skill of the Day.
              </p>
              <button type="button" onClick={unsubscribe} className={PRIMARY}>Yes, unsubscribe me</button>
              <button type="button" onClick={switchToWeekly} className={SECONDARY}>Too much email? Switch to the Monday digest only</button>
            </>
          )}

          {status === 'working' && (
            <>
              <div className="flex justify-center mb-5">
                <div className="w-10 h-10 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
              </div>
              <p className="text-text-muted text-sm">Processing your request…</p>
            </>
          )}

          {status === 'success' && (
            <>
              <Icon tone="ok" name="check" />
              <h1 className="text-white text-xl font-semibold mb-3">You’ve been unsubscribed</h1>
              <p className="text-text-muted text-sm leading-relaxed">
                No more WorkflowStacks emails to <span className="text-white break-all">{email}</span>. You can subscribe again anytime on the homepage.
              </p>
              <button type="button" onClick={resubscribeWeekly} className={SECONDARY}>
                Changed your mind? Get the Monday digest only instead
              </button>
            </>
          )}

          {status === 'weekly' && (
            <>
              <Icon tone="ok" name="check" />
              <h1 className="text-white text-xl font-semibold mb-3">Monday digest only</h1>
              <p className="text-text-muted text-sm leading-relaxed">
                Done. You’ll get the weekly Hot / Top / Rising list and nothing daily. Change your mind anytime from the footer of any email.
              </p>
            </>
          )}

          {status === 'pending' && (
            <>
              <Icon tone="ok" name="mail" />
              <h1 className="text-white text-xl font-semibold mb-3">Check your inbox to confirm</h1>
              <p className="text-text-muted text-sm leading-relaxed">
                We sent a confirmation to <span className="text-white break-all">{email}</span>. Click the link in it and the Monday digest starts again — nothing is sent until you do.
              </p>
            </>
          )}

          {status === 'bad-token' && (
            <>
              <Icon tone="bad" name="cross" />
              <h1 className="text-white text-xl font-semibold mb-3">This link isn’t valid</h1>
              <p className="text-text-muted text-sm leading-relaxed">
                The unsubscribe link doesn’t match this address. Use the link from the footer of the most recent WorkflowStacks email, or reply to any of them and we’ll do it by hand.
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <Icon tone="bad" name="cross" />
              <h1 className="text-white text-xl font-semibold mb-3">Something went wrong</h1>
              <p className="text-text-muted text-sm leading-relaxed">
                We couldn’t process your request. Please try again or contact us if the issue persists.
              </p>
              <button type="button" onClick={() => setStatus('ready')} className={SECONDARY}>Try again</button>
            </>
          )}

          {status === 'no-email' && (
            <>
              <Icon tone="muted" name="mail" />
              <h1 className="text-white text-xl font-semibold mb-3">No email specified</h1>
              <p className="text-text-muted text-sm leading-relaxed">
                This link appears to be invalid. Please use the unsubscribe link from one of our emails.
              </p>
            </>
          )}
        </div>

        <Link href="/" className="inline-block mt-6 text-sm text-text-muted hover:text-teal-400 transition-colors">
          ← Back to WorkflowStacks
        </Link>
      </div>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
      <UnsubscribeFlow />
    </Suspense>
  )
}
