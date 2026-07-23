'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, Check } from 'lucide-react'

// Fake-door row: each card is a tool that doesn't exist yet. A "notify me"
// signup is a demand vote — we build the winners.
export default function ComingSoon({ tools }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {tools.map((t) => <ComingCard key={t.slug} tool={t} />)}
    </div>
  )
}

function ComingCard({ tool }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState('idle')

  async function notify(e) {
    e.preventDefault()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return
    setState('working')
    try {
      const res = await fetch('/api/notify-interest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: tool.slug, email }),
      })
      setState(res.ok ? 'done' : 'idle')
    } catch { setState('idle') }
  }

  return (
    <Card className="bg-[#0d100f] border border-dashed border-[#323A3C] h-full">
      <CardContent className="py-6 flex flex-col h-full">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <h3 className="text-lg font-bold text-slate-200">{tool.title}</h3>
          <span className="text-[10px] uppercase tracking-wide text-slate-500 border border-slate-700 rounded px-1.5 py-0.5">Soon</span>
        </div>
        <p className="text-slate-400 text-sm leading-relaxed flex-1 mb-4">{tool.blurb}</p>
        {state === 'done' ? (
          <p className="text-sm text-[#C6F24E] flex items-center gap-1.5"><Check className="w-4 h-4" />You’re on the list — we’ll email you.</p>
        ) : (
          <form onSubmit={notify} className="flex gap-2">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com"
              className="flex-1 bg-slate-950/60 border border-slate-700 rounded-md px-3 py-2 text-white text-sm focus:border-[#C6F24E]/60 focus:outline-none" />
            <Button type="submit" disabled={state === 'working'} className="bg-white/5 hover:bg-white/10 text-white border border-[#323A3C] text-sm whitespace-nowrap">
              <Bell className="w-3.5 h-3.5 mr-1.5" />Notify me
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
