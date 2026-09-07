import Link from 'next/link'
import { ArrowLeft, ArrowRight, Layers, ListOrdered, UserRound, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { COLLECTION_KINDS, allCollectionItems } from '@/lib/collections'
import { itemListSchema, breadcrumbSchema, SITE_URL } from '@/lib/schema'

// Packs, playbooks and personas each had a top-level nav slot for four items.
// This is the one entry point for all twelve, organised the way somebody
// actually arrives at them — by who they are and what they are trying to ship.
export const metadata = {
  title: 'Curated AI Skill Collections — By Role and By Job | WorkflowStacks',
  description:
    'Pre-picked sets of AI skills for a specific role or a specific job: starter packs, step-by-step playbooks with a stated outcome, and whole-role personas. Free, and every skill links to its source repository.',
  alternates: { canonical: '/collections' },
  openGraph: {
    title: 'Curated AI Skill Collections — By Role and By Job',
    description: 'Starter packs, playbooks and personas: pre-picked AI skill sets for a role or a job.',
    url: '/collections',
  },
}

export const revalidate = 86400

const KIND_ICON = { packs: Layers, playbooks: ListOrdered, personas: UserRound }

// Ordered rather than derived, so the page reads the same way every build and
// the biggest audiences lead.
const AUDIENCE_ORDER = ['Founder', 'Agency', 'Marketer', 'Creator', 'Sales', 'Developer']

// Written out rather than templated. `If you are a ${audience.toLowerCase()}`
// produces "a agency" and "a sales" — the audience values are job categories,
// not job titles, so no amount of article-picking makes them read as English.
const AUDIENCE_HEADING = {
  Founder: 'If you are a founder',
  Agency: 'If you run an agency',
  Marketer: 'If you are a marketer',
  Creator: 'If you are a creator',
  Sales: 'If you are in sales',
  Developer: 'If you are a developer',
}

function headingFor(audience) {
  if (AUDIENCE_HEADING[audience]) return AUDIENCE_HEADING[audience]
  const word = String(audience).toLowerCase()
  return `If you are ${/^[aeiou]/.test(word) ? 'an' : 'a'} ${word}`
}

export default async function CollectionsPage() {
  const items = await allCollectionItems()

  const audiences = [
    ...AUDIENCE_ORDER.filter((a) => items.some((i) => i.audience === a)),
    ...[...new Set(items.map((i) => i.audience))].filter((a) => !AUDIENCE_ORDER.includes(a)).sort(),
  ]

  const list = itemListSchema({
    name: 'Curated AI skill collections',
    description: 'Starter packs, playbooks and personas — pre-picked AI skill sets for a role or a job.',
    url: '/collections',
    items: items.map((i) => ({ name: i.title, url: `${SITE_URL}/${i.kind}/${i.slug || i.id}` })),
  })
  const crumbs = breadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Collections', path: '/collections' },
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
        <p className="text-xs tracking-widest uppercase text-[#C6F24E] text-center mb-4 font-semibold">Collections</p>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 text-center leading-tight">
          Someone already picked the skills for your job
        </h1>
        <p className="text-lg text-slate-300 text-center mb-12 max-w-2xl mx-auto">
          The catalog runs to thousands of repositories, which is useless if you do not
          already know what you are looking for. These are pre-picked sets — chosen for one
          role or one job, with every skill linking back to its source repository.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          {Object.values(COLLECTION_KINDS).map((k) => {
            const Icon = KIND_ICON[k.kind]
            const n = items.filter((i) => i.kind === k.kind).length
            return (
              <Card key={k.kind} className="bg-slate-900/60 border-slate-700/50">
                <CardContent className="py-5">
                  <div className="flex items-center gap-2 mb-2">
                    {Icon && <Icon className="w-4 h-4 text-[#C6F24E]" />}
                    <Link href={`/${k.kind}`} className="text-white font-semibold hover:text-[#C6F24E] transition-colors">
                      {k.plural}
                    </Link>
                    <span className="text-xs text-slate-500 ml-auto">{n}</span>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">{k.blurb}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {audiences.map((aud) => {
          const mine = items.filter((i) => i.audience === aud)
          if (!mine.length) return null
          return (
            <section key={aud} className="mb-14">
              <h2 className="text-2xl font-bold text-white mb-5">{headingFor(aud)}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mine.map((i) => {
                  const meta = COLLECTION_KINDS[i.kind]
                  const Icon = KIND_ICON[i.kind]
                  return (
                    <Card key={`${i.kind}-${i.id}`} className="bg-slate-900/60 border-slate-700/50 hover:border-[#C6F24E]/40 transition-all duration-300 h-full">
                      <CardContent className="py-5 flex flex-col h-full">
                        <div className="flex items-center gap-1.5 mb-2">
                          {Icon && <Icon className="w-3.5 h-3.5 text-[#C6F24E]" />}
                          <span className="text-xs uppercase tracking-wide text-[#C6F24E] font-semibold">{meta?.label}</span>
                          {i.timeEstimate && (
                            <span className="text-xs text-slate-500 ml-auto flex items-center gap-1">
                              <Clock className="w-3 h-3" />{i.timeEstimate}
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2 leading-snug">
                          <Link href={`/${i.kind}/${i.slug || i.id}`} className="hover:text-[#C6F24E] transition-colors">
                            {i.title}
                          </Link>
                        </h3>
                        <p className="text-slate-400 text-sm leading-relaxed mb-4 flex-1">
                          {i.outcome || i.description}
                        </p>
                        <div className="flex items-center justify-between gap-3">
                          <Link href={`/${i.kind}/${i.slug || i.id}`} className="text-sm text-[#C6F24E] hover:text-[#A6D62E] font-medium inline-flex items-center gap-1">
                            Open <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                          {i.skillCount > 0 && (
                            <span className="text-xs text-slate-500 whitespace-nowrap">{i.skillCount} skills</span>
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

        <p className="text-sm text-slate-400 text-center mt-10">
          Know exactly what you want?{' '}
          <Link href="/skills" className="text-[#C6F24E] hover:text-[#A6D62E] underline underline-offset-2">
            Browse the full catalog →
          </Link>
        </p>
        <p className="text-sm text-slate-500 text-center mt-4">
          Want the job done rather than the tools?{' '}
          <Link href="/automate" className="text-[#C6F24E] hover:text-[#A6D62E] underline underline-offset-2">
            See what you can automate.
          </Link>
        </p>
      </div>
    </div>
  )
}
