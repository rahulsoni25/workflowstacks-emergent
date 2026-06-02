import DealsClient from './DealsClient'

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

export default async function DealsPage() {
  const [dealsData, reqData] = await Promise.all([getJson('/api/deals'), getJson('/api/deals/requests')])
  const deals = dealsData?.deals || []
  const requests = reqData?.requests || []

  // Honest structured data: real offers with real prices. No review/rating markup
  // (we have no genuine ratings — fabricating them would mislead search engines).
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'AI Tool Deals for Founders',
    description: 'Group-buy and exclusive discounts on AI tools for founders, from WorkflowStacks.',
    numberOfItems: deals.length,
    itemListElement: deals.slice(0, 20).map((d, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: `${d.tool} deal`,
        category: d.category || 'AI tools',
        ...(d.blurb ? { description: d.blurb } : {}),
        ...(d.groupPrice
          ? { offers: { '@type': 'Offer', price: d.groupPrice, priceCurrency: 'USD', availability: 'https://schema.org/LimitedAvailability' } }
          : {}),
      },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <DealsClient initialDeals={deals} initialRequests={requests} />
    </>
  )
}
