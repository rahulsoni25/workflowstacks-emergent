import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Check, Download, Wrench, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getOutcome, OUTCOMES } from '@/lib/outcomes'
import { getTemplate } from '@/lib/templates'

export function generateStaticParams() {
  return Object.keys(OUTCOMES).map((slug) => ({ slug }))
}

export function generateMetadata({ params }) {
  const o = getOutcome(params.slug)
  if (!o) return {}
  return {
    title: o.title,
    description: o.metaDescription,
    alternates: { canonical: `/automate/${o.slug}` },
    openGraph: { title: o.title, description: o.metaDescription, url: `/automate/${o.slug}` },
  }
}

export default function OutcomePage({ params }) {
  const o = getOutcome(params.slug)
  if (!o) notFound()
  const tpl = getTemplate(o.template)

  // FAQ + HowTo structured data — real Q&A tied to a real deliverable
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: o.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <div className="min-h-screen bg-neptune">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/templates">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">
              <ArrowLeft className="w-4 h-4 mr-2" />All templates
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <p className="text-xs tracking-widest uppercase text-[#C6F24E] font-semibold mb-3">Free · no code · ~{tpl?.setup_minutes || 5} min</p>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">{o.h1}</h1>

        <p className="text-lg text-slate-300 mb-4">{o.pain}</p>
        <p className="text-lg text-slate-300 mb-10">{o.how}</p>

        {tpl && (
          <Card className="bg-[#C6F24E]/10 border-[#C6F24E]/40 mb-12">
            <CardContent className="py-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs tracking-widest uppercase text-[#C6F24E] font-semibold mb-1">The working template</p>
                <h2 className="text-white font-bold text-lg">{tpl.title}</h2>
                <p className="text-slate-400 text-sm mt-1 max-w-md">{tpl.outcome}</p>
              </div>
              <Link href={`/templates/${tpl.slug}`}>
                <Button className="bg-[#C6F24E] hover:bg-[#A6D62E] text-[#0A0C0D] font-semibold whitespace-nowrap">
                  <Download className="w-4 h-4 mr-2" />Get it free
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {tpl && (
          <div className="mb-12">
            <h2 className="text-white font-bold text-xl mb-4">What you’ll need</h2>
            <ul className="space-y-2.5">
              {tpl.requires.map((r) => (
                <li key={r} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-[#C6F24E] flex-shrink-0 mt-0.5" />{r}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mb-12">
          <h2 className="text-white font-bold text-xl mb-4">Common questions</h2>
          <div className="space-y-4">
            {o.faqs.map((f) => (
              <Card key={f.q} className="bg-slate-900/60 border-slate-700/50">
                <CardContent className="py-4">
                  <h3 className="text-white font-semibold text-sm mb-1">{f.q}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{f.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="bg-gradient-to-br from-[#C6F24E]/10 to-transparent border-[#C6F24E]/25">
          <CardContent className="py-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Wrench className="w-5 h-5 text-[#C6F24E] mt-0.5" />
              <div>
                <h2 className="text-white font-semibold text-sm mb-1">Want it built for you instead?</h2>
                <p className="text-slate-400 text-sm">We’ll set this up in your tools, customized, running within 7 days.</p>
              </div>
            </div>
            <Link href={`/build-for-me?goal=${encodeURIComponent(o.h1)}`}>
              <Button className="bg-white/5 hover:bg-white/10 text-white border border-[#323A3C] whitespace-nowrap">From $500 <ArrowRight className="w-4 h-4 ml-2" /></Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
