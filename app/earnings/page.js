'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, DollarSign, CheckCircle2, Wallet, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getHandle, setHandle as saveHandle } from '@/lib/identity'

export default function EarningsPage() {
  const [handle, setHandle] = useState('')
  const [data, setData] = useState(null)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    const h = getHandle()
    if (h) { setHandle(h); load(h) }
  }, [])

  const load = (h) => {
    fetch(`/api/creator?handle=${encodeURIComponent(h)}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
  }

  const connect = async () => {
    const h = saveHandle(handle)
    if (!h) return alert('Enter your @handle first')
    setConnecting(true)
    try {
      const res = await fetch('/api/stripe/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handle: h }) })
      const d = await res.json()
      if (d.url) window.location.href = d.url
      else { alert(d.error || 'Could not start onboarding'); setConnecting(false) }
    } catch { setConnecting(false) }
  }

  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/"><Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5"><ArrowLeft className="w-4 h-4 mr-2" />Home</Button></Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <h1 className="text-4xl font-bold text-white mb-2">Creator Earnings</h1>
        <p className="text-slate-400 mb-8">Sell your agents and keep <strong className="text-teal-300">85%</strong> of every sale. Connect payouts to get paid.</p>

        <Card className="bg-slate-900/60 border-slate-700/50 mb-6">
          <CardContent className="py-6">
            <label className="text-sm text-slate-300 mb-1 block">Your creator handle</label>
            <div className="flex gap-2">
              <div className="flex items-center bg-slate-800/50 border border-slate-700 rounded-md px-3 flex-1">
                <span className="text-slate-400">@</span>
                <Input value={handle} onChange={(e) => setHandle(e.target.value.replace(/^@/, ''))} placeholder="your-handle" className="border-0 bg-transparent text-white focus-visible:ring-0" />
              </div>
              <Button onClick={() => handle && load(handle)} variant="outline" className="border-slate-600 text-slate-200">Load</Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardContent className="py-6 text-center">
              <DollarSign className="w-6 h-6 text-teal-400 mx-auto mb-1" />
              <div className="text-3xl font-bold text-white">${((data?.earnings || 0) / 100).toFixed(2)}</div>
              <div className="text-slate-400 text-sm">your earnings (85%)</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardContent className="py-6 text-center">
              <Wallet className="w-6 h-6 text-teal-400 mx-auto mb-1" />
              <div className="text-3xl font-bold text-white">{data?.salesCount || 0}</div>
              <div className="text-slate-400 text-sm">sales</div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardHeader><CardTitle className="text-white">Payouts</CardTitle></CardHeader>
          <CardContent>
            {data?.connected ? (
              <div className="flex items-center gap-2 text-teal-300"><CheckCircle2 className="w-5 h-5" />Payouts connected — you'll receive 85% of each sale automatically.</div>
            ) : (
              <>
                <p className="text-slate-400 text-sm mb-4">Connect a Stripe account (2 min) so we can pay you. We take a 15% platform fee.</p>
                <Button onClick={connect} disabled={connecting} className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white">
                  {connecting ? 'Opening Stripe…' : <><ExternalLink className="w-4 h-4 mr-2" />Connect payouts with Stripe</>}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {data?.paidAgents?.length > 0 && (
          <Card className="bg-slate-900/60 border-slate-700/50 mt-6">
            <CardHeader><CardTitle className="text-white">Your paid agents</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {data.paidAgents.map((a) => (
                  <li key={a.id} className="flex items-center justify-between text-sm">
                    <Link href={`/a/${a.id}`} className="text-slate-200 hover:text-teal-300 truncate">{a.name}</Link>
                    <span className="text-slate-400 shrink-0">${a.price} · {a.sales || 0} sold</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
