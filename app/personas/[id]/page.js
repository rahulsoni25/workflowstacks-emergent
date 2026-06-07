import { notFound } from 'next/navigation'
import { ArrowLeft, Briefcase, Zap, CheckCircle2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks-emergent.vercel.app'
export const revalidate = 600

async function getPersona(id) {
  try {
    const res = await fetch(`${BASE}/api/personas/${id}`, { next: { revalidate: 600 } })
    if (!res.ok) return null
    const data = await res.json()
    return data.persona ? { persona: data.persona, skills: data.skills || [] } : null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }) {
  const data = await getPersona(params.id)
  if (!data) return { title: 'Persona not found | WorkflowStacks', robots: { index: false, follow: false } }
  const p = data.persona
  const title = `${p.name} — AI Agent Persona | WorkflowStacks`
  const description = (p.whatItDoes || p.description || '').slice(0, 160)
  const url = `/personas/${p.id}`
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, type: 'article', url } }
}

export default async function PersonaDetailPage({ params }) {
  const data = await getPersona(params.id)
  if (!data) notFound()
  const { persona, skills } = data
  const goal = persona.description || `Act as my ${persona.name}`
  const builderHref = `/builder?skillIds=${(persona.skillIds || []).join(',')}&goal=${encodeURIComponent(goal)}`

  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/personas">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">
              <ArrowLeft className="w-4 h-4 mr-2" />Back to Personas
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="mb-8">
          <Badge className="bg-violet-500/10 text-violet-300 border-violet-500/20 border mb-4">
            <Briefcase className="w-3 h-3 mr-1" />{persona.audience}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">{persona.name}</h1>
          <p className="text-xl text-slate-300 mb-5">{persona.whatItDoes || persona.description}</p>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="text-sm bg-slate-800/60 border border-slate-700/50 rounded-full px-3 py-1 text-slate-200">🧩 {persona.skillIds?.length || 0} skills</span>
            <span className="text-sm bg-emerald-500/10 border border-emerald-500/30 rounded-full px-3 py-1 text-emerald-300">100% free</span>
          </div>
          <Link href={builderHref}>
            <Button className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/20" size="lg">
              <Zap className="w-4 h-4 mr-2" />Build this AI Employee
            </Button>
          </Link>
          <p className="text-sm text-slate-500 mt-2">Loads its {persona.skillIds?.length || 0} skills into the builder and generates a paste-ready agent.</p>
        </div>

        {persona.handles?.length > 0 && (
          <Card className="bg-slate-900/60 border-slate-700/50 mb-8">
            <CardHeader><CardTitle className="text-white">What it handles for you</CardTitle></CardHeader>
            <CardContent>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {persona.handles.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />{h}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {persona.brief && (
          <Card className="bg-slate-900/60 border-slate-700/50 mb-8">
            <CardHeader><CardTitle className="text-white">Operating brief</CardTitle></CardHeader>
            <CardContent>
              <p className="text-slate-300 italic">"{persona.brief}"</p>
            </CardContent>
          </Card>
        )}

        {skills.length > 0 && (
          <>
            <h2 className="text-2xl font-bold text-white mb-6">Skills in this persona ({skills.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {skills.map((skill) => (
                <Card key={skill.id} className="bg-slate-900/60 border-slate-700/50 hover:border-teal-500/40 transition-all">
                  <CardHeader>
                    <Badge className="bg-slate-800 text-slate-300 border-slate-700 w-fit mb-2 text-xs">{skill.category}</Badge>
                    <CardTitle className="text-white text-lg">{skill.title_human || skill.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-400 text-sm line-clamp-2 mb-3">{skill.description_human || skill.description}</p>
                    <div className="flex items-center justify-between">
                      {skill.github_stars > 0 && (
                        <span className="flex items-center gap-1 text-sm text-slate-400">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />{skill.github_stars.toLocaleString()}
                        </span>
                      )}
                      <Link href={`/skills/${skill.slug || skill.id}`}>
                        <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:text-teal-300">View</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
