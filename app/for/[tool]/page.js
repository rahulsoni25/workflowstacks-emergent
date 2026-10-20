import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SITE_URL as BASE } from '@/lib/site-url'
import { breadcrumbSchema } from '@/lib/schema'
import { INSTALL_TARGETS, getInstallTarget } from '@/lib/install-targets'
import { categoryLabel } from '@/lib/skill-display'
import { isAiRelevant, qualityRank } from '@/lib/skill-relevance'
import NewsletterSignup from '@/components/NewsletterSignup'
import RankedSection from '@/components/RankedSection'

// Per-tool hubs: "Open-source AI skills for Claude Code", one per entry in
// lib/install-targets.js. Same shape and cost profile as /best/[category]:
// rendered on first request, refreshed weekly, two or three catalog fetches.
// See lib/install-targets.js for why these pages exist.
export const revalidate = 604800
export const dynamicParams = true
export function generateStaticParams() { return [] }

async function getJson(path) {
  try {
    const res = await fetch(`${BASE}${path}`, { next: { revalidate: 604800 }, signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }) {
  const t = getInstallTarget(params.tool)
  if (!t) return { title: 'Not found | WorkflowStacks', robots: { index: false, follow: true } }
  return {
    title: `Open-Source AI Skills for ${t.name} | WorkflowStacks`,
    description: `${t.blurb} Ranked by quality, with a plain-English guide and the install path for ${t.name} on every listing. Free.`.slice(0, 165),
    alternates: { canonical: `/for/${t.slug}` },
  }
}

export default async function ForToolPage({ params }) {
  const t = getInstallTarget(params.tool)
  if (!t) notFound()

  // One list request per category the tool installs, plus the Hot feed. The
  // merge below ranks on our own rewrite quality and guide depth first, so a
  // small, well-documented tool outranks a famous repo with a thin page — the
  // ordering Search Console rewards (docs/INDEXING-DIAGNOSIS.md §1).
  const [lists, hotData] = await Promise.all([
    Promise.all(t.categories.map((c) => getJson(`/api/skills?category=${encodeURIComponent(c)}&sort=popular&limit=24`))),
    getJson('/api/hot'),
  ])
  const seen = new Set()
  const pool = []
  for (const l of lists) {
    for (const s of l?.skills || []) {
      if (seen.has(s.id) || s.dead_repo || !s.slug) continue
      seen.add(s.id)
      pool.push(s)
    }
  }
  const top = pool.filter((s) => isAiRelevant(s)).sort((a, b) => qualityRank(b) - qualityRank(a)).slice(0, 20)
  const cats = new Set(t.categories)
  const hot = (hotData?.hot || []).filter((s) => cats.has(s.category) && s.slug).slice(0, 5)
  const rising = (hotData?.rising || []).filter((s) => cats.has(s.category) && s.slug).slice(0, 5)
  const total = lists.reduce((n, l) => n + (Number(l?.total) || 0), 0)
  const others = INSTALL_TARGETS.filter((x) => x.slug !== t.slug)

  const crumbs = breadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'By tool', path: '/for' },
    { name: `For ${t.name}`, path: `/for/${t.slug}` },
  ])
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Open-source AI skills for ${t.name}`,
    url: `${BASE}/for/${t.slug}`,
    numberOfItems: top.length,
    itemListElement: top.map((s, i) => ({ '@type': 'ListItem', position: i + 1, name: s.title_human || s.name, url: `${BASE}/skills/${s.slug}` })),
  }

  return (
    <div className="min-h-screen bg-[#0A0C0D]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <div className="container mx-auto max-w-5xl px-4 py-12">
        <header className="max-w-2xl">
          <div className="t-mono text-[11px] font-semibold uppercase tracking-widest text-[#C6F24E]">
            <Link href="/for" className="hover:underline">By tool</Link> · {t.kind}
          </div>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-text-primary">Open-source AI skills for {t.name}</h1>
          <p className="mt-3 text-[15.5px] leading-relaxed text-text-muted">
            {t.blurb}{' '}
            {total ? `${total.toLocaleString('en-US')} listings in the catalog install into ${t.name}; ` : ''}
            the ones below rank on the depth of the guide we wrote and how well the listing reads, not on GitHub stars alone.
          </p>
        </header>

        <section className="mt-8 rounded-xl border border-[#262B2D] bg-[#101314] p-5">
          <h2 className="m-0 text-[13.5px] font-semibold text-text-primary">How a listing gets into {t.name}</h2>
          <ul className="mt-3 space-y-2.5">
            {t.paths.map((p) => (
              <li key={p.label} className="text-[13.5px] text-text-muted">
                {p.label}
                {p.code && <pre className="mt-1.5 overflow-x-auto rounded-md border border-[#262B2D] bg-[#0A0C0D] px-3 py-2 text-[12.5px] text-text-secondary">{p.code}</pre>}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] text-text-muted">Every listing page has the matching button and shows what the install needs (keys, runtimes, desktop apps) before you click.</p>
        </section>

        <div className="mt-10 grid gap-10 lg:grid-cols-[3fr_2fr]">
          <div className="space-y-10">
            <RankedSection
              title={`Best for ${t.name}`}
              hint="Guide depth, then stars"
              items={top}
              rank
              empty={`No published listings for ${t.name} yet.`}
            />
            <RankedSection title={`🔥 Hot this week for ${t.name}`} hint="Stars gained in 7 days" items={hot} rank showVelocity />
            <RankedSection title={`🌱 New for ${t.name}`} hint="Added recently" items={rising} />
          </div>
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <NewsletterSignup
              source="for-tool"
              headline={`New skills for ${t.name}, every Monday.`}
              sub="The five skills gaining the most GitHub stars each week. One email, unsubscribe anytime."
            />
            <div className="rounded-xl border border-[#262B2D] bg-[#101314] p-5">
              <div className="text-[13.5px] font-semibold text-text-primary">By type</div>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {t.categories.map((c) => (
                  <li key={c}>
                    <Link href={`/best/${c}`} className="rounded-full border border-[#262B2D] px-2.5 py-1 text-xs text-text-muted no-underline hover:border-[#C6F24E]/50 hover:text-[#C6F24E]">Best {categoryLabel(c)}</Link>
                  </li>
                ))}
              </ul>
              {t.related?.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {t.related.map((r) => (
                    <li key={r.href}><Link href={r.href} className="text-[13px] text-[#C6F24E]">{r.label} →</Link></li>
                  ))}
                </ul>
              )}
              <div className="mt-5 text-[13.5px] font-semibold text-text-primary">Other tools</div>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {others.map((x) => (
                  <li key={x.slug}>
                    <Link href={`/for/${x.slug}`} className="rounded-full border border-[#262B2D] px-2.5 py-1 text-xs text-text-muted no-underline hover:border-[#C6F24E]/50 hover:text-[#C6F24E]">{x.name}</Link>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[13px] text-text-muted">
                <Link href="/skills" className="text-[#C6F24E]">Browse the whole catalog →</Link>
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
