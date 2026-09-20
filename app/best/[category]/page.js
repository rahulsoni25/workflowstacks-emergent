import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SITE_URL as BASE } from '@/lib/site-url'
import { listSkills, getHotLists } from '@/lib/skills-data'
import { breadcrumbSchema } from '@/lib/schema'
import { TYPE_CATEGORIES, FOR_CATEGORIES } from '@/lib/skill-display'
import NewsletterSignup from '@/components/NewsletterSignup'
import RankedSection from '@/components/RankedSection'

// Programmatic "best of" roundups, one per catalog category. They rank for
// "best <category> …" queries, link 20+ skill pages each (the crawl found
// most skill pages hanging off a single link), and carry the signup form.
// Rendered on first request and refreshed daily, like skill pages.
export const revalidate = 86400
export const dynamicParams = true
export function generateStaticParams() { return [] }

const ALL = [...TYPE_CATEGORIES, ...FOR_CATEGORIES]
const LABELS = Object.fromEntries(ALL)

// Direct Mongo reads (lib/skills-data.js) — no self-calls to /api/skills
// and /api/hot on each daily regeneration.
async function safe(promise) {
  try {
    return await promise
  } catch {
    return null
  }
}

function monthYear() {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export async function generateMetadata({ params }) {
  const label = LABELS[params.category]
  if (!label) return { title: 'Not found | WorkflowStacks' }
  return {
    title: `Best ${label} AI skills (${monthYear()}) — ranked by GitHub stars | WorkflowStacks`,
    description: `The best open-source ${label.toLowerCase()} on WorkflowStacks, ranked by GitHub stars, plus the ones gaining the most stars this week and what’s new. Updated daily from the GitHub API.`,
    alternates: { canonical: `/best/${params.category}` },
  }
}

export default async function BestCategoryPage({ params }) {
  const category = params.category
  const label = LABELS[category]
  if (!label) notFound()

  const [list, hotData] = await Promise.all([
    safe(listSkills({ category, sort: 'popular', limit: 20 }, { revalidate: 86400 })),
    safe(getHotLists({ category, revalidate: 86400 })),
  ])
  const top = (list?.skills || []).filter((s) => !s.dead_repo)
  const hot = (hotData?.hot || []).slice(0, 5)
  const rising = (hotData?.rising || []).slice(0, 5)
  const total = list?.total || top.length

  const crumbs = breadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Best by category', path: '/best' },
    { name: `Best ${label}`, path: `/best/${category}` },
  ])
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Best ${label} AI skills, ranked by GitHub stars`,
    url: `${BASE}/best/${category}`,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    numberOfItems: top.length,
    itemListElement: top.map((s, i) => ({ '@type': 'ListItem', position: i + 1, name: s.title_human || s.name, url: `${BASE}/skills/${s.slug || s.id}` })),
  }
  const others = ALL.filter(([slug]) => slug !== category)

  return (
    <div className="min-h-screen bg-[#0A0C0D]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <div className="container mx-auto max-w-5xl px-4 py-12">
        <header className="max-w-2xl">
          <div className="t-mono text-[11px] font-semibold uppercase tracking-widest text-[#C6F24E]">
            <Link href="/best" className="hover:underline">Best by category</Link> · {monthYear()}
          </div>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-text-primary">Best {label} AI skills</h1>
          <p className="mt-3 text-[15.5px] leading-relaxed text-text-muted">
            {total ? `${Number(total).toLocaleString('en-US')} open-source ${label.toLowerCase()} in the catalog, ` : `Open-source ${label.toLowerCase()}, `}
            ranked by GitHub stars and refreshed daily. The Hot section uses stars gained in the last 7 days, so newer repos can appear there before they reach the top list.
          </p>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[3fr_2fr]">
          <div className="space-y-10">
            <RankedSection title={`🔥 Hot in ${label} this week`} hint="Stars gained in 7 days" items={hot} rank showVelocity />
            <RankedSection
              title={`⭐ Top ${label} by stars`}
              hint="Total GitHub stars"
              items={top}
              rank
              empty="No published skills in this category yet."
            />
            <RankedSection title={`🌱 New in ${label}`} hint="Added in the last 30 days" items={rising} />
          </div>
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <NewsletterSignup
              source="best-page"
              headline={`New ${label.toLowerCase()} worth knowing, every Monday.`}
              sub="The five skills gaining the most GitHub stars each week, across every category. One email, unsubscribe anytime."
            />
            <div className="rounded-xl border border-[#262B2D] bg-[#101314] p-5">
              <div className="text-[13.5px] font-semibold text-text-primary">Other categories</div>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {others.map(([slug, l]) => (
                  <li key={slug}>
                    <Link href={`/best/${slug}`} className="rounded-full border border-[#262B2D] px-2.5 py-1 text-xs text-text-muted no-underline hover:border-[#C6F24E]/50 hover:text-[#C6F24E]">{l}</Link>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[13px] text-text-muted">
                <Link href={`/skills?category=${encodeURIComponent(category)}`} className="text-[#C6F24E]">Browse all {label.toLowerCase()} →</Link>
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
