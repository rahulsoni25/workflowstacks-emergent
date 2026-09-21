'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BadgeCheck, Loader2 } from 'lucide-react'
import CopyLine from './CopyLine'
import { readInvite } from './InviteCapture'

// Claim = prove you control a listed repo by adding our badge (or any link to
// workflowstacks.com) to its README. No account, no password.
export default function ClaimBox({ handle, badgeMd, foundingLeft }) {
  const router = useRouter()
  const [state, setState] = useState('idle') // idle | checking | ok | error
  const [msg, setMsg] = useState('')

  const check = async () => {
    setState('checking')
    setMsg('')
    try {
      const res = await fetch('/api/creator-directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle, ref: readInvite() }),
      })
      const j = await res.json().catch(() => ({}))
      if (res.ok && j.success) {
        setState('ok')
        setMsg(j.founding ? 'Verified — and you are a Founding Creator.' : 'Verified. Welcome aboard.')
        router.refresh()
      } else {
        setState('error')
        setMsg(j.error || 'Something went wrong — please try again.')
      }
    } catch {
      setState('error')
      setMsg('Network error — please try again.')
    }
  }

  return (
    <section className="rounded-xl border border-[#C6F24E]/25 bg-[#101314] p-5">
      <div className="flex items-center gap-2 text-text-primary">
        <BadgeCheck className="h-5 w-5 text-[#C6F24E]" />
        <h2 className="text-lg font-semibold">Is this you? Claim this page</h2>
      </div>
      <p className="mt-2 text-[14px] leading-relaxed text-text-muted">
        This page was created automatically because @{handle}&rsquo;s open-source work is in our catalog. If that&rsquo;s you, claim it in two steps. No account needed.
      </p>
      <ol className="mt-4 space-y-4 text-[14px] text-text-muted">
        <li>
          <div className="mb-1.5 font-semibold text-text-primary">1. Paste this badge into your repo&rsquo;s README</div>
          <CopyLine text={badgeMd} />
        </li>
        <li>
          <div className="mb-1.5 font-semibold text-text-primary">2. Push, then press the button</div>
          <button
            type="button"
            onClick={check}
            disabled={state === 'checking' || state === 'ok'}
            className="inline-flex items-center gap-2 rounded-lg bg-[#C6F24E] px-4 py-2 text-sm font-semibold text-[#0A0C0D] hover:bg-[#d4f76e] disabled:opacity-60"
          >
            {state === 'checking' && <Loader2 className="h-4 w-4 animate-spin" />}
            {state === 'ok' ? 'Verified' : 'Check my README'}
          </button>
          {msg && <p className={`mt-2 text-[13px] ${state === 'ok' ? 'text-[#C6F24E]' : 'text-amber-300'}`} role="status">{msg}</p>}
        </li>
      </ol>
      <p className="mt-4 text-[13px] text-text-muted">
        Verified creators get a badge on this page, their GitHub bio and links shown here, and a personal invite link.
        {foundingLeft > 0 && <> The first 100 are marked <strong className="text-text-primary">Founding Creator</strong> for good. {foundingLeft} spots left.</>}
      </p>
    </section>
  )
}
