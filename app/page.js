import HomeClient from './HomeClient'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks-emergent.vercel.app'
export const revalidate = 300

async function getJson(path) {
  try {
    const res = await fetch(`${BASE}${path}`, { next: { revalidate: 300 } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// FAQPage schema for AEO — scoped to the homepage only (not the global layout),
// so other routes can carry their own page-specific structured data.
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'What is WorkflowStacks?', acceptedAnswer: { '@type': 'Answer', text: 'WorkflowStacks is a free marketplace of real, trending open-source AI skills, with a no-code agent builder, group-buy deals on AI tools, and a community of AI founders. The open-source catalog is 100% free.' } },
    { '@type': 'Question', name: 'Is WorkflowStacks free?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Browsing open-source AI skills, reading their full source, and building agents is completely free. WorkflowStacks earns from group-buy tool deals, services, and creator tools — never from the free catalog.' } },
    { '@type': 'Question', name: 'How is it different from paid AI-skill marketplaces?', acceptedAnswer: { '@type': 'Answer', text: 'Unlike paid marketplaces that hide a skill behind a buy button, WorkflowStacks shows the full real source of every free open-source tool before you use it, and lets you build a custom agent from them for free.' } },
    { '@type': 'Question', name: 'What can I build with the Agent Builder?', acceptedAnswer: { '@type': 'Answer', text: 'Pick any skills, set a goal, and the builder generates a ready-to-paste agent blueprint for Claude, ChatGPT, or Gemini — no code required.' } },
    { '@type': 'Question', name: 'What are group-buy tool deals?', acceptedAnswer: { '@type': 'Answer', text: 'Founders pool together to unlock wholesale rates (typically 40–70% off) on paid AI tools like Perplexity and n8n. You reserve a seat for free and the deal unlocks when enough founders join.' } },
  ],
}

export default async function HomePage() {
  const [skillsData, statsData, personasData, playbooksData] = await Promise.all([
    getJson('/api/skills'), getJson('/api/stats'), getJson('/api/personas'), getJson('/api/playbooks'),
  ])
  const allSkills = skillsData?.skills || []
  // Trim each card to only the fields the home grid renders, so we don't inline
  // heavy unused fields (readme_preview, use_guide, *_original) ×182 into the SSR
  // payload twice. Keeps all cards (content/SEO) while cutting parse/hydration cost.
  const skills = allSkills.map((s) => ({
    id: s.id,
    name: s.name,
    title_human: s.title_human,
    description: s.description,
    description_human: s.description_human,
    category: s.category,
    github_stars: s.github_stars,
    github_forks: s.github_forks,
    language: s.language,
    is_premium: s.is_premium,
    price: s.price,
  }))
  // Single source of truth: every headline count is the real number of published,
  // browsable items — never rounded up past what a visitor can actually see.
  const totalSkills = allSkills.length || statsData?.totalSkills || 0
  const personaCount = (personasData?.personas || []).length || 4
  const playbookCount = (playbooksData?.playbooks || []).length || 4
  const stats = { ...(statsData || {}), totalSkills, personaCount, playbookCount }

  // Server-render a featured grid (not all 182) to keep the landing HTML light /
  // fast; the full catalog stays fully crawlable at /skills + in the sitemap. The
  // client re-fetches the matching set when the visitor searches or filters.
  const featured = skills.slice(0, 24)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <HomeClient initialSkills={featured} initialStats={stats} />
    </>
  )
}
