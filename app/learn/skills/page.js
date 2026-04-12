import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export const metadata = {
  title: 'What Are AI Skills? | ShowClawMart Learn',
  description: 'AI skills are pre-built capabilities that you can add to AI agents. Learn about Claude Skills, Gemini Extensions, MCP Servers, and AI Prompts on ShowClawMart.',
  alternates: { canonical: '/learn/skills' },
}

export default function LearnSkillsPage() {
  const skillTypes = [
    { name: 'Claude Skills', desc: 'Custom capabilities built for Anthropic\'s Claude AI. These skills extend what Claude can do — from code review to data analysis.', color: 'violet', emoji: '✨' },
    { name: 'Gemini Extensions', desc: 'Plugins and extensions for Google\'s Gemini AI. These connect Gemini to external services and give it new abilities.', color: 'blue', emoji: '💎' },
    { name: 'MCP Servers', desc: 'Model Context Protocol servers that let any AI access external tools, databases, and APIs securely. The universal standard for AI tool integration.', color: 'emerald', emoji: '🔧' },
    { name: 'AI Prompts', desc: 'Carefully engineered prompt templates that give AI models specific behaviors, expertise, and output formats. Copy-paste ready.', color: 'amber', emoji: '📝' },
    { name: 'AI Agents', desc: 'Complete autonomous agent configurations that combine multiple skills to accomplish complex goals like lead generation or market research.', color: 'cyan', emoji: '🤖' },
  ]

  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/"><Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5"><ArrowLeft className="w-4 h-4 mr-2" />Home</Button></Link>
        </div>
      </header>
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 text-center">What Are AI Skills?</h1>
        <p className="text-xl text-slate-300 text-center mb-16 max-w-2xl mx-auto">AI skills are pre-built capabilities that give AI models new powers. Think of them as apps for your AI.</p>
        <div className="space-y-6">
          {skillTypes.map((s, i) => (
            <Card key={i} className="bg-slate-900/60 border-slate-700/50 backdrop-blur-xl">
              <CardContent className="flex items-start gap-5 py-6">
                <div className="text-4xl">{s.emoji}</div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">{s.name}</h2>
                  <p className="text-slate-300 leading-relaxed">{s.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center mt-16">
          <Link href="/"><Button size="lg" className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-8">Browse All Skills</Button></Link>
        </div>
      </div>
    </div>
  )
}
