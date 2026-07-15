'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Wrench, Clock, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const PROMISES = [
  { icon: Wrench, title: 'Built from proven tools', desc: 'We assemble your agent from the same open-source skills in our catalog — no black boxes, you can read every part.' },
  { icon: Clock, title: 'Working within 7 days', desc: 'Not a strategy call. Not a roadmap. A running automation in your own tools, usually much sooner.' },
  { icon: KeyRound, title: 'You own everything', desc: 'One-time payment from $500. The workflows, accounts, and configs are yours — no lock-in, no subscription.' },
]

const BUDGETS = ['$500–750', '$750–1,500', '$1,500+', 'Not sure yet']

export default function BuildForMeClient() {
  const [form, setForm] = useState({ name: '', email: '', goal: '', tools: '', budget: '' })
  const [state, setState] = useState('idle') // idle | sending | done | error
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setState('sending')
    setError('')
    try {
      // Carry the recommender goal along if they arrived from a result page
      const params = new URLSearchParams(window.location.search)
      const res = await fetch('/api/dfy-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source_goal: params.get('goal') || '' }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Something went wrong — try again.')
      setState('done')
    } catch (err) {
      setState('error')
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">
              <ArrowLeft className="w-4 h-4 mr-2" />Home
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <p className="text-xs tracking-widest uppercase text-[#C6F24E] text-center mb-4 font-semibold">Done-for-you</p>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 text-center leading-tight">
          Tell us what to automate.<br />We hand you a working agent.
        </h1>
        <p className="text-lg text-slate-300 text-center mb-12 max-w-xl mx-auto">
          Skip the setup entirely. Describe the workflow, and we build it into your tools — from <strong className="text-white">$500, one-time</strong>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {PROMISES.map((p) => {
            const Icon = p.icon
            return (
              <Card key={p.title} className="bg-slate-900/60 border-slate-700/50">
                <CardContent className="py-5">
                  <Icon className="w-6 h-6 text-[#C6F24E] mb-3" />
                  <h2 className="text-white font-semibold mb-1 text-sm">{p.title}</h2>
                  <p className="text-slate-400 text-xs leading-relaxed">{p.desc}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {state === 'done' ? (
          <Card className="bg-slate-900/60 border-[#C6F24E]/40">
            <CardContent className="py-10 text-center">
              <Check className="w-10 h-10 text-[#C6F24E] mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Request received</h2>
              <p className="text-slate-300 max-w-md mx-auto">
                We'll reply to your email within 24 hours with a plan and a fixed quote. No payment until you approve it.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardContent className="py-8">
              <form onSubmit={submit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="dfy-name" className="block text-sm text-slate-300 mb-1.5">Your name</label>
                    <input id="dfy-name" value={form.name} onChange={set('name')} required
                      className="w-full bg-slate-950/60 border border-slate-700 rounded-md px-3 py-2.5 text-white text-sm focus:border-[#C6F24E]/60 focus:outline-none"
                      placeholder="Jordan" />
                  </div>
                  <div>
                    <label htmlFor="dfy-email" className="block text-sm text-slate-300 mb-1.5">Email</label>
                    <input id="dfy-email" type="email" value={form.email} onChange={set('email')} required
                      className="w-full bg-slate-950/60 border border-slate-700 rounded-md px-3 py-2.5 text-white text-sm focus:border-[#C6F24E]/60 focus:outline-none"
                      placeholder="you@company.com" />
                  </div>
                </div>
                <div>
                  <label htmlFor="dfy-goal" className="block text-sm text-slate-300 mb-1.5">What do you want automated?</label>
                  <textarea id="dfy-goal" value={form.goal} onChange={set('goal')} required rows={4}
                    className="w-full bg-slate-950/60 border border-slate-700 rounded-md px-3 py-2.5 text-white text-sm focus:border-[#C6F24E]/60 focus:outline-none resize-y"
                    placeholder="e.g. When a customer leaves a review on my Shopify store, draft a personalized reply for my approval and log it to a sheet." />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="dfy-tools" className="block text-sm text-slate-300 mb-1.5">Tools you already use <span className="text-slate-500">(optional)</span></label>
                    <input id="dfy-tools" value={form.tools} onChange={set('tools')}
                      className="w-full bg-slate-950/60 border border-slate-700 rounded-md px-3 py-2.5 text-white text-sm focus:border-[#C6F24E]/60 focus:outline-none"
                      placeholder="Shopify, Gmail, Slack, Notion…" />
                  </div>
                  <div>
                    <label htmlFor="dfy-budget" className="block text-sm text-slate-300 mb-1.5">Budget <span className="text-slate-500">(optional)</span></label>
                    <select id="dfy-budget" value={form.budget} onChange={set('budget')}
                      className="w-full bg-slate-950/60 border border-slate-700 rounded-md px-3 py-2.5 text-white text-sm focus:border-[#C6F24E]/60 focus:outline-none">
                      <option value="">Select…</option>
                      {BUDGETS.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>
                {state === 'error' && (
                  <p className="text-sm text-red-400">{error}</p>
                )}
                <Button type="submit" size="lg" disabled={state === 'sending'}
                  className="w-full bg-[#C6F24E] hover:bg-[#A6D62E] text-[#0A0C0D] font-semibold shadow-lg shadow-lime-500/20">
                  {state === 'sending' ? 'Sending…' : 'Get my plan & quote'}
                </Button>
                <p className="text-xs text-slate-500 text-center">
                  Free to ask. You get a plan and a fixed quote within 24 hours — pay only if you approve it.
                </p>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
