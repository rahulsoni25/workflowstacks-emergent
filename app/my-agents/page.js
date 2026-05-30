'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Bot, Copy, CheckCircle2, Plus, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getUserId } from '@/lib/identity'

export default function MyAgentsPage() {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    const uid = getUserId()
    if (!uid) { setLoading(false); return }
    fetch(`/api/my-agents?userId=${encodeURIComponent(uid)}`)
      .then((r) => r.json())
      .then((d) => setAgents(d.agents || []))
      .catch(() => setAgents([]))
      .finally(() => setLoading(false))
  }, [])

  const copy = async (agent) => {
    if (agent.agentBlueprint) {
      await navigator.clipboard.writeText(agent.agentBlueprint)
      setCopiedId(agent.id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">
              <ArrowLeft className="w-4 h-4 mr-2" />Home
            </Button>
          </Link>
          <Link href="/builder">
            <Button className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white">
              <Plus className="w-4 h-4 mr-2" />Build New Agent
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">My Agents</h1>
        <p className="text-lg text-slate-400 mb-10">
          Every agent you build is saved here on this device — no account needed.
        </p>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : agents.length === 0 ? (
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardContent className="py-16 text-center">
              <Bot className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-300 text-lg mb-2">You haven't built any agents yet.</p>
              <p className="text-slate-500 mb-6">Pick a few skills and the builder generates a ready-to-paste agent blueprint.</p>
              <Link href="/builder">
                <Button className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white">
                  <Plus className="w-4 h-4 mr-2" />Build Your First Agent
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {agents.map((agent) => (
              <Card key={agent.id} className="bg-slate-900/60 border-slate-700/50">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-white text-xl">{agent.name || agent.goal}</CardTitle>
                      <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        {agent.created_at ? new Date(agent.created_at).toLocaleDateString() : ''}
                        <span className="text-slate-600">•</span>
                        {agent.skillIds?.length || 0} skills
                      </p>
                    </div>
                    <Button
                      onClick={() => copy(agent)}
                      variant="outline"
                      className="border-teal-500/30 text-teal-300 hover:bg-teal-500/10 shrink-0"
                    >
                      {copiedId === agent.id ? (
                        <><CheckCircle2 className="w-4 h-4 mr-2" />Copied</>
                      ) : (
                        <><Copy className="w-4 h-4 mr-2" />Copy Blueprint</>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {agent.skills?.map((s) => (
                      <Badge key={s.id} className="bg-slate-800 text-slate-300 border-slate-700">{s.name}</Badge>
                    ))}
                  </div>
                  <details className="group">
                    <summary className="cursor-pointer text-teal-400 text-sm hover:text-teal-300">View blueprint</summary>
                    <div className="bg-slate-950/60 rounded-lg p-4 mt-3 max-h-72 overflow-auto border border-slate-800">
                      <pre className="text-slate-300 whitespace-pre-wrap font-mono text-xs">{agent.agentBlueprint}</pre>
                    </div>
                  </details>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
