import SubmitClient from './SubmitClient'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks-emergent.vercel.app'
export const revalidate = 1800

async function getStats() {
  try {
    const res = await fetch(`${BASE}/api/stats`, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export default async function SubmitPage() {
  const stats = await getStats()
  const publishedCount = Number(stats?.publishedSkills || stats?.totalSkills) || 0
  return <SubmitClient publishedCount={publishedCount} />
}
