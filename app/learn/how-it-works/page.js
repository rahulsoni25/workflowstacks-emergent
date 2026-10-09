import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Zap, Users, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { jsonLdScript, learnPageSchema, breadcrumbSchema } from '@/lib/schema'

export const metadata = {
  title: 'How WorkflowStacks Works | AI Skills Marketplace Guide',
  description: 'Describe the job, review the matched open-source AI skill or agent, and install it into Claude, ChatGPT or Gemini. How WorkflowStacks works, and how it differs from browsing GitHub.',
  alternates: { canonical: '/learn/how-it-works' },
}

export default function HowItWorksPage() {
  const steps = [
    { step: '01', title: 'Describe the job', desc: 'Say what you want done in plain English, such as "weekly client ad report". WorkflowStacks matches it against open-source AI skills, agents and MCP servers it has already scored, each one a live GitHub repository.', icon: '🔍' },
    { step: '02', title: 'Review the match', desc: 'Each match shows a guide-quality score, live GitHub stars and forks, an example use case and the source repo. Swap to an alternative in one click, or combine several skills in the Agent Builder.', icon: '🛠️' },
    { step: '03', title: 'Install in your AI tool', desc: 'Pick Claude, ChatGPT or Gemini and how you want it delivered: a paste-ready blueprint, or a Claude Skill package. No code. Some tools need their own API key, and each listing says so up front.', icon: '🚀' },
  ]

  const comparison = [
    ['Cost of the repository', 'Free', 'Free. The repositories stay free on GitHub'],
    ['Choosing between options', 'Compare forks and READMEs yourself', 'Each listing is scored, with live stars and forks shown'],
    ['Usage instructions', 'Whatever the README contains', 'A plain-English usage guide written for each listing'],
    ['Getting it into your AI tool', 'Read the docs, then write the prompt or config yourself', 'One paste-ready blueprint, or a Claude Skill package'],
    ['Quality bar', 'None applied across repositories', 'Listings must clear an 8/10 quality gate to be published'],
  ]


  return (
    <div className="min-h-screen bg-neptune">
      <script {...jsonLdScript(learnPageSchema({ name: 'How WorkflowStacks Works', description: 'Describe the job, review the matched open-source AI skill or agent, and install it into Claude, ChatGPT or Gemini.', url: '/learn/how-it-works' }))} />
      <script {...jsonLdScript(breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Learn', path: '/learn' }, { name: 'How it works', path: '/learn/how-it-works' }]))} />
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/"><Button variant="ghost" className="text-text-secondary hover:text-white hover:bg-white/5"><ArrowLeft className="w-4 h-4 mr-2" />Home</Button></Link>
        </div>
      </header>
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 text-center">How WorkflowStacks Works</h1>
        <p className="text-xl text-text-secondary text-center mb-16 max-w-2xl mx-auto">Describe a job, review the match, install it in your AI tool.</p>
        <p data-answer="true" className="text-text-secondary leading-relaxed max-w-2xl mx-auto mb-12 text-center">WorkflowStacks is a catalog of open-source AI skills, agents and MCP servers. You describe a task in plain English, it matches the best-scored repository, and you install it into Claude, ChatGPT or Gemini as a paste-ready blueprint or a Claude Skill package. No code is required.</p>
        <div className="space-y-8">
          {steps.map((s, i) => (
            <Card key={i} className="bg-slate-900/60 border-slate-700/50 backdrop-blur-xl">
              <CardContent className="flex items-start gap-6 py-6">
                <div className="text-4xl">{s.icon}</div>
                <div>
                  <div className="text-teal-400 text-sm font-bold mb-1">STEP {s.step}</div>
                  <h2 className="text-2xl font-bold text-white mb-2">{s.title}</h2>
                  <p className="text-text-secondary leading-relaxed">{s.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-white mb-3">WorkflowStacks vs. browsing GitHub</h2>
          <p className="text-text-secondary leading-relaxed mb-6">The open-source repositories are the same and stay free on GitHub. WorkflowStacks adds scoring, a plain-English guide and a paste-ready install on top of them.</p>
          <div className="overflow-x-auto rounded-xl border border-slate-700/50">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/80 text-white">
                <tr>
                  <th scope="col" className="p-4 font-semibold">Question</th>
                  <th scope="col" className="p-4 font-semibold">GitHub on its own</th>
                  <th scope="col" className="p-4 font-semibold">WorkflowStacks</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                {comparison.map(([q, a, b]) => (
                  <tr key={q} className="border-t border-slate-700/50">
                    <th scope="row" className="p-4 font-medium text-white">{q}</th>
                    <td className="p-4">{a}</td>
                    <td className="p-4">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <div className="text-center mt-16">
          <Link href="/builder"><Button size="lg" className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white px-8 py-6 text-lg shadow-2xl shadow-teal-500/25 rounded-xl"><Zap className="w-5 h-5 mr-2" />Build Your First Agent</Button></Link>
        </div>
      </div>
    </div>
  )
}
