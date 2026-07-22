import { notFound } from 'next/navigation'
import { getBundle, BUNDLES } from '@/lib/bundles'
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
  return <BundleSalesClient bundle={{ ...safe, file_count: files.length }} />
}
