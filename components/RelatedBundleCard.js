'use client'

// The bridge between the free catalog and the paid packs. A visitor who just
// found a free SEO skill sees the tested, ready-to-run pack for the same job
// right here instead of never learning it exists. Copy states plainly that it
// is paid and what it needs; nothing is claimed that lib/bundles.js does not.
import Link from 'next/link'
import { Package, ArrowRight } from 'lucide-react'
import { trackEvent } from '@/lib/analytics'

export default function RelatedBundleCard({ bundle, skill }) {
  if (!bundle) return null
  const skillKey = skill?.slug || skill?.id || ''
  return (
    <div className="mt-12 rounded-2xl border border-lime-400/25 bg-lime-400/5 p-6 md:p-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-lime-300">
            <Package className="h-4 w-4" />
            Ready-to-run pack · one-time ${bundle.price_usd}
          </div>
          <h2 className="text-xl font-bold text-white">{bundle.title}</h2>
          <p className="mt-1 text-slate-300">{bundle.tagline}</p>
          <p className="mt-2 text-xs text-slate-500">Includes the tested workflow and a written setup playbook. Needs: {bundle.needs}.</p>
        </div>
        <Link
          href={`/bundles/${bundle.slug}?ref=skill:${encodeURIComponent(skillKey)}`}
          onClick={() => trackEvent('bundle_card_click', { bundle: bundle.slug, from_skill: skillKey, value: bundle.price_usd })}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-lime-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-lime-300"
        >
          See what you get <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
