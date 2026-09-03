// Shared query tokenizer for catalog search. Extracted from
// app/api/search-skills/route.js so the plain /api/skills?search= path (the
// marketplace search box, the MCP connector's search_skills, the builder)
// stops treating a whole multi-word query as ONE substring regex over
// name/description only — which returned zero results for "scrape websites"
// while "scraper" found Crawl4ai. Noise words are dropped, tokens are lightly
// stemmed so "transcribe/transcribed/transcription" share a root.
const NOISE = new Set([
  'the','a','an','my','your','our','for','of','to','from','with','in','on','at',
  'is','are','be','can','do','i','we','you','it','that','this','and','or','but',
  'how','what','when','where','want','need','please','help','make','build','create',
  'use','using','about','some','any','find','show','give','let','tell','best','top','good',
])

export function lightStem(t) {
  return t
    .replace(/(ization|isation|ations|ation)$/i, 'ate')
    .replace(/(ribed|ribing|ription)$/i, 'ribe')
    .replace(/(ies)$/i, 'y')
    .replace(/(ing|ed|es|s)$/i, '')
}

export function tokenize(q) {
  return Array.from(new Set(
    String(q || '')
      .toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .filter((t) => t.length >= 3 && !NOISE.has(t))
      .map(lightStem).filter((t) => t.length >= 3)
  ))
}
