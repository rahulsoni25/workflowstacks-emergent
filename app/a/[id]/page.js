import { notFound } from 'next/navigation'
import AgentClient from './AgentClient'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks-emergent.vercel.app'

async function getAgent(id) {
  try {
    const res = await fetch(`${BASE}/api/agents/${id}`, { next: { revalidate: 300 } })
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
