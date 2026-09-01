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
export const revalidate = 1800

// One page's worth for the default SSR load. The catalog now has 2,000+
// published skills — fetching them all in one request (the old behavior)
// took 90s+ to sort/transfer and blew past the fetch timeout below,
// silently rendering the page as empty. The client re-fetches this same
// endpoint (with category/sort/search/offset) as the user interacts.
export const PAGE_SIZE = 48

async function getSkills() {
  try {
    const res = await fetch(`${BASE}/api/skills?sort=trending&limit=${PAGE_SIZE}`, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return { skills: [], total: 0, hasMore: false }
    const data = await res.json()
    return { skills: data.skills || [], total: data.total || 0, hasMore: !!data.hasMore }
  } catch {
    return { skills: [], total: 0, hasMore: false }
  }
}

// Heavy fields the catalog grid never renders — the API already strips these
// from list responses, but keep the belt-and-braces trim for any leftovers.
const HEAVY = ['readme_preview', 'use_guide', 'description_original', 'name_original', 'rewritten_at']
function trim(s) {
  const out = {}
  for (const k in s) if (!HEAVY.includes(k)) out[k] = s[k]
  return out
}

export default async function SkillsPage() {
  const { skills: raw, total, hasMore } = await getSkills()
  const skills = raw.map(trim)
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'AI Skills & Tools catalog',
    description: 'Free, trending open-source AI skills, MCP servers, and agent tools for founders.',
    numberOfItems: total,
    itemListElement: skills.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${BASE}/skills/${s.slug || s.id}`,
      name: s.title_human || s.name,
    })),
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <SkillsCatalogClient initialSkills={skills} initialTotal={total} initialHasMore={hasMore} pageSize={PAGE_SIZE} />
    </>
  )
}
