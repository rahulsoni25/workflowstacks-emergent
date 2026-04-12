import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Zap, Users, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = {
  title: 'How WorkflowStacks Works | AI Skills Marketplace Guide',
  description: 'Learn how WorkflowStacks helps you discover AI skills, build custom agents, and deploy them to ChatGPT, Claude, and Gemini in under 2 minutes. No coding required.',
  alternates: { canonical: '/learn/how-it-works' },
}

export default function HowItWorksPage() {
  const steps = [
    { step: '01', title: 'Browse or Search', desc: 'Explore our library of 500+ AI skills sourced from GitHub. Filter by category (Claude, Gemini, MCP, Prompts) or search by outcome like "automate reviews" or "rank in AI search".', icon: '🔍' },
    { step: '02', title: 'Pick a Playbook or Build Custom', desc: 'Choose a pre-made Playbook for your use case, or use the Agent Builder to select individual skills and combine them into a custom AI agent.', icon: '🛠️' },
    { step: '03', title: 'Generate Your Agent Blueprint', desc: 'Our engine creates a ready-to-paste prompt that combines all your selected skills into one powerful, coherent agent blueprint.', icon: '✨' },
    { step: '04', title: 'Deploy Anywhere', desc: 'Copy the blueprint and paste it into ChatGPT, Claude, Gemini, or any AI chat tool. Your custom agent is live instantly — no API keys, no setup.', icon: '🚀' },
  ]

  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/"><Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5"><ArrowLeft className="w-4 h-4 mr-2" />Home</Button></Link>
        </div>
      </header>
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 text-center">How WorkflowStacks Works</h1>
        <p className="text-xl text-slate-300 text-center mb-16 max-w-2xl mx-auto">From discovery to deployment in under 2 minutes. Here's exactly how it works.</p>
        <div className="space-y-8">
          {steps.map((s, i) => (
            <Card key={i} className="bg-slate-900/60 border-slate-700/50 backdrop-blur-xl">
              <CardContent className="flex items-start gap-6 py-6">
                <div className="text-4xl">{s.icon}</div>
                <div>
                  <div className="text-teal-400 text-sm font-bold mb-1">STEP {s.step}</div>
                  <h2 className="text-2xl font-bold text-white mb-2">{s.title}</h2>
                  <p className="text-slate-300 leading-relaxed">{s.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center mt-16">
          <Link href="/builder"><Button size="lg" className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white px-8 py-6 text-lg shadow-2xl shadow-teal-500/25 rounded-xl"><Zap className="w-5 h-5 mr-2" />Build Your First Agent</Button></Link>
        </div>
      </div>
    </div>
  )
}
