'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, BookOpen, Zap, Star, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default function PlaybookDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [playbook, setPlaybook] = useState(null)
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) loadPlaybook()
  }, [params.id])

  const loadPlaybook = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/playbooks/${params.id}`)
      const data = await res.json()
      if (data.playbook) {
        setPlaybook(data.playbook)
        setSkills(data.skills || [])
      }
    } catch (e) {
      console.error('Error:', e)
    }
    setLoading(false)
  }

  const handleCreateAgent = () => {
    const skillIds = playbook.skillIds.join(',')
    router.push(`/builder?skillIds=${skillIds}&goal=${encodeURIComponent(playbook.title)}`)
  }

  if (loading || !playbook) {
    return (
      <div className="min-h-screen bg-gradient-to-br neptune flex items-center justify-center">
        <div className="inline-block w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br neptune">
      <header className="border-b border-slate-700/50 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/playbooks">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Playbooks
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white mb-3">{playbook.title}</h1>
          <p className="text-xl text-slate-300 mb-5">{playbook.description}</p>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {playbook.timeEstimate && (
              <span className="flex items-center gap-1.5 text-sm bg-slate-800/60 border border-slate-700/50 rounded-full px-3 py-1 text-slate-200">⏱️ {playbook.timeEstimate}</span>
            )}
            {playbook.skillIds?.length > 0 && (
              <span className="flex items-center gap-1.5 text-sm bg-slate-800/60 border border-slate-700/50 rounded-full px-3 py-1 text-slate-200">🧩 {playbook.skillIds.length} skills</span>
            )}
            <span className="flex items-center gap-1.5 text-sm bg-emerald-500/10 border border-emerald-500/30 rounded-full px-3 py-1 text-emerald-300">100% free</span>
          </div>
          {playbook.outcome && (
            <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-4 mb-4">
              <h3 className="text-teal-300 font-semibold mb-1">What you'll have at the end:</h3>
              <p className="text-slate-200">{playbook.outcome}</p>
            </div>
          )}
          {playbook.problem && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mb-6">
              <h3 className="text-orange-400 font-semibold mb-1">Problem this solves:</h3>
              <p className="text-slate-300">{playbook.problem}</p>
            </div>
          )}
          <Button onClick={handleCreateAgent} className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/20" size="lg">
            <Zap className="w-4 h-4 mr-2" />
            Build the Agent that Runs this Playbook
          </Button>
        </div>

        {/* The actual playbook — numbered, executable steps */}
        {playbook.steps?.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">The Playbook — step by step</h2>
            <div className="space-y-4">
              {playbook.steps.map((step, i) => (
                <div key={i} className="flex gap-4 bg-slate-900/60 border border-slate-700/50 rounded-xl p-5">
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 text-white font-bold flex items-center justify-center">{i + 1}</div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                      {step.skill && <Badge className="bg-teal-500/10 text-teal-300 border-teal-500/20 border text-xs">{step.skill}</Badge>}
                    </div>
                    <p className="text-slate-300">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Skills Used ({skills.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {skills.map((skill) => (
              <Card key={skill.id} className="bg-slate-900/60 border-slate-700/50 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white">{skill.title_human || skill.name}</CardTitle>
                  <CardDescription className="text-slate-400 line-clamp-2">{skill.description_human || skill.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={`/skills/${skill.id}`}>
                    <Button variant="outline" className="w-full border-white/20 text-white">View Details</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
