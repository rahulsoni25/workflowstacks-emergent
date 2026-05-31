'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Star, Github, ArrowLeft, ChevronRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const CATEGORIES = [
  'all', 'ai-agent', 'marketing', 'sales', 'saas-starter', 'automation',
  'devtools', 'mcp-server', 'claude-skill', 'prompt', 'analytics', 'support', 'design'
]

function categoryColor(cat) {
  const map = {
    'ai-agent': 'bg-teal-500/15 text-teal-300 border-teal-500/30',
    marketing: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
    sales: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    'saas-starter': 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    automation: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    devtools: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    'mcp-server': 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    'claude-skill': 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    prompt: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  }
  return map[cat] || 'bg-slate-500/15 text-slate-300 border-slate-500/30'
}

// Receives the full published list (server-rendered) and filters client-side.
export default function SkillsCatalogClient({ skills = [] }) {
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return skills.filter((s) => {
      if (category !== 'all' && s.category !== category) return false
      if (!q) return true
      const hay = `${s.title_human || ''} ${s.name || ''} ${s.description_human || s.description || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [skills, category, search])

  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">
              <ArrowLeft className="w-4 h-4 mr-2" />Home
            </Button>
          </Link>
          <span className="text-slate-400 text-sm">{filtered.length} skills</span>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 text-center">Browse the Skill Catalog</h1>
        <p className="text-lg text-slate-400 text-center mb-10 max-w-2xl mx-auto">
          Free, trending GitHub tools and AI skills for founders across every niche.
        </p>

        <div className="max-w-xl mx-auto mb-8 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search skills..."
            className="pl-10 bg-slate-900/60 border-slate-700 text-white"
          />
        </div>

        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                category === c
                  ? 'bg-teal-500 text-white border-teal-500'
                  : 'bg-slate-900/60 text-slate-300 border-slate-700 hover:border-teal-500/40'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-slate-400 py-20">No skills match your search.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((skill) => (
              <Card key={skill.id} className="bg-slate-900/60 border-slate-700/50 backdrop-blur-xl hover:border-teal-500/40 transition-all duration-300 group h-full flex flex-col">
                <CardHeader className="flex-1">
                  <Badge className={`${categoryColor(skill.category)} border text-xs w-fit mb-2`}>{skill.category}</Badge>
                  <CardTitle className="text-white text-lg group-hover:text-teal-300 transition-colors">
                    {skill.title_human || skill.name}
                  </CardTitle>
                  <CardDescription className="text-slate-400 line-clamp-2">
                    {skill.description_human || skill.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    {skill.github_stars > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {skill.github_stars.toLocaleString()}
                      </span>
                    )}
                    {skill.github_forks > 0 && (
                      <span className="flex items-center gap-1">
                        <Github className="w-3.5 h-3.5" />
                        {skill.github_forks.toLocaleString()} forks
                      </span>
                    )}
                    {skill.language && <span className="text-slate-500">{skill.language}</span>}
                    {typeof skill.rewrite_score === 'number' && (
                      <span className="ml-auto flex items-center gap-1 text-teal-300">
                        <Check className="w-3.5 h-3.5" />{skill.rewrite_score}/10
                      </span>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Link href={`/skills/${skill.id}`} className="w-full">
                    <Button className="w-full bg-slate-800 hover:bg-teal-500/20 text-slate-200 hover:text-teal-300 border border-slate-700 hover:border-teal-500/40 transition-all" variant="outline">
                      View Details
                      <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
