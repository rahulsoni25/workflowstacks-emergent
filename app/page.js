import HomeClient from './HomeClient'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks-emergent.vercel.app'
export const revalidate = 300

async function getJson(path) {
  try {
    const res = await fetch(`${BASE}${path}`, { next: { revalidate: 300 } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export default async function HomePage() {
  const [skillsData, stats] = await Promise.all([getJson('/api/skills'), getJson('/api/stats')])
  return <HomeClient initialSkills={skillsData?.skills || []} initialStats={stats || null} />
}
