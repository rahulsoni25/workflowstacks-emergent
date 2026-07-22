'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Check, Lock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function BundleSalesClient({ bundle }) {
  const searchParams = useSearchParams()
  const justPurchased = searchParams.get('purchased') === '1'
  const [state, setState] = useState('idle') // idle | working | error
  const [error, setError] = useState('')

  useEffect(() => {
    if (justPurchased) window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [justPurchased])

  async function buy() {
    setState('working')
    setError('')
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundleId: bundle.slug }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Checkout unavailable — try again.')
      window.location.href = data.url
    } catch (e) {
      setState('error')
      setError(e.message)
    }
  }

  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/templates">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">
              <ArrowLeft className="w-4 h-4 mr-2" />Templates
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16 max-w-2xl">
        {justPurchased && (
          <Card className="bg-[#C6F24E]/10 border-[#C6F24E]/40 mb-8">
            <CardContent className="py-5 text-center">
              <Check className="w-8 h-8 text-[#C6F24E] mx-auto mb-2" />
              <p className="text-white font-semibold">Purchase complete — check your email.</p>
              <p className="text-slate-300 text-sm mt-1">We sent your private download link to your inbox. It's yours to keep.</p>
            </CardContent>
          </Card>
        )}

        <p className="text-xs tracking-widest uppercase text-[#C6F24E] font-semibold mb-3">Premium · one-time</p>
        <h1 className="text-4xl font-bold text-white mb-2 leading-tight">{bundle.title}</h1>
        <p className="text-lg text-slate-300 mb-6">{bundle.tagline}</p>
        <p className="text-slate-400 mb-8">{bundle.description}</p>

        <Card className="bg-slate-900/60 border-slate-700/50 mb-8">
          <CardContent className="py-6">
            <h2 className="text-white font-bold mb-4">What's inside</h2>
            <ul className="space-y-2.5">
              {bundle.includes.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-[#C6F24E] flex-shrink-0 mt-0.5" />{f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-4 p-5 bg-slate-900/60 border border-[#C6F24E]/25 rounded-lg">
          <div>
            <span className="text-3xl font-extrabold text-white">${bundle.price_usd}</span>
            <span className="text-slate-400 text-sm"> one-time</span>
            <p className="text-slate-500 text-xs mt-1">Pay once. You own it. Free updates.</p>
          </div>
          <Button onClick={buy} disabled={state === 'working'} size="lg"
            className="bg-[#C6F24E] hover:bg-[#A6D62E] text-[#0A0C0D] font-semibold shadow-lg shadow-lime-500/20">
            {state === 'working' ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Redirecting…</> : <><Lock className="w-4 h-4 mr-2" />Buy &amp; download</>}
          </Button>
        </div>
        {state === 'error' && <p className="text-sm text-amber-400 mt-3 text-center">{error}</p>}

        <p className="text-center text-sm text-slate-500 mt-10">
          Want the free single-purpose versions first?{' '}
          <Link href="/templates" className="text-[#C6F24E] hover:text-[#A6D62E] underline underline-offset-2">Browse free templates</Link>
        </p>
      </div>
    </div>
  )
}
