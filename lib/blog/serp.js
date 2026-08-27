// Server-side SERP access with no paid key. Primary: Brave Search API when
// BRAVE_SEARCH_API_KEY is set (free tier, clean JSON). Fallback: DuckDuckGo's
// HTML endpoint (keyless; may be rate-limited from datacenter IPs — every
// caller must tolerate null). Neither is Google, so positions are a proxy;
// Google Search Console remains the ground truth for Google rankings, and
// rank rows are labeled with the engine they came from.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) WorkflowStacksBot/1.0 (+https://workflowstacks.com)'

export async function serpSearch(query, { count = 10 } = {}) {
  if (process.env.BRAVE_SEARCH_API_KEY) {
    try {
      const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`, {
        headers: { 'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY, Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      })
      if (res.ok) {
        const data = await res.json()
        const results = (data.web?.results || []).map((r, i) => ({ position: i + 1, title: r.title, url: r.url, snippet: r.description || '' }))
        if (results.length) return { engine: 'brave', results }
      }
    } catch {}
  }
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return { engine: 'ddg', results: [], error: `http ${res.status}` }
    const html = await res.text()
    const results = []
    const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>)?/g
    let m
    while ((m = re.exec(html)) && results.length < count) {
      let url = m[1]
      const uddg = url.match(/uddg=([^&]+)/)
      if (uddg) url = decodeURIComponent(uddg[1])
      const clean = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#x?\w+;/g, ' ').replace(/\s+/g, ' ').trim()
      results.push({ position: results.length + 1, title: clean(m[2]), url, snippet: clean(m[3]) })
    }
    return { engine: 'ddg', results }
  } catch (e) {
    return { engine: 'ddg', results: [], error: e.message }
  }
}

// Where does our domain sit for this query? null = not in top `count`.
export async function rankFor(query, { domain = 'workflowstacks.com', count = 20 } = {}) {
  const { engine, results, error } = await serpSearch(query, { count })
  if (error && !results.length) return { engine, position: null, error, checked_at: new Date() }
  const hit = results.find((r) => { try { return new URL(r.url).hostname.replace(/^www\./, '') === domain } catch { return false } })
  return {
    engine,
    position: hit ? hit.position : null,
    url: hit?.url || null,
    top: results.slice(0, 5).map((r) => ({ position: r.position, title: r.title, url: r.url })),
    checked_at: new Date(),
  }
}
