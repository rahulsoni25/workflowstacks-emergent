import Link from 'next/link'
import { ArrowLeft, Terminal, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SLASH_COMMANDS } from '@/lib/commands'

function starsOf(s) {
  const m = /^([\d,]+)★/.exec(s || '')
  return m ? Number(m[1].replace(/,/g, '')) : 0
}

export const metadata = {
  title: 'Claude Code Slash Commands — Verified, Copy-Paste | WorkflowStacks',
  description: 'Real, working Claude Code slash commands — the actual command file, not a description of one. Copy-paste into .claude/commands/. Free.',
  alternates: { canonical: '/commands' },
}

export default function CommandsIndexPage() {
  const commands = Object.values(SLASH_COMMANDS)
  const categories = [...new Set(commands.map((c) => c.category))]
  const totalStars = commands.reduce((n, c) => n + starsOf(c.stat), 0)

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
        <div className="flex items-center justify-center gap-3 mb-4">
          <Terminal className="w-8 h-8 text-[#C6F24E]" />
          <h1 className="text-4xl md:text-5xl font-bold text-white text-center">Claude Code slash commands</h1>
        </div>
        <p className="text-lg text-slate-300 text-center mb-6 max-w-2xl mx-auto">
          The actual command file, not a description of one — hand-verified, copy-paste into <code className="text-[#C6F24E]">.claude/commands/</code>.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-12 text-sm text-slate-500">
          <span>{commands.length} commands</span>
          <span>·</span>
          <span>{categories.length} categories</span>
          <span>·</span>
          <span>{totalStars.toLocaleString()}★ combined, across the real projects they come from</span>
        </div>

        {categories.map((cat) => (
          <div key={cat} className="mb-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">{cat}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {commands.filter((c) => c.category === cat).map((c) => (
                <Link key={c.slug} href={`/commands/${c.slug}`}>
                  <Card className="bg-slate-900/60 border-slate-700/50 hover:border-[#C6F24E]/40 transition-all h-full">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="text-white font-semibold font-mono">{c.name}</h3>
                        <span className="text-[10px] font-mono text-slate-600 bg-slate-950/60 border border-slate-800 rounded px-1.5 py-0.5 shrink-0">{c.license}</span>
                      </div>
                      <p className="text-slate-400 text-sm leading-relaxed mb-2">{c.blurb}</p>
                      {c.idea && (
                        <p className="text-xs text-slate-500 flex items-start gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5 text-[#C6F24E]/70 shrink-0 mt-0.5" />
                          <span><span className="text-slate-400">Try it for:</span> {c.idea}</span>
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}

        <p className="text-sm text-slate-500 text-center mt-6">
          New to Claude Code slash commands? <a href="https://docs.anthropic.com/en/docs/claude-code" target="_blank" rel="noopener noreferrer" className="text-[#C6F24E] hover:text-[#A6D62E] underline underline-offset-2">Read the official docs</a>.
        </p>
      </div>
    </div>
  )
}
