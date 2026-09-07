import Link from 'next/link'
import { ArrowLeft, ArrowRight, Clock, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { OUTCOMES } from '@/lib/outcomes'
import { getTemplate } from '@/lib/templates'
import { itemListSchema, breadcrumbSchema } from '@/lib/schema'

// The 16 /automate/* outcome pages target "how do I automate X" demand, but
// until now they had no hub: /automate itself 404'd, so the cluster had no
// canonical entry point for crawlers, no shared internal-link surface, and no
// page competing for the head term the long-tail pages sit under.
export const metadata = {
  title: 'What Can You Automate With AI? 16 Jobs, With Free Working Workflows',
  description:
    'A plain-English list of the business jobs you can hand to an AI workflow today — inbox triage, review replies, product descriptions, client reports, cold email. Each one links to a free, importable automation you can run in about 5 minutes.',
  alternates: { canonical: '/automate' },
  openGraph: {
    title: 'What Can You Automate With AI? 16 Jobs, With Free Working Workflows',
    description: 'Sixteen real business jobs you can automate today, each with a free working workflow behind it.',
    url: '/automate',
  },
}

const GROUPS = [
  { key: 'ecommerce', label: 'Ecommerce', blurb: 'Catalog copy, review replies, and abandoned carts — the jobs that scale badly by hand.' },
  { key: 'sales', label: 'Sales', blurb: 'Cold email, lead scoring, and objection prep, done before the call instead of during it.' },
  { key: 'agency', label: 'Agency & marketing', blurb: 'Client reporting and content repurposing — the billable-hour sinks.' },
  { key: 'founder', label: 'Founder & operations', blurb: 'Inbox, meetings, and the admin that eats the day you meant to spend building.' },
]

export const revalidate = 86400

export default function AutomateIndexPage() {
  const outcomes = Object.values(OUTCOMES)

  const list = itemListSchema({
    name: 'Business jobs you can automate with AI',
    description: 'Sixteen automatable business jobs, each mapped to a free working workflow.',
    url: '/automate',
    items: outcomes.map((o) => ({ name: o.h1, url: `https://workflowstacks.com/automate/${o.slug}` })),
  })
  const crumbs = breadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'What to automate', path: '/automate' },
  ])

  return (
    <div className="min-h-screen bg-neptune">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(list) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />

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
        <p className="text-xs tracking-widest uppercase text-[#C6F24E] text-center mb-4 font-semibold">What to automate</p>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 text-center leading-tight">
          What can you actually automate with AI?
        </h1>
        <p className="text-lg text-slate-300 text-center mb-4 max-w-2xl mx-auto">
          Not &ldquo;anything&rdquo; — that answer helps nobody. Below are {outcomes.length} specific,
          repetitive business jobs that an AI workflow does well today, grouped by who usually
          owns them.
        </p>
        <p className="text-slate-400 text-center mb-14 max-w-2xl mx-auto">
          Every one links to a free, importable workflow rather than a prompt: you download a
          file, connect your own accounts, and it runs on your own n8n instance. Setup is about
          five minutes. Nothing here is hosted or executed by us.
        </p>

        {GROUPS.map((g) => {
          const items = outcomes.filter((o) => o.persona === g.key)
          if (!items.length) return null
          return (
            <section key={g.key} className="mb-14">
              <h2 className="text-2xl font-bold text-white mb-1">{g.label}</h2>
              <p className="text-slate-400 text-sm mb-5">{g.blurb}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((o) => {
                  const tpl = getTemplate(o.template)
                  return (
                    <Card key={o.slug} className="bg-slate-900/60 border-slate-700/50 hover:border-[#C6F24E]/40 transition-all duration-300 h-full">
                      <CardContent className="py-5 flex flex-col h-full">
                        <h3 className="text-lg font-bold text-white mb-2 leading-snug">
                          <Link href={`/automate/${o.slug}`} className="hover:text-[#C6F24E] transition-colors">
                            {o.h1}
                          </Link>
                        </h3>
                        <p className="text-slate-400 text-sm leading-relaxed mb-4 flex-1">{o.how}</p>
                        <div className="flex items-center justify-between gap-3">
                          <Link href={`/automate/${o.slug}`} className="text-sm text-[#C6F24E] hover:text-[#A6D62E] font-medium inline-flex items-center gap-1">
                            How it works <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                          {tpl && (
                            <span className="text-xs text-slate-500 flex items-center gap-1 whitespace-nowrap">
                              <Clock className="w-3.5 h-3.5" />~{tpl.setup_minutes} min setup
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </section>
          )
        })}

        <Card className="bg-gradient-to-br from-[#C6F24E]/10 to-transparent border-[#C6F24E]/25">
          <CardContent className="py-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Wrench className="w-5 h-5 text-[#C6F24E] mt-0.5" />
              <div>
                <h2 className="text-white font-semibold text-sm mb-1">Your job isn&apos;t on this list?</h2>
                <p className="text-slate-400 text-sm">Describe it and we&apos;ll build the workflow into your tools, tested and running within 7 days.</p>
              </div>
            </div>
            <Link href="/build-for-me">
              <Button className="bg-white/5 hover:bg-white/10 text-white border border-[#323A3C] whitespace-nowrap">
                Get it built — from $500 <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <p className="text-sm text-slate-400 text-center mt-10">
          Prefer to browse by the workflow itself?{' '}
          <Link href="/templates" className="text-[#C6F24E] hover:text-[#A6D62E] underline underline-offset-2">
            See all free templates →
          </Link>
        </p>
      </div>
    </div>
  )
}
