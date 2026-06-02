import { notFound } from 'next/navigation'
import SkillDetailClient from './SkillDetailClient'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks-emergent.vercel.app'

// Render dynamically so an unknown id produces a real 404 status (not a soft-404
// 200). Underlying data (getSkill, getSourceSpec, related) stays fetch-cached via
// `next: { revalidate }`, so this only re-runs a cheap render per request.
export const dynamic = 'force-dynamic'

// Sibling skills in the same category, for the "Related skills" cross-link module.
async function getRelated(skill) {
  try {
    const res = await fetch(`${BASE}/api/skills?category=${encodeURIComponent(skill.category)}`, { next: { revalidate: 3600 } })
    if (!res.ok) return []
    const data = await res.json()
    return (data.skills || [])
      .filter((s) => s.id !== skill.id)
      .sort((a, b) => (b.github_stars || 0) - (a.github_stars || 0))
      .slice(0, 6)
  } catch {
    return []
  }
}

async function getSkill(id) {
  try {
    const res = await fetch(`${BASE}/api/skills/${id}`, { next: { revalidate: 3600 } })
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

// Trim to a clean snippet length without cutting a word in half (append … if shortened).
function clip(text, max = 160) {
  const t = (text || '').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-]+$/, '') + '…'
}

// Per-skill SEO: unique title, description, canonical, and OG/Twitter tags
export async function generateMetadata({ params }) {
  const skill = await getSkill(params.id)
  if (!skill) return { title: 'Skill not found | WorkflowStacks', robots: { index: false, follow: false } }
  const name = skill.title_human || skill.name
  const title = `${name} | WorkflowStacks`
  const description = clip(skill.description_human || skill.description || '')
  const url = `/skills/${skill.id}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, type: 'article', url, images: ['/opengraph-image'] },
    twitter: { card: 'summary_large_image', title, description, images: ['/opengraph-image'] },
  }
}

export default async function SkillDetailPage({ params }) {
  const skill = await getSkill(params.id)
  if (!skill) notFound()
  const [sourceSpec, related] = await Promise.all([getSourceSpec(skill.github_url), getRelated(skill)])

  // Structured data for rich results
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: skill.title_human || skill.name,
    description: skill.description_human || skill.description,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: skill.price || 0, priceCurrency: 'USD' },
    ...(skill.github_url ? { url: skill.github_url } : {}),
    ...(skill.creator ? { author: { '@type': 'Person', name: skill.creator } } : {}),
  }

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Skills', item: `${BASE}/skills` },
      { '@type': 'ListItem', position: 3, name: skill.title_human || skill.name, item: `${BASE}/skills/${skill.id}` },
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
      <SkillDetailClient skill={skill} sourceSpec={sourceSpec} related={related} />
    </>
  )
}
