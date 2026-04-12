import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export const metadata = {
  title: 'What Is MCP (Model Context Protocol)? | ShowClawMart Learn',
  description: 'MCP (Model Context Protocol) is the universal standard for connecting AI models to external tools and data. Learn how MCP servers work and why they matter.',
  alternates: { canonical: '/learn/mcp' },
}

export default function LearnMCPPage() {
  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/"><Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5"><ArrowLeft className="w-4 h-4 mr-2" />Home</Button></Link>
        </div>
      </header>
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 text-center">What Is MCP?</h1>
        <p className="text-xl text-slate-300 text-center mb-16 max-w-2xl mx-auto">Model Context Protocol (MCP) is the universal standard for connecting AI models to external tools, databases, and APIs.</p>
        
        <div className="space-y-8">
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardContent className="py-6">
              <h2 className="text-2xl font-bold text-white mb-3">Why MCP Matters</h2>
              <p className="text-slate-300 leading-relaxed mb-4">Before MCP, every AI tool had its own proprietary way to connect to external services. MCP standardizes this into one protocol that works across Claude, ChatGPT, Gemini, and any LLM.</p>
              <p className="text-slate-300 leading-relaxed">Think of it like USB for AI — one standard connector that works with everything.</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardContent className="py-6">
              <h2 className="text-2xl font-bold text-white mb-3">How MCP Servers Work</h2>
              <div className="space-y-4">
                {[
                  { title: 'Server exposes tools', desc: 'An MCP server defines what tools and data it can provide (e.g., "search database", "send email", "read spreadsheet").' },
                  { title: 'AI connects via protocol', desc: 'The AI model connects to the MCP server using a standardized JSON-RPC protocol.' },
                  { title: 'AI uses tools naturally', desc: 'The AI can now use these tools as part of its responses, calling them when needed to complete tasks.' },
                ].map((item, i) => (
                  <div key={i} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <h3 className="text-white font-semibold mb-1">{i + 1}. {item.title}</h3>
                    <p className="text-slate-300 text-sm">{item.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardContent className="py-6">
              <h2 className="text-2xl font-bold text-white mb-3">Popular MCP Use Cases</h2>
              <ul className="space-y-2">
                {[
                  'Connect AI to your Shopify store for inventory management',
                  'Let AI read and write to Google Sheets',
                  'Give AI access to your CRM for lead management',
                  'Connect AI to Slack for team notifications',
                  'Enable AI to search your internal documentation',
                ].map((uc, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-300">
                    <span className="text-emerald-400">\u2713</span>{uc}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-16">
          <Link href="/?category=mcp-server"><Button size="lg" className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8">Browse MCP Servers</Button></Link>
        </div>
      </div>
    </div>
  )
}
