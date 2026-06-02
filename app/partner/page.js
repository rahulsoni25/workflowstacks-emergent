'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Tag, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

const CATEGORIES = ['Research', 'Automation', 'Sales', 'Marketing', 'Design', 'Productivity', 'AI Video', 'Other']

export default function PartnerPage() {
  const [form, setForm] = useState({
    company: '', tool: '', category: 'AI Video', blurb: '', dealType: 'affiliate',
    retailPrice: '', groupPrice: '', savingsPct: '', link: '', code: '', slotsTotal: '50', contactEmail: '',
  })
  const [status, setStatus] = useState('idle')
  const [msg, setMsg] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setStatus('submitting')
    try {
      const res = await fetch('/api/deals/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const d = await res.json()
      if (res.ok && d.success) { setMsg(d.message); setStatus('done') }
      else { setMsg(d.error || 'Something went wrong'); setStatus('error') }
    } catch { setMsg('Network error'); setStatus('error') }
  }

  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/deals"><Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5"><ArrowLeft className="w-4 h-4 mr-2" />Deals</Button></Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-xl">
        {status === 'done' ? (
          <Card className="bg-slate-900/60 border-teal-500/30">
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="w-14 h-14 text-teal-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">Deal submitted 🎉</h1>
              <p className="text-slate-400 mb-8">{msg}</p>
              <Link href="/deals"><Button className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white">See live deals</Button></Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl mb-4"><Megaphone className="w-7 h-7 text-white" /></div>
              <h1 className="text-3xl font-bold text-white mb-2">List your deal for founders</h1>
              <p className="text-slate-400">Reach our community of AI founders & builders. Offer a group rate or an affiliate discount — we review every deal before it goes live.</p>
            </div>

            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardContent className="py-6">
                <form onSubmit={submit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-sm text-slate-300 mb-1 block">Company</label><Input value={form.company} onChange={set('company')} placeholder="Acme Inc" className="bg-slate-800/50 border-slate-700 text-white" /></div>
                    <div><label className="text-sm text-slate-300 mb-1 block">Tool / product *</label><Input value={form.tool} onChange={set('tool')} required placeholder="Higgsfield" className="bg-slate-800/50 border-slate-700 text-white" /></div>
                  </div>
                  <div>
                    <label className="text-sm text-slate-300 mb-1 block">Category</label>
                    <select value={form.category} onChange={set('category')} className="w-full bg-slate-800/50 border border-slate-700 rounded-md px-3 py-2 text-white text-sm outline-none">
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div><label className="text-sm text-slate-300 mb-1 block">One-line pitch</label><Input value={form.blurb} onChange={set('blurb')} placeholder="AI video generation — annual seats at a group rate" className="bg-slate-800/50 border-slate-700 text-white" /></div>

                  <div>
                    <label className="text-sm text-slate-300 mb-1 block">Deal type</label>
                    <div className="flex gap-2">
                      {[['affiliate', '🔗 Affiliate / discount code'], ['groupbuy', '🤝 Group-buy (collect & charge)']].map(([v, label]) => (
                        <button type="button" key={v} onClick={() => setForm((f) => ({ ...f, dealType: v }))} className={`flex-1 px-3 py-2 rounded-md text-sm border ${form.dealType === v ? 'bg-teal-500/15 border-teal-500/40 text-teal-300' : 'bg-slate-800/50 border-slate-700 text-slate-300'}`}>{label}</button>
                      ))}
                    </div>
                  </div>

                  {form.dealType === 'affiliate' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2"><label className="text-sm text-slate-300 mb-1 block">Deal / referral link *</label><Input value={form.link} onChange={set('link')} placeholder="https://yourtool.com/?ref=workflowstacks" className="bg-slate-800/50 border-slate-700 text-white" /></div>
                      <div><label className="text-sm text-slate-300 mb-1 block">Promo code</label><Input value={form.code} onChange={set('code')} placeholder="FOUNDERS30" className="bg-slate-800/50 border-slate-700 text-white" /></div>
                      <div><label className="text-sm text-slate-300 mb-1 block">% off</label><Input value={form.savingsPct} onChange={set('savingsPct')} placeholder="30" className="bg-slate-800/50 border-slate-700 text-white" /></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      <div><label className="text-sm text-slate-300 mb-1 block">Retail $/yr</label><Input value={form.retailPrice} onChange={set('retailPrice')} placeholder="240" className="bg-slate-800/50 border-slate-700 text-white" /></div>
                      <div><label className="text-sm text-slate-300 mb-1 block">Group $/yr</label><Input value={form.groupPrice} onChange={set('groupPrice')} placeholder="120" className="bg-slate-800/50 border-slate-700 text-white" /></div>
                      <div><label className="text-sm text-slate-300 mb-1 block">Seats</label><Input value={form.slotsTotal} onChange={set('slotsTotal')} placeholder="50" className="bg-slate-800/50 border-slate-700 text-white" /></div>
                    </div>
                  )}

                  <div><label className="text-sm text-slate-300 mb-1 block">Your contact email *</label><Input value={form.contactEmail} onChange={set('contactEmail')} required placeholder="partnerships@yourtool.com" className="bg-slate-800/50 border-slate-700 text-white" /></div>

                  {status === 'error' && <p className="text-red-400 text-sm">{msg}</p>}
                  <Button type="submit" disabled={status === 'submitting'} className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white" size="lg">{status === 'submitting' ? 'Submitting…' : 'Submit deal for review'}</Button>
                </form>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
