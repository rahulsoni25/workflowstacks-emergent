'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const TEAM_SIZES = ['1–10', '11–50', '51–200', '200+']

const FIELD =
  'w-full bg-slate-950/60 border border-slate-700 rounded-md px-3 py-2.5 text-white text-sm focus:border-teal-400/60 focus:outline-none'

// Enterprise leads land in the same Done-for-You pipeline (/admin → DfY) but
// carry source:'enterprise' + tier:'enterprise' so they can be told apart —
// enterprise is quoted per contract, not off the fixed DfY tiers.
export default function EnterpriseContactClient() {
  const [form, setForm] = useState({ name: '', email: '', company: '', teamSize: '', goal: '' })
  const [state, setState] = useState('idle') // idle | sending | done | error
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setState('sending')
    setError('')
    try {
      const res = await fetch('/api/dfy-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          company: form.company,
          goal: form.goal,
          budget: form.teamSize ? `Team size: ${form.teamSize}` : '',
          source: 'enterprise',
          tier: 'enterprise',
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Something went wrong — try again.')
      setState('done')
    } catch (err) {
      setState('error')
      setError(err.message)
    }
  }

  if (state === 'done') {
    return (
      <Card className="bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border-teal-500/30">
        <CardContent className="py-10 text-center">
          <Check className="w-10 h-10 text-teal-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Thanks — we&apos;ve got it</h2>
          <p className="text-slate-300 max-w-md mx-auto">
            Our enterprise team will reply to your email within one business day to arrange a demo and scoped pricing.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border-teal-500/30">
      <CardContent className="py-10">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to Scale Your AI Operations?</h2>
          <p className="text-slate-300">Tell us about your team and we&apos;ll come back with a custom demo and pricing.</p>
        </div>

        <form onSubmit={submit} className="space-y-5 max-w-2xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="ent-name" className="block text-sm text-slate-300 mb-1.5">Your name</label>
              <input id="ent-name" value={form.name} onChange={set('name')} required className={FIELD} placeholder="Jordan" />
            </div>
            <div>
              <label htmlFor="ent-email" className="block text-sm text-slate-300 mb-1.5">Work email</label>
              <input id="ent-email" type="email" value={form.email} onChange={set('email')} required className={FIELD} placeholder="you@company.com" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="ent-company" className="block text-sm text-slate-300 mb-1.5">Company</label>
              <input id="ent-company" value={form.company} onChange={set('company')} required className={FIELD} placeholder="Acme Inc." />
            </div>
            <div>
              <label htmlFor="ent-team" className="block text-sm text-slate-300 mb-1.5">
                Team size <span className="text-slate-500">(optional)</span>
              </label>
              <select id="ent-team" value={form.teamSize} onChange={set('teamSize')} className={FIELD}>
                <option value="">Select…</option>
                {TEAM_SIZES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="ent-goal" className="block text-sm text-slate-300 mb-1.5">What are you looking to automate?</label>
            <textarea id="ent-goal" value={form.goal} onChange={set('goal')} required rows={4} className={`${FIELD} resize-y`}
              placeholder="e.g. White-label agents for 40 agency clients, ingesting skills from our private repos, with SSO for the team." />
          </div>

          {state === 'error' && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" size="lg" disabled={state === 'sending'}
            className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold shadow-lg shadow-teal-500/20">
            {state === 'sending' ? 'Sending…' : 'Contact Enterprise Sales'}
          </Button>
          <p className="text-xs text-slate-500 text-center">
            We reply within one business day. No commitment — pricing is scoped to what you actually need.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
