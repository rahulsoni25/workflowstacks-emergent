import Link from 'next/link'
import { SITE_URL as BASE } from '@/lib/site-url'
import { breadcrumbSchema } from '@/lib/schema'
import { TYPE_CATEGORIES, FOR_CATEGORIES } from '@/lib/skill-display'
import NewsletterSignup from '@/components/NewsletterSignup'

export const revalidate = 86400

export const metadata = {
  title: 'Best open-source AI skills by category — ranked by GitHub stars | WorkflowStacks',
  description:
    'The best open-source AI agents, Claude skills, MCP servers, prompts and automations in every category, ranked by GitHub stars and this week’s star growth.',
  alternates: { canonical: '/best' },
}

async function getCounts() {
  try {
    const res = await fetch(`${BASE}/api/stats`, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return {}
    return (await res.json()).categories || {}
  } catch {
    return {}
  }
}

function Group({ title, items, counts }) {
  return (
    <section>
      <h2 className="text-2xl font-bold tracking-tight text-text-primary">{title}</h2>
      <ul className="mt-4 grid list-none gap-3 p-0 sm:grid-cols-2">
        {items.map(([slug, label]) => (
          <li key={slug}>
            <Link href={`/best/${slug}`} className="block rounded-[14px] border border-[#262B2D] bg-[#101314] px-5 py-4 no-underline transition-colors hover:border-[#C6F24E]">
              <div className="text-[16px] font-semibold text-text-primary">Best {label}</div>
              <div className="t-mono mt-0.5 text-xs text-text-muted">
                {counts[slug] ? `${Number(counts[slug]).toLocaleString('en-US')} in the catalog · ` : ''}ranked by stars →
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default async function BestIndexPage() {
  const counts = await getCounts()
  const crumbs = breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Best by category', path: '/best' }])
  return (
    <div className="min-h-screen bg-[#0A0C0D]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <div className="container mx-auto max-w-5xl px-4 py-12">
        <header className="max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary">Best AI skills by category</h1>
          <p className="mt-3 text-[15.5px] leading-relaxed text-text-muted">
            Every list is computed from GitHub data — total stars for the ranking, stars gained this week for what’s hot — and refreshed daily. No sponsored placements.
          </p>
        </header>
        <div className="mt-10 grid gap-10 lg:grid-cols-[3fr_2fr]">
          <div className="space-y-10">
            <Group title="By what it is" items={TYPE_CATEGORIES} counts={counts} />
            <Group title="By what it’s for" items={FOR_CATEGORIES} counts={counts} />
          </div>
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <NewsletterSignup source="best-page" headline="The fastest-growing, every Monday." sub="The five skills gaining the most GitHub stars each week, across every category. One email, unsubscribe anytime." />
            <p className="mt-4 text-[13.5px] text-text-muted"><Link href="/hot" className="text-[#C6F24E]">See this week’s Hot list →</Link></p>
          </aside>
        </div>
      </div>
    </div>
  )
}
