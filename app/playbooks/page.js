'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, BookOpen, Users, Target, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { motion } from 'framer-motion'

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
      'Founder': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      'Marketer': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
      'Developer': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      'Creator': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      'Agency': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
    }
    return colors[audience] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  }

  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-500 to-teal-500 rounded-2xl mb-4 shadow-lg shadow-amber-500/20">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">Playbooks</h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Step-by-step guides combining AI skills to solve real problems
          </p>
        </motion.div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-14 h-14 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {playbooks.map((playbook, i) => (
              <motion.div key={playbook.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-xl hover:border-amber-500/40 transition-all duration-300 h-full flex flex-col">
                  <CardHeader className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <Badge className={`${getAudienceColor(playbook.audience)} border`}>
                        <Users className="w-3 h-3 mr-1" />
                        {playbook.audience}
                      </Badge>
                      <Badge variant="outline" className="border-slate-600 text-slate-300">
                        {playbook.skillIds?.length || 0} skills
                      </Badge>
                    </div>
                    <CardTitle className="text-white text-xl">{playbook.title}</CardTitle>
                    <CardDescription className="text-slate-400">{playbook.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {playbook.problem && (
                      <div className="flex items-start gap-2 text-sm text-slate-400 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" />
                        <span>{playbook.problem}</span>
                      </div>
                    )}
                    <Link href={`/playbooks/${playbook.id}`}>
                      <Button className="w-full bg-gradient-to-r from-amber-500 to-teal-500 hover:from-amber-600 hover:to-teal-600 text-white shadow-lg shadow-amber-500/20">
                        View Playbook
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
