// Which answer engine sent this visitor.
//
// GEO work (llms.txt, AI-aware robots rules, citation-shaped copy) is
// currently unmeasured here: a visit arriving from a ChatGPT citation is
// recorded as referrer "chatgpt.com" and then pooled with every other
// referral, so there is no way to tell whether any of it is working.
//
// Classifying the hostname costs nothing and makes the channel legible in
// whatever GA4/GTM already consumes our events. Hostname matching only —
// answer engines do not pass a stable query string, and several strip the
// referrer path entirely.
const ENGINES = [
  { engine: 'chatgpt', hosts: ['chatgpt.com', 'chat.openai.com', 'openai.com'] },
  { engine: 'perplexity', hosts: ['perplexity.ai'] },
  { engine: 'claude', hosts: ['claude.ai', 'anthropic.com'] },
  { engine: 'gemini', hosts: ['gemini.google.com', 'bard.google.com'] },
  { engine: 'copilot', hosts: ['copilot.microsoft.com'] },
  { engine: 'grok', hosts: ['grok.com', 'x.ai'] },
  { engine: 'deepseek', hosts: ['chat.deepseek.com', 'deepseek.com'] },
  { engine: 'mistral', hosts: ['chat.mistral.ai'] },
  { engine: 'poe', hosts: ['poe.com'] },
  { engine: 'phind', hosts: ['phind.com'] },
  { engine: 'you', hosts: ['you.com'] },
]

// A referrer counts as an engine when the hostname equals one of its hosts or
// is a subdomain of it — never on a bare substring, which would let
// "notperplexity.ai.example.com" through.
export function aiEngineFor(referrerHost) {
  if (!referrerHost || typeof referrerHost !== 'string') return null
  const host = referrerHost.toLowerCase().replace(/^www\./, '')
  for (const { engine, hosts } of ENGINES) {
    for (const h of hosts) {
      if (host === h || host.endsWith(`.${h}`)) return engine
    }
  }
  return null
}

// Crawler user agents that fetch pages to build or ground an answer. Useful
// server-side to tell whether the GEO work is even being read yet — crawler
// activity leads citations by weeks, so it is the earlier signal.
const CRAWLERS = [
  ['GPTBot', 'openai'], ['OAI-SearchBot', 'openai'], ['ChatGPT-User', 'openai'],
  ['ClaudeBot', 'anthropic'], ['Claude-Web', 'anthropic'], ['anthropic-ai', 'anthropic'],
  ['PerplexityBot', 'perplexity'], ['Perplexity-User', 'perplexity'],
  ['Google-Extended', 'google'], ['Applebot-Extended', 'apple'],
  ['Amazonbot', 'amazon'], ['CCBot', 'commoncrawl'], ['Bytespider', 'bytedance'],
  ['meta-externalagent', 'meta'], ['cohere-ai', 'cohere'],
]

export function aiCrawlerFor(userAgent) {
  if (!userAgent || typeof userAgent !== 'string') return null
  for (const [token, vendor] of CRAWLERS) {
    if (userAgent.includes(token)) return vendor
  }
  return null
}
