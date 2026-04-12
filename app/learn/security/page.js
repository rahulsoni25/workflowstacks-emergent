import Link from 'next/link'
import { ArrowLeft, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export const metadata = {
  title: 'Security & Trust | ShowClawMart',
  description: 'Learn about ShowClawMart\'s security practices, data handling, and trust measures. We verify all skills and protect your data.',
  alternates: { canonical: '/learn/security' },
}

export default function LearnSecurityPage() {
  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/"><Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5"><ArrowLeft className="w-4 h-4 mr-2" />Home</Button></Link>
        </div>
      </header>
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-16">
          <Shield className="w-16 h-16 text-teal-400 mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Security & Trust</h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">Your safety is our priority. Here's how we protect you and verify skills.</p>
        </div>
        
        <div className="space-y-6">
          {[
            { title: 'Skill Verification', desc: 'Every skill is sourced from public GitHub repositories. We check star counts, update frequency, and community activity as quality signals. Premium skills undergo additional manual review.', icon: '✅' },
            { title: 'No Code Execution', desc: 'ShowClawMart generates text-based agent blueprints. We never execute code on your behalf or access your accounts. The blueprints are plain-text instructions that you paste into your own AI tools.', icon: '🔒' },
            { title: 'Data Privacy', desc: 'We don\'t store your conversations, agent outputs, or personal data beyond what\'s needed for your account. Your agent blueprints are generated on-demand and not stored unless you choose to save them.', icon: '🛡️' },
            { title: 'Open Source Skills', desc: 'The majority of skills on ShowClawMart come from open-source repositories. You can inspect the source code before using any skill.', icon: '🔍' },
            { title: 'Secure Infrastructure', desc: 'Our platform runs on enterprise-grade infrastructure with encryption in transit and at rest. We follow industry best practices for web application security.', icon: '🏢' },
          ].map((item, i) => (
            <Card key={i} className="bg-slate-900/60 border-slate-700/50">
              <CardContent className="flex items-start gap-5 py-6">
                <div className="text-3xl">{item.icon}</div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">{item.title}</h2>
                  <p className="text-slate-300 leading-relaxed">{item.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
