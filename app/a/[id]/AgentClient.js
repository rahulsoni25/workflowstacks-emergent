'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Zap, Copy, CheckCircle2, Share2, User, Repeat, Star, Sparkles, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function AgentClient({ agent, skills }) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)
  const [copies, setCopies] = useState(agent.copyCount || 0)
  const [buying, setBuying] = useState(false)
  const purchased = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('purchased') === '1'
  const locked = agent.isPaid && agent.price > 0 && !purchased

  const buy = async () => {
    setBuying(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id }),
      })
      const d = await res.json()
      if (d.url) window.location.href = d.url
      else { alert(d.error || 'Checkout unavailable'); setBuying(false) }
    } catch { setBuying(false) }
  }

  const bump = () => {
    fetch('/api/agent-templates/copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: agent.id }),
    }).catch(() => {})
    setCopies((c) => c + 1)
  }

  const remix = () => {
    bump()
    const ids = (agent.skillIds || []).join(',')
    router.push(`/builder?skillIds=${ids}&goal=${encodeURIComponent(agent.goal || agent.name)}`)
  }

  const copyBlueprint = async () => {
    if (agent.agentBlueprint) {
      await navigator.clipboard.writeText(agent.agentBlueprint)
      bump()
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Open the blueprint straight in Claude with the prompt prefilled (clipboard fallback for long prompts).
  const openInClaude = async () => {
    const text = agent.agentBlueprint
    if (!text) return
    try { await navigator.clipboard.writeText(text) } catch {}
    bump()
    const q = encodeURIComponent(text)
    const url = q.length <= 6000 ? `https://claude.ai/new?q=${q}` : 'https://claude.ai/new'
    if (q.length > 6000) { setCopied(true); setTimeout(() => setCopied(false), 2500) }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const share = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    try {
      if (navigator.share) await navigator.share({ title: agent.name, url })
      else { await navigator.clipboard.writeText(url); setShared(true); setTimeout(() => setShared(false), 2000) }
    } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/community">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">
              <ArrowLeft className="w-4 h-4 mr-2" />Community
            </Button>
          </Link>
          <Button onClick={share} variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">
            {shared ? <><CheckCircle2 className="w-4 h-4 mr-2 text-teal-400" />Link copied</> : <><Share2 className="w-4 h-4 mr-2" />Share</>}
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
          <User className="w-4 h-4" />by <span className="text-teal-300 font-medium">@{agent.creatorName || 'anonymous'}</span>
          <span className="text-slate-600">•</span>
          <Repeat className="w-4 h-4" />{copies} remixes
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">{agent.name}</h1>
        {agent.goal && <p className="text-xl text-slate-300 mb-6">{agent.goal}</p>}

        <div className="flex flex-wrap gap-3 mb-8">
          {locked ? (
            <Button onClick={buy} disabled={buying} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/20" size="lg">
              {buying ? 'Opening checkout…' : `Buy for $${agent.price} — unlock blueprint`}
            </Button>
          ) : (
            <>
              <Button onClick={openInClaude} className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/20" size="lg">
                <Sparkles className="w-4 h-4 mr-2" />Open in Claude<ExternalLink className="w-3.5 h-3.5 ml-2 opacity-80" />
              </Button>
              <Button onClick={copyBlueprint} variant="outline" className="border-slate-600 text-slate-200 hover:bg-white/5" size="lg">
                {copied ? <><CheckCircle2 className="w-4 h-4 mr-2 text-teal-400" />Copied</> : <><Copy className="w-4 h-4 mr-2" />Copy blueprint</>}
              </Button>
            </>
          )}
          <Button onClick={remix} variant={locked ? 'outline' : 'default'} className={locked ? 'border-teal-500/40 text-teal-300 hover:bg-teal-500/10' : 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/20'} size="lg">
            <Zap className="w-4 h-4 mr-2" />Remix the skills — free
          </Button>
        </div>

        <Card className="bg-slate-900/60 border-slate-700/50 mb-6">
          <CardHeader><CardTitle className="text-white">Skills in this agent ({skills.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {skills.map((s) => (
                <Link key={s.id} href={`/skills/${s.id}`} className="block">
                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 hover:border-teal-500/40 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm font-medium line-clamp-1">{s.title_human || s.name}</span>
                      {s.github_stars > 0 && <span className="flex items-center gap-1 text-xs text-slate-400 shrink-0"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{s.github_stars.toLocaleString()}</span>}
                    </div>
                    <Badge className="bg-slate-700/50 text-slate-300 border-slate-600 text-xs mt-1">{s.category}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {agent.agentBlueprint && (
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader><CardTitle className="text-white">The agent blueprint{agent.isPaid && agent.price > 0 ? ` · $${agent.price}` : ''}</CardTitle></CardHeader>
            <CardContent>
              {locked ? (
                <div className="relative">
                  <div className="bg-slate-950/60 rounded-lg p-4 border border-slate-800 max-h-48 overflow-hidden">
                    <pre className="text-slate-400 whitespace-pre-wrap font-mono text-xs blur-sm select-none">{(agent.agentBlueprint || '').slice(0, 600)}</pre>
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent rounded-lg">
                    <p className="text-white font-semibold mb-3">🔒 Buy to unlock the full blueprint</p>
                    <Button onClick={buy} disabled={buying} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">{buying ? 'Opening…' : `Buy for $${agent.price}`}</Button>
                    <p className="text-slate-500 text-xs mt-2">or remix the skills for free</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-slate-950/60 rounded-lg p-4 border border-slate-800 max-h-96 overflow-auto">
                    <pre className="text-slate-300 whitespace-pre-wrap font-mono text-xs">{agent.agentBlueprint}</pre>
                  </div>
                  <p className="text-slate-500 text-sm mt-3">{purchased ? '✅ Purchased — ' : ''}Paste into Claude, ChatGPT, or Gemini — or hit Remix to customize it in the Builder.</p>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
