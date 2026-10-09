import Link from 'next/link'
import { ArrowLeft, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { jsonLdScript, learnPageSchema, breadcrumbSchema } from '@/lib/schema'

export const metadata = {
  title: 'What Are AI Agents? | WorkflowStacks Learn',
  description: 'AI agents are custom-configured AI assistants that combine multiple skills to accomplish complex goals. Learn how to build and deploy your own agents.',
  alternates: { canonical: '/learn/agents' },
}

export default function LearnAgentsPage() {
  return (
    <div className="min-h-screen bg-neptune">
      <script {...jsonLdScript(learnPageSchema({ name: 'What Are AI Agents?', description: 'AI agents are AI assistants configured with a goal and a set of skills so they can complete multi-step work.', url: '/learn/agents', term: 'AI agent', termDescription: 'An AI assistant configured with a goal, instructions and a set of skills or tools so it can carry out multi-step tasks.' }))} />
      <script {...jsonLdScript(breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Learn', path: '/learn' }, { name: 'What Are AI Agents?', path: '/learn/agents' }]))} />
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/"><Button variant="ghost" className="text-text-secondary hover:text-white hover:bg-white/5"><ArrowLeft className="w-4 h-4 mr-2" />Home</Button></Link>
        </div>
      </header>
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 text-center">What Are AI Agents?</h1>
        <p className="text-xl text-text-secondary text-center mb-6 max-w-2xl mx-auto">AI agents are custom-configured AI assistants that combine multiple skills to accomplish complex goals autonomously.</p>
        <p data-answer="true" className="text-text-secondary leading-relaxed max-w-2xl mx-auto mb-12 text-center">An AI agent is an AI assistant given a goal, instructions and a set of skills or tools so it can finish multi-step work instead of answering one question. On WorkflowStacks, an agent is a blueprint: an open-source repository compiled into one instruction set you paste into Claude, ChatGPT or Gemini.</p>
        
        <div className="space-y-8">
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardContent className="py-6">
              <h2 className="text-2xl font-bold text-white mb-3">How Agents Work on WorkflowStacks</h2>
              <p className="text-text-secondary leading-relaxed mb-4">An AI agent on WorkflowStacks is a prompt blueprint that combines multiple skills into a coherent instruction set. When you paste this blueprint into ChatGPT, Claude, or Gemini, the AI becomes your specialized assistant.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['Pick Skills \u2192 Choose the capabilities your agent needs', 'Set a Goal \u2192 Describe what you want in plain English', 'Deploy \u2192 Copy the blueprint and paste into any AI tool'].map((s, i) => (
                  <div key={i} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <p className="text-text-secondary text-sm">{s}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardContent className="py-6">
              <h2 className="text-2xl font-bold text-white mb-3">Agent Examples</h2>
              <ul className="space-y-3">
                {[
                  'SEO Content Agent — Writes, optimizes, and publishes blog posts for AI Overview rankings',
                  'Founder Launch Agent — Validates ideas, creates landing pages, writes launch emails',
                  'Ecommerce Ops Agent — Responds to reviews, syncs inventory, generates product descriptions',
                  'Lead Gen Agent — Qualifies leads, personalizes outreach, tracks follow-ups',
                ].map((ex, i) => (
                  <li key={i} className="flex items-start gap-3 text-text-secondary">
                    <span className="text-teal-400">•</span>{ex}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-16">
          <Link href="/builder"><Button size="lg" className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-8"><Zap className="w-5 h-5 mr-2" />Build Your Agent</Button></Link>
        </div>
      </div>
    </div>
  )
}
