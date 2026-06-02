'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Users, Tag, CheckCircle2, Percent, Search, Megaphone, ShieldCheck, Clock, TrendingDown, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const CATS = ['all', 'Research', 'Automation', 'Sales', 'Marketing', 'Design', 'Productivity', 'AI Video', 'Other']
const SORTS = [
  { key: 'popular', label: 'Most popular' },
  { key: 'savings', label: 'Biggest savings' },
  { key: 'newest', label: 'Newest' },
]

export default function DealsClient({ initialDeals = [], initialRequests = [] }) {
  const [deals, setDeals] = useState(initialDeals)
  const [openId, setOpenId] = useState(null)
  const [email, setEmail] = useState('')
  const [joined, setJoined] = useState({})
  const [locking, setLocking] = useState(null)
  const [requests, setRequests] = useState(initialRequests)
  const [reqTool, setReqTool] = useState('')
  const [reqVoted, setReqVoted] = useState({})
  const [cat, setCat] = useState('all')
  const [sort, setSort] = useState('popular')
  const [q, setQ] = useState('')

  // Server already seeded deals + requests; only refresh if it came back empty.
  useEffect(() => {
    if (!initialDeals.length) fetch('/api/deals').then((r) => r.json()).then((d) => setDeals(d.deals || [])).catch(() => {})
    if (!initialRequests.length) loadRequests()
  }, [])
  const loadRequests = () => fetch('/api/deals/requests').then((r) => r.json()).then((d) => setRequests(d.requests || [])).catch(() => {})

  const requestTool = async (tool) => {
    const t = (tool || '').trim()
    if (!t) return
    setReqVoted((v) => ({ ...v, [t.toLowerCase()]: true }))
    await fetch('/api/deals/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tool: t }) }).catch(() => {})
    setReqTool(''); loadRequests()
  }

  const lockSeat = async (dealId) => {
    setLocking(dealId)
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dealId }) })
      const d = await res.json()
      if (d.url) window.location.href = d.url
      else { alert(d.error || 'Checkout unavailable'); setLocking(null) }
    } catch { setLocking(null) }
  }
  const join = async (dealId) => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return
    const res = await fetch('/api/deals/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dealId, email }) })
    if (res.ok) { setJoined((j) => ({ ...j, [dealId]: true })); setDeals((ds) => ds.map((d) => d.id === dealId ? { ...d, slotsTaken: (d.slotsTaken || 0) + 1 } : d)); setOpenId(null); setEmail('') }
  }

  // Stats
  const stats = useMemo(() => {
    const gb = deals.filter((d) => d.savingsPct > 0)
    const avg = gb.length ? Math.round(gb.reduce((s, d) => s + d.savingsPct, 0) / gb.length) : 0
    const joinedCount = deals.reduce((s, d) => s + (d.slotsTaken || 0), 0)
    const maxOff = deals.reduce((m, d) => Math.max(m, d.savingsPct || 0), 0)
    return { count: deals.length, avg, joinedCount, maxOff }
  }, [deals])

  const shown = useMemo(() => {
    let list = deals.filter((d) => (cat === 'all' || d.category === cat) && (!q || d.tool.toLowerCase().includes(q.toLowerCase())))
    if (sort === 'savings') list = [...list].sort((a, b) => (b.savingsPct || 0) - (a.savingsPct || 0))
    else if (sort === 'newest') list = [...list].reverse()
    else list = [...list].sort((a, b) => (b.slotsTaken || 0) - (a.slotsTaken || 0))
    return list
  }, [deals, cat, sort, q])

  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/"><Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5"><ArrowLeft className="w-4 h-4 mr-2" />Home</Button></Link>
          <Link href="/partner"><Button variant="outline" className="border-teal-500/30 text-teal-300 hover:bg-teal-500/10"><Megaphone className="w-4 h-4 mr-2" />List your deal</Button></Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-4">
            <Percent className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-300 text-sm font-medium">Up to {stats.maxOff || 70}% off the AI tools founders use</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">Tool Deals for Founders</h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Pool with other founders for <strong className="text-teal-300">wholesale rates</strong>, or grab an exclusive discount. Real savings on tools you already pay for.
          </p>
        </div>

        {/* Stat row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { icon: Tag, v: stats.count, l: 'live deals' },
            { icon: TrendingDown, v: `${stats.avg}%`, l: 'avg savings' },
            { icon: Users, v: stats.joinedCount, l: 'founders joined' },
            { icon: ShieldCheck, v: '100%', l: 'refundable group-buys' },
          ].map((s, i) => {
            const Icon = s.icon
            return (
              <div key={i} className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 text-center">
                <Icon className="w-5 h-5 text-teal-400 mx-auto mb-1" />
                <div className="text-2xl font-bold text-white">{s.v}</div>
                <div className="text-slate-400 text-xs">{s.l}</div>
              </div>
            )
          })}
        </div>

        {/* How it works */}
        <div className="bg-slate-900/40 border border-slate-700/50 rounded-2xl p-6 mb-10">
          <h2 className="text-white font-semibold text-center mb-5">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { n: 1, t: 'Reserve or buy', d: 'Lock a seat (refundable) on a group-buy, or grab a discount code instantly.' },
              { n: 2, t: 'The deal unlocks', d: 'When enough founders join, the group rate activates for everyone.' },
              { n: 3, t: 'Save together', d: 'You pay the wholesale price — typically 40–70% below retail.' },
            ].map((s) => (
              <div key={s.n} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 text-white font-bold text-sm flex items-center justify-center shrink-0">{s.n}</div>
                <div><div className="text-white font-medium text-sm">{s.t}</div><div className="text-slate-400 text-sm">{s.d}</div></div>
              </div>
            ))}
          </div>
        </div>

        {/* Honest disclosure: how deals work + affiliate transparency */}
        <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-900/40 border border-slate-700/40 rounded-lg p-3 mb-6">
          <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
          <p>
            <span className="text-slate-400 font-medium">How these deals work:</span> Group-buy seats pool founders together for wholesale rates and are 100% refundable if a deal doesn&apos;t reach its target. Some discount links are partner/affiliate links — we may earn a commission at no extra cost to you. We never inflate prices or run fake scarcity.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tools…" className="pl-10 bg-slate-900/60 border-slate-700 text-white" />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-slate-900/60 border border-slate-700 rounded-md px-3 text-sm text-white outline-none">
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-2 mb-8">
          {CATS.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`px-3 py-1.5 rounded-full text-sm border transition-all ${cat === c ? 'bg-teal-500 text-white border-teal-500' : 'bg-slate-900/60 text-slate-300 border-slate-700 hover:border-teal-500/40'}`}>{c}</button>
          ))}
        </div>

        {/* Deals */}
        {shown.length === 0 ? (
          <p className="text-center text-slate-400 py-16">No deals match — try another filter, or request a tool below.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {shown.map((d) => {
              const pct = Math.min(100, Math.round(((d.slotsTaken || 0) / (d.slotsTotal || 1)) * 100))
              const affiliate = d.dealType === 'affiliate'
              const savePerYr = d.retailPrice && d.groupPrice ? Math.round(d.retailPrice - d.groupPrice) : 0
              return (
                <Card key={d.id} className={`bg-slate-900/60 border-slate-700/50 ${d.featured ? 'ring-1 ring-teal-500/30' : ''}`}>
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/30 to-cyan-500/30 flex items-center justify-center text-white font-bold text-lg shrink-0">{(d.tool || '?').charAt(0).toUpperCase()}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-white text-xl">{d.tool}</CardTitle>
                          {d.featured && <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 border text-xs"><Sparkles className="w-3 h-3 mr-1" />Featured</Badge>}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-xs"><Tag className="w-3 h-3 mr-1" />{d.category}</Badge>
                          <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-xs">{affiliate ? '🔗 Discount' : '🤝 Group-buy'}</Badge>
                        </div>
                      </div>
                      {d.savingsPct > 0 && <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 border text-base px-2.5 shrink-0">−{d.savingsPct}%</Badge>}
                    </div>
                    {d.blurb && <p className="text-slate-400 text-sm mt-3">{d.blurb}</p>}
                  </CardHeader>
                  <CardContent>
                    {affiliate ? (
                      <>
                        <a href={d.link || '#'} target="_blank" rel="noopener noreferrer" className="block">
                          <Button className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white">Get this deal →</Button>
                        </a>
                        {d.code && <p className="text-center text-sm text-slate-400 mt-2">Use code <span className="text-teal-300 font-mono bg-slate-800/60 px-2 py-0.5 rounded">{d.code}</span> at checkout</p>}
                        <p className="text-center text-xs text-slate-500 mt-2">Exclusive for WorkflowStacks founders · via partner link</p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-3xl font-bold text-white">${d.groupPrice}</span>
                          <span className="text-slate-500 line-through text-sm">${d.retailPrice}/yr</span>
                          {savePerYr > 0 && <span className="text-emerald-400 text-sm ml-auto">save ${savePerYr}/yr</span>}
                        </div>
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-400 mt-3">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{d.slotsTaken || 0}/{d.slotsTotal} joined</span>
                          <span className={pct >= 80 ? 'text-amber-400' : ''}>{pct >= 80 ? <><Clock className="w-3 h-3 inline mr-0.5" />almost there!</> : `${pct}%`}</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
                          <div className="h-full bg-gradient-to-r from-teal-500 to-cyan-500" style={{ width: `${pct}%` }} />
                        </div>
                        {joined[d.id] ? (
                          <div className="flex items-center gap-2 text-teal-300 text-sm"><CheckCircle2 className="w-4 h-4" />Reserved — we'll email you when it unlocks.</div>
                        ) : openId === d.id ? (
                          <div className="flex gap-2">
                            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="bg-slate-800/50 border-slate-700 text-white" />
                            <Button onClick={() => join(d.id)} className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white shrink-0">Confirm</Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Button onClick={() => lockSeat(d.id)} disabled={locking === d.id} className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white">{locking === d.id ? 'Opening checkout…' : `Lock your seat — $${d.groupPrice}`}</Button>
                            <button onClick={() => setOpenId(d.id)} className="w-full text-center text-slate-400 text-xs hover:text-slate-300">or reserve free (pay later)</button>
                          </div>
                        )}
                        <p className="text-center text-[11px] text-slate-500 mt-2 flex items-center justify-center gap-1"><ShieldCheck className="w-3 h-3" />Fully refunded if the deal doesn't reach its target</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Demand radar */}
        <div className="mt-16 border-t border-slate-700/50 pt-12">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Want a deal on a tool we don't have?</h2>
            <p className="text-slate-400 text-sm">Request it — the most-wanted tools are the ones we negotiate next. (Claude, Perplexity, Higgsfield…)</p>
          </div>
          <div className="max-w-md mx-auto flex gap-2 mb-6">
            <Input value={reqTool} onChange={(e) => setReqTool(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && requestTool(reqTool)} placeholder="e.g. Claude, Perplexity, Higgsfield…" className="bg-slate-800/50 border-slate-700 text-white" />
            <Button onClick={() => requestTool(reqTool)} className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white shrink-0">Request</Button>
          </div>
          {requests.length > 0 && (
            <div className="max-w-2xl mx-auto flex flex-wrap gap-2 justify-center">
              {requests.map((r) => (
                <button key={r.id} onClick={() => requestTool(r.tool)} disabled={reqVoted[r.tool.toLowerCase()]} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-all ${reqVoted[r.tool.toLowerCase()] ? 'bg-teal-500/15 border-teal-500/40 text-teal-300' : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-teal-500/40'}`}>
                  {r.tool} <span className="text-xs bg-slate-800 rounded-full px-1.5">{r.votes}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
