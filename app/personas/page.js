'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Users, Briefcase, Target, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export default function PersonasPage() {
  const [personas, setPersonas] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadPersonas()
  }, [])

  const loadPersonas = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/personas')
      const data = await res.json()
      setPersonas(data.personas || [])
    } catch (e) {
      console.error('Error loading personas:', e)
    }
    setLoading(false)
  }

  const handleUsePersona = (persona) => {
    const skillIds = (persona.skillIds || []).join(',')
    const goal = persona.description || `Act as my ${persona.name}`
    router.push(`/builder?skillIds=${skillIds}&goal=${encodeURIComponent(goal)}`)
  }

  const getAudienceColor = (audience) => {
    const colors = {
      Founder: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      Marketer: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
      Sales: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      Developer: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl mb-4 shadow-lg shadow-teal-500/20">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">AI Agent Personas</h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            A <span className="text-teal-300 font-semibold">Persona</span> is a role in a box — the exact skills a
            Founder, Marketer, or Sales rep needs, pre-selected. One click turns it into a working agent.
          </p>
        </motion.div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-14 h-14 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : personas.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-400 text-xl mb-4">No personas available yet. Seed the database first!</p>
            <Link href="/"><Button className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white">Go Home</Button></Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {personas.map((persona, i) => (
              <motion.div
                key={persona.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-xl hover:border-teal-500/40 transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-3">
                      <Badge className={`${getAudienceColor(persona.audience)} border`}>
                        <Briefcase className="w-3 h-3 mr-1" />
                        {persona.audience}
                      </Badge>
                      <Badge variant="outline" className="border-slate-600 text-slate-300">
                        {persona.skillIds?.length || 0} skills
                      </Badge>
                    </div>
                    <CardTitle className="text-white text-2xl">{persona.name}</CardTitle>
                    <CardDescription className="text-slate-400 text-base">
                      {persona.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Target className="w-4 h-4" />
                      <span>Best for: {persona.audience}s</span>
                    </div>
                    <Button
                      onClick={() => handleUsePersona(persona)}
                      className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/20"
                      size="lg"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Use This Persona in Builder
                    </Button>
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
