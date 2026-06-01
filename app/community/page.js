import Link from 'next/link'
import { ArrowLeft, Zap, Repeat, Trophy, User, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks-emergent.vercel.app'

export const metadata = {
  title: 'Community Agents — Build, Share & Remix | WorkflowStacks',
  description: 'Discover AI agents built by the community — remix any of them free in one click. Build your own and share it. Real skills, no code.',
  alternates: { canonical: '/community' },
}

export const revalidate = 120

async function getJson(path) {
  try {
    const res = await fetch(`${BASE}${path}`, { next: { revalidate: 120 } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export default async function CommunityPage() {
  const [agentsData, creatorsData] = await Promise.all([getJson('/api/agents'), getJson('/api/creators')])
  const agents = agentsData?.agents || []
  const creators = creatorsData?.creators || []

  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/"><Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5"><ArrowLeft className="w-4 h-4 mr-2" />Home</Button></Link>
          <Link href="/builder"><Button className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white"><Zap className="w-4 h-4 mr-2" />Build & share yours</Button></Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-full px-4 py-1.5 mb-4">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span className="text-teal-300 text-sm font-medium">{agents.length} community agents · remix any free</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">Community Agents</h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            AI agents built by founders, for founders. <strong className="text-teal-300">Remix any of them in one click</strong> — or build your own and share it.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Agents grid */}
          <div className="lg:col-span-2">
            {agents.length === 0 ? (
              <Card className="bg-slate-900/60 border-slate-700/50">
                <CardContent className="py-16 text-center">
                  <Zap className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-300 text-lg mb-2">No community agents yet — be the first.</p>
                  <p className="text-slate-500 mb-6">Build an agent in the Builder and toggle "Publish to community."</p>
                  <Link href="/builder"><Button className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white"><Zap className="w-4 h-4 mr-2" />Build the first one</Button></Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {agents.map((a) => (
                  <Link key={a.id} href={`/a/${a.id}`} className="block group">
                    <Card className="bg-slate-900/60 border-slate-700/50 hover:border-teal-500/40 transition-all h-full">
                      <CardHeader>
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                          <span className="flex items-center gap-1"><User className="w-3 h-3" />@{a.creatorName || 'anonymous'}</span>
                          <span className="flex items-center gap-1"><Repeat className="w-3 h-3" />{a.copyCount || 0}</span>
                        </div>
                        <CardTitle className="text-white text-lg group-hover:text-teal-300 transition-colors line-clamp-2">{a.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-slate-400 text-sm line-clamp-2 mb-3">{a.goal || a.description}</p>
                        <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-xs">{a.skillIds?.length || 0} skills</Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <div>
            <Card className="bg-slate-900/60 border-slate-700/50 sticky top-24">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-400" />Top creators</CardTitle>
              </CardHeader>
              <CardContent>
                {creators.length === 0 ? (
                  <p className="text-slate-500 text-sm">No creators yet — publish an agent to claim the top spot.</p>
                ) : (
                  <ol className="space-y-3">
                    {creators.map((c, i) => (
                      <li key={c.handle} className="flex items-center gap-3">
                        <span className={`w-6 text-center font-bold ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-orange-400' : 'text-slate-500'}`}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm font-medium truncate">@{c.handle}</div>
                          <div className="text-slate-500 text-xs">{c.agents} agents · {c.copies} remixes</div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
