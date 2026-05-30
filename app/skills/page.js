import SkillsCatalogClient from './SkillsCatalogClient'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks-emergent.vercel.app'

export const metadata = {
  title: 'Browse AI Skills & Tools for Founders | WorkflowStacks',
  description: 'Browse 100+ free, trending GitHub AI skills, MCP servers, and agent tools for founders — marketing, sales, SaaS, automation, and more.',
  alternates: { canonical: '/skills' },
  openGraph: {
    title: 'Browse AI Skills & Tools for Founders | WorkflowStacks',
    description: 'Browse 100+ free, trending GitHub AI skills and agent tools for founders across every niche.',
    type: 'website',
    url: '/skills',
  },
}

export const revalidate = 3600

async function getSkills() {
  try {
    const res = await fetch(`${BASE}/api/skills`, { next: { revalidate: 3600 } })
    if (!res.ok) return []
    const data = await res.json()
    return data.skills || []
  } catch {
    return []
  }
}

export default async function SkillsPage() {
  const skills = await getSkills()
  return <SkillsCatalogClient skills={skills} />
}
