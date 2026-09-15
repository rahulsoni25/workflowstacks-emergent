import Link from 'next/link'
import { SITE_URL as BASE } from '@/lib/site-url'
import { breadcrumbSchema } from '@/lib/schema'
import NewsletterSignup from '@/components/NewsletterSignup'

// Public archive of the Monday digest. Archived issues rank for the skill
// names they contain and give the signup form proof the newsletter exists.
export const revalidate = 1800

export const metadata = {
  title: 'WorkflowStacks Weekly — the Monday digest of fast-growing AI skills',
  description:
    'Every Monday: the five open-source AI skills gaining the most GitHub stars that week, the top overall, and what’s new. Read past issues and subscribe.',
  alternates: { canonical: '/newsletter' },
}

async function getIssues() {
  try {
    const res = await fetch(`${BASE}/api/newsletter/issues`, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return []
    return (await res.json()).issues || []
  } catch {
    return []
  }
}

function fmtIssueDate(issue) {
  try {
    return new Date(`${issue}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
  } catch {
    return issue
  }
}

export default async function NewsletterPage() {
  const issues = await getIssues()
  const crumbs = breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Newsletter', path: '/newsletter' }])
  return (
    <div className="min-h-screen bg-[#0A0C0D]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <div className="container mx-auto max-w-5xl px-4 py-12">
        <div className="grid gap-10 lg:grid-cols-[3fr_2fr]">
          <div>
            <header className="max-w-2xl">
              <div className="t-mono text-[11px] font-semibold uppercase tracking-widest text-[#C6F24E]">Every Monday</div>
              <h1 className="mt-2 text-4xl font-bold tracking-tight text-text-primary">WorkflowStacks Weekly</h1>
              <p className="mt-3 text-[15.5px] leading-relaxed text-text-muted">
                One email a week with three lists, all computed from GitHub data rather than picked by hand:
              </p>
              <ul className="mt-4 space-y-2 text-[14.5px] text-text-secondary">
                <li><span className="font-semibold text-text-primary">🔥 Hot this week</span> — the five skills that gained the most stars in the last 7 days.</li>
                <li><span className="font-semibold text-text-primary">⭐ Top overall</span> — the most-starred skills in the catalog, minus the Hot picks.</li>
                <li><span className="font-semibold text-text-primary">🌱 New &amp; rising</span> — what was added in the last 30 days and is already moving.</li>
              </ul>
              <p className="mt-4 text-[14px] text-text-muted">
                See <Link href="/hot" className="text-[#C6F24E]">this week’s list</Link> before you subscribe.
              </p>
            </header>

            <section className="mt-12">
              <h2 className="text-2xl font-bold tracking-tight text-text-primary">Past issues</h2>
              {issues.length ? (
                <ol className="mt-4 list-none divide-y divide-[#262B2D] rounded-[14px] border border-[#262B2D] bg-[#101314] p-0">
                  {issues.map((it) => (
                    <li key={it.issue} className="px-5 py-4">
                      <Link href={`/newsletter/${it.issue}`} className="text-[16px] font-semibold text-text-primary hover:text-[#C6F24E]">
                        {fmtIssueDate(it.issue)}
                      </Link>
                      {it.subject && <div className="mt-0.5 text-[13.5px] text-text-secondary">{it.subject}</div>}
                      {it.hot_preview?.length > 0 && (
                        <div className="t-mono mt-1.5 text-xs text-text-muted">
                          {it.hot_preview.map((s, i) => `${i + 1}. ${s.name}${s.velocity_7d ? ` (+${s.velocity_7d}★)` : ''}`).join(' · ')}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-4 rounded-[14px] border border-[#262B2D] bg-[#101314] px-5 py-6 text-sm text-text-muted">
                  The first issue goes out on the next Monday. Until then, <Link href="/hot" className="text-[#C6F24E]">the live list</Link> shows exactly what it will contain.
                </p>
              )}
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <NewsletterSignup
              source="newsletter-page"
              headline="Get the next issue."
              sub="Sent Monday mornings. No filler, no sponsored placements, unsubscribe in one click."
              showDailyOption
            />
          </aside>
        </div>
      </div>
    </div>
  )
}
