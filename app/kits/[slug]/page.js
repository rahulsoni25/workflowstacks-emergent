import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Check, Clock, Layers, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getKit, KITS, kitItemCount } from '@/lib/kits'
import { getTemplate } from '@/lib/templates'
import { itemListSchema, breadcrumbSchema } from '@/lib/schema'
import AssetLink from './AssetLink'

// Finishing Kits — curated, link-only asset bundles matched to one specific
// hero template's output style. See lib/kits.js for why this exists and why
// it's deliberately NOT a generic stock-asset directory.

export function generateStaticParams() {
  return Object.keys(KITS).map((slug) => ({ slug }))
}

export function generateMetadata({ params }) {
  const kit = getKit(params.slug)
  if (!kit) return {}
  return {
    title: kit.title_seo,
    description: kit.metaDescription,
    alternates: { canonical: `/kits/${kit.slug}` },
    openGraph: { title: kit.title_seo, description: kit.metaDescription, url: `/kits/${kit.slug}` },
  }
}

export default function KitPage({ params }) {
  const kit = getKit(params.slug)
  if (!kit) notFound()
  const tpl = getTemplate(kit.template)
  const itemCount = kitItemCount(kit)
  const allItems = kit.groups.flatMap((g) => g.items)

  const listSchema = itemListSchema({
    name: kit.title,
    description: kit.metaDescription,
    url: `/kits/${kit.slug}`,
    items: allItems,
  })
  const crumbs = breadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Kits', path: '/kits' },
    { name: kit.title, path: `/kits/${kit.slug}` },
  ])

  return (
    <div className="min-h-screen bg-neptune">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/kits">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">
              <ArrowLeft className="w-4 h-4 mr-2" />All kits
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <p className="text-xs tracking-widest uppercase text-[#C6F24E] text-center mb-4 font-semibold">
          Free finishing kit · {kit.persona}
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 text-center leading-tight">{kit.h1}</h1>
        <p className="text-lg text-slate-300 text-center mb-8 max-w-xl mx-auto">{kit.outcome}</p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-10 text-sm text-slate-400">
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-teal-400" />~10 min to grab everything</span>
          <span className="flex items-center gap-1.5"><Layers className="w-4 h-4 text-teal-400" />{itemCount} picks, {kit.groups.length} categories</span>
          <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-teal-400" />Link-only — we host nothing</span>
        </div>

        <Card className="bg-[#C6F24E]/5 border-[#C6F24E]/20 mb-12">
          <CardContent className="py-5">
            <p className="text-sm text-slate-200 leading-relaxed">
              <span className="text-[#C6F24E] font-semibold">Why this kit exists: </span>
              {kit.whyItExists}
            </p>
          </CardContent>
        </Card>

        {kit.groups.map((group) => (
          <div key={group.category} className="mb-10">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-200">{group.category}</h2>
              <span className="text-xs text-slate-600 font-mono">{group.items.length} pick{group.items.length > 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-2.5">
              {group.items.map((item) => (
                <Card key={item.name} className="bg-slate-900/60 border-slate-700/50">
                  <CardContent className="py-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm mb-1">{item.name}</p>
                      <p className="text-slate-400 text-xs leading-relaxed">{item.why}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <AssetLink kitSlug={kit.slug} assetName={item.name} href={item.url}>
                        {item.linkType === 'exact' ? 'Get asset' : 'Browse'}
                      </AssetLink>
                      <div className="flex gap-1.5 text-right">
                        <span className="text-[10px] font-mono text-slate-600 bg-slate-950/60 border border-slate-800 rounded px-1.5 py-0.5">via {item.sourceName}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {group.items.some((i) => i.license) && (
                <p className="text-[11px] text-slate-600 pl-1">
                  {[...new Set(group.items.map((i) => i.license))].join(' · ')}
                </p>
              )}
            </div>
          </div>
        ))}

        {tpl && (
          <div className="mb-12">
            <h2 className="text-white font-bold text-xl mb-4">Use this with</h2>
            <Link href={`/templates/${tpl.slug}`} className="inline-flex items-center gap-2 text-sm text-slate-300 bg-slate-900/60 border border-slate-700/50 hover:border-[#C6F24E]/40 rounded-full px-4 py-2 transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C6F24E]" />{tpl.title}
            </Link>
          </div>
        )}

        <Card className="bg-[#C6F24E]/5 border-[#C6F24E]/25">
          <CardContent className="py-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Wrench className="w-5 h-5 text-[#C6F24E] mt-0.5" />
              <div>
                <h2 className="text-white font-semibold text-sm mb-1">Need it matched to your product?</h2>
                <p className="text-slate-400 text-sm">We'll pick the badge, LUT and caption style to fit your brand as part of a done-for-you build.</p>
              </div>
            </div>
            <Link href={`/build-for-me?goal=${encodeURIComponent(kit.outcome)}`}>
              <Button className="bg-white/5 hover:bg-white/10 text-white border border-[#323A3C] whitespace-nowrap">Get it built — from $500</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
