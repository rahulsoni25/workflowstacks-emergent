import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SITE_URL as BASE } from '@/lib/site-url'
import { breadcrumbSchema } from '@/lib/schema'

// Crawlable pagination for the catalog.
//
// Search Console (7 Sept 2026): every click the site has ever had came from
// /skills/* pages ranking for repo-name queries — templates, outcomes, MCP
// and blog had zero in 90 days. Impressions fell from ~2,000/week to ~16 the
// week after two changes landed together: the 29 July sitemap gate dropped
// ~1,500 catalog URLs, and the 11 August move to client-side pagination left
// the /skills index with no <a> to any skill page. The pages that earned the
// traffic lost both of Google's paths to them at once.
//
// This restores the link path. Every published skill is reachable from
// /skills → /skills/page/2 → … by plain anchors, independent of the sitemap
// gate (which still curates what we *ask* Google to prioritise). Sort is
// `newest` because it is the most stable ordering the API offers — items
// only ever enter at the front.
export const PAGE_SIZE = 48
export const revalidate = 1800
export const dynamicParams = true
export function generateStaticParams() { return [] }

async function getPage(n) {
  const offset = (n - 1) * PAGE_SIZE
  try {
    const res = await fetch(`${BASE}/api/skills?sort=newest&limit=${PAGE_SIZE}&offset=${offset}`, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return { skills: data.skills || [], total: data.total || 0 }
  } catch {
    return null
  }
}

function parsePage(raw) {
  const n = parseInt(raw, 10)
  return Number.isInteger(n) && n >= 1 ? n : null
}

export async function generateMetadata({ params }) {
  const n = parsePage(params.n)
  if (!n) return { robots: { index: false, follow: false } }
  const data = await getPage(n)
  if (!data || !data.skills.length) return { title: 'Catalog page not found | WorkflowStacks', robots: { index: false, follow: false } }
  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE))
  const title = `All AI Skills — Page ${n} of ${pages} | WorkflowStacks`
  return {
    title,
    description: `Page ${n} of the full WorkflowStacks catalog: ${data.total.toLocaleString('en-US')} open-source AI agents, Claude skills and MCP servers, each with a plain-English guide and one-click install.`,
    alternates: { canonical: `/skills/page/${n}` },
    openGraph: { title, url: `/skills/page/${n}`, type: 'website' },
  }
}

export default async function SkillsPageN({ params }) {
  const n = parsePage(params.n)
  if (!n) notFound()
  const data = await getPage(n)
  if (!data || !data.skills.length) notFound()
  const { skills, total } = data
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const prev = n === 1 ? null : n === 2 ? '/skills' : `/skills/page/${n - 1}`
  const next = n < pages ? `/skills/page/${n + 1}` : null

  const crumbs = breadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'All Skills', path: '/skills' },
    { name: `Page ${n}`, path: `/skills/page/${n}` },
  ])

  return (
    <div className="min-h-screen bg-neptune">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/skills">
            <Button variant="ghost" className="text-text-secondary hover:text-white hover:bg-white/5">
              <ArrowLeft className="w-4 h-4 mr-2" />All skills
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <p className="text-xs tracking-widest uppercase text-[#C6F24E] mb-3 font-semibold">Catalog · page {n} of {pages}</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">All AI skills, newest first</h1>
        <p className="text-text-secondary mb-10">
          {total.toLocaleString('en-US')} open-source agents, Claude skills and MCP servers. Every entry
          links to its source repository and installs with one click. Showing {(n - 1) * PAGE_SIZE + 1}–{Math.min(n * PAGE_SIZE, total)}.
        </p>

        <ol className="divide-y divide-slate-800/70" start={(n - 1) * PAGE_SIZE + 1}>
          {skills.map((s) => {
            const key = s.slug || s.id
            const desc = (s.description_human || s.description || '').replace(/\s+/g, ' ').slice(0, 160)
            return (
              <li key={key} className="py-3.5">
                <Link href={`/skills/${key}`} className="text-white font-semibold hover:text-[#C6F24E] transition-colors">
                  {s.title_human || s.name}
                </Link>
                {s.github_stars > 0 && (
                  <span className="text-xs text-text-muted ml-2">★ {Number(s.github_stars).toLocaleString('en-US')}</span>
                )}
                {desc && <p className="text-sm text-text-muted mt-0.5 leading-relaxed">{desc}</p>}
              </li>
            )
          })}
        </ol>

        <nav aria-label="Catalog pages" className="flex items-center justify-between gap-4 mt-10 pt-6 border-t border-slate-800/70">
          {prev ? (
            <Link href={prev} rel="prev" className="text-sm text-[#C6F24E] hover:text-[#A6D62E] inline-flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Previous
            </Link>
          ) : <span />}
          <span className="text-xs text-text-muted">Page {n} of {pages}</span>
          {next ? (
            <Link href={next} rel="next" className="text-sm text-[#C6F24E] hover:text-[#A6D62E] inline-flex items-center gap-1">
              Next <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : <span />}
        </nav>
      </div>
    </div>
  )
}
