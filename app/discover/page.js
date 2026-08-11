import Link from 'next/link'
import { ArrowLeft, ArrowRight, Star, Github } from 'lucide-react'
import { Button } from '@/components/ui/button'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks-emergent.vercel.app'

export const metadata = {
  title: 'Discover AI Skills — Trending, Newest, Top Quality | WorkflowStacks',
  description: 'Discover the best free AI skills for founders — ranked by trending, newest, recently updated, top quality, and hidden gems. Real GitHub data, no fake metrics.',
  alternates: { canonical: '/discover' },
}

// 5 min — short enough that AI rewrite landings show up fast, long enough to
// not hammer the DB on every page view.
export const revalidate = 300

const SECTIONS = [
  { key: 'trending', label: '🔥 Trending', hint: 'Popular and recently active' },
  { key: 'newest', label: '🆕 Newest', hint: 'Just added to the marketplace' },
  { key: 'updated', label: '♻️ Recently Updated', hint: 'Freshest, actively maintained' },
  { key: 'quality', label: '✅ Top Quality', hint: 'Highest AI quality-gate score' },
  { key: 'popular', label: '⭐ Most Starred', hint: 'Most GitHub stars' },
  { key: 'gems', label: '💎 Hidden Gems', hint: 'High quality, still under the radar' },
]

// One small, sorted fetch per section instead of pulling the whole catalog
// (2,000+ skills) and sorting six ways in memory — that used to take 90s+
// and blow past the fetch timeout, silently rendering every section empty.
async function getSection(sortKey) {
  try {
    const res = await fetch(`${BASE}/api/skills?sort=${sortKey}&limit=8`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return []
    const d = await res.json()
    return d.skills || []
  } catch {
    return []
  }
}

function MiniCard({ skill }) {
  return (
    <Link href={`/skills/${skill.slug || skill.id}`} className="block group">
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 h-full hover:border-teal-500/40 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500">{skill.category}</span>
          {typeof skill.rewrite_score === 'number' && (
            <span className="text-xs text-teal-300" title="Health Score">{skill.rewrite_score}/10</span>
          )}
        </div>
        <h3 className="text-white font-semibold leading-snug group-hover:text-teal-300 transition-colors line-clamp-2">
          {skill.title_human || skill.name}
        </h3>
        <p className="text-slate-400 text-sm mt-1 line-clamp-2">{skill.description_human || skill.description}</p>
        <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
          {skill.github_stars > 0 && (
            <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{skill.github_stars.toLocaleString()}</span>
          )}
          {skill.language && <span>{skill.language}</span>}
        </div>
      </div>
    </Link>
  )
}

export default async function DiscoverPage() {
  const sections = await Promise.all(SECTIONS.map((sec) => getSection(sec.key)))

  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">
              <ArrowLeft className="w-4 h-4 mr-2" />Home
            </Button>
          </Link>
          <Link href="/skills">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">Full catalog →</Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 text-center">Discover</h1>
        <p className="text-lg text-slate-400 text-center mb-12 max-w-2xl mx-auto">
          The best free AI skills for founders — sorted six ways by <strong className="text-teal-300">real GitHub + quality data</strong>. No fake downloads or ratings.
        </p>

        <div className="space-y-14">
          {SECTIONS.map((sec, i) => {
            const top = sections[i]
            if (!top || top.length === 0) return null
            return (
              <section key={sec.key}>
                <div className="flex items-end justify-between mb-5">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{sec.label}</h2>
                    <p className="text-slate-400 text-sm">{sec.hint}</p>
                  </div>
                  <Link href={`/skills?sort=${sec.key}`} className="shrink-0">
                    <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:text-teal-300 hover:border-teal-500/40">
                      See all <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {top.map((s) => <MiniCard key={s.id} skill={s} />)}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
