import { ArrowLeft, BookOpen, Users, AlertCircle, Clock, ListChecks, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks-emergent.vercel.app'
export const revalidate = 600

function audienceColor(a) {
  const c = {
    Founder: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    Marketer: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    Developer: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Creator: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Agency: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  }
  return c[a] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'
}

async function getPlaybooks() {
  try {
    const res = await fetch(`${BASE}/api/playbooks`, { next: { revalidate: 600 } })
    if (!res.ok) return []
    return (await res.json()).playbooks || []
  } catch {
    return []
  }
}

export default async function PlaybooksPage() {
  const playbooks = await getPlaybooks()

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'AI Playbooks for Founders',
    description: 'Step-by-step AI playbooks that combine skills to solve one specific problem.',
    numberOfItems: playbooks.length,
    itemListElement: playbooks.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${BASE}/playbooks/${p.id}`,
      name: p.title,
    })),
  }

  return (
    <div className="min-h-screen bg-neptune">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/"><Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5"><ArrowLeft className="w-4 h-4 mr-2" />Back to Home</Button></Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-500 to-teal-500 rounded-2xl mb-4 shadow-lg shadow-amber-500/20">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">Playbooks</h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            A <span className="text-teal-300 font-semibold">Playbook</span> solves one specific problem with a proven set of skills. Open it in the Builder to get the agent that runs it.
          </p>
        </div>

        {playbooks.length === 0 ? (
          <div className="text-center py-20"><p className="text-slate-400 text-xl">No playbooks available yet.</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {playbooks.map((playbook) => {
              const stepCount = playbook.steps?.length || 0
              return (
                <Card key={playbook.id} className="bg-slate-900/60 border-slate-700/50 backdrop-blur-xl hover:border-amber-500/40 transition-all duration-300 h-full flex flex-col">
                  <CardHeader className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <Badge className={`${audienceColor(playbook.audience)} border`}><Users className="w-3 h-3 mr-1" />{playbook.audience}</Badge>
                      <Badge variant="outline" className="border-slate-600 text-slate-300">{playbook.skillIds?.length || 0} skills</Badge>
                    </div>
                    <CardTitle className="text-white text-xl">{playbook.title}</CardTitle>
                    <CardDescription className="text-slate-400">{playbook.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* At-a-glance signals so the value is legible before click-through */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {playbook.timeEstimate && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-teal-500/20 bg-teal-500/10 px-2.5 py-1 text-teal-300"><Clock className="w-3 h-3" />{playbook.timeEstimate}</span>
                      )}
                      {stepCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-600 bg-slate-800/50 px-2.5 py-1 text-slate-300"><ListChecks className="w-3 h-3" />{stepCount} steps</span>
                      )}
                    </div>
                    {playbook.outcome && (
                      <div className="flex items-start gap-2 text-sm text-slate-300 bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/15">
                        <Target className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-400" />
                        <span><span className="text-emerald-300 font-medium">Outcome:</span> {playbook.outcome}</span>
                      </div>
                    )}
                    {playbook.problem && (
                      <div className="flex items-start gap-2 text-sm text-slate-400 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" /><span>{playbook.problem}</span>
                      </div>
                    )}
                    <Link href={`/playbooks/${playbook.id}`} className="block">
                      <Button className="w-full bg-gradient-to-r from-amber-500 to-teal-500 hover:from-amber-600 hover:to-teal-600 text-white shadow-lg shadow-amber-500/20">View Playbook</Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
