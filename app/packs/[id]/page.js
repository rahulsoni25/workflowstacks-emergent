'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Package, Users, Target, Zap, Star, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default function PackDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [pack, setPack] = useState(null)
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      loadPack()
    }
  }, [params.id])

  const loadPack = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/packs/${params.id}`)
      const data = await res.json()
      
      if (data.pack) {
        setPack(data.pack)
        setSkills(data.skills || [])
      }
    } catch (e) {
      console.error('Error loading pack:', e)
    }
    setLoading(false)
  }

  const handleOpenInBuilder = () => {
    const skillIds = pack.skillIds.join(',')
    router.push(`/builder?skillIds=${skillIds}&goal=${encodeURIComponent(pack.name)}`)
  }

  const getCategoryColor = (cat) => {
    const colors = {
      'claude-skill': 'bg-purple-500/10 text-purple-500',
      'gemini-extension': 'bg-blue-500/10 text-blue-500',
      'mcp-server': 'bg-green-500/10 text-green-500',
      'prompt': 'bg-orange-500/10 text-orange-500',
      'ai-agent': 'bg-cyan-500/10 text-cyan-500',
      'ai-tool': 'bg-indigo-500/10 text-indigo-500'
    }
    return colors[cat] || 'bg-gray-500/10 text-gray-500'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="inline-block w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!pack) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl text-white mb-4">Pack not found</h2>
          <Link href="/packs">
            <Button>Browse Packs</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/packs">
            <Button variant="ghost" className="text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Packs
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Pack Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20 border">
                  <Users className="w-3 h-3 mr-1" />
                  {pack.audience}
                </Badge>
                <Badge variant="outline" className="border-white/20 text-gray-300">
                  <Target className="w-3 h-3 mr-1" />
                  {pack.useCase}
                </Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">{pack.name}</h1>
              <p className="text-xl text-gray-300">{pack.description}</p>
            </div>
          </div>

          <Button
            onClick={handleOpenInBuilder}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            size="lg"
          >
            <Zap className="w-4 h-4 mr-2" />
            Open in Agent Builder
          </Button>
        </div>

        {/* Skills in Pack */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">
            Included Skills ({skills.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {skills.map((skill) => (
              <Card key={skill.id} className="bg-black/40 border-white/10 backdrop-blur-xl hover:border-purple-500/50 transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge className={`${getCategoryColor(skill.category)} border border-white/10`}>
                      {skill.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-white">{skill.title_human || skill.name}</CardTitle>
                  <CardDescription className="text-gray-400">
                    {skill.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                    {skill.rating > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                        {skill.rating.toFixed(1)}
                      </span>
                    )}
                    {skill.installs > 0 && (
                      <span className="flex items-center gap-1">
                        <Download className="w-4 h-4" />
                        {skill.installs.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <Link href={`/skills/${skill.id}`}>
                    <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                      View Details
                    </Button>
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
