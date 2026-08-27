// RSS feed for the blog — used by readers, syndication tools and answer
// engines that still poll feeds. Regenerated hourly.
import { allPublishedForSitemap } from '@/lib/blog/store'
import { SITE_URL } from '@/lib/schema'

export const revalidate = 3600

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function GET() {
  let posts = []
  try { posts = await allPublishedForSitemap() } catch (e) { posts = [] }
  const items = posts.slice(0, 50).map((p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${SITE_URL}/blog/${p.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${p.slug}</guid>
      <pubDate>${new Date(p.published_at).toUTCString()}</pubDate>
      <description>${esc(p.excerpt || '')}</description>
    </item>`).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>The WorkflowStacks Journal</title>
    <link>${SITE_URL}/blog</link>
    <description>Hands-on guides to n8n workflows, MCP servers, Claude Code and open-source AI agents.</description>
    <language>en</language>
${items}
  </channel>
</rss>`
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } })
}
