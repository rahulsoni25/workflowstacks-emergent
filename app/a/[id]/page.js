import { notFound } from 'next/navigation'
import AgentClient from './AgentClient'
import { SITE_URL as BASE } from '@/lib/site-url'

// Always the public doc: a paid agent comes back without its blueprint (a
// 300-char preview only) — the API withholds it without an unlock token, and
// this fetch never sends one, so the page stays cacheable and the SEO fields
// (name, goal, skills) still render. AgentClient does the unlock after
// checkout with the server-minted token. Reading searchParams here would
// make the whole route dynamic (a function run per visit, see docs/COSTS.md).
async function getAgent(id) {
  try {
    const res = await fetch(`${BASE}/api/agents/${id}`, { next: { revalidate: 21600 }, signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
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
    openGraph: { title, description, type: 'article', url, images: [`/a/${a.id}/opengraph-image`] },
    twitter: { card: 'summary_large_image', title, description, images: [`/a/${a.id}/opengraph-image`] },
  }
}

export default async function PublicAgentPage({ params }) {
  const data = await getAgent(params.id)
  if (!data?.agent) notFound()
  return <AgentClient agent={data.agent} skills={data.skills || []} />
}
