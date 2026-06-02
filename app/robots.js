const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks-emergent.vercel.app'

export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Don't waste crawl budget on API or per-user pages
      disallow: ['/api/', '/my-agents', '/admin', '/earnings'],
    },
    sitemap: `${BASE}/sitemap.xml`,
  }
}
