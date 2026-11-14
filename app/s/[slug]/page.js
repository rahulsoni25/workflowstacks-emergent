import { notFound } from 'next/navigation'
import StackDetailClient from './StackDetailClient'
import { SITE_URL as BASE } from '@/lib/site-url'

// ISR. `revalidate` alone did not make this cached: without generateStaticParams
// a dynamic segment renders on every request (`next build` listed /s/[slug] as
// ƒ, 2026-11-14). An empty list renders each stack on its first visit and
// serves it from the cache after that. See docs/COSTS.md.
export const revalidate = 21600
export const dynamicParams = true
export function generateStaticParams() { return [] }

// Only a 404 means "no such stack". Any other failure throws, so ISR keeps the
// last good page (or caches nothing) rather than storing a 404 for 6 hours.
async function getStack(slug) {
  const res = await fetch(`${BASE}/api/stacks/${slug}`, { next: { revalidate: 21600 }, signal: AbortSignal.timeout(10_000) })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`stack ${slug}: API answered ${res.status}`)
  const data = await res.json()
  return data.stack ? { stack: data.stack, skills: data.skills || [] } : null
}

export async function generateMetadata({ params }) {
  const data = await getStack(params.slug)
  if (!data) return { title: 'Stack not found | WorkflowStacks', robots: { index: false, follow: false } }
  const { stack } = data
  const title = `${stack.name} — AI Stack | WorkflowStacks`
  const description = (stack.summary || stack.goal || '').slice(0, 160)
  const url = `/s/${stack.slug}`
  return {
    title, description,
    alternates: { canonical: url },
    openGraph: { title, description, type: 'article', url },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function StackPage({ params }) {
  const data = await getStack(params.slug)
  if (!data) notFound()
  const { stack, skills } = data

  // Schema.org HowTo — each skill becomes a step in the recipe
  const howTo = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: stack.name,
    description: stack.summary || stack.goal,
    step: skills.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.title_human || s.name,
      text: s.explainer?.what_it_is || s.description_human || s.description || '',
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howTo) }} />
      <StackDetailClient stack={stack} skills={skills} />
    </>
  )
}
