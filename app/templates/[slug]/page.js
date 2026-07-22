import Link from 'next/link'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { ArrowLeft, Check, Clock, FileJson, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getTemplate, TEMPLATES } from '@/lib/templates'
import { outcomesForTemplate } from '@/lib/outcomes'
import DownloadButtons from './DownloadButtons'

// Outcome-template landing pages — "download a working agent" is the new
// magic moment. One static page per hand-built, tested template.

export function generateStaticParams() {
  return Object.keys(TEMPLATES).map((slug) => ({ slug }))
}

export function generateMetadata({ params }) {
  const tpl = getTemplate(params.slug)
  if (!tpl) return {}
  return {
    title: `${tpl.title} — Free Working Template | WorkflowStacks`,
    description: `${tpl.outcome} Free, importable n8n workflow — set up in ~${tpl.setup_minutes} minutes, no code.`,
    alternates: { canonical: `/templates/${tpl.slug}` },
  }
}

const IMPORT_STEPS = [
  { title: 'Download the workflow', desc: 'One JSON file — it contains the whole automation, with setup instructions inside.' },
  { title: 'Import into n8n', desc: 'In n8n (free at n8n.io): Workflows → ⋮ menu → "Import from File" → pick the downloaded file.' },
  { title: 'Connect your accounts', desc: 'The workflow tells you exactly which nodes to open — connect Google Sheets and your AI key. ~5 minutes.' },
  { title: 'Click Execute', desc: 'That\'s it. It runs. Edit the prompt inside any time to change the output style.' },
]

export default function TemplatePage({ params }) {
  const tpl = getTemplate(params.slug)
  if (!tpl) notFound()
  const relatedOutcomes = outcomesForTemplate(tpl.slug)

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

      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <p className="text-xs tracking-widest uppercase text-[#C6F24E] text-center mb-4 font-semibold">
          Free working template · {tpl.deliverable_type === 'n8n' ? 'n8n workflow' : tpl.deliverable_type}
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 text-center leading-tight">{tpl.title}</h1>
        <p className="text-lg text-slate-300 text-center mb-8 max-w-xl mx-auto">{tpl.outcome}</p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-10 text-sm text-slate-400">
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-teal-400" />~{tpl.setup_minutes} min setup</span>
          <span className="flex items-center gap-1.5"><FileJson className="w-4 h-4 text-teal-400" />Import &amp; run — not a prompt</span>
          <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-teal-400" />Free, you own it</span>
        </div>

        <div className="mb-14">
          <Suspense fallback={null}>
            <DownloadButtons slug={tpl.slug} filename={tpl.filename} />
          </Suspense>
        </div>

        <Card className="bg-slate-900/60 border-slate-700/50 mb-8">
          <CardContent className="py-6">
            <h2 className="text-white font-bold mb-4">What you need</h2>
            <ul className="space-y-2.5">
              {tpl.requires.map((r) => (
                <li key={r} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-[#C6F24E] flex-shrink-0 mt-0.5" />{r}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <h2 className="text-white font-bold text-xl mb-4">From download to running — 4 steps</h2>
        <div className="space-y-3 mb-14">
          {IMPORT_STEPS.map((s, i) => (
            <Card key={s.title} className="bg-slate-900/60 border-slate-700/50">
              <CardContent className="py-4 flex items-start gap-4">
                <span className="text-[#C6F24E] font-bold text-lg leading-none mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className="text-white font-semibold text-sm mb-1">{s.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {relatedOutcomes.length > 0 && (
          <div className="mb-12">
            <h2 className="text-white font-bold text-xl mb-4">Use this to…</h2>
            <div className="flex flex-wrap gap-2">
              {relatedOutcomes.map((o) => (
                <Link key={o.slug} href={`/automate/${o.slug}`} className="text-sm text-slate-300 bg-slate-900/60 border border-slate-700/50 hover:border-[#C6F24E]/40 rounded-full px-4 py-2 transition-colors">
                  {o.h1}
                </Link>
              ))}
            </div>
          </div>
        )}

        <Card className="bg-[#C6F24E]/5 border-[#C6F24E]/25">
          <CardContent className="py-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Wrench className="w-5 h-5 text-[#C6F24E] mt-0.5" />
              <div>
                <h2 className="text-white font-semibold text-sm mb-1">Rather not set it up yourself?</h2>
                <p className="text-slate-400 text-sm">We'll build this — customized to your store and running in your tools — within 7 days.</p>
              </div>
            </div>
            <Link href={`/build-for-me?goal=${encodeURIComponent(tpl.outcome)}`}>
              <Button className="bg-white/5 hover:bg-white/10 text-white border border-[#323A3C]">Get it built — from $500</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
