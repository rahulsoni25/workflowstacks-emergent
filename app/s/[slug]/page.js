import { notFound } from 'next/navigation'
import StackDetailClient from './StackDetailClient'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks-emergent.vercel.app'
export const revalidate = 60

async function getStack(slug) {
  try {
    const res = await fetch(`${BASE}/api/stacks/${slug}`, { next: { revalidate: 60 } })
    if (!res.ok) return null
    const data = await res.json()
    return data.stack ? { stack: data.stack, skills: data.skills || [] } : null
  } catch {
    return null
  }
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
