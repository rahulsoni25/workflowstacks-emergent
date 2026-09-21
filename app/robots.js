
import { SITE_URL as BASE } from '@/lib/site-url'
export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/my-agents', '/admin', '/earnings'],
      },
      {
        // Explicitly welcome AI / answer engines (GEO) so we appear in
        // ChatGPT, Perplexity, Claude, Gemini and Google AI Overviews.
        userAgent: [
          'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
          'ClaudeBot', 'Claude-Web', 'anthropic-ai',
          'PerplexityBot', 'Perplexity-User',
          'Google-Extended', 'Applebot-Extended', 'Amazonbot', 'CCBot',
        ],
        allow: '/',
        disallow: ['/api/', '/admin', '/earnings'],
      },
      {
        // Third-party SEO-tool and scraper crawlers. They send no visitors, but
        // each crawl of the ~2.7k-page catalog costs ISR writes and function CPU
        // on a capped Hobby plan. The polite ones stop here; the rest are denied
        // at the firewall (vercel.json -> routes[].mitigate, same list).
        userAgent: [
          'AhrefsBot', 'SemrushBot', 'MJ12bot', 'DotBot', 'Bytespider',
          'DataForSeoBot', 'BLEXBot', 'PetalBot', 'serpstatbot', 'MegaIndex',
          'SeekportBot', 'Barkrowler', 'ZoominfoBot',
        ],
        disallow: '/',
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  }
}
