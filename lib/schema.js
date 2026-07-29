// Page-level structured data helpers.
//
// Sitewide Organization + WebSite schema lives in app/layout.js. This file
// covers PER-PAGE schema, which was missing entirely — search engines had no
// machine-readable signal that /builder is a software tool, that /bundles/*
// are purchasable products, or where any page sits in the site hierarchy.
//
// Deliberately NOT included:
//   - FAQPage: Google retired FAQ rich results for all sites (May 2026).
//     Existing FAQPage markup on the homepage is left alone (harmless), but
//     we don't add more or expect benefit from it.
//   - HowTo: deprecated by Google in Sept 2023.

export const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks.com'

// Renders a JSON-LD script tag. Next.js App Router allows this inside any
// server component; keep the object plain-serializable.
export function jsonLdScript(data) {
  return {
    type: 'application/ld+json',
    dangerouslySetInnerHTML: { __html: JSON.stringify(data) },
  }
}

// SoftwareApplication — the correct type for a tool users operate (the agent
// builder) or a downloadable automation (an n8n template). Signals "this IS
// software", which plain WebPage markup never communicates.
export function softwareApplicationSchema({
  name,
  description,
  url,
  applicationCategory = 'BusinessApplication',
  operatingSystem = 'Web',
  priceUsd = 0,
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name,
    description,
    url: `${SITE_URL}${url}`,
    applicationCategory,
    operatingSystem,
    offers: {
      '@type': 'Offer',
      price: String(priceUsd),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}${url}`,
    },
    publisher: { '@type': 'Organization', name: 'WorkflowStacks', url: SITE_URL },
  }
}

// Product + Offer for paid bundles. This is what allows price to surface in
// search results, and it's the honest representation of a one-time purchase.
export function productSchema({ name, description, url, priceUsd, category }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    category,
    url: `${SITE_URL}${url}`,
    brand: { '@type': 'Brand', name: 'WorkflowStacks' },
    offers: {
      '@type': 'Offer',
      price: String(priceUsd),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}${url}`,
      seller: { '@type': 'Organization', name: 'WorkflowStacks' },
    },
  }
}

// BreadcrumbList — clarifies hierarchy for crawlers and can render a
// breadcrumb trail in the SERP instead of a raw URL.
export function breadcrumbSchema(trail) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  }
}
