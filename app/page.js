import HomeClient from './HomeClient'
import { homeFaqs } from '@/lib/home-faqs'
import { SITE_URL as BASE } from '@/lib/site-url'

export const revalidate = 1800

async function getJson(path) {
  try {
    const res = await fetch(`${BASE}${path}`, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// FAQPage schema for AEO — scoped to the homepage only (not the global layout),
// so other routes can carry their own page-specific structured data. Built from
// the same list the visible accordion renders (lib/home-faqs.js).
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: homeFaqs().map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

// Only the fields the trending cards render — keeps the SSR payload light and
// never inlines heavy enrichment blobs into the homepage HTML.
function trimSkill(s) {
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    title_human: s.title_human,
    description: s.description,
    description_human: s.description_human,
    category: s.category,
    language: s.language,
    creator: s.creator,
    owner: s.owner,
    github_url: s.github_url,
    github_stars: s.github_stars,
    github_forks: s.github_forks,
    github_topics: Array.isArray(s.github_topics) ? s.github_topics.slice(0, 6) : undefined,
    rewrite_score: s.rewrite_score,
    installs: s.installs,
    is_premium: s.is_premium,
    price: s.price,
    explainer: s.explainer
      ? {
          use_case_example: s.explainer.use_case_example,
          what_it_is: s.explainer.what_it_is,
          how_it_helps: s.explainer.how_it_helps,
        }
      : undefined,
  }
}

export default async function HomePage() {
  // The homepage renders a six-card "Trending this week" rail, so ask the API
  // for exactly that instead of pulling the catalog to throw most of it away.
  const [skillsData, statsData] = await Promise.all([getJson('/api/skills?sort=trending&limit=6'), getJson('/api/stats')])
  const featured = (skillsData?.skills || []).map(trimSkill)

  // Single source of truth for the headline count: the real number of
  // published, browsable listings from /api/stats (a countDocuments(), not a
  // full fetch). HomeClient floors it to the nearest 10 so "N+" is always true.
  const stats = {
    totalSkills: statsData?.totalSkills || 0,
    publishedSkills: statsData?.publishedSkills || statsData?.totalSkills || 0,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <HomeClient initialSkills={featured} initialStats={stats} />
    </>
  )
}
