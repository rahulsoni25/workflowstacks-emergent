'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowBigUp, Zap, Plus, MessageSquarePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getHandle } from '@/lib/identity'

const CATEGORIES = ['all', 'Sales', 'Marketing', 'Support', 'Ops', 'Finance', 'Product']
const CAT_COLOR = {
  Sales: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Marketing: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
  Support: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  Ops: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  Finance: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Product: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
}

export default function ProblemsPage() {
  const [problems, setProblems] = useState([])
  const [category, setCategory] = useState('all')
  const [voted, setVoted] = useState({})
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', category: 'Ops' })
  const [submitting, setSubmitting] = useState(false)
  const [building, setBuilding] = useState(null)
  const router = useRouter()

  // Match the problem to the right skills, then open the Builder pre-loaded
  const buildAgent = async (p) => {
    setBuilding(p.id)
    let skillIds = []
    try {
      const r = await fetch(`/api/match?q=${encodeURIComponent(`${p.title} ${p.description || ''}`)}&category=${encodeURIComponent(p.category)}`)
      const d = await r.json()
      skillIds = (d.matches || []).map((m) => m.id)
    } catch { /* fall back to goal-only */ }
    const qs = skillIds.length ? `skillIds=${skillIds.join(',')}&goal=${encodeURIComponent(p.title)}` : `goal=${encodeURIComponent(p.title)}`
    router.push(`/builder?${qs}`)
  }

  const load = () => {
    fetch('/api/problems')
      .then((r) => r.json())
      .then((d) => setProblems(d.problems || []))
      .catch(() => {})
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(
    () => (category === 'all' ? problems : problems.filter((p) => p.category === category)),
    [problems, category]
  )

  const upvote = (id) => {
    if (voted[id]) return
    setVoted((v) => ({ ...v, [id]: true }))
    setProblems((ps) => ps.map((p) => (p.id === id ? { ...p, upvotes: (p.upvotes || 0) + 1 } : p)))
    fetch('/api/problems/upvote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ problemId: id }) }).catch(() => {})
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/problems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, author: getHandle() || 'anonymous' }),
      })
      if (res.ok) { setForm({ title: '', description: '', category: 'Ops' }); setShowForm(false); load() }
    } finally { setSubmitting(false) }
  }

  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/"><Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5"><ArrowLeft className="w-4 h-4 mr-2" />Home</Button></Link>
          <Button onClick={() => setShowForm((s) => !s)} className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white"><Plus className="w-4 h-4 mr-2" />Post a problem</Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">Workflow Problems</h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            What's the bottleneck you wish AI could kill? <strong className="text-teal-300">Post it, upvote others</strong> — and turn any problem into an agent in one click.
          </p>
        </div>

        {showForm && (
          <Card className="bg-slate-900/60 border-teal-500/30 mb-8">
            <CardContent className="py-6">
              <form onSubmit={submit} className="space-y-3">
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Automate replying to Shopify product reviews" className="bg-slate-800/50 border-slate-700 text-white" />
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Describe the bottleneck (optional)" rows={2} className="w-full bg-slate-800/50 border border-slate-700 rounded-md px-3 py-2 text-sm text-white outline-none focus:border-teal-500/50" />
                <div className="flex items-center gap-3">
                  <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="bg-slate-800/50 border border-slate-700 rounded-md px-3 py-2 text-sm text-white outline-none">
                    {CATEGORIES.filter((c) => c !== 'all').map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <Button type="submit" disabled={submitting} className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white ml-auto"><MessageSquarePlus className="w-4 h-4 mr-2" />{submitting ? 'Posting…' : 'Post problem'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategory(c)} className={`px-3 py-1.5 rounded-full text-sm border transition-all ${category === c ? 'bg-teal-500 text-white border-teal-500' : 'bg-slate-900/60 text-slate-300 border-slate-700 hover:border-teal-500/40'}`}>{c}</button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-slate-400 py-16">No problems yet — be the first to post one.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((p) => (
              <Card key={p.id} className="bg-slate-900/60 border-slate-700/50 hover:border-teal-500/40 transition-all">
                <CardContent className="py-4 flex items-start gap-4">
                  <button onClick={() => upvote(p.id)} className={`flex flex-col items-center rounded-lg px-2.5 py-1.5 border transition-all ${voted[p.id] ? 'bg-teal-500/15 border-teal-500/40 text-teal-300' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-teal-500/40'}`}>
                    <ArrowBigUp className="w-5 h-5" />
                    <span className="text-sm font-bold">{p.upvotes || 0}</span>
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`${CAT_COLOR[p.category] || 'bg-slate-700/50 text-slate-300 border-slate-600'} border text-xs`}>{p.category}</Badge>
                      <span className="text-slate-500 text-xs">by @{p.author || 'anonymous'}</span>
                    </div>
                    <h3 className="text-white font-semibold">{p.title}</h3>
                    {p.description && <p className="text-slate-400 text-sm mt-1 line-clamp-2">{p.description}</p>}
                  </div>
                  <Button onClick={() => buildAgent(p)} disabled={building === p.id} size="sm" className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white shrink-0">
                    <Zap className="w-4 h-4 mr-1.5" />{building === p.id ? 'Matching skills…' : 'Build the agent'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
