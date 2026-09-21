import Link from 'next/link'
import { BadgeCheck, Github } from 'lucide-react'
import { SITE_URL as BASE } from '@/lib/site-url'
import { breadcrumbSchema, itemListSchema } from '@/lib/schema'
import { listCreators } from '@/lib/creators'
import CreatorsBrowser, { CreatorCard } from '@/components/creators/CreatorsBrowser'
import InviteCapture from '@/components/creators/InviteCapture'

// The people behind the catalog. Built from the GitHub owner already stored on
// every skill, so it grows with the daily ingest. Reads Mongo directly rather
// than self-fetching the API (one function invocation per regen, not two).
export const revalidate = 3600

export const metadata = {
  title: 'Creators — the builders behind the open-source AI skills catalog | WorkflowStacks',
  description:
    'Every developer and team whose open-source AI skills, MCP servers and agents are listed on WorkflowStacks. Find your GitHub username and claim your creator page with a README badge.',
  alternates: { canonical: '/creators' },
}

const INITIAL = 120

async function getData() {
  try {
    return await listCreators()
  } catch (e) {
    console.error('creators page', e)
    return { creators: [], total: 0, verified: 0 }
  }
}

export default async function CreatorsPage() {
  const { creators, total, verified } = await getData()
  const verifiedList = creators.filter((c) => c.verified)
  const initial = creators.filter((c) => !c.verified).slice(0, INITIAL)
  const crumbs = breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Creators', path: '/creators' }])
  const itemList = itemListSchema({
    name: 'Creators on WorkflowStacks',
    description: metadata.description,
    url: '/creators',
    items: [...verifiedList, ...initial].slice(0, 50).map((c) => ({
      name: c.handle,
      url: c.verified || c.skills > 1 ? `${BASE}/creators/${c.handle.toLowerCase()}` : `${BASE}/skills/${c.top_slug}`,
    })),
  })

  return (
    <div className="min-h-screen bg-[#0A0C0D]">
      <InviteCapture />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <div className="container mx-auto max-w-5xl px-4 py-12">
        <header className="max-w-2xl">
          <div className="t-mono text-[11px] font-semibold uppercase tracking-widest text-[#C6F24E]">
            {total.toLocaleString('en-US')} listed · {verified.toLocaleString('en-US')} verified
          </div>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-text-primary">Creators</h1>
          <p className="mt-3 text-[15.5px] leading-relaxed text-text-muted">
            The developers and teams whose open-source AI skills, MCP servers and agents make up this catalog.
            <strong className="text-text-primary"> Listed</strong> means we added their public GitHub project ourselves.
            <strong className="text-text-primary"> Verified</strong> <BadgeCheck className="inline h-4 w-4 -translate-y-px text-[#C6F24E]" /> means
            the creator claimed their page by adding our badge to their README.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="#find" className="rounded-lg bg-[#C6F24E] px-4 py-2 text-sm font-semibold text-[#0A0C0D] no-underline hover:bg-[#d4f76e]">Find &amp; claim your page</a>
            <Link href="/submit" className="inline-flex items-center gap-2 rounded-lg border border-[#262B2D] px-4 py-2 text-sm text-text-primary no-underline hover:border-[#C6F24E]/40">
              <Github className="h-4 w-4" />Not listed? Submit a repo
            </Link>
          </div>
        </header>

        {verifiedList.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-semibold text-text-primary">Verified creators</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {verifiedList.map((c) => <CreatorCard key={c.handle} c={c} />)}
            </div>
          </section>
        )}

        <section id="find" className="mt-12 scroll-mt-24">
          <h2 className="text-xl font-semibold text-text-primary">Everyone in the catalog</h2>
          <p className="mt-1 text-sm text-text-muted">Sorted by number of listed projects, then GitHub stars.</p>
          <div className="mt-5">
            <CreatorsBrowser initial={initial} total={total - verifiedList.length} />
          </div>
        </section>

        <section className="mt-14 grid gap-4 md:grid-cols-3">
          {[
            ['Free to be here', 'Listing open-source work costs nothing. Every listing links straight to your GitHub repo.'],
            ['Keep 85% on paid', 'Sell a paid agent built on your skill and keep 85% of each sale, paid out through Stripe.'],
            ['Found by agents', 'The catalog is searchable from inside Claude and other agents through our MCP server.'],
          ].map(([h, p]) => (
            <div key={h} className="rounded-xl border border-[#262B2D] bg-[#101314] p-5">
              <div className="font-semibold text-text-primary">{h}</div>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-text-muted">{p}</p>
            </div>
          ))}
        </section>

        <p className="mt-10 text-[13px] text-text-muted">
          Listed here and would rather not be? Email <a href="mailto:hello@workflowstacks.com" className="text-[#C6F24E]">hello@workflowstacks.com</a> and we will remove your page.
        </p>
      </div>
    </div>
  )
}
