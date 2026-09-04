import ProblemsClient from './ProblemsClient'
import { SITE_URL as BASE } from '@/lib/site-url'

export const revalidate = 1800

async function getProblems() {
  try {
    const res = await fetch(`${BASE}/api/problems`, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return []
    return (await res.json()).problems || []
  } catch {
    return []
  }
}

export default async function ProblemsPage() {
  const problems = await getProblems()

  // Crawlable list of the real, community-posted problems.
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Workflow problems founders want AI to solve',
    numberOfItems: problems.length,
    itemListElement: problems.slice(0, 25).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: p.title,
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <ProblemsClient initialProblems={problems} />
    </>
  )
}
