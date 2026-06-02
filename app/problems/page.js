import ProblemsClient from './ProblemsClient'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks-emergent.vercel.app'
export const revalidate = 120

async function getProblems() {
  try {
    const res = await fetch(`${BASE}/api/problems`, { next: { revalidate: 120 } })
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
