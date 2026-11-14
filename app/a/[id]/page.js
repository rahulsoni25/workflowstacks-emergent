import { notFound } from 'next/navigation'
import AgentClient from './AgentClient'
import { SITE_URL as BASE } from '@/lib/site-url'

// Always the public doc: a paid agent comes back without its blueprint (a
// 300-char preview only) — the API withholds it without an unlock token, and
// this fetch never sends one, so the page stays cacheable and the SEO fields
// (name, goal, skills) still render. AgentClient does the unlock after
// checkout with the server-minted token. Reading searchParams here would
// make the whole route dynamic (a function run per visit, see docs/COSTS.md).
//
// ISR. Without generateStaticParams a dynamic segment renders on every request
// (`next build` listed /a/[id] as ƒ, 2026-11-14). An empty list renders each
// agent on its first visit and serves it from the cache after that. 6 hours is
// how long the API response was already cached, so pages are no staler than before.
export const revalidate = 21600
export const dynamicParams = true
export function generateStaticParams() { return [] }

// Only a 404 means "no such agent". Any other failure throws, so ISR keeps the
// last good page (or caches nothing) rather than storing a 404 for 6 hours.
async function getAgent(id) {
  const res = await fetch(`${BASE}/api/agents/${id}`, { next: { revalidate: 21600 }, signal: AbortSignal.timeout(10_000) })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`agent ${id}: API answered ${res.status}`)
  return res.json()
}

// The API returns whole skill documents (stars history, README preview…).
// AgentClient renders only these fields, and every extra byte is in the cached
// page, billed per 8 KB (docs/COSTS.md rule 5).
function skillCard(s) {
  return { id: s.id, slug: s.slug, name: s.name, title_human: s.title_human, category: s.category, github_stars: s.github_stars }
}

export async function generateMetadata({ params }) {
  const data = await getAgent(params.id)
  if (!data?.agent) return { title: 'Agent not found | WorkflowStacks' }
  const a = data.agent
  const title = `${a.name} — AI agent by @${a.creatorName || 'anonymous'} | WorkflowStacks`
  const description = `${a.goal || a.description || ''}`.slice(0, 160)
  const url = `/a/${a.id}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, type: 'article', url, images: ['/a/opengraph-image'] },
    twitter: { card: 'summary_large_image', title, description, images: ['/a/opengraph-image'] },
  }
}

export default async function PublicAgentPage({ params }) {
  const data = await getAgent(params.id)
  if (!data?.agent) notFound()
  return <AgentClient agent={data.agent} skills={(data.skills || []).map(skillCard)} />
}
