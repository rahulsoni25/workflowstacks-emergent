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

// 5 min — short enough that AI rewrite landings show up fast, long enough
// to not hammer the DB on every page view.
export const revalidate = 300

async function getSkills() {
  try {
    const res = await fetch(`${BASE}/api/skills`, { next: { revalidate: 300 } })
    if (!res.ok) return []
    const data = await res.json()
    return data.skills || []
  } catch {
    return []
  }
}

// Heavy fields the catalog grid never renders — strip them from the SSR payload.
const HEAVY = ['readme_preview', 'use_guide', 'description_original', 'name_original', 'rewritten_at']
function trim(s) {
  const out = {}
  for (const k in s) if (!HEAVY.includes(k)) out[k] = s[k]
  return out
}

export default async function SkillsPage() {
  const raw = await getSkills()
  const skills = raw.map(trim)
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'AI Skills & Tools catalog',
    description: 'Free, trending open-source AI skills, MCP servers, and agent tools for founders.',
    numberOfItems: skills.length,
    itemListElement: skills.slice(0, 100).map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${BASE}/skills/${s.id}`,
      name: s.title_human || s.name,
    })),
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <SkillsCatalogClient skills={skills} />
    </>
  )
}
