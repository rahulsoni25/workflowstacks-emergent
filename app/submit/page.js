import SubmitClient from './SubmitClient'
import { getStats as readStats } from '@/lib/skills-data'

export const revalidate = 1800

async function getStats() {
  try {
    return await readStats({ revalidate: 1800 })
  } catch {
    return null
  }
}

export default async function SubmitPage() {
  const stats = await getStats()
  const publishedCount = Number(stats?.publishedSkills || stats?.totalSkills) || 0
  return <SubmitClient publishedCount={publishedCount} />
}
