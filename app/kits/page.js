import Link from 'next/link'
import { ArrowLeft, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { KITS, kitItemCount } from '@/lib/kits'

export const metadata = {
  title: 'Finishing Kits — Free Assets Matched to Your Template | WorkflowStacks',
  description: 'Curated captions, badges, LUTs, overlays and SFX/music — picked for one specific ad style, not a generic stock library. Link-only, nothing to host.',
  alternates: { canonical: '/kits' },
}

export default function KitsIndexPage() {
  const kits = Object.values(KITS)

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
          <Layers className="w-8 h-8 text-[#C6F24E]" />
          <h1 className="text-4xl md:text-5xl font-bold text-white text-center">Finishing Kits</h1>
        </div>
        <p className="text-lg text-slate-300 text-center mb-12 max-w-2xl mx-auto">
          Not a generic stock library. Each kit is a small, curated set of captions, badges, LUTs, overlays and sound — picked for one specific ad style, so you finish editing in minutes instead of hunting across six sites.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {kits.map((k) => (
            <Link key={k.slug} href={`/kits/${k.slug}`}>
              <Card className="bg-slate-900/60 border-slate-700/50 hover:border-[#C6F24E]/40 transition-all h-full">
                <CardContent className="py-5">
                  <p className="text-[11px] tracking-widest uppercase text-[#C6F24E] font-semibold mb-2">{k.persona}</p>
                  <h2 className="text-white font-bold mb-1.5">{k.title}</h2>
                  <p className="text-slate-400 text-sm leading-relaxed mb-3">{k.outcome}</p>
                  <p className="text-xs text-slate-600 font-mono">{kitItemCount(k)} picks · {k.groups.length} categories</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <p className="text-sm text-slate-500 text-center mt-10">
          Every pick links to its real source — we host nothing.{' '}
          <Link href="/templates" className="text-[#C6F24E] hover:text-[#A6D62E] underline underline-offset-2">Browse templates</Link> these kits are built for.
        </p>
      </div>
    </div>
  )
}
