import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export const metadata = {
  title: 'For Creators — Share Your AI Skills | ShowClawMart',
  description: 'Submit your AI skills, agents, and MCP servers to ShowClawMart. Reach thousands of founders, agencies, and ecommerce teams looking for AI automation solutions.',
  alternates: { canonical: '/learn/creators' },
}

export default function LearnCreatorsPage() {
  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/"><Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5"><ArrowLeft className="w-4 h-4 mr-2" />Home</Button></Link>
        </div>
      </header>
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 text-center">For Creators</h1>
        <p className="text-xl text-slate-300 text-center mb-16 max-w-2xl mx-auto">Share your AI skills with thousands of teams. Get discovered, build reputation, and earn.</p>
        
        <div className="space-y-8">
          <Card className="bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border-teal-500/30">
            <CardContent className="py-6">
              <h2 className="text-2xl font-bold text-white mb-3">Why List on ShowClawMart?</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: 'Reach', desc: '2,000+ active users looking for AI tools' },
                  { title: 'Revenue', desc: 'Set your own price for premium skills' },
                  { title: 'Discovery', desc: 'Auto-indexed from GitHub with enhanced descriptions' },
                  { title: 'Community', desc: 'Get feedback, ratings, and feature requests' },
                ].map((b, i) => (
                  <div key={i} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <h3 className="text-teal-300 font-semibold mb-1">{b.title}</h3>
                    <p className="text-slate-300 text-sm">{b.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardContent className="py-6">
              <h2 className="text-2xl font-bold text-white mb-3">How to Submit</h2>
              <ol className="space-y-3 text-slate-300">
                <li className="flex gap-3"><span className="text-teal-400 font-bold">1.</span> Push your skill to a public GitHub repository</li>
                <li className="flex gap-3"><span className="text-teal-400 font-bold">2.</span> Add relevant topics like "claude-skill", "mcp-server", or "ai-agent"</li>
                <li className="flex gap-3"><span className="text-teal-400 font-bold">3.</span> Write a clear README with description and usage instructions</li>
                <li className="flex gap-3"><span className="text-teal-400 font-bold">4.</span> Our GitHub syncer will auto-discover and index your skill</li>
                <li className="flex gap-3"><span className="text-teal-400 font-bold">5.</span> Or manually upload via our Upload page</li>
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-16">
          <Link href="/upload"><Button size="lg" className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-8">Upload Your Skill</Button></Link>
        </div>
      </div>
    </div>
  )
}
