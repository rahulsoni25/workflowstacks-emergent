const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks-emergent.vercel.app'

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
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  }
}
