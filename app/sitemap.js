const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks-emergent.vercel.app'

// Static, indexable routes
const STATIC_ROUTES = [
  '', '/skills', '/discover', '/problems', '/deals', '/partner', '/members', '/join', '/community', '/packs', '/playbooks', '/personas', '/builder', '/upload',
  '/learn', '/learn/how-it-works', '/learn/agents', '/learn/skills',
  '/learn/mcp', '/learn/creators', '/learn/security',
  '/about', '/docs', '/help', '/enterprise', '/founder-launch',
  '/privacy', '/terms',
  '/submit',
]

export const revalidate = 86400 // refresh sitemap daily

export default async function sitemap() {
  const now = new Date()
  const staticEntries = STATIC_ROUTES.map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: path === '' || path === '/skills' ? 'daily' : path === '/submit' ? 'monthly' : 'weekly',
    priority: path === '' ? 1 : path === '/skills' ? 0.9 : 0.6,
  }))

  // Dynamic per-skill detail pages (published only)
  let skillEntries = []
  try {
    const res = await fetch(`${BASE}/api/skills`, { next: { revalidate: 86400 } })
    if (res.ok) {
      const data = await res.json()
      skillEntries = (data.skills || []).map((s) => ({
        url: `${BASE}/skills/${s.id}`,
        lastModified: s.last_updated ? new Date(s.last_updated) : now,
        changeFrequency: 'weekly',
        priority: 0.7,
      }))
    }
  } catch (e) {
    // Sitemap still valid with just static routes if the API is unreachable
  }

  return [...staticEntries, ...skillEntries]
}
