'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, BookOpen, Users, Target, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default function PlaybooksPage() {
  const [playbooks, setPlaybooks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPlaybooks()
  }, [])

  const loadPlaybooks = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/playbooks')
      const data = await res.json()
      setPlaybooks(data.playbooks || [])
    } catch (e) {
      console.error('Error loading playbooks:', e)
    }
    setLoading(false)
  }

  const getAudienceColor = (audience) => {
    const colors = {
      'Founder': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      'Marketer': 'bg-pink-500/10 text-pink-500 border-pink-500/20',
      'Developer': 'bg-green-500/10 text-green-500 border-green-500/20',
      'Creator': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      'Agency': 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    }
    return colors[audience] || 'bg-gray-500/10 text-gray-500 border-gray-500/20'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/">
            <Button variant="ghost" className="text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-purple-500 rounded-2xl mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Playbooks</h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Step-by-step guides combining AI skills to solve real problems
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {playbooks.map((playbook) => (
              <Card key={playbook.id} className="bg-black/40 border-white/10 backdrop-blur-xl hover:border-orange-500/50 transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between mb-3">
                    <Badge className={`${getAudienceColor(playbook.audience)} border`}>
                      <Users className="w-3 h-3 mr-1" />
                      {playbook.audience}
                    </Badge>
                    <Badge variant="outline" className="border-white/20 text-gray-300">
                      {playbook.skillIds?.length || 0} skills
                    </Badge>
                  </div>
                  <CardTitle className="text-white text-xl">{playbook.title}</CardTitle>
                  <CardDescription className="text-gray-400">
                    {playbook.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {playbook.problem && (
                    <div className="flex items-start gap-2 text-sm text-gray-400 bg-white/5 p-3 rounded-lg">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{playbook.problem}</span>
                    </div>
                  )}
                  <Link href={`/playbooks/${playbook.id}`}>
                    <Button className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600">
                      View Playbook
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
