import { notFound } from 'next/navigation'
import SkillDetailClient from './SkillDetailClient'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks-emergent.vercel.app'

async function getSkill(id) {
  try {
    const res = await fetch(`${BASE}/api/skills/${id}`, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    const data = await res.json()
    return data.skill || null
  } catch {
    return null
  }
}

// Per-skill SEO: unique title, description, canonical, and OG/Twitter tags
export async function generateMetadata({ params }) {
  const skill = await getSkill(params.id)
  if (!skill) return { title: 'Skill not found | WorkflowStacks' }
  const name = skill.title_human || skill.name
  const title = `${name} | WorkflowStacks`
  const description = (skill.description_human || skill.description || '').slice(0, 160)
  const url = `/skills/${skill.id}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, type: 'article', url },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function SkillDetailPage({ params }) {
  const skill = await getSkill(params.id)
  if (!skill) notFound()

  // Structured data for rich results
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: skill.title_human || skill.name,
    description: skill.description_human || skill.description,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: skill.price || 0, priceCurrency: 'USD' },
    ...(skill.github_url ? { url: skill.github_url } : {}),
    ...(skill.creator ? { author: { '@type': 'Person', name: skill.creator } } : {}),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SkillDetailClient skill={skill} />
    </>
  )
}
