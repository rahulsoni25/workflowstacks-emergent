import Link from 'next/link'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SITE_URL as BASE } from '@/lib/site-url'
import { AUDIENCE, DESCRIPTION, SITE_NAME, TAGLINE } from '@/lib/positioning'

export const metadata = {
  title: 'About WorkflowStacks | Open-Source AI Skills, Agents & MCP Servers',
  description: DESCRIPTION,
  alternates: { canonical: '/about' },
}

// 6 hours: the only numbers on this page come from /api/stats, and they move
// when the daily jobs run. See docs/COSTS.md before lowering.
export const revalidate = 21600

async function getStats() {
  try {
    const res = await fetch(`${BASE}/api/stats`, { next: { revalidate: 21600 }, signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// Same convention as the homepage headline (HomeClient.countLabel): floor to
// the nearest 10 so "N+" is always true, and show nothing rather than a guess
// when the count is missing or too small to floor.
function plusLabel(n) {
  const v = Number(n) || 0
  return v >= 10 ? `${(Math.floor(v / 10) * 10).toLocaleString('en-US')}+` : null
}

export default async function AboutPage() {
  // Both figures are countDocuments() results from /api/stats — the same
  // source the homepage uses. Nothing on this page is a hardcoded number.
  const stats = await getStats()
  const liveStats = [
    { n: plusLabel(stats?.publishedSkills || stats?.totalSkills), label: 'Open-source AI skills indexed' },
    { n: plusLabel(stats?.agentsBuilt), label: 'Agents built with the builder' },
  ].filter((s) => s.n)

  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/"><Button variant="ghost" className="text-text-secondary hover:text-white hover:bg-white/5"><ArrowLeft className="w-4 h-4 mr-2" />Home</Button></Link>
        </div>
      </header>
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">About {SITE_NAME}</h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">{TAGLINE}.</p>
        </div>

        <div className="space-y-8">
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardContent className="py-6">
              <h2 className="text-2xl font-bold text-white mb-3">Our Mission</h2>
              <p className="text-text-secondary leading-relaxed">We built {SITE_NAME} for {AUDIENCE}. The tools already exist on GitHub; our job is to find them, quality-gate them, and make them installable in one click.</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardContent className="py-6">
              <h2 className="text-2xl font-bold text-white mb-3">What We Do</h2>
              <p className="text-text-secondary leading-relaxed mb-4">{DESCRIPTION} Listings are discovered from public GitHub repositories, scored for quality and relevance, and rewritten in plain language so you can tell what each one does before you install it.</p>
              {liveStats.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {liveStats.map((stat) => (
                    <div key={stat.label} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 text-center">
                      <div className="text-2xl font-bold text-teal-400">{stat.n}</div>
                      <div className="text-text-muted text-sm">{stat.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardContent className="py-6">
              <h2 className="text-2xl font-bold text-white mb-3">Our Values</h2>
              <ul className="space-y-3">
                {[
                  'Accessibility — AI should be usable by everyone, not just developers',
                  'Quality — Every listing passes a quality gate before it is published',
                  'Transparency — Open-source skills, clear pricing, no hidden fees',
                  'Community — Built by creators, for creators',
                ].map((v, i) => (
                  <li key={i} className="flex items-start gap-2 text-text-secondary">
                    <span className="text-teal-400">•</span>{v}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
