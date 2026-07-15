import Link from 'next/link'
import { ArrowLeft, BookOpen, Star, GitFork } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

// Learning resources shelf — the famous mega-repos (awesome-lists, courses,
// books) that are genuinely useful but aren't AI skills. They used to top the
// skills library by star count and drown the real tools; now they live here.
// Their /skills/[slug] pages stay live, so nothing indexed goes 404.

export const metadata = {
  title: 'Learning Resources for Founders | WorkflowStacks',
  description:
    'The most-starred learning resources on GitHub — curated lists, courses, and books for founders building with AI. Separated from our skills library so tools stay tools.',
  alternates: { canonical: '/learn/resources' },
}

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks-emergent.vercel.app'

async function getResources() {
  try {
    const res = await fetch(`${BASE}/api/skills?type=resource`, { next: { revalidate: 3600 } })
    if (!res.ok) return []
    const data = await res.json()
    return (data.skills || []).sort((a, b) => (b.github_stars || 0) - (a.github_stars || 0))
  } catch {
    return []
  }
}

function fmt(n) {
  if (!n) return '0'
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k`
  return String(n)
}

export default async function LearningResourcesPage() {
  const resources = await getResources()

  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/learn">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">
              <ArrowLeft className="w-4 h-4 mr-2" />Learn
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="flex items-center justify-center gap-3 mb-4">
          <BookOpen className="w-8 h-8 text-teal-400" />
          <h1 className="text-4xl md:text-5xl font-bold text-white text-center">Learning Resources</h1>
        </div>
        <p className="text-xl text-slate-300 text-center mb-4 max-w-2xl mx-auto">
          The most-starred guides, curated lists, and courses on GitHub — for leveling up, not for wiring into an agent.
        </p>
        <p className="text-sm text-slate-500 text-center mb-12 max-w-2xl mx-auto">
          Looking for tools you can actually deploy? Those live in the{' '}
          <Link href="/skills" className="text-teal-400 hover:text-teal-300 underline underline-offset-2">skills library</Link>.
        </p>

        {resources.length === 0 ? (
          <p className="text-slate-400 text-center py-12">
            The shelf is being restocked — check back shortly.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resources.map((r) => (
              <Link key={r.id} href={`/skills/${r.slug || r.id}`}>
                <Card className="bg-slate-900/60 border-slate-700/50 hover:border-teal-500/40 transition-all duration-300 h-full group cursor-pointer">
                  <CardContent className="py-5">
                    <h2 className="text-lg font-bold text-white mb-1 group-hover:text-teal-300 transition-colors">
                      {r.title_human || r.name}
                    </h2>
                    <p className="text-slate-400 text-sm leading-relaxed mb-3 line-clamp-2">
                      {r.description_human || r.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-400/70" />{fmt(r.github_stars)}
                      </span>
                      <span className="flex items-center gap-1">
                        <GitFork className="w-3.5 h-3.5" />{fmt(r.github_forks)}
                      </span>
                      {r.language && <span>{r.language}</span>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
