import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getBundle, BUNDLES } from '@/lib/bundles'

export function generateStaticParams() {
  return Object.keys(BUNDLES).map((slug) => ({ slug }))
}

export const metadata = {
  robots: { index: false, follow: false }, // private post-purchase page
}

// Post-purchase download page. The token in the URL (emailed to the buyer)
// gates the actual file downloads — this page just renders the links; the
// /api/bundles/[slug]/download endpoint validates the token on each click.
export default function UnlockPage({ params, searchParams }) {
  const bundle = getBundle(params.slug)
  if (!bundle) notFound()
  const token = (searchParams?.token || '').toString()

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

      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="flex items-center gap-2 text-[#C6F24E] mb-3">
          <ShieldCheck className="w-5 h-5" />
          <span className="text-xs tracking-widest uppercase font-semibold">Your download</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">{bundle.title}</h1>
        <p className="text-slate-400 mb-8">Download your workflow{bundle.files.length > 1 ? 's' : ''} below, then import into n8n (⋮ → Import from File). Setup steps are inside each one.</p>

        {!token ? (
          <Card className="bg-amber-500/5 border-amber-500/30">
            <CardContent className="py-6 text-center text-amber-300 text-sm">
              This download link is missing its access token. Please use the exact link from your purchase email.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {bundle.files.map((f) => (
              <Card key={f.key} className="bg-slate-900/60 border-slate-700/50">
                <CardContent className="py-4 flex items-center justify-between gap-4">
                  <span className="text-white font-semibold text-sm">{f.name}</span>
                  <a href={`/api/bundles/${bundle.slug}/download?token=${encodeURIComponent(token)}&file=${encodeURIComponent(f.key)}`} download>
                    <Button className="bg-[#C6F24E] hover:bg-[#A6D62E] text-[#0A0C0D] font-semibold text-sm">
                      <Download className="w-4 h-4 mr-2" />Download
                    </Button>
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <p className="text-xs text-slate-600 mt-8 text-center">Keep this link private — it's tied to your purchase. Lost it? Reply to your purchase email.</p>
      </div>
    </div>
  )
}
