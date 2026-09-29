import SubmitClient from './SubmitClient'
import { SITE_URL as BASE } from '@/lib/site-url'

export const revalidate = 21600

async function getStats() {
  try {
    const res = await fetch(`${BASE}/api/stats`, { next: { revalidate: 21600 }, signal: AbortSignal.timeout(10_000) })
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
