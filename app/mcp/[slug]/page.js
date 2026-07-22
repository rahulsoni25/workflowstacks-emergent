import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ExternalLink, KeyRound, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getMcpServer, claudeConfigBlock, MCP_SERVERS } from '@/lib/mcp-servers'
import CopyConfig from './CopyConfig'

export function generateStaticParams() {
  return Object.keys(MCP_SERVERS).map((slug) => ({ slug }))
}

export function generateMetadata({ params }) {
  const s = getMcpServer(params.slug)
  if (!s) return {}
  return {
    title: `Add ${s.name} to Claude Desktop — MCP Config | WorkflowStacks`,
    description: `${s.blurb} Copy-paste the config into Claude Desktop and connect ${s.name} in under a minute.`,
    alternates: { canonical: `/mcp/${s.slug}` },
  }
}

const STEPS = [
  'Open Claude Desktop → Settings → Developer → Edit Config.',
  'Paste the block below into claude_desktop_config.json (merge it into "mcpServers" if you already have some).',
  'Fill in any placeholder values (paths, API keys).',
  'Fully quit and reopen Claude Desktop. The server’s tools appear in the 🔌 menu.',
]

export default function McpServerPage({ params }) {
  const server = getMcpServer(params.slug)
  if (!server) notFound()
  const block = claudeConfigBlock(server)

  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/mcp">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">
              <ArrowLeft className="w-4 h-4 mr-2" />All MCP servers
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <p className="text-xs tracking-widest uppercase text-[#C6F24E] font-semibold mb-3">Claude Desktop · MCP</p>
        <h1 className="text-4xl font-bold text-white mb-3 leading-tight">Add {server.name} to Claude Desktop</h1>
        <p className="text-lg text-slate-300 mb-6">{server.blurb}</p>

        <div className="flex flex-wrap items-center gap-3 mb-8 text-sm">
          <span className="text-slate-400">{server.category}</span>
          {server.needs_key ? (
            <span className="flex items-center gap-1.5 text-amber-300"><KeyRound className="w-4 h-4" />Needs an API key</span>
          ) : (
            <span className="flex items-center gap-1.5 text-[#C6F24E]"><Check className="w-4 h-4" />No key needed</span>
          )}
          <a href={server.repo} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-teal-300 hover:text-teal-200">
            <ExternalLink className="w-4 h-4" />Source repo
          </a>
        </div>

        <h2 className="text-white font-bold text-lg mb-3">Your config</h2>
        <CopyConfig code={block} />
        {server.note && (
          <p className="text-sm text-slate-400 mt-3 flex items-start gap-2">
            <span className="text-[#C6F24E] font-bold">›</span>{server.note}
          </p>
        )}

        <h2 className="text-white font-bold text-lg mt-10 mb-4">How to add it</h2>
        <div className="space-y-3 mb-10">
          {STEPS.map((s, i) => (
            <Card key={i} className="bg-slate-900/60 border-slate-700/50">
              <CardContent className="py-3.5 flex items-start gap-3">
                <span className="text-[#C6F24E] font-bold text-sm leading-none mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                <p className="text-slate-300 text-sm leading-relaxed">{s}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-xs text-slate-500 mb-8">
          The linked repo is the source of truth — if the package name ever changes, it’ll be current there.
        </p>

        <Card className="bg-gradient-to-br from-[#C6F24E]/10 to-transparent border-[#C6F24E]/25">
          <CardContent className="py-5 flex flex-wrap items-center justify-between gap-4">
            <p className="text-slate-300 text-sm">Want a whole automation, not just one tool? <span className="text-white font-semibold">Grab a working workflow template.</span></p>
            <Link href="/templates"><Button className="bg-white/5 hover:bg-white/10 text-white border border-[#323A3C]">Browse templates</Button></Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
