import Link from 'next/link'
import { SITE_URL as BASE } from '@/lib/site-url'
import { getHotLists } from '@/lib/skills-data'
import { breadcrumbSchema } from '@/lib/schema'
import { TYPE_CATEGORIES, FOR_CATEGORIES } from '@/lib/skill-display'
import NewsletterSignup from '@/components/NewsletterSignup'
import ShareButtons from '@/components/ShareButtons'
import RankedSection from '@/components/RankedSection'

// The public face of the Monday digest. Same three lists, same data, one
// page that can be linked, shared and indexed — the email is the inbox
// version of this. 30-minute ISR; the numbers move once a day.
export const revalidate = 1800

export const metadata = {
  title: 'Hot this week — the fastest-growing open-source AI skills | WorkflowStacks',
  description:
    'The open-source AI skills, MCP servers and agents gaining the most GitHub stars this week, ranked by 7-day star growth rather than total stars. Updated daily, emailed every Monday.',
  alternates: { canonical: '/hot' },
}

// Same lists /api/hot serves, read from Mongo in-process (lib/skills-data.js).
async function getHot() {
  try {
    return await getHotLists({ revalidate: 1800 })
  } catch {
    return null
  }
}

export default async function HotPage() {
  const data = (await getHot()) || { hot: [], top: [], rising: [], share_text: '' }
  const { hot = [], top = [], rising = [] } = data
  const shareText = data.share_text || 'The fastest-growing open-source AI skills this week, ranked by GitHub star growth'
  const updated = data.generated_at ? new Date(data.generated_at) : null
  const crumbs = breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Hot this week', path: '/hot' }])
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Hot this week — fastest-growing open-source AI skills',
    description: metadata.description,
    url: `${BASE}/hot`,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    numberOfItems: hot.length,
    itemListElement: hot.map((s, i) => ({ '@type': 'ListItem', position: i + 1, name: s.title_human || s.name, url: `${BASE}/skills/${s.slug || s.id}` })),
  }

  return (
    <div className="min-h-screen bg-[#0A0C0D]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <div className="container mx-auto max-w-5xl px-4 py-12">
        <header className="max-w-2xl">
          <div className="t-mono text-[11px] font-semibold uppercase tracking-widest text-[#C6F24E]">Updated daily · emailed Mondays</div>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-text-primary">🔥 Hot this week</h1>
          <p className="mt-3 text-[15.5px] leading-relaxed text-text-muted">
            The open-source AI skills, MCP servers and agents gaining the most GitHub stars in the last 7 days. Ranked by growth, not total stars,
            so a two-week-old repo can beat a ten-thousand-star one. Built from daily star snapshots of every repo in the catalog.
          </p>
          <ShareButtons text={shareText} url={`${BASE}/hot?ref=share`} className="mt-5" />
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[3fr_2fr]">
          <div className="space-y-10">
            <RankedSection
              title="Fastest-growing"
              hint="Stars gained in the last 7 days"
              items={hot}
              rank
              showVelocity
              empty="Velocity data is still accumulating — the first ranking appears once a week of star snapshots exists. Check back in a few days."
            />
            <RankedSection title="⭐ Top overall" hint="Most GitHub stars, excluding this week’s Hot picks" items={top} rank />
            <RankedSection title="🌱 New & rising" hint="Added to the catalog in the last 30 days" items={rising} />
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <NewsletterSignup
              source="hot-list"
              headline="Get this list every Monday."
              sub="Plus the top overall and what’s new. One email a week, unsubscribe anytime."
              showDailyOption
            />
            <div className="rounded-xl border border-[#262B2D] bg-[#101314] p-5 text-[13.5px] text-text-muted">
              <div className="font-semibold text-text-primary">Past issues</div>
              <p className="mt-1">Every Monday’s list is archived. <Link href="/newsletter" className="text-[#C6F24E]">Browse the archive →</Link></p>
              <div className="mt-4 font-semibold text-text-primary">Best by category</div>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {[...TYPE_CATEGORIES, ...FOR_CATEGORIES].map(([slug, label]) => (
                  <li key={slug}>
                    <Link href={`/best/${slug}`} className="rounded-full border border-[#262B2D] px-2.5 py-1 text-xs text-text-muted no-underline hover:border-[#C6F24E]/50 hover:text-[#C6F24E]">{label}</Link>
                  </li>
                ))}
              </ul>
              <div className="mt-4 font-semibold text-text-primary">Are you a creator?</div>
              <p className="mt-1">Featured repos get a README badge and a one-time note from us, sent to the public email on the GitHub profile.</p>
            </div>
          </aside>
        </div>

        {updated && (
          <p className="t-mono mt-10 text-xs text-text-muted">Last computed {updated.toUTCString()}. Source: GitHub API star counts, snapshotted daily by WorkflowStacks.</p>
        )}
      </div>
    </div>
  )
}
