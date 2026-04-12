'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Star, Download, Github, ExternalLink, Code2, User, Calendar, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'

export default function SkillDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [skill, setSkill] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      loadSkill()
    }
  }, [params.id])

  const loadSkill = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/skills/${params.id}`)
      const data = await res.json()
      
      if (data.skill) {
        setSkill(data.skill)
      } else {
        console.error('Skill not found')
      }
    } catch (e) {
      console.error('Error loading skill:', e)
    }
    setLoading(false)
  }

  const handleDownload = () => {
    if (skill?.github_url) {
      window.open(skill.github_url, '_blank')
    }
  }

  const getCategoryColor = (cat) => {
    const colors = {
      'claude-skill': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      'gemini-extension': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      'mcp-server': 'bg-green-500/10 text-green-500 border-green-500/20',
      'prompt': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      'anthropic-claude': 'bg-pink-500/10 text-pink-500 border-pink-500/20',
      'ai-prompt': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
    }
    return colors[cat] || 'bg-gray-500/10 text-gray-500 border-gray-500/20'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="inline-block w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!skill) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl text-white mb-4">Skill not found</h2>
          <Link href="/">
            <Button>Go Home</Button>
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
          <Link href="/">
            <Button variant="ghost" className="text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Skills
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
              <CardHeader>
                <div className="flex items-start justify-between mb-4">
                  <Badge className={`${getCategoryColor(skill.category)} border`}>
                    {skill.category}
                  </Badge>
                  {skill.is_premium && (
                    <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 border-0 text-lg px-4 py-1">
                      ${skill.price}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-4xl text-white mb-2">{skill.title_human || skill.name}</CardTitle>
                <CardDescription className="text-xl text-gray-300">
                  {skill.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6 text-gray-300">
                  <span className="flex items-center gap-2">
                    <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                    <span className="font-semibold">{skill.rating?.toFixed(1)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    <span>{skill.installs?.toLocaleString()} installs</span>
                  </span>
                  {skill.github_stars > 0 && (
                    <span className="flex items-center gap-2">
                      <Github className="w-5 h-5" />
                      <span>{skill.github_stars} stars</span>
                    </span>
                  )}
                </div>

                <Separator className="bg-white/10" />

                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">About this skill</h3>
                  {skill.readme_preview ? (
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <pre className="text-gray-300 whitespace-pre-wrap font-mono text-sm">
                        {skill.readme_preview}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-gray-400">No additional information available.</p>
                  )}
                </div>

                {skill.github_topics && skill.github_topics.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Topics</h3>
                    <div className="flex flex-wrap gap-2">
                      {skill.github_topics.map((topic, idx) => (
                        <Badge key={idx} variant="outline" className="border-white/20 text-gray-300">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {skill.is_premium ? (
                  <Button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600" size="lg">
                    Purchase for ${skill.price}
                  </Button>
                ) : (
                  <Button 
                    onClick={handleDownload}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600" 
                    size="lg"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Free
                  </Button>
                )}
                
                {skill.github_url && (
                  <Button 
                    variant="outline" 
                    className="w-full border-white/20 text-white hover:bg-white/10"
                    onClick={() => window.open(skill.github_url, '_blank')}
                  >
                    <Github className="w-4 h-4 mr-2" />
                    View on GitHub
                  </Button>
                )}

                {skill.source_url && skill.source_url !== skill.github_url && (
                  <Button 
                    variant="outline" 
                    className="w-full border-white/20 text-white hover:bg-white/10"
                    onClick={() => window.open(skill.source_url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Source
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-400">Creator</div>
                    <div className="text-white font-medium">{skill.creator}</div>
                  </div>
                </div>

                {skill.language && (
                  <div className="flex items-start gap-3">
                    <Code2 className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-400">Language</div>
                      <div className="text-white font-medium">{skill.language}</div>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-400">Category</div>
                    <div className="text-white font-medium">{skill.category}</div>
                  </div>
                </div>

                {skill.created_at && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-400">Published</div>
                      <div className="text-white font-medium">
                        {new Date(skill.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
