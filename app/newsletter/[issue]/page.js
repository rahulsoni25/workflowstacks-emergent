import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SITE_URL as BASE } from '@/lib/site-url'
import { breadcrumbSchema } from '@/lib/schema'
import NewsletterSignup from '@/components/NewsletterSignup'
import ShareButtons from '@/components/ShareButtons'
import RankedSection from '@/components/RankedSection'

// One archived Monday issue, rendered from the lists stored at send time.
export const revalidate = 3600
export const dynamicParams = true
export function generateStaticParams() { return [] }

const ISSUE_RE = /^\d{4}-\d{2}-\d{2}$/

async function getIssue(issue) {
  if (!ISSUE_RE.test(issue)) return null
  try {
    const res = await fetch(`${BASE}/api/newsletter/issues/${issue}`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return null
    return (await res.json()).issue || null
  } catch {
    return null
  }
}

function fmtIssueDate(issue) {
  try {
    return new Date(`${issue}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
  } catch {
    return issue
  }
}

export async function generateMetadata({ params }) {
  const doc = await getIssue(params.issue)
  if (!doc) return { title: 'Issue not found | WorkflowStacks Weekly' }
  const hot = doc.items?.hot || []
  const names = hot.slice(0, 3).map((s) => s.title_human || s.name).join(', ')
  return {
    title: `WorkflowStacks Weekly — ${fmtIssueDate(doc.issue)}`,
    description: names
      ? `Hot this week: ${names}. The open-source AI skills gaining the most GitHub stars in the week of ${fmtIssueDate(doc.issue)}, plus the top overall and what’s new.`
      : `The Monday digest for ${fmtIssueDate(doc.issue)}.`,
    alternates: { canonical: `/newsletter/${doc.issue}` },
  }
}

export default async function IssuePage({ params }) {
  const doc = await getIssue(params.issue)
  if (!doc) notFound()
  const hot = doc.items?.hot || []
  const top = doc.items?.top || []
  const rising = doc.items?.rising || []
  const crumbs = breadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Newsletter', path: '/newsletter' },
    { name: fmtIssueDate(doc.issue), path: `/newsletter/${doc.issue}` },
  ])
  return (
    <div className="min-h-screen bg-[#0A0C0D]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <div className="container mx-auto max-w-5xl px-4 py-12">
        <header className="max-w-2xl">
          <div className="t-mono text-[11px] font-semibold uppercase tracking-widest text-[#C6F24E]">
            <Link href="/newsletter" className="hover:underline">WorkflowStacks Weekly</Link> · {fmtIssueDate(doc.issue)}
          </div>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-text-primary">{doc.subject || 'The Monday digest'}</h1>
          <p className="mt-3 text-[15.5px] leading-relaxed text-text-muted">
            Ranked by GitHub stars gained in the 7 days before this issue went out, not total stars. Star counts below are as of the send.
          </p>
          {doc.share_text && <ShareButtons text={doc.share_text} url={`${BASE}/newsletter/${doc.issue}?ref=share`} className="mt-5" />}
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[3fr_2fr]">
          <div className="space-y-10">
            <RankedSection title="🔥 Hot this week" hint="Stars gained in 7 days" items={hot} rank showVelocity empty="No velocity data was available for this issue." />
            <RankedSection title="⭐ Top overall" items={top} rank />
            <RankedSection title="🌱 New & rising" items={rising} />
          </div>
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <NewsletterSignup source="newsletter-page" headline="Get the next issue." sub="Sent Monday mornings. Unsubscribe in one click." showDailyOption />
            <p className="text-[13.5px] text-text-muted">
              <Link href="/hot" className="text-[#C6F24E]">This week’s live list →</Link>
              <br />
              <Link href="/newsletter" className="text-[#C6F24E]">All past issues →</Link>
            </p>
          </aside>
        </div>
      </div>
    </div>
  )
}
