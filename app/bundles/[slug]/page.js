import { notFound } from 'next/navigation'
import { getBundle, BUNDLES } from '@/lib/bundles'
import { productSchema, breadcrumbSchema } from '@/lib/schema'
import BundleSalesClient from './BundleSalesClient'

export function generateStaticParams() {
  return Object.keys(BUNDLES).map((slug) => ({ slug }))
}

export function generateMetadata({ params }) {
  const b = getBundle(params.slug)
  if (!b) return {}
  return {
    title: `${b.title} — Premium Workflow | WorkflowStacks`,
    description: b.description,
    alternates: { canonical: `/bundles/${b.slug}` },
  }
}

export default function BundlePage({ params }) {
  const bundle = getBundle(params.slug)
  if (!bundle) notFound()
  // Never ship workflow payloads to the client on the sales page
  const { files, ...safe } = bundle

  // Product + Offer is what lets the price surface in search results — the
  // single highest-value schema on a paid page.
  const product = productSchema({
    name: bundle.title,
    description: bundle.description,
    url: `/bundles/${bundle.slug}`,
    priceUsd: bundle.price_usd,
    category: 'AI automation workflow',
  })
  const crumbs = breadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Premium Tools', path: '/tools' },
    { name: bundle.title, path: `/bundles/${bundle.slug}` },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(product) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <BundleSalesClient bundle={{ ...safe, file_count: files.length }} />
    </>
  )
}
