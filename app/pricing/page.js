import Link from 'next/link'
import { ArrowLeft, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export const metadata = {
  title: 'Pricing — Free Catalog, Premium Tools & Done-For-You Agents | WorkflowStacks',
  description:
    'Browse 1,500+ open-source AI skills free. Buy premium automation tools one-time ($29–$39). Or have us build your working agent from $500, delivered in 7 days.',
  alternates: { canonical: '/pricing' },
}

const TIERS = [
  {
    name: 'Free Catalog',
    price: '$0',
    priceNote: 'forever',
    blurb: 'Everything you need to explore and build on your own.',
    features: [
      '1,500+ quality-gated open-source AI skills',
      'No-code Agent Builder',
      '11 free n8n workflow templates',
      'Deploy to ChatGPT, Claude, Gemini',
    ],
    cta: { label: 'Browse the catalog', href: '/' },
  },
  {
    name: 'Premium Tools',
    price: '$29–$39',
    priceNote: 'one-time',
    blurb: 'Individual premium tools and bundles.',
    features: [
      'Advanced, ready-to-run n8n workflows',
      'Buy once — keep the files',
      'Instant download after checkout',
      'Free updates',
    ],
    cta: { label: 'See premium tools', href: '/tools' },
  },
  {
    name: 'Done-For-You Agent',
    price: 'from $500',
    priceNote: 'per agent',
    blurb: 'We build your working agent for you.',
    features: [
      'Built and customized to your tools',
      'Delivered within 7 days',
      'Setup included',
      'Handover walkthrough',
    ],
    cta: { label: 'Get it built', href: '/build-for-me' },
  },
  {
    name: 'Enterprise / Teams',
    price: 'Custom',
    priceNote: '',
    blurb: 'For agencies and teams.',
    features: [
      'Team access',
      'Private skills',
      'SLA',
      'Custom integrations',
    ],
    cta: { label: 'Contact us', href: '/enterprise' },
  },
]

export default function PricingPage() {
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

      <div className="container mx-auto px-4 py-16 max-w-6xl">
        <p className="text-xs tracking-widest uppercase text-[#C6F24E] text-center mb-4 font-semibold">Pricing</p>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 text-center leading-tight">
          Start free. Pay only for what ships.
        </h1>
        <p className="text-lg text-slate-300 text-center mb-14 max-w-xl mx-auto">
          The catalog, builder, and templates are free. Premium tools are one-time purchases — no subscriptions.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {TIERS.map((tier) => (
            <Card key={tier.name} className="bg-slate-900/60 border-slate-700/50 hover:border-[#C6F24E]/40 transition-all duration-300 h-full">
              <CardContent className="py-7 flex flex-col h-full">
                <h2 className="text-white font-bold text-lg mb-1">{tier.name}</h2>
                <div className="mb-3">
                  <span className="text-3xl font-extrabold text-white">{tier.price}</span>
                  {tier.priceNote && <span className="text-slate-400 text-sm"> {tier.priceNote}</span>}
                </div>
                <p className="text-slate-400 text-sm mb-5">{tier.blurb}</p>
                <ul className="space-y-2.5 mb-7 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <Check className="w-4 h-4 text-[#C6F24E] flex-shrink-0 mt-0.5" />{f}
                    </li>
                  ))}
                </ul>
                <Link href={tier.cta.href} className="block">
                  <Button className="w-full bg-white/5 hover:bg-[#C6F24E] hover:text-[#0A0C0D] text-white border border-[#323A3C] font-semibold transition-colors">
                    {tier.cta.label}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-center text-sm text-slate-500 mt-12">
          Questions? <Link href="/help" className="text-[#C6F24E] hover:text-[#A6D62E] underline underline-offset-2">We're happy to help</Link>.
        </p>
      </div>
    </div>
  )
}
