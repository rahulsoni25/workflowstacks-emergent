import Link from 'next/link'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export const metadata = {
  title: 'About ShowClawMart | AI Skills Marketplace',
  description: 'ShowClawMart is the leading marketplace for AI skills, agent personas, and automation playbooks. Our mission is to make AI accessible to everyone.',
  alternates: { canonical: '/about' },
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/"><Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5"><ArrowLeft className="w-4 h-4 mr-2" />Home</Button></Link>
        </div>
      </header>
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">About ShowClawMart</h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">Making AI accessible to every team, regardless of technical skill.</p>
        </div>

        <div className="space-y-8">
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardContent className="py-6">
              <h2 className="text-2xl font-bold text-white mb-3">Our Mission</h2>
              <p className="text-slate-300 leading-relaxed">We believe every founder, marketer, and business operator should be able to harness the power of AI without writing a single line of code. ShowClawMart bridges the gap between powerful AI tools and the people who need them most.</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardContent className="py-6">
              <h2 className="text-2xl font-bold text-white mb-3">What We Do</h2>
              <p className="text-slate-300 leading-relaxed mb-4">ShowClawMart is an AI skills marketplace that automatically discovers the best AI tools from GitHub, enriches them with benefit-driven descriptions, and packages them into ready-to-use agent blueprints.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { n: '500+', label: 'AI skills indexed' },
                  { n: '2,000+', label: 'Active users' },
                  { n: '10,000+', label: 'Agents built' },
                ].map((stat, i) => (
                  <div key={i} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 text-center">
                    <div className="text-2xl font-bold text-teal-400">{stat.n}</div>
                    <div className="text-slate-400 text-sm">{stat.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardContent className="py-6">
              <h2 className="text-2xl font-bold text-white mb-3">Our Values</h2>
              <ul className="space-y-3">
                {[
                  'Accessibility — AI should be usable by everyone, not just developers',
                  'Quality — Every skill is verified for quality and usefulness',
                  'Transparency — Open-source skills, clear pricing, no hidden fees',
                  'Community — Built by creators, for creators',
                ].map((v, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-300">
                    <span className="text-teal-400">\u2022</span>{v}
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
