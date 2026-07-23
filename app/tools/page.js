import Link from 'next/link'
import { ArrowLeft, ArrowRight, KeyRound, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BUNDLES } from '@/lib/bundles'
import { COMING_SOON } from '@/lib/coming-soon'
import ComingSoon from './ComingSoon'

export const metadata = {
  title: 'Premium AI Tools — Lead Finder, Rank Tracker & More | WorkflowStacks',
  description:
    'Buy-once automation tools every business needs: find leads, track your Google rankings, watch competitors, catch bad reviews. Set up yourself or let us do it.',
  alternates: { canonical: '/tools' },
}

export default function ToolsPage() {
  const tools = Object.values(BUNDLES)
  const hero = tools.filter((t) => t.hero)
  const other = tools.filter((t) => !t.hero)

  const Cardish = (t) => (
    <Link key={t.slug} href={`/bundles/${t.slug}`}>
      <Card className="bg-slate-900/60 border-slate-700/50 hover:border-[#C6F24E]/40 transition-all h-full">
        <CardContent className="py-6 flex flex-col h-full">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <h3 className="text-xl font-bold text-white">{t.title}</h3>
            <span className="text-[#C6F24E] font-extrabold whitespace-nowrap">${t.price_usd}</span>
          </div>
          <p className="text-slate-300 text-sm font-medium mb-2">{t.tagline}</p>
          <p className="text-slate-400 text-sm leading-relaxed flex-1">{t.description}</p>
          {t.needs && (
            <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-4">
              {t.needs.startsWith('No') ? <Check className="w-3.5 h-3.5 text-[#C6F24E]/70" /> : <KeyRound className="w-3.5 h-3.5 text-amber-300/60" />}
              {t.needs}
            </p>
          )}
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#C6F24E] mt-4">
            See the tool <ArrowRight className="w-4 h-4" />
          </span>
        </CardContent>
      </Card>
    </Link>
  )

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
        <p className="text-xs tracking-widest uppercase text-[#C6F24E] font-semibold text-center mb-4">Premium tools · buy once</p>
        <h1 className="text-4xl md:text-5xl font-bold text-white text-center mb-4 leading-tight">
          The automations every business needs
        </h1>
        <p className="text-lg text-slate-300 text-center mb-12 max-w-2xl mx-auto">
          Find leads. Track rankings. Watch competitors. Catch bad reviews. Buy once, own it forever — or let us set it up for you.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
          {hero.map(Cardish)}
        </div>

        {other.length > 0 && (
          <>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">More packs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {other.map(Cardish)}
            </div>
          </>
        )}

        <div className="mt-16 mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-1">Coming soon — vote with your email</h2>
          <p className="text-slate-500 text-sm">We build the ones people actually want. Tap “notify me” on any you’d use.</p>
        </div>
        <ComingSoon tools={COMING_SOON} />

        <p className="text-sm text-slate-500 text-center mt-12">
          Prefer free? <Link href="/templates" className="text-[#C6F24E] hover:text-[#A6D62E] underline underline-offset-2">Browse 11 free workflow templates</Link>.
        </p>
      </div>
    </div>
  )
}
