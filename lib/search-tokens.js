// Shared query tokenizer for catalog search. Extracted from
// app/api/search-skills/route.js so the plain /api/skills?search= path (the
// marketplace search box, the MCP connector's search_skills, the builder)
// stops treating a whole multi-word query as ONE substring regex over
// name/description only — which returned zero results for "scrape websites"
// while "scraper" found Crawl4ai. Noise words are dropped, tokens are lightly
// stemmed so "transcribe/transcribed/transcription" share a root.
//
// Two-letter tokens are searchable. "ui", "ux", "ai", "3d" carry the whole
// meaning of a design or AI query, but they used to be dropped with the noise:
// "ui-ux-pro-max" tokenized to [pro, max] and a live search for it returned a
// crypto miner ("Maximize Profit") and a Parkinson's classifier ("Prediction")
// ahead of anything to do with UI. Short tokens are matched at a word
// boundary (tokenPattern) so "ui" does not reach "build" or "guide".
const NOISE = new Set([
  'the','a','an','my','your','our','for','of','to','from','with','in','on','at',
  'is','are','be','can','do','i','we','you','it','that','this','and','or','but',
  'how','what','when','where','want','need','please','help','make','build','create',
  'use','using','about','some','any','find','show','give','let','tell','best','top','good',
  // Two-letter function words, now that two-letter tokens are kept.
  'as','by','so','if','no','me','us','am','up','vs','re','ok','oh','hi','ie','eg','im',
])

export function lightStem(t) {
  return t
    .replace(/(ization|isation|ations|ation)$/i, 'ate')
    .replace(/(ribed|ribing|ription)$/i, 'ribe')
    .replace(/(ies)$/i, 'y')
    .replace(/(ing|ed|es|s)$/i, '')
}

// The query as typed: lowercase ASCII alphanumerics, in order, no filtering.
// "ui-ux-pro-max", "UI/UX Pro Max" and "ui ux pro max" all give
// [ui, ux, pro, max].
export function words(q) {
  return String(q || '')
    .toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter(Boolean)
}

export function tokenize(q) {
  return Array.from(new Set(
    words(q)
      .filter((t) => t.length >= 2 && !NOISE.has(t))
      .map((t) => {
        // Stemming never takes a token under three chars: "css" -> "cs",
        // "ads" -> "ad" and "aws" -> "aw" matched nothing useful and were
        // then discarded by the length filter, so those queries silently
        // lost their most specific word.
        if (t.length < 4) return t
        const s = lightStem(t)
        return s.length >= 3 ? s : t
      })
  ))
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Regex source for one token, for Mongo $regex (with $options: 'i') and for
// tokenMatcher below. Two-letter tokens are anchored at both ends of a word
// ("ui" matches "ui-ux-pro-max" and "Material UI", not "build"); three-letter
// tokens at the start of a word only ("rag" reaches "ragflow" but not
// "storage", and the stem "cod" from "codes" still reaches "code" and
// "coding"); longer tokens stay plain substrings so "tool" finds "devtools".
export function tokenPattern(t) {
  const safe = escapeRegex(t)
  if (t.length <= 2) return `(^|[^a-z0-9])${safe}([^a-z0-9]|$)`
  if (t.length === 3) return `(^|[^a-z0-9])${safe}`
  return safe
}

export function tokenMatcher(t) {
  const re = new RegExp(tokenPattern(t), 'i')
  return (text) => re.test(String(text || ''))
}

// The query as one phrase, for pinning listings whose NAME is what the
// visitor typed. "ui-ux-pro-max", "UI UX Pro Max" and "uiuxpromax" all match
// a listing named ui-ux-pro-max-skill or titled "UI UX Pro Max: ...". Noise
// words and stems are deliberately not applied — a name is matched as
// written. A single word follows tokenPattern's boundary rules so "ai" pins
// "ai-agent" but not "aider". Returns null when there is nothing to match.
export function phrasePattern(q) {
  const ws = words(q).slice(0, 8)
  if (!ws.length || ws.join('').length < 2) return null
  if (ws.length === 1) return tokenPattern(ws[0])
  return `(^|[^a-z0-9])${ws.map(escapeRegex).join('[^a-z0-9]*')}`
}

// Canonical form of a name or query for "is this listing exactly what they
// typed" checks: "UI/UX Pro Max" and "ui-ux-pro-max" both give ui-ux-pro-max.
export function normalizeName(s) {
  return words(s).join('-')
}
