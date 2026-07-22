import Link from 'next/link'
import { ArrowLeft, Download, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TEMPLATES } from '@/lib/templates'

export const metadata = {
  title: 'Free Working AI Agent Templates — Import & Run | WorkflowStacks',
  description:
    'Download working n8n automations — not prompts. Product descriptions, review replies, meeting summaries. Import, connect your accounts, running in ~5 minutes.',
  alternates: { canonical: '/templates' },
}

const PERSONA_LABEL = { ecommerce: '🛍️ Ecommerce', agency: '📈 Agency', founder: '🚀 Founder' }

export default function TemplatesIndexPage() {
  const templates = Object.values(TEMPLATES)

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

      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <p className="text-xs tracking-widest uppercase text-[#C6F24E] text-center mb-4 font-semibold">Working templates</p>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 text-center leading-tight">
          Download an agent that actually runs
        </h1>
        <p className="text-lg text-slate-300 text-center mb-12 max-w-xl mx-auto">
          Not prompts — real, importable automations. Each one is hand-built, tested, and carries its own setup instructions. Free.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {templates.map((t) => (
            <Card key={t.slug} className="bg-slate-900/60 border-slate-700/50 hover:border-[#C6F24E]/40 transition-all duration-300 h-full">
              <CardContent className="py-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-slate-400">{PERSONA_LABEL[t.persona] || t.persona}</span>
                  <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />~{t.setup_minutes} min setup</span>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">{t.title}</h2>
                <p className="text-slate-400 text-sm leading-relaxed mb-5 flex-1">{t.outcome}</p>
                <div className="flex items-center gap-3">
                  <Link href={`/templates/${t.slug}`} className="flex-1">
                    <Button className="w-full bg-[#C6F24E] hover:bg-[#A6D62E] text-[#0A0C0D] font-semibold text-sm">
                      <Download className="w-4 h-4 mr-2" />Get this template
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-gradient-to-br from-[#C6F24E]/10 to-transparent border-[#C6F24E]/25 mt-10">
          <CardContent className="py-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs tracking-widest uppercase text-[#C6F24E] font-semibold mb-1">Premium · one-time</p>
              <h2 className="text-white font-bold text-lg">Ecommerce Pro Pack — $29</h2>
              <p className="text-slate-400 text-sm mt-1 max-w-md">A full review-management system: routes negative reviews to a priority alert, tags sentiment, logs everything. The PRO upgrade to the free drafter.</p>
            </div>
            <Link href="/bundles/ecommerce-pro-pack">
              <Button className="bg-[#C6F24E] hover:bg-[#A6D62E] text-[#0A0C0D] font-semibold">See what's inside</Button>
            </Link>
          </CardContent>
        </Card>

        <p className="text-sm text-slate-400 text-center mt-10">
          Using Claude Desktop?{' '}
          <Link href="/mcp" className="text-[#C6F24E] hover:text-[#A6D62E] underline underline-offset-2">
            Add tools to Claude with copy-paste MCP configs →
          </Link>
        </p>

        <p className="text-sm text-slate-500 text-center mt-4">
          Need something these don't cover?{' '}
          <Link href="/build-for-me" className="text-[#C6F24E] hover:text-[#A6D62E] underline underline-offset-2">
            We'll build your agent for you — from $500.
          </Link>
        </p>
      </div>
    </div>
  )
}
