import SkillsCatalogClient from './SkillsCatalogClient'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks-emergent.vercel.app'

export const metadata = {
  title: 'Marketplace — AI Agents, Skills & MCP Servers | WorkflowStacks',
  description: 'Browse the quality-gated catalog of open-source AI agents, Claude skills, MCP servers and prompts. Live GitHub stats, health scores, one-click install into Claude, ChatGPT or Gemini.',
  alternates: { canonical: '/skills' },
  openGraph: {
    title: 'Marketplace — AI Agents, Skills & MCP Servers | WorkflowStacks',
    description: 'Quality-gated open-source AI agents, skills and MCP servers with live GitHub stats and one-click install.',
    type: 'website',
    url: '/skills',
  },
}

// 30 min — short enough that enrichment landings show up fast, long enough
// to not hammer the DB on every page view.
export const revalidate = 1800

// One page's worth for the default SSR load. The catalog has thousands of
// published skills — fetching them all in one request took 90s+ and blew
// past the fetch timeout, silently rendering the page empty. The client
// re-fetches this same endpoint (with category/sort/search/offset) as the
// visitor interacts.
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

// Heavy fields the marketplace grid never renders — the API already strips
// these from list responses, but keep the belt-and-braces trim for leftovers.
const HEAVY = ['readme_preview', 'use_guide', 'description_original', 'name_original', 'rewritten_at', 'codeflow']
function trim(s) {
  const out = {}
  for (const k in s) if (!HEAVY.includes(k)) out[k] = s[k]
  if (out.explainer) {
    out.explainer = {
      use_case_example: out.explainer.use_case_example,
      what_you_can_make: out.explainer.what_you_can_make,
      what_it_is: out.explainer.what_it_is,
      how_it_helps: out.explainer.how_it_helps,
    }
  }
  return out
}

export default async function SkillsPage() {
  const { skills: raw, total, hasMore } = await getSkills()
  const skills = raw.map(trim)
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'WorkflowStacks Marketplace',
    description: 'Quality-gated open-source AI agents, skills, MCP servers and prompts.',
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
