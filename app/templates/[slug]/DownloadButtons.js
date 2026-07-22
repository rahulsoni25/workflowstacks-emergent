'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Download, Sparkles, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Download flow with a SOFT email gate:
//  - We ask for an email (single field) before the download.
//  - "Just download" always works — we never block the activation moment.
//  - When a goal is present (?goal= from the builder), the download is
//    personalized: the workflow's AI prompt is rewritten for the user's niche.
export default function DownloadButtons({ slug, filename }) {
  const searchParams = useSearchParams()
  const goal = (searchParams.get('goal') || '').trim()
  const personalizable = goal.length >= 10

  const [email, setEmail] = useState('')
  const [state, setState] = useState('idle') // idle | working | error
  const [done, setDone] = useState(false)

  function triggerDownload(blob) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  async function runDownload() {
    // Personalized path (POST) returns a blob; standard path is a plain GET.
    if (personalizable) {
      const res = await fetch(`/api/templates/${slug}/personalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal }),
      })
      if (!res.ok) throw new Error('download failed')
      triggerDownload(await res.blob())
    } else {
      window.location.href = `/api/templates/${slug}`
    }
  }

  // Best-effort — a failed capture must never block the download.
  async function captureEmail() {
    const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
    if (!valid) return
    try {
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'template-download', template: slug }),
      })
    } catch {}
  }

  async function onSubmit(e) {
    e.preventDefault()
    setState('working')
    try {
      await captureEmail()
      await runDownload()
      setDone(true)
      setState('idle')
    } catch {
      setState('error')
    }
  }

  async function skip() {
    setState('working')
    try {
      await runDownload()
      setDone(true)
      setState('idle')
    } catch {
      setState('error')
    }
  }

  if (done) {
    return (
      <div className="text-center space-y-2">
        <p className="text-white font-semibold">✓ Downloading — check your Downloads folder.</p>
        <p className="text-sm text-slate-400">
          Next: open n8n → Import from File → follow the setup note inside the workflow.
        </p>
        <button onClick={() => setDone(false)} className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2">
          Download again
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="relative">
          <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full bg-slate-950/60 border border-slate-700 rounded-md pl-9 pr-3 py-3 text-white text-sm focus:border-[#C6F24E]/60 focus:outline-none"
          />
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={state === 'working'}
          className="w-full bg-[#C6F24E] hover:bg-[#A6D62E] text-[#0A0C0D] font-semibold shadow-lg shadow-lime-500/20"
        >
          {personalizable ? <Sparkles className="w-4 h-4 mr-2" /> : <Download className="w-4 h-4 mr-2" />}
          {state === 'working'
            ? 'Preparing…'
            : personalizable
              ? 'Email it to me + download (personalized)'
              : 'Email it to me + download'}
        </Button>
      </form>

      <div className="text-center mt-3 space-y-1">
        <button onClick={skip} disabled={state === 'working'} className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2">
          No thanks — just download
        </button>
        {personalizable && (
          <p className="text-[11px] text-slate-500">
            Tuned to: “{goal.slice(0, 80)}{goal.length > 80 ? '…' : ''}”
          </p>
        )}
        {state === 'error' && (
          <p className="text-xs text-amber-400">Something hiccuped — click “just download” to grab the standard file.</p>
        )}
        <p className="text-[11px] text-slate-600">We email new templates occasionally. Unsubscribe anytime. No spam.</p>
      </div>
    </div>
  )
}
