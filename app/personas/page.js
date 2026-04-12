'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Users, Briefcase, Target, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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
    const skillIds = persona.skillIds.join(',')
    const goal = `Act as a ${persona.name} for ${persona.targetAudience}`
    router.push(`/builder?personaId=${persona.id}&skillIds=${skillIds}&goal=${encodeURIComponent(goal)}`)
  }

  const getDomainColor = (domain) => {
    const colors = {
      'commerce': 'bg-green-500/10 text-green-500 border-green-500/20',
      'marketing': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      'founder_ops': 'bg-purple-500/10 text-purple-500 border-purple-500/20'
    }
    return colors[domain] || 'bg-gray-500/10 text-gray-500 border-gray-500/20'
  }

  return (
    <div className=\"min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900\">
      <header className=\"border-b border-white/10 bg-black/20 backdrop-blur-xl\">
        <div className=\"container mx-auto px-4 py-4\">
          <Link href=\"/\">
            <Button variant=\"ghost\" className=\"text-white hover:bg-white/10\">
              <ArrowLeft className=\"w-4 h-4 mr-2\" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <div className=\"container mx-auto px-4 py-12 max-w-6xl\">
        <div className=\"text-center mb-12\">
          <div className=\"inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl mb-4\">
            <Users className=\"w-8 h-8 text-white\" />
          </div>
          <h1 className=\"text-4xl md:text-5xl font-bold text-white mb-2\">AI Agent Personas</h1>
          <p className=\"text-xl text-gray-300 max-w-2xl mx-auto\">
            Pre-configured AI agents for specific roles - start with proven skill combinations
          </p>
        </div>

        {loading ? (
          <div className=\"text-center py-20\">
            <div className=\"inline-block w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin\"></div>
          </div>
        ) : (
          <div className=\"grid grid-cols-1 md:grid-cols-2 gap-6\">
            {personas.map((persona) => (
              <Card key={persona.id} className=\"bg-black/40 border-white/10 backdrop-blur-xl hover:border-cyan-500/50 transition-all\">
                <CardHeader>
                  <div className=\"flex items-start justify-between mb-3\">
                    <Badge className={`${getDomainColor(persona.primaryDomain)} border`}>
                      <Briefcase className=\"w-3 h-3 mr-1\" />
                      {persona.primaryDomain}
                    </Badge>
                    <Badge variant=\"outline\" className=\"border-white/20 text-gray-300\">
                      {persona.skillIds?.length || 0} skills
                    </Badge>
                  </div>
                  <CardTitle className=\"text-white text-2xl\">{persona.name}</CardTitle>
                  <CardDescription className=\"text-gray-400 text-base\">
                    {persona.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className=\"space-y-4\">
                  <div className=\"flex items-center gap-2 text-sm text-gray-400\">
                    <Target className=\"w-4 h-4\" />
                    <span>For: {persona.targetAudience}</span>
                  </div>
                  
                  <Button 
                    onClick={() => handleUsePersona(persona)}
                    className=\"w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600\"
                    size=\"lg\"
                  >
                    <Zap className=\"w-4 h-4 mr-2\" />
                    Use This Persona in Builder
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
