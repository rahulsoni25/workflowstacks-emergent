import Link from 'next/link'
import { ArrowLeft, KeyRound, Check, Plug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MCP_SERVERS } from '@/lib/mcp-servers'

export const metadata = {
  title: 'MCP Servers for Claude Desktop — Copy-Paste Configs | WorkflowStacks',
  description:
    'Add tools to Claude Desktop in under a minute. Verified, copy-paste MCP server configs — filesystem, GitHub, web search, browsers, databases, and more. Free.',
  alternates: { canonical: '/mcp' },
}

export default function McpIndexPage() {
  const servers = Object.values(MCP_SERVERS)
  const categories = [...new Set(servers.map((s) => s.category))]

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
          <Plug className="w-8 h-8 text-[#C6F24E]" />
          <h1 className="text-4xl md:text-5xl font-bold text-white text-center">MCP servers for Claude Desktop</h1>
        </div>
        <p className="text-lg text-slate-300 text-center mb-12 max-w-2xl mx-auto">
          Give Claude real tools — files, web search, GitHub, databases. Each one is a verified, copy-paste config. Connected in under a minute.
        </p>

        {categories.map((cat) => (
          <div key={cat} className="mb-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">{cat}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {servers.filter((s) => s.category === cat).map((s) => (
                <Link key={s.slug} href={`/mcp/${s.slug}`}>
                  <Card className="bg-slate-900/60 border-slate-700/50 hover:border-[#C6F24E]/40 transition-all h-full">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="text-white font-semibold">{s.name}</h3>
                        {s.needs_key
                          ? <span title="Needs an API key"><KeyRound className="w-4 h-4 text-amber-300/70 shrink-0" /></span>
                          : <span title="No key needed"><Check className="w-4 h-4 text-[#C6F24E]/70 shrink-0" /></span>}
                      </div>
                      <p className="text-slate-400 text-sm leading-relaxed">{s.blurb}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}

        <p className="text-sm text-slate-500 text-center mt-6">
          New to MCP? It’s the standard way to connect tools to Claude.{' '}
          <Link href="/learn/mcp" className="text-[#C6F24E] hover:text-[#A6D62E] underline underline-offset-2">Learn how it works</Link>.
        </p>
      </div>
    </div>
  )
}
