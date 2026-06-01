'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Linkedin, CheckCircle2, UserPlus, Share2, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

const CATEGORIES = [
  'AI Micro-SaaS Founder', 'Developer', 'AI Influencer', 'Indie Hacker',
  'Agency / Studio', 'No-Code Builder', 'Investor / Angel', 'Community Builder',
]

export default function JoinPage() {
  const [form, setForm] = useState({ name: '', linkedinUrl: '', category: 'AI Micro-SaaS Founder', headline: '', country: '', builds: '' })
  const [ref, setRef] = useState('')
  const [status, setStatus] = useState('idle') // idle | submitting | done | error
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get('ref')
    if (r) setRef(r)
  }, [])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setStatus('submitting')
    try {
      const res = await fetch('/api/members/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, ref }),
      })
      const d = await res.json()
      if (res.ok && d.success) {
        setMsg(d.message || "You're in!")
        setStatus('done')
      } else {
        setMsg(d.error || 'Something went wrong')
        setStatus('error')
      }
    } catch {
      setMsg('Network error — please try again')
      setStatus('error')
    }
  }

  const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}/members` : ''
  const linkedinShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(inviteUrl)}`

  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/members"><Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5"><ArrowLeft className="w-4 h-4 mr-2" />Members</Button></Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-xl">
        {status === 'done' ? (
          <Card className="bg-slate-900/60 border-teal-500/30">
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="w-14 h-14 text-teal-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">{msg}</h1>
              <p className="text-slate-400 mb-8">You're now part of the global AI Builder Network. Invite a few peers — the network grows by who you bring.</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link href="/members"><Button className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white">View the directory</Button></Link>
                <a href={linkedinShare} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="border-sky-500/40 text-sky-300 hover:bg-sky-500/10"><Linkedin className="w-4 h-4 mr-2" />Invite on LinkedIn</Button>
                </a>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl mb-4">
                <UserPlus className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Join the AI Builder Network</h1>
              <p className="text-slate-400">Get featured among AI micro-SaaS founders, developers, influencers & indie hackers worldwide. Free.</p>
              {ref && <p className="text-teal-400 text-sm mt-2">Invited by @{ref} 👋</p>}
            </div>

            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardContent className="py-6">
                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-300 mb-1 block">Full name *</label>
                    <Input value={form.name} onChange={set('name')} required placeholder="Jane Doe" className="bg-slate-800/50 border-slate-700 text-white" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-300 mb-1 block flex items-center gap-1.5"><Linkedin className="w-4 h-4 text-sky-400" />LinkedIn profile URL *</label>
                    <Input value={form.linkedinUrl} onChange={set('linkedinUrl')} required placeholder="https://linkedin.com/in/yourname" className="bg-slate-800/50 border-slate-700 text-white" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-300 mb-1 block">I'm a…</label>
                    <select value={form.category} onChange={set('category')} className="w-full bg-slate-800/50 border border-slate-700 rounded-md px-3 py-2 text-white text-sm focus:border-teal-500/50 outline-none">
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-300 mb-1 block">Headline</label>
                    <Input value={form.headline} onChange={set('headline')} placeholder="Building Acme — AI cold email for agencies" className="bg-slate-800/50 border-slate-700 text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-slate-300 mb-1 block flex items-center gap-1"><Globe className="w-3.5 h-3.5" />Country</label>
                      <Input value={form.country} onChange={set('country')} placeholder="India" className="bg-slate-800/50 border-slate-700 text-white" />
                    </div>
                    <div>
                      <label className="text-sm text-slate-300 mb-1 block">What you build with AI</label>
                      <Input value={form.builds} onChange={set('builds')} placeholder="AI SaaS, agents…" className="bg-slate-800/50 border-slate-700 text-white" />
                    </div>
                  </div>

                  {status === 'error' && <p className="text-red-400 text-sm">{msg}</p>}

                  <Button type="submit" disabled={status === 'submitting'} className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white" size="lg">
                    {status === 'submitting' ? 'Joining…' : 'Join the network — free'}
                  </Button>
                  <p className="text-center text-xs text-slate-500">No account or password. We list your name, role, country & LinkedIn.</p>
                </form>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
