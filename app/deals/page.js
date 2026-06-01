'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Users, Tag, CheckCircle2, Percent } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function DealsPage() {
  const [deals, setDeals] = useState([])
  const [openId, setOpenId] = useState(null)
  const [email, setEmail] = useState('')
  const [joined, setJoined] = useState({})

  useEffect(() => {
    fetch('/api/deals').then((r) => r.json()).then((d) => setDeals(d.deals || [])).catch(() => {})
  }, [])

  const join = async (dealId) => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return
    const res = await fetch('/api/deals/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dealId, email }) })
    if (res.ok) {
      setJoined((j) => ({ ...j, [dealId]: true }))
      setDeals((ds) => ds.map((d) => (d.id === dealId ? { ...d, slotsTaken: (d.slotsTaken || 0) + 1 } : d)))
      setOpenId(null); setEmail('')
    }
  }

  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Link href="/"><Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5"><ArrowLeft className="w-4 h-4 mr-2" />Home</Button></Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-4">
            <Percent className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-300 text-sm font-medium">Founders save 40–70% by buying together</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">Group-Buy Tool Deals</h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Pool with other founders to unlock <strong className="text-teal-300">wholesale rates</strong> on the AI tools you already use. Join a deal — it unlocks when enough builders are in.
          </p>
        </div>

        {deals.length === 0 ? (
          <p className="text-center text-slate-400 py-16">No live deals right now — check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {deals.map((d) => {
              const pct = Math.min(100, Math.round(((d.slotsTaken || 0) / (d.slotsTotal || 1)) * 100))
              return (
                <Card key={d.id} className="bg-slate-900/60 border-slate-700/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-xs"><Tag className="w-3 h-3 mr-1" />{d.category}</Badge>
                      <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 border">−{d.savingsPct}%</Badge>
                    </div>
                    <CardTitle className="text-white text-xl mt-2">{d.tool}</CardTitle>
                    <p className="text-slate-400 text-sm">{d.blurb}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-2xl font-bold text-white">${d.groupPrice}</span>
                      <span className="text-slate-500 line-through text-sm">${d.retailPrice}/yr</span>
                    </div>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{d.slotsTaken || 0}/{d.slotsTotal} joined</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
                      <div className="h-full bg-gradient-to-r from-teal-500 to-cyan-500" style={{ width: `${pct}%` }} />
                    </div>
                    {joined[d.id] ? (
                      <div className="flex items-center gap-2 text-teal-300 text-sm"><CheckCircle2 className="w-4 h-4" />You're on the list — we'll email you when it unlocks.</div>
                    ) : openId === d.id ? (
                      <div className="flex gap-2">
                        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="bg-slate-800/50 border-slate-700 text-white" />
                        <Button onClick={() => join(d.id)} className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white shrink-0">Confirm</Button>
                      </div>
                    ) : (
                      <Button onClick={() => setOpenId(d.id)} className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white">Join this deal — free to reserve</Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
        <p className="text-center text-xs text-slate-500 mt-8">Reserving is free and non-binding. You only pay if the deal unlocks and you opt in.</p>
      </div>
    </div>
  )
}
