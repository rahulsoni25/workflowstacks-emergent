import { TEMPLATES } from '../lib/templates'
import { BUNDLES } from '../lib/bundles'
import { OUTCOMES } from '../lib/outcomes'
import { MCP_SERVERS } from '../lib/mcp-servers'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks-emergent.vercel.app'

// Static, indexable routes
const STATIC_ROUTES = [
  '', '/skills', '/discover', '/problems', '/deals', '/partner', '/members', '/join', '/community', '/packs', '/playbooks', '/personas', '/builder', '/upload', '/build-for-me',
  '/templates',
  ...Object.keys(TEMPLATES).map((slug) => `/templates/${slug}`),
  ...Object.keys(BUNDLES).map((slug) => `/bundles/${slug}`),
  ...Object.keys(OUTCOMES).map((slug) => `/automate/${slug}`),
  '/mcp',
  ...Object.keys(MCP_SERVERS).map((slug) => `/mcp/${slug}`),
  '/learn', '/learn/how-it-works', '/learn/agents', '/learn/skills',
  '/learn/mcp', '/learn/creators', '/learn/security', '/learn/resources',
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

  // Dynamic per-skill detail pages (published only). Tools and learning
  // resources are fetched separately — /api/skills now returns tools only,
  // but resource pages stay live and must stay indexed.
  let skillEntries = []
  try {
    const [toolsRes, resourcesRes] = await Promise.all([
      fetch(`${BASE}/api/skills`, { next: { revalidate: 86400 } }),
      fetch(`${BASE}/api/skills?type=resource`, { next: { revalidate: 86400 } }),
    ])
    const docs = []
    if (toolsRes.ok) docs.push(...((await toolsRes.json()).skills || []))
    if (resourcesRes.ok) docs.push(...((await resourcesRes.json()).skills || []))
    skillEntries = docs.map((s) => ({
      url: `${BASE}/skills/${s.slug || s.id}`,
      lastModified: s.last_updated ? new Date(s.last_updated) : now,
      changeFrequency: 'weekly',
      priority: 0.7,
    }))
  } catch (e) {
    // Sitemap still valid with just static routes if the API is unreachable
  }

  return [...staticEntries, ...skillEntries]
}
