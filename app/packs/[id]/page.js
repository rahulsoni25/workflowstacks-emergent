import { notFound } from 'next/navigation'
import { ArrowLeft, Users, Target, Zap, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks-emergent.vercel.app'
export const revalidate = 600

function categoryColor(cat) {
  const colors = {
    'claude-skill': 'bg-teal-500/10 text-teal-500',
    'gemini-extension': 'bg-blue-500/10 text-blue-500',
    'mcp-server': 'bg-green-500/10 text-green-500',
    prompt: 'bg-orange-500/10 text-orange-500',
    'ai-agent': 'bg-cyan-500/10 text-cyan-500',
    'ai-tool': 'bg-indigo-500/10 text-indigo-500',
  }
  return colors[cat] || 'bg-gray-500/10 text-slate-500'
}

async function getPack(id) {
  try {
    const res = await fetch(`${BASE}/api/packs/${id}`, { next: { revalidate: 600 } })
    if (!res.ok) return null
    const data = await res.json()
    return data.pack ? { pack: data.pack, skills: data.skills || [] } : null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }) {
  const data = await getPack(params.id)
  if (!data) return { title: 'Pack not found | WorkflowStacks', robots: { index: false, follow: false } }
  const p = data.pack
  const title = `${p.name} — AI Starter Pack | WorkflowStacks`
  const description = (p.description || '').slice(0, 160)
  const url = `/packs/${p.id}`
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, type: 'article', url } }
}

export default async function PackDetailPage({ params }) {
  const data = await getPack(params.id)
  if (!data) notFound()
  const { pack, skills } = data
  const builderHref = `/builder?skillIds=${(pack.skillIds || []).join(',')}&goal=${encodeURIComponent(pack.name)}`

  return (
    <div className="min-h-screen bg-gradient-to-br neptune">
      <header className="border-b border-slate-700/50 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/packs">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">
              <ArrowLeft className="w-4 h-4 mr-2" />Back to Packs
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Badge className="bg-teal-500/10 text-teal-500 border-teal-500/20 border"><Users className="w-3 h-3 mr-1" />{pack.audience}</Badge>
            {pack.useCase && <Badge variant="outline" className="border-white/20 text-slate-300"><Target className="w-3 h-3 mr-1" />{pack.useCase}</Badge>}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">{pack.name}</h1>
          <p className="text-xl text-slate-300 mb-6">{pack.description}</p>
          <Link href={builderHref}>
            <Button className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/20" size="lg">
              <Zap className="w-4 h-4 mr-2" />Build an Agent from this Pack
            </Button>
          </Link>
          <p className="text-sm text-slate-500 mt-2">Loads all {skills.length} skills into the builder and generates a paste-ready blueprint.</p>
        </div>

        {skills.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Included Skills ({skills.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {skills.map((skill) => (
                <Card key={skill.id} className="bg-slate-900/60 border-slate-700/50 backdrop-blur-xl hover:border-teal-500/40 transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <Badge className={`${categoryColor(skill.category)} border border-slate-700/50`}>{skill.category}</Badge>
                    </div>
                    <CardTitle className="text-white">{skill.title_human || skill.name}</CardTitle>
                    <CardDescription className="text-slate-400 line-clamp-2">{skill.description_human || skill.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                      {skill.github_stars > 0 && (
                        <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-amber-400 text-amber-400" />{skill.github_stars.toLocaleString()}</span>
                      )}
                      {skill.language && <span className="text-slate-500">{skill.language}</span>}
                    </div>
                    <Link href={`/skills/${skill.id}`}>
                      <Button variant="outline" className="w-full border-white/20 text-slate-300 hover:text-white hover:bg-white/5">View Details</Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
