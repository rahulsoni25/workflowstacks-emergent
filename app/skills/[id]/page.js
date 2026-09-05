import { notFound, permanentRedirect } from 'next/navigation'
import SkillDetailClient from './SkillDetailClient'
import { relatedBundle } from '@/lib/bundles'
import { buildCodeflow, summarize } from '@/lib/codeflow'
import { SITE_URL as BASE } from '@/lib/site-url'

// Note: invalid skill IDs render the not-found UI with HTTP 200 (a Next.js 14
// App Router limitation — notFound() doesn't emit a 404 status under ISR, and
// force-dynamic doesn't change it while tripling TTFB on valid pages). The
// not-found page emits <meta robots noindex>, so crawlers won't index these
// phantom URLs — the practical SEO impact is nil. Keeping ISR for fast pages.

// ISR. Without generateStaticParams a dynamic segment is server-rendered on
// EVERY request (verified live 2026-08-17: Cache-Control private/no-store,
// X-Vercel-Cache MISS on repeat GETs) — the 2026-08-11 CPU/transfer overage
// assumed ISR was in effect; it wasn't. An empty param list + revalidate makes
// each slug render on first hit, then serve from the edge cache for an hour.
export const revalidate = 86400
export const dynamicParams = true
export function generateStaticParams() { return [] }

// Sibling skills in the same category, for the "Related skills" cross-link module.
async function getRelated(skill) {
  try {
    const res = await fetch(`${BASE}/api/skills?category=${encodeURIComponent(skill.category)}&sort=popular&limit=7`, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return []
    const data = await res.json()
    return (data.skills || [])
      .filter((s) => s.id !== skill.id)
      .slice(0, 6)
  } catch {
    return []
  }
}

async function getSkill(id) {
  try {
    // Content only actually changes once/day (06:00 UTC refresh-content.yml cron),
    // so a 5 min window bought no real freshness — it just forced this page to
    // regenerate on almost every crawler/bot visit, which was the direct cause of
    // a 0% edge-cache-hit rate and blew past the Vercel Hobby Fast Origin
    // Transfer / Fluid Active CPU limits (2026-08-11). 1h keeps pages reasonably
    // fresh while cutting regeneration frequency ~12x.
    const res = await fetch(`${BASE}/api/skills/${id}`, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return null
    const data = await res.json()
    return data.skill || null
  } catch {
    return null
  }
}

function ghHeaders() {
  const h = { Accept: 'application/vnd.github+json', 'User-Agent': 'WorkflowStacks' }
  if (process.env.GITHUB_TOKEN) h.Authorization = `token ${process.env.GITHUB_TOKEN}`
  return h
}

// "Read the source" spec sheet — fetch the repo's file tree + facts so visitors
// can fully inspect what's inside, FREE (vs rivals' pay-to-inspect black box).
// Cached 24h via ISR; degrades gracefully on rate-limit/failure.
async function getSourceSpec(githubUrl) {
  if (!githubUrl) return null
  const m = githubUrl.match(/github\.com\/([^/]+)\/([^/#?]+)/i)
  if (!m) return null
  const owner = m[1]
  const repo = m[2].replace(/\.git$/, '')
  try {
    const [metaRes, contentsRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: ghHeaders(), next: { revalidate: 86400 } }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/contents`, { headers: ghHeaders(), next: { revalidate: 86400 } }),
    ])
    if (!metaRes.ok || !contentsRes.ok) return null
    const meta = await metaRes.json()
    const contents = await contentsRes.json()
    if (!Array.isArray(contents)) return null
    const tree = contents
      .map((c) => ({ name: c.name, type: c.type, size: c.size || 0 }))
      .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1))
    const notable = tree
      .filter((t) => t.type === 'file')
      .filter((t) => /readme|skill|agent|prompt|config|package\.json|requirements|main|index/i.test(t.name))
      .slice(0, 6)
      .map((t) => t.name)
    return {
      owner,
      repo,
      htmlUrl: meta.html_url,
      defaultBranch: meta.default_branch,
      fileCount: tree.filter((t) => t.type === 'file').length,
      dirCount: tree.filter((t) => t.type === 'dir').length,
      sizeKB: meta.size || 0,
      language: meta.language || null,
      license: meta.license?.spdx_id && meta.license.spdx_id !== 'NOASSERTION' ? meta.license.spdx_id : meta.license?.name || null,
      openIssues: meta.open_issues_count ?? null,
      pushedAt: meta.pushed_at || null,
      tree: tree.slice(0, 24),
      notable,
    }
  } catch {
    return null
  }
}

// Codeflow ("How it works"): prefer the stored, LLM-enriched version written by
// /api/codeflow (daily Action). Fall back to a live deterministic build so
// every page has it before the backfill finishes. GitHub responses cached 24h.
async function getCodeflow(skill) {
  const name = skill.title_human || skill.name
  const stored = skill.codeflow
  // Accept any stored version that has real data (older versions are
  // refreshed by the daily job — never trigger 2,000 live rebuilds on a bump).
  if (stored && typeof stored === 'object' && stored.size?.files > 0 && stored.version >= 1) {
    return { ...stored, summary: summarize(stored, name) || stored.summary || null }
  }
  if (!skill.github_url) return null
  // The job already tried and failed (dead/private/empty repo) → don't retry
  // on every render. Long tail (<50★) waits for the job too: no traffic, and
  // it protects the GitHub budget for pages people actually open.
  if (skill.codeflow_at && !stored) return null
  if ((skill.github_stars || 0) < 50) return null
  // Live build (page not yet backfilled). Trees over ~2MB can't enter Next's
  // data cache, so very large repos (>60MB) wait for the stored version too.
  const cf = await buildCodeflow(skill.github_url, { category: skill.category, installHint: skill.use_guide?.install, maxSizeKB: 60_000, fetchOpts: { next: { revalidate: 86400 } } })
  if (!cf) return null
  return { ...cf, summary: summarize(cf, name) }
}

// Trim to a clean snippet. Prefer ending on a complete sentence; otherwise cut on
// a word boundary and append … — never mid-word or on a dangling preposition.
function clip(text, max = 160) {
  const t = (text || '').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max - 1)
  const sentenceEnd = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '))
  if (sentenceEnd > max * 0.55) return cut.slice(0, sentenceEnd + 1)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > max * 0.55 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-]+$/, '') + '…'
}

// Per-skill SEO: unique title, description, canonical, and OG/Twitter tags
export async function generateMetadata({ params }) {
  const skill = await getSkill(params.id)
  // Throw the not-found here too (not just in the page) so Next emits a real 404
  // status for unknown skill ids instead of a soft-404 200 (Next 14.2 quirk).
  if (!skill) notFound()
  const name = skill.title_human || skill.name
  // Add the install intent when the result stays within a typical SERP title
  // width; long tool names fall back to the plain pattern.
  const withIntent = `${name} for Claude, ChatGPT & Gemini | WorkflowStacks`
  const title = withIntent.length <= 65 ? withIntent : `${name} | WorkflowStacks`
  const description = clip(skill.description_human || skill.description || '')
  const url = `/skills/${skill.slug || skill.id}`
  return {
    title,
    description,
    alternates: { canonical: url },
    // No explicit `images`: the sibling opengraph-image.js renders a per-skill
    // card, and listing the generic site-wide /opengraph-image here overrode
    // it — every shared skill link showed the same anonymous preview.
    openGraph: { title, description, type: 'article', url },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function SkillDetailPage({ params }) {
  const skill = await getSkill(params.id)
  if (!skill) notFound()
  // 308 permanent redirect UUID URLs to the canonical slug URL (preserves
  // backlinks + tells search engines to update their index)
  if (skill.slug && params.id !== skill.slug && /^[0-9a-f-]{36}$/i.test(params.id)) {
    permanentRedirect(`/skills/${skill.slug}`)
  }
  const [codeflow, related] = await Promise.all([getCodeflow(skill), getRelated(skill)])
  // Legacy spec sheet only when Codeflow could not be built (rate-limit etc.)
  const sourceSpec = codeflow ? null : await getSourceSpec(skill.github_url)

  // Structured data for rich results
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: skill.title_human || skill.name,
    description: skill.description_human || skill.description,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: skill.price || 0, priceCurrency: 'USD' },
    // The entity URL is OUR canonical page; the upstream repo is sameAs
    // (codeRepository below when known). Pointing url at GitHub told search
    // engines the canonical home of this software was a third-party site.
    url: `${BASE}/skills/${skill.slug || skill.id}`,
    image: `${BASE}/opengraph-image`,
    ...(skill.github_url ? { sameAs: [skill.github_url] } : {}),
    ...(skill.creator ? { author: { '@type': 'Person', name: skill.creator } } : {}),
    ...(codeflow?.languages?.length ? { programmingLanguage: codeflow.languages.map((l) => l.name) } : {}),
    ...(codeflow?.repo?.html_url ? { codeRepository: codeflow.repo.html_url } : {}),
    ...(codeflow?.repo?.pushed_at ? { dateModified: codeflow.repo.pushed_at } : {}),
    ...(codeflow?.runtime?.length ? { softwareRequirements: codeflow.runtime.join(', ') } : {}),
    ...(codeflow?.signals?.license && /^[A-Za-z0-9.+-]+$/.test(codeflow.signals.license) && codeflow.signals.license !== 'Other'
      ? { license: `https://spdx.org/licenses/${codeflow.signals.license}.html` } : {}),
  }

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Skills', item: `${BASE}/skills` },
      { '@type': 'ListItem', position: 3, name: skill.title_human || skill.name, item: `${BASE}/skills/${skill.slug || skill.id}` },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <SkillDetailClient skill={skill} sourceSpec={sourceSpec} codeflow={codeflow} related={related} bundle={relatedBundle(skill)} />
    </>
  )
}
