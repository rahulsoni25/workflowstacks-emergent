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
    { '@type': 'Question', name: "Isn't this just GitHub with extra steps?", acceptedAnswer: { '@type': 'Answer', text: 'The opposite — we remove the steps. We read 180+ repos, score them at 8/10+, write each tool\'s usage guide (install command, quick-start, real gotcha), and let you merge the ones you pick into one paste-ready agent. You skip hours of evaluating repos and wiring prompts. The tools stay free and open-source; we delete the work around them.' } },
    { '@type': 'Question', name: "If it's free, what's the catch?", acceptedAnswer: { '@type': 'Answer', text: 'No catch. The catalog is free forever and every skill\'s source is readable line-by-line before you use it. We earn from group-buy savings on paid AI tools, done-for-you agent setups, and creator tools — never by locking the free catalog behind a paywall.' } },
    { '@type': 'Question', name: 'Will it actually work in my AI tool?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. The Builder outputs a system prompt / custom instruction that runs as-is in ChatGPT, Claude, or Gemini — paste it in and go. No API keys, no install, no code.' } },
    { '@type': 'Question', name: 'Do I need to know how to code?', acceptedAnswer: { '@type': 'Answer', text: 'No. WorkflowStacks is built for non-technical founders and marketers. You browse by outcome, pick the skills you want, and the Agent Builder generates a ready-to-paste blueprint for you.' } },
    { '@type': 'Question', name: 'How are skills chosen?', acceptedAnswer: { '@type': 'Answer', text: 'They are ingested from GitHub by trending and star count, then quality-gated — only listings that score 8/10 or higher are published. Every card shows live GitHub stars and forks, refreshed daily.' } },
    { '@type': 'Question', name: 'What are Playbooks and Personas?', acceptedAnswer: { '@type': 'Answer', text: 'Playbooks are step-by-step guides that combine AI skills to solve one specific problem. Personas are pre-configured AI agent roles for specific audiences (Founders, Agencies, Ecommerce). Both open in the Builder in one click.' } },
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
