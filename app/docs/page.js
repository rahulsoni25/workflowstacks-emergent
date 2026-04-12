import Link from 'next/link'
import { ArrowLeft, Code2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export const metadata = {
  title: 'API Documentation | WorkflowStacks',
  description: 'WorkflowStacks API documentation. Access skills, agents, packs, playbooks, and personas programmatically.',
  alternates: { canonical: '/docs' },
}

export default function DocsPage() {
  const endpoints = [
    { method: 'GET', path: '/api/skills', desc: 'List all skills. Supports ?category= and ?search= query params.' },
    { method: 'GET', path: '/api/skills/:id', desc: 'Get a single skill by ID with full details.' },
    { method: 'GET', path: '/api/stats', desc: 'Get marketplace statistics (total skills, category counts).' },
    { method: 'GET', path: '/api/personas', desc: 'List all AI agent personas.' },
    { method: 'GET', path: '/api/packs', desc: 'List all starter packs.' },
    { method: 'GET', path: '/api/playbooks', desc: 'List all playbooks.' },
    { method: 'GET', path: '/api/agents', desc: 'List public agent templates.' },
    { method: 'POST', path: '/api/agent-templates', desc: 'Create a new agent blueprint. Body: { goal, selectedSkillIds, isPublic }' },
    { method: 'GET', path: '/api/ingest', desc: 'Trigger GitHub skill ingestion (scrapes latest AI repos).' },
    { method: 'GET', path: '/api/trending', desc: 'Get trending skills by popularity score.' },
  ]

  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/"><Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5"><ArrowLeft className="w-4 h-4 mr-2" />Home</Button></Link>
        </div>
      </header>
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-16">
          <Code2 className="w-16 h-16 text-teal-400 mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">API Documentation</h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">Access WorkflowStacks's marketplace data programmatically.</p>
        </div>

        <Card className="bg-teal-500/10 border-teal-500/30 mb-8">
          <CardContent className="py-4">
            <p className="text-teal-300 font-medium">Base URL: <code className="bg-slate-800/50 px-2 py-1 rounded text-white font-mono">{process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks.com'}/api</code></p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {endpoints.map((ep, i) => (
            <Card key={i} className="bg-slate-900/60 border-slate-700/50">
              <CardContent className="flex items-start gap-4 py-4">
                <span className={`text-xs font-bold px-2 py-1 rounded ${ep.method === 'GET' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-cyan-400'}`}>{ep.method}</span>
                <div>
                  <code className="text-white font-mono text-sm">{ep.path}</code>
                  <p className="text-slate-400 text-sm mt-1">{ep.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
