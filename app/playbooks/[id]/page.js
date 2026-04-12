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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-3">{playbook.title}</h1>
          <p className="text-xl text-slate-300 mb-6">{playbook.description}</p>
          {playbook.problem && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mb-6">
              <h3 className="text-orange-400 font-semibold mb-1">Problem This Solves:</h3>
              <p className="text-slate-300">{playbook.problem}</p>
            </div>
          )}
          <Button onClick={handleCreateAgent} className="bg-gradient-to-r from-orange-500 to-pink-500" size="lg">
            <Zap className="w-4 h-4 mr-2" />
            Create This Agent
          </Button>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Skills Used ({skills.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {skills.map((skill) => (
              <Card key={skill.id} className="bg-slate-900/60 border-slate-700/50 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white">{skill.title_human || skill.name}</CardTitle>
                  <CardDescription className="text-slate-400">{skill.description}</CardDescription>
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
