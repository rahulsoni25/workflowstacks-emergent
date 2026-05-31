'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Briefcase, Zap, CheckCircle2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default function PersonaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [persona, setPersona] = useState(null)
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) load()
  }, [params.id])

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/personas/${params.id}`)
      const data = await res.json()
      if (data.persona) {
        setPersona(data.persona)
        setSkills(data.skills || [])
      }
    } catch (e) {
      console.error('Error:', e)
    }
    setLoading(false)
  }

  const useInBuilder = () => {
    const ids = (persona.skillIds || []).join(',')
    const goal = persona.description || `Act as my ${persona.name}`
    router.push(`/builder?skillIds=${ids}&goal=${encodeURIComponent(goal)}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neptune flex items-center justify-center">
        <div className="inline-block w-14 h-14 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!persona) {
    return (
      <div className="min-h-screen bg-neptune flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl text-white mb-4">Persona not found</h2>
          <Link href="/personas"><Button>Browse Personas</Button></Link>
        </div>
      </div>
    )
  }

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
          <Button onClick={useInBuilder} className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/20" size="lg">
            <Zap className="w-4 h-4 mr-2" />Build this AI Employee
          </Button>
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
                  <Link href={`/skills/${skill.id}`}>
                    <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:text-teal-300">View</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
