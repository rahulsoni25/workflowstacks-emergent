import Link from 'next/link'
import { ArrowLeft, Bot, Users, Workflow, Shield, Layers, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export const metadata = {
  title: 'Learn | WorkflowStacks',
  description: 'Learn how WorkflowStacks works — AI agents, skills, MCP servers, creators, and security. Guides for founders building with AI.',
  alternates: { canonical: '/learn' },
}

const TOPICS = [
  { href: '/learn/how-it-works', icon: Workflow, title: 'How It Works', desc: 'From browsing skills to deploying an agent blueprint in any AI tool.' },
  { href: '/learn/agents', icon: Bot, title: 'What Are AI Agents?', desc: 'How agents combine multiple skills into one coherent assistant.' },
  { href: '/learn/skills', icon: Layers, title: 'Understanding Skills', desc: 'What a skill is, where they come from, and how to use them.' },
  { href: '/learn/mcp', icon: BookOpen, title: 'MCP Servers', desc: 'Connect AI to real tools and data via the Model Context Protocol.' },
  { href: '/learn/creators', icon: Users, title: 'For Creators', desc: 'Publish your own skills and reach founders building with AI.' },
  { href: '/learn/security', icon: Shield, title: 'Security & Trust', desc: 'How we source skills and keep the marketplace safe.' },
]

export default function LearnHubPage() {
  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">
              <ArrowLeft className="w-4 h-4 mr-2" />Home
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 text-center">Learn WorkflowStacks</h1>
        <p className="text-xl text-slate-300 text-center mb-16 max-w-2xl mx-auto">
          Everything you need to discover, combine, and deploy AI skills as a founder.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TOPICS.map((t) => {
            const Icon = t.icon
            return (
              <Link key={t.href} href={t.href}>
                <Card className="bg-slate-900/60 border-slate-700/50 hover:border-teal-500/40 transition-all duration-300 h-full group cursor-pointer">
                  <CardContent className="py-6">
                    <Icon className="w-8 h-8 text-teal-400 mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2 group-hover:text-teal-300 transition-colors">{t.title}</h2>
                    <p className="text-slate-400 text-sm leading-relaxed">{t.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
