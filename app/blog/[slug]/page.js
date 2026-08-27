import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPublishedBySlug, relatedPosts, DEFAULT_AUTHOR, TOPICS, PERSONAS } from '@/lib/blog/store'
import { renderMarkdown, assembleBody } from '@/lib/blog/markdown'
import { articleSchema, breadcrumbSchema } from '@/lib/schema'
import AnswerBox from '@/components/blog/AnswerBox'
import AssetCard from '@/components/blog/AssetCard'
import Toc from '@/components/blog/Toc'
import Prose from '@/components/blog/Prose'
import PostCard from '@/components/blog/PostCard'

export const revalidate = 3600
// Slugs come from Mongo, not a registry — render on demand.
export const dynamicParams = true
export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }) {
  const post = await getPublishedBySlug(params.slug)
  if (!post) return {}
  return {
    title: post.meta_title || post.title,
    description: post.meta_description || post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt || post.answer,
      type: 'article',
      publishedTime: post.published_at,
    },
  }
}

function fmtDate(iso) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) } catch { return '' }
}

export default async function BlogPost({ params }) {
  const post = await getPublishedBySlug(params.slug)
  if (!post) notFound()

  const body = post.body_md || assembleBody(post)
  const { html, toc } = renderMarkdown(body)
  const related = await relatedPosts(post)
  const author = post.author || DEFAULT_AUTHOR

  const article = articleSchema({
    title: post.title,
    description: post.meta_description || post.excerpt,
    url: `/blog/${post.slug}`,
    publishedAt: post.published_at,
    modifiedAt: post.refreshed_at,
    author,
    keywords: [post.seo?.primary, ...(post.seo?.secondary || [])].filter(Boolean),
  })
  const crumbs = breadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: post.title, path: `/blog/${post.slug}` },
  ])

  return (
    <div className="min-h-screen bg-[#0A0C0D]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <div className="container mx-auto px-4 py-10">
        <nav className="text-[12.5px] text-[#6E7772]">
          <Link href="/blog" className="text-[#8A938D] no-underline hover:text-[#ECEFEA]">← All articles</Link>
          <span className="mx-2">·</span>
          <span className="font-semibold uppercase tracking-widest text-[#C6F24E]">{TOPICS[post.topic] || post.topic}</span>
          {post.persona && <span className="ml-2 uppercase tracking-widest">{PERSONAS[post.persona]}</span>}
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
          <article className="min-w-0 max-w-[760px]">
            <h1 className="text-[clamp(28px,4vw,40px)] font-bold leading-tight tracking-tight text-[#ECEFEA]" style={{ textWrap: 'balance' }}>
              {post.title}
            </h1>
            <div className="mt-4 flex items-center gap-3 text-[13px] text-[#8A938D]">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C6F24E] text-[13px] font-bold text-[#0A0C0D]">
                {(author.name || 'W').slice(0, 1)}
              </span>
              <span>
                <span className="text-[#ECEFEA]">{author.name}</span> · {fmtDate(post.published_at)}
                {post.refreshed_at && <> · Updated {fmtDate(post.refreshed_at)}</>}
                {post.reading_min ? <> · {post.reading_min} min read</> : null}
              </span>
            </div>

            <AnswerBox answer={post.answer} tldr={post.tldr} />

            <div className="lg:hidden mb-6"><Toc toc={toc} /></div>

            <Prose html={html} />

            {post.key_takeaways?.length > 0 && (
              <div className="mt-10 rounded-xl border border-[#262B2D] bg-[#101314] p-6">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-[#6E7772]">Key takeaways</div>
                <ul className="mt-3 mb-0 space-y-2 pl-5 text-[14.5px] text-[#ECEFEA] list-disc">
                  {post.key_takeaways.map((t, i) => (<li key={i}>{t}</li>))}
                </ul>
              </div>
            )}

            {post.sources?.length > 0 && (
              <div className="mt-8">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-[#6E7772]">Sources</div>
                <ul className="mt-2 mb-0 space-y-1 pl-5 text-[13px] text-[#8A938D] list-disc">
                  {post.sources.map((s, i) => (
                    <li key={i}><a href={s.url} target="_blank" rel="noopener" className="text-[#8A938D] underline decoration-[#3a4144] hover:text-[#C6F24E]">{s.title || s.url}</a></li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-10 rounded-xl border border-[#262B2D] bg-[#101314] p-6">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#C6F24E] text-[16px] font-bold text-[#0A0C0D]">
                  {(author.name || 'W').slice(0, 1)}
                </span>
                <div>
                  <div className="text-[14.5px] font-semibold text-[#ECEFEA]">{author.name}</div>
                  <div className="text-[12.5px] text-[#6E7772]">{author.role}</div>
                  <p className="mt-1.5 mb-0 text-[13px] leading-relaxed text-[#8A938D]">{author.bio}</p>
                </div>
              </div>
            </div>
          </article>

          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-6">
              <Toc toc={toc} />
              <AssetCard asset={post.anchor_asset} campaign={post.slug} />
            </div>
          </aside>
        </div>

        <div className="lg:hidden mt-8 max-w-[760px]"><AssetCard asset={post.anchor_asset} campaign={post.slug} /></div>

        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="text-xl font-semibold text-[#ECEFEA]">Keep reading</h2>
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (<PostCard key={p.slug} post={p} />))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
