'use client'

import { useState, useEffect } from 'react'
import { Search, Star, Download, Github, Sparkles, Zap, Code2, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'

const HomePage = () => {
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState(null)
  const [ingesting, setIngesting] = useState(false)

  useEffect(() => {
    loadStats()
    loadSkills()
  }, [])

  useEffect(() => {
    loadSkills()
  }, [category, search])

  const loadStats = async () => {
    try {
      const res = await fetch('/api/stats')
      const data = await res.json()
      setStats(data)
    } catch (e) {
      console.error('Error loading stats:', e)
    }
  }

  const loadSkills = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (category !== 'all') params.append('category', category)
      if (search) params.append('search', search)
      
      const res = await fetch(`/api/skills?${params}`)
      const data = await res.json()
      setSkills(data.skills || [])
    } catch (e) {
      console.error('Error loading skills:', e)
      setSkills([])
    }
    setLoading(false)
  }

  const handleIngest = async () => {
    setIngesting(true)
    try {
      const res = await fetch('/api/ingest')
      const data = await res.json()
      alert(`Ingested ${data.count} skills from GitHub!`)
      loadStats()
      loadSkills()
    } catch (e) {
      console.error('Error ingesting:', e)
      alert('Error ingesting skills')
    }
    setIngesting(false)
  }

  const getCategoryColor = (cat) => {
    const colors = {
      'claude-skill': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      'gemini-extension': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      'mcp-server': 'bg-green-500/10 text-green-500 border-green-500/20',
      'prompt': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      'anthropic-claude': 'bg-pink-500/10 text-pink-500 border-pink-500/20',
      'ai-prompt': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      'ai-agent': 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
      'ai-tool': 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
    }
    return colors[cat] || 'bg-gray-500/10 text-gray-500 border-gray-500/20'
  }

  const getCategoryIcon = (cat) => {
    if (cat === 'claude-skill' || cat === 'anthropic-claude') return <Brain className="w-4 h-4" />
    if (cat === 'gemini-extension') return <Sparkles className="w-4 h-4" />
    if (cat === 'mcp-server') return <Code2 className="w-4 h-4" />
    return <Zap className="w-4 h-4" />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">ShowClawMart</h1>
            </Link>
            <nav className="flex items-center gap-4">
              <Link href="/help">
                <Button variant="ghost" className="border-white/20 text-white hover:bg-white/10">
                  📖 How to Use
                </Button>
              </Link>
              <Link href="/personas">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  🎭 Personas
                </Button>
              </Link>
              <Link href="/packs">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  Starter Packs
                </Button>
              </Link>
              <Link href="/playbooks">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  Playbooks
                </Button>
              </Link>
              <Link href="/builder">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  <Zap className="w-4 h-4 mr-2" />
                  Build Agent
                </Button>
              </Link>
              <Button 
                onClick={handleIngest} 
                disabled={ingesting}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                {ingesting ? 'Ingesting...' : '🔄 Sync'}
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Discover AI Skills
            <br />
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              From GitHub
            </span>
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Browse Claude Skills, Gemini Extensions, and MCP Servers automatically sourced from the best GitHub repositories
          </p>
          
          {stats && (
            <div className="flex justify-center gap-8 mb-12">
              <div className="text-center">
                <div className="text-4xl font-bold text-white">{stats.totalSkills}</div>
                <div className="text-gray-400">Total Skills</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-400">{Object.keys(stats.categories).length}</div>
                <div className="text-gray-400">Categories</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Search and Filter */}
      <section className="px-4 pb-8">
        <div className="container mx-auto max-w-6xl">
          <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search skills..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                />
              </div>
            </div>
            
            <Tabs value={category} onValueChange={setCategory} className="w-full">
              <TabsList className="bg-white/5 border border-white/10">
                <TabsTrigger value="all" className="data-[state=active]:bg-purple-500">All</TabsTrigger>
                <TabsTrigger value="ai-agent" className="data-[state=active]:bg-cyan-500">AI Agents</TabsTrigger>
                <TabsTrigger value="mcp-server" className="data-[state=active]:bg-green-500">MCP</TabsTrigger>
                <TabsTrigger value="claude-skill" className="data-[state=active]:bg-purple-500">Claude</TabsTrigger>
                <TabsTrigger value="prompt" className="data-[state=active]:bg-orange-500">Prompts</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </section>

      {/* Skills Grid */}
      <section className="px-4 pb-20">
        <div className="container mx-auto max-w-6xl">
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-400 mt-4">Loading skills...</p>
            </div>
          ) : skills.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 text-xl mb-4">No skills found. Click "Sync GitHub" to ingest skills!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {skills.map((skill) => (
                <Card key={skill.id} className="bg-black/40 border-white/10 backdrop-blur-xl hover:border-purple-500/50 transition-all hover:transform hover:scale-105">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <Badge className={`${getCategoryColor(skill.category)} border`}>
                        <span className="flex items-center gap-1">
                          {getCategoryIcon(skill.category)}
                          {skill.category}
                        </span>
                      </Badge>
                      {skill.is_premium && (
                        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 border-0">
                          ${skill.price}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-white">{skill.title_human || skill.name}</CardTitle>
                    <CardDescription className="text-gray-400">
                      {skill.description_human || skill.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                        {skill.rating?.toFixed(1) || '0.0'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Download className="w-4 h-4" />
                        {skill.installs?.toLocaleString() || '0'}
                      </span>
                      {skill.github_stars > 0 && (
                        <span className="flex items-center gap-1">
                          <Github className="w-4 h-4" />
                          {skill.github_stars}
                        </span>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Link href={`/skills/${skill.id}`} className="w-full">
                      <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                        View Details
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/20 backdrop-blur-xl py-8">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p>ShowClawMart - Discover AI Skills from GitHub</p>
        </div>
      </footer>
    </div>
  )
}

export default HomePage