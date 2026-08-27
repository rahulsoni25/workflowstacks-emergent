import Link from 'next/link'
import PostCard from '@/components/blog/PostCard'
import { listPublished, TOPICS } from '@/lib/blog/store'
import { breadcrumbSchema } from '@/lib/schema'

// New posts appear when their published_at passes — hourly ISR keeps the
// index fresh without a rebuild.
export const revalidate = 3600

export const metadata = {
  title: 'The WorkflowStacks Journal — n8n, MCP & AI agent guides',
  description:
    'Hands-on guides to n8n workflows, MCP servers for Claude Desktop, Claude Code, and open-source AI agents — every article checked against the actual workflow files and repos it covers.',
  alternates: { canonical: '/blog' },
}

export default async function BlogIndex({ searchParams }) {
  const topic = searchParams?.topic && TOPICS[searchParams.topic] ? searchParams.topic : null
  const page = Math.max(1, parseInt(searchParams?.page || '1', 10) || 1)
  const perPage = 24
  const { items, total } = await listPublished({ topic, limit: perPage, skip: (page - 1) * perPage })
  const [featured, ...rest] = page === 1 && !topic ? items : [null, ...items]
  const crumbs = breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }])
  const totalPages = Math.max(1, Math.ceil(total / perPage))

  return (
    <div className="min-h-screen bg-[#0A0C0D]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <div className="container mx-auto px-4 py-12">
        <header className="max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight text-[#ECEFEA]">The WorkflowStacks Journal</h1>
          <p className="mt-3 text-[15.5px] leading-relaxed text-[#A3ABA6]">
            What we built, tested and verified this week — n8n workflows, MCP configs, Claude Code, and the
            open-source agent repos worth your time. Every claim is checked against the actual files.
          </p>
        </header>

        <nav aria-label="Topics" className="mt-8 flex flex-wrap gap-2">
          <Link
            href="/blog"
            className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium no-underline ${!topic ? 'border-[#C6F24E] bg-[#C6F24E] text-[#0A0C0D]' : 'border-[#262B2D] text-[#A3ABA6] hover:text-[#ECEFEA]'}`}
          >
            All
          </Link>
          {Object.entries(TOPICS).map(([slug, label]) => (
            <Link
              key={slug}
              href={`/blog?topic=${slug}`}
              className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium no-underline ${topic === slug ? 'border-[#C6F24E] bg-[#C6F24E] text-[#0A0C0D]' : 'border-[#262B2D] text-[#A3ABA6] hover:text-[#ECEFEA]'}`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {items.length === 0 ? (
          <div className="mt-16 rounded-xl border border-[#262B2D] bg-[#101314] p-10 text-center text-[#A3ABA6]">
            No articles here yet — new ones publish daily.{' '}
            <Link href="/templates" className="text-[#C6F24E] no-underline">Browse the free templates</Link> in the meantime.
          </div>
        ) : (
          <>
            {featured && (
              <div className="mt-8">
                <PostCard post={featured} featured />
              </div>
            )}
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rest.filter(Boolean).map((p) => (<PostCard key={p.slug} post={p} />))}
            </div>
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-3 text-[13.5px]">
                {page > 1 && (
                  <Link className="rounded-lg border border-[#262B2D] px-4 py-2 text-[#A3ABA6] no-underline hover:text-[#ECEFEA]" href={`/blog?${new URLSearchParams({ ...(topic ? { topic } : {}), page: String(page - 1) })}`}>← Newer</Link>
                )}
                <span className="text-[#6E7772]">Page {page} of {totalPages}</span>
                {page < totalPages && (
                  <Link className="rounded-lg border border-[#262B2D] px-4 py-2 text-[#A3ABA6] no-underline hover:text-[#ECEFEA]" href={`/blog?${new URLSearchParams({ ...(topic ? { topic } : {}), page: String(page + 1) })}`}>Older →</Link>
                )}
              </div>
            )}
          </>
        )}

        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#262B2D] bg-[#101314] p-6">
          <div>
            <div className="text-[15px] font-semibold text-[#ECEFEA]">One useful automation in your inbox, weekly.</div>
            <div className="mt-1 text-[13px] text-[#8A938D]">The Monday digest: new templates, new articles, no filler.</div>
          </div>
          <Link href="/join" className="rounded-lg bg-[#C6F24E] px-5 py-2.5 text-[13.5px] font-semibold text-[#0A0C0D] no-underline hover:bg-[#A6D62E]">Subscribe</Link>
        </div>
      </div>
    </div>
  )
}
