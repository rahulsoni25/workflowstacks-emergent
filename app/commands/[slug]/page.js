import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ExternalLink, ScrollText, Star, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getSlashCommand, SLASH_COMMANDS } from '@/lib/commands'
import { softwareSourceCodeSchema, breadcrumbSchema } from '@/lib/schema'
import CopyCommand from './CopyCommand'

export function generateStaticParams() {
  return Object.keys(SLASH_COMMANDS).map((slug) => ({ slug }))
}

export function generateMetadata({ params }) {
  const c = getSlashCommand(params.slug)
  if (!c) return {}
  return {
    title: `${c.name} — Claude Code Slash Command | WorkflowStacks`,
    description: `${c.blurb} Real, verified command file — copy it straight into .claude/commands/.`,
    alternates: { canonical: `/commands/${c.slug}` },
  }
}

const STEPS = [
  'Copy the command file below.',
  'Save it as .claude/commands/<name>.md in your project (create the folder if it doesn\'t exist).',
  'Adjust anything project-specific (see the note below, if there is one).',
  `Run the command in Claude Code by typing its name, e.g. it will appear in your / menu.`,
]

export default function SlashCommandPage({ params }) {
  const cmd = getSlashCommand(params.slug)
  if (!cmd) notFound()

  const codeSchema = softwareSourceCodeSchema({
    name: cmd.name,
    description: cmd.blurb,
    url: `/commands/${cmd.slug}`,
    author: cmd.author,
    license: cmd.license,
  })
  const crumbs = breadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Commands', path: '/commands' },
    { name: cmd.name, path: `/commands/${cmd.slug}` },
  ])

  return (
    <div className="min-h-screen bg-neptune">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(codeSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/commands">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">
              <ArrowLeft className="w-4 h-4 mr-2" />All commands
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <p className="text-xs tracking-widest uppercase text-[#C6F24E] font-semibold mb-3">Claude Code · Slash command</p>
        <h1 className="text-4xl font-bold text-white mb-3 leading-tight font-mono">{cmd.name}</h1>
        <p className="text-lg text-slate-300 mb-6">{cmd.blurb}</p>

        <div className="flex flex-wrap items-center gap-3 mb-6 text-sm">
          <span className="text-slate-400">{cmd.category}</span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-400">{cmd.license}</span>
          <a href={cmd.repo} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-teal-300 hover:text-teal-200">
            <ExternalLink className="w-4 h-4" />Source: {cmd.author}
          </a>
        </div>

        {cmd.stat && (
          <p className="flex items-start gap-2 text-xs text-slate-500 mb-8">
            <Star className="w-3.5 h-3.5 text-[#C6F24E] shrink-0 mt-0.5" />{cmd.stat}
          </p>
        )}

        {cmd.plainWhy && (
          <Card className="bg-slate-900/60 border-slate-700/50 mb-6">
            <CardContent className="py-5">
              <p className="text-[11px] tracking-widest uppercase text-[#C6F24E] font-semibold mb-2">What this actually does for you</p>
              <p className="text-slate-200 text-sm leading-relaxed">{cmd.plainWhy}</p>
            </CardContent>
          </Card>
        )}

        {cmd.idea && (
          <Card className="bg-[#C6F24E]/5 border-[#C6F24E]/20 mb-10">
            <CardContent className="py-5 flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-[#C6F24E] shrink-0 mt-0.5" />
              <p className="text-slate-200 text-sm leading-relaxed"><span className="text-[#C6F24E] font-semibold">Try it for: </span>{cmd.idea}</p>
            </CardContent>
          </Card>
        )}

        <h2 className="text-white font-bold text-lg mb-3">The command file</h2>
        <CopyCommand code={cmd.content} />
        {cmd.note && (
          <p className="text-sm text-slate-400 mt-3 flex items-start gap-2">
            <span className="text-[#C6F24E] font-bold">›</span>{cmd.note}
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
          The linked repo is the source of truth — if the author updates it, the repo link stays current.
        </p>

        <Card className="bg-gradient-to-br from-[#C6F24E]/10 to-transparent border-[#C6F24E]/25">
          <CardContent className="py-5 flex flex-wrap items-center justify-between gap-4">
            <p className="text-slate-300 text-sm flex items-center gap-2"><ScrollText className="w-4 h-4 text-[#C6F24E]" />Want a whole automation, not just one command? <span className="text-white font-semibold">Grab a working n8n template.</span></p>
            <Link href="/templates"><Button className="bg-white/5 hover:bg-white/10 text-white border border-[#323A3C]">Browse templates</Button></Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
