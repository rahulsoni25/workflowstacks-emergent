'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Zap, GitFork, Eye, Share2, Sparkles, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function getCategoryColor(cat) {
  const colors = {
    'claude-skill': 'bg-teal-500/10 text-teal-300 border-teal-500/20',
    'mcp-server': 'bg-green-500/10 text-green-300 border-green-500/20',
    'ai-agent': 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
    'ai-tool': 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
    'automation': 'bg-orange-500/10 text-orange-300 border-orange-500/20',
    'prompt': 'bg-violet-500/10 text-violet-300 border-violet-500/20',
  }
  return colors[cat] || 'bg-slate-500/10 text-slate-300 border-slate-500/20'
}

export default function StackDetailClient({ stack, skills }) {
  const [copied, setCopied] = useState(false)
  const builderHref = `/builder?goal=${encodeURIComponent(stack.goal)}&forkOf=${encodeURIComponent(stack.slug)}`
  const skillIdsParam = (stack.skillIds || []).join(',')
  const builderForkHref = `/builder?skillIds=${skillIdsParam}&goal=${encodeURIComponent(stack.goal)}&forkOf=${encodeURIComponent(stack.slug)}`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900">
      <header className="border-b border-slate-700/50 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">
              <ArrowLeft className="w-4 h-4 mr-2" />Back to home
            </Button>
          </Link>
          <Button onClick={copyLink} variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:text-white">
            <Share2 className="w-3.5 h-3.5 mr-1.5" />{copied ? 'Copied!' : 'Share'}
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-10 max-w-5xl">
        {/* Header card */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-violet-300" />
            <span>An AI Stack by <span className="text-slate-200 font-medium">@{stack.creatorHandle || 'anonymous'}</span></span>
            <span>·</span>
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {(stack.viewCount || 0).toLocaleString()}</span>
            <span>·</span>
            <span className="flex items-center gap-1"><GitFork className="w-3 h-3" /> {(stack.forkCount || 0).toLocaleString()}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 tracking-tight">{stack.name}</h1>
          <p className="text-xl text-slate-300 mb-4 italic">"{stack.goal}"</p>
          {stack.summary && (
            <div className="bg-teal-500/5 border border-teal-500/30 rounded-md p-4 mb-4">
              <div className="text-teal-300 font-semibold uppercase tracking-wide text-xs mb-1.5">How this stack solves it</div>
              <p className="text-slate-200">{stack.summary}</p>
            </div>
          )}
          {stack.context && (
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-md p-4 mb-4">
              <div className="text-violet-300 font-semibold uppercase tracking-wide text-xs mb-1.5">Goal in plain English</div>
              <p className="text-slate-200">{stack.context}</p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-6">
            <Link href={builderForkHref}>
              <Button size="lg" className="bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white font-semibold shadow-lg shadow-violet-500/20">
                <Zap className="w-4 h-4 mr-2" />Build this stack
              </Button>
            </Link>
            <Link href={builderHref}>
              <Button size="lg" variant="outline" className="border-slate-700 text-slate-200 hover:bg-white/5">
                <GitFork className="w-4 h-4 mr-2" />Fork & customize
              </Button>
            </Link>
          </div>
        </div>

        {/* Skills used */}
        <h2 className="text-2xl font-bold text-white mb-4">Skills in this stack ({skills.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {skills.map((s, i) => (
            <Card key={s.id} className="bg-slate-900/60 border-slate-700/50 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-violet-300 font-bold text-sm">#{i + 1}</span>
                  <Badge className={`${getCategoryColor(s.category)} border`}>{s.category}</Badge>
                  {s.explainer?.difficulty && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      s.explainer.difficulty === 'beginner' ? 'bg-emerald-500/15 text-emerald-300' :
                      s.explainer.difficulty === 'advanced' ? 'bg-orange-500/15 text-orange-300' :
                      'bg-slate-500/15 text-slate-300'
                    }`}>{s.explainer.difficulty}</span>
                  )}
                </div>
                <CardTitle className="text-white text-base">{s.title_human || s.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 text-sm mb-2">{s.explainer?.what_it_is || s.description_human || s.description}</p>
                {s.explainer?.what_you_can_make && (
                  <p className="text-xs text-slate-400 italic">{s.explainer.what_you_can_make}</p>
                )}
                <div className="flex items-center justify-between mt-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    {s.explainer?.time_to_setup && <span>⏱ {s.explainer.time_to_setup}</span>}
                    {s.explainer?.cost_to_run && <span>💵 {s.explainer.cost_to_run}</span>}
                  </div>
                  <Link href={`/skills/${s.slug || s.id}`} className="text-teal-400 hover:text-teal-300 inline-flex items-center gap-1 font-medium">
                    Details <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-12 p-6 bg-gradient-to-r from-violet-500/10 via-cyan-500/10 to-teal-500/10 border border-violet-500/30 rounded-lg text-center">
          <h3 className="text-xl font-bold text-white mb-2">Build your own AI stack</h3>
          <p className="text-slate-300 mb-4">Tell us what you want to build and we'll recommend the exact skills.</p>
          <Link href="/">
            <Button className="bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white font-semibold">
              <Sparkles className="w-4 h-4 mr-2" />Start building
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
