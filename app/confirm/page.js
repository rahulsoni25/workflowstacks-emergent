import Link from 'next/link'
import { SITE_URL } from '@/lib/site-url'

// The link in the confirmation email: /confirm?token=…
//
// The confirm happens server-side on first render — no JavaScript, no
// click — so it works from any mail client, and the page then says
// "You're in". POST /api/confirm (app/api/[[...path]]/route.js) flips the
// address to active, drops the token and sends the welcome email; a second
// visit finds no pending token and says so.
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Confirm your subscription | WorkflowStacks', robots: { index: false, follow: false } }

async function confirm(token) {
  if (!/^[a-f0-9]{32}$/.test(token)) return { ok: false, error: 'missing' }
  try {
    const r = await fetch(`${SITE_URL}/api/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })
    const data = await r.json().catch(() => ({}))
    if (r.ok && data.ok) return { ok: true, email: data.email || '' }
    return { ok: false, error: data.error || `http ${r.status}` }
  } catch {
    return { ok: false, error: 'network' }
  }
}

function Icon({ tone, path }) {
  const ring = tone === 'ok' ? 'bg-teal-400/10' : tone === 'bad' ? 'bg-red-400/10' : 'bg-white/5'
  const color = tone === 'ok' ? 'text-teal-400' : tone === 'bad' ? 'text-red-400' : 'text-text-muted'
  return (
    <div className="flex justify-center mb-5">
      <div className={`w-12 h-12 rounded-full ${ring} flex items-center justify-center`}>
        <svg className={`w-6 h-6 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d={path} />
        </svg>
      </div>
    </div>
  )
}

const CHECK = 'M5 13l4 4L19 7'
const CROSS = 'M6 18L18 6M6 6l12 12'
const MAIL = 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'

export default async function ConfirmPage({ searchParams }) {
  const token = (searchParams?.token || '').toString().trim()
  const result = await confirm(token)

  let body
  if (result.ok) {
    body = (
      <>
        <Icon tone="ok" path={CHECK} />
        <h1 className="text-white text-xl font-semibold mb-3">You’re in</h1>
        <p className="text-text-muted text-sm leading-relaxed">
          {result.email ? <><span className="text-white">{result.email}</span> is confirmed. </> : 'Your subscription is confirmed. '}
          A welcome email with this week’s Hot list is on its way, and the next Monday digest lands in your inbox.
        </p>
        <Link href="/hot" className="mt-5 inline-block rounded-md bg-[#C6F24E] px-4 py-2 text-sm font-semibold text-[#0A0C0D] hover:bg-[#A6D62E]">
          See this week’s Hot list
        </Link>
      </>
    )
  } else if (result.error === 'invalid_token') {
    body = (
      <>
        <Icon tone="muted" path={MAIL} />
        <h1 className="text-white text-xl font-semibold mb-3">This link has already been used</h1>
        <p className="text-text-muted text-sm leading-relaxed">
          If you already confirmed, you’re all set and nothing more is needed. If you unsubscribed since, or the link is older than you remember,{' '}
          <Link href="/newsletter" className="text-[#C6F24E] hover:underline">subscribe again</Link> and we’ll send a fresh one.
        </p>
      </>
    )
  } else if (result.error === 'missing') {
    body = (
      <>
        <Icon tone="muted" path={MAIL} />
        <h1 className="text-white text-xl font-semibold mb-3">This link looks incomplete</h1>
        <p className="text-text-muted text-sm leading-relaxed">
          Open the confirmation email and click the button, or paste the full link from it into your browser.
        </p>
      </>
    )
  } else {
    body = (
      <>
        <Icon tone="bad" path={CROSS} />
        <h1 className="text-white text-xl font-semibold mb-3">Something went wrong</h1>
        <p className="text-text-muted text-sm leading-relaxed">
          We couldn’t confirm your subscription just now. Try the link again in a minute — it stays valid.
        </p>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <Link href="/" className="inline-block mb-10">
          <span className="text-xl font-semibold text-white tracking-tight">WorkflowStacks</span>
        </Link>
        <div className="bg-[#111111] border border-white/8 rounded-2xl p-8">{body}</div>
        <Link href="/" className="inline-block mt-6 text-sm text-text-muted hover:text-teal-400 transition-colors">
          ← Back to WorkflowStacks
        </Link>
      </div>
    </div>
  )
}
