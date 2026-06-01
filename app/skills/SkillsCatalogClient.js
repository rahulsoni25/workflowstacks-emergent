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
  'devtools', 'mcp-server', 'claude-skill', 'prompt', 'analytics', 'support', 'design',
  // Emerging 2026/2027
  'computer-use', 'voice-ai', 'agent-memory', 'ai-evals', 'local-ai', 'multi-agent'
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
    'computer-use': 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    'voice-ai': 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
    'agent-memory': 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    'ai-evals': 'bg-lime-500/15 text-lime-300 border-lime-500/30',
    'local-ai': 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    'multi-agent': 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  }
  return map[cat] || 'bg-slate-500/15 text-slate-300 border-slate-500/30'
}

const ts = (v) => (v ? new Date(v).getTime() : 0)
const daysAgo = (v) => (v ? (Date.now() - ts(v)) / 86400000 : 1e9)

// All rankings use REAL, verifiable signals (no fabricated downloads/ratings).
const SORTS = [
  { key: 'trending', label: '🔥 Trending', hint: 'Popular + recently active', cmp: (a, b) => (b.popularity_score || 0) - (a.popularity_score || 0) || (b.github_stars || 0) - (a.github_stars || 0) },
  { key: 'popular', label: '⭐ Most Starred', hint: 'Highest GitHub stars', cmp: (a, b) => (b.github_stars || 0) - (a.github_stars || 0) },
  { key: 'newest', label: '🆕 Newest', hint: 'Recently added here', cmp: (a, b) => ts(b.added_at || b.created_at) - ts(a.added_at || a.created_at) },
  { key: 'updated', label: '♻️ Recently Updated', hint: 'Freshest, actively maintained', cmp: (a, b) => ts(b.last_updated) - ts(a.last_updated) },
  { key: 'quality', label: '✅ Top Quality', hint: 'Our AI quality-gate score', cmp: (a, b) => (b.rewrite_score || 0) - (a.rewrite_score || 0) || (b.github_stars || 0) - (a.github_stars || 0) },
  // Novel: surfaces genuinely useful tools before they go mainstream
  { key: 'gems', label: '💎 Hidden Gems', hint: 'High quality, still under the radar', cmp: (a, b) => gemScore(b) - gemScore(a) },
]

// Gem score rewards quality + freshness, dampened by fame (favors under-the-radar picks)
function gemScore(s) {
  const stars = s.github_stars || 0
  const quality = s.rewrite_score || 7
  const freshness = Math.max(0, 30 - daysAgo(s.last_updated)) / 30 // 0..1, last ~30d
  const fameDamp = stars > 15000 ? 0 : 1 - stars / 15000 // big repos lose gem points
  return quality * 2 + freshness * 5 + fameDamp * 5
}

// Receives the full published list (server-rendered) and filters client-side.
export default function SkillsCatalogClient({ skills = [] }) {
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState(() => {
    if (typeof window === 'undefined') return 'trending'
    const p = new URLSearchParams(window.location.search).get('sort')
    return SORTS.some((s) => s.key === p) ? p : 'trending'
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const cmp = (SORTS.find((s) => s.key === sort) || SORTS[0]).cmp
    return skills
      .filter((s) => {
        if (category !== 'all' && s.category !== category) return false
        if (!q) return true
        const hay = `${s.title_human || ''} ${s.name || ''} ${s.description_human || s.description || ''}`.toLowerCase()
        return hay.includes(q)
      })
      .sort(cmp)
  }, [skills, category, search, sort])

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

        {/* Rank by — all real, verifiable signals */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 justify-center">
            {SORTS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                title={s.hint}
                className={`px-3.5 py-1.5 rounded-lg text-sm border transition-all ${
                  sort === s.key
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-teal-500 shadow-lg shadow-teal-500/20'
                    : 'bg-slate-900/60 text-slate-300 border-slate-700 hover:border-teal-500/40'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-slate-500 mt-2">
            {(SORTS.find((s) => s.key === sort) || SORTS[0]).hint} · ranked by real GitHub + quality data, no fake metrics
          </p>
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
