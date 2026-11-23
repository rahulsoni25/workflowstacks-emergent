// Relevance search for the catalog — the engine behind /api/skills?search=,
// which serves the /skills marketplace search box AND the MCP connector's
// search_skills tool.
//
// Why this exists (live audit, Nov 2026):
//  - The old path matched any token as a substring, sorted the matches by
//    popularity, and only re-ranked the top ~160-400 of them. A precise but
//    less popular word ("gmail", "figma") fell outside that window and lost to
//    a generic one ("automate", "code"): "automate my gmail inbox" returned a
//    trading bot and a job-application bot, not one Gmail tool.
//  - Every description was searched in full. A few auto-discovered listings
//    carry 20-195 KB page/README dumps as their description, so they matched
//    almost any word and surfaced for "voice cloning", "instagram reels",
//    "resume builder", "scrape product prices"...
//  - The owner (creator) was not searchable, and a pasted GitHub URL was split
//    into "github"/"com" tokens that match everything.
//
// What it does instead:
//  - Tokens are stemmed to a root and matched at a word start ("clon" hits
//    clone/cloning/cloner, but "art" no longer hits "start"); names and slugs
//    keep substring matching because they're compact identifiers
//    ("MeetingSummarizer", "superseo").
//  - Every match is scored (no popularity window), each token weighted by how
//    rare it is in the catalog (IDF) and by which field it hit. Only the first
//    DESC_SCAN_CHARS of a description count — real descriptions are shorter
//    than that (p99 ~370 chars), dumps aren't.
//  - Results that cover less than half of the best result's query weight are
//    dropped, so "N results" means N relevant listings, not every doc that
//    happens to contain "automate".
//  - Exact name / slug / owner/repo matches rank first.
//  - A word that matches nothing (a typo like "instgram") is retried once with
//    one-edit tolerance.
//
// Pure functions only (no DB, no Next imports) so it runs in node:test and in
// an offline evaluation against a catalog snapshot.

// Words that carry no intent in a catalog search. MCP queries are natural
// language ("I want a tool that transcribes my zoom meetings"), so the list
// covers ordinary function words, not just the obvious ones.
const NOISE = new Set([
  'the', 'a', 'an', 'my', 'your', 'our', 'for', 'of', 'to', 'from', 'with', 'in', 'on', 'at',
  'is', 'are', 'be', 'can', 'do', 'i', 'we', 'you', 'it', 'that', 'this', 'and', 'or', 'but',
  'how', 'what', 'when', 'where', 'want', 'need', 'please', 'help', 'make', 'build', 'create',
  'use', 'using', 'about', 'some', 'any', 'find', 'show', 'give', 'let', 'tell', 'best', 'top', 'good',
  'into', 'onto', 'than', 'then', 'them', 'they', 'their', 'there', 'these', 'those', 'which',
  'while', 'will', 'would', 'should', 'could', 'have', 'has', 'had', 'was', 'were', 'been',
  'does', 'did', 'just', 'like', 'get', 'gets', 'all', 'also', 'more', 'most', 'very', 'really',
  'thing', 'things', 'something', 'anything', 'other', 'others', 'its', 'via', 'etc', 'able',
  'looking', 'look', 'way', 'ways', 'who', 'why', 'whose', 'one', 'ones', 'each', 'every',
  'much', 'many', 'lot', 'lots', 'easy', 'easily', 'simple', 'quickly', 'me', 'us', 'by', 'as',
  'up', 'so', 'no', 'if', 'vs', 'am', 'im', 'tool', 'tools', 'repo', 'repos',
  'repository', 'repositories', 'github', 'com', 'www', 'http', 'https', 'git', 'kind', 'sort',
  'someone', 'wants', 'wanted', 'trying', 'try',
])

export const DESC_SCAN_CHARS = 400
const MAX_TOKENS = 10
const CANDIDATE_CAP = 3000

// Suffix rules, first match wins; [pattern, replacement, min chars left before the suffix].
const STEM_RULES = [
  [/(?:ization|isation)s?$/, 'iz', 3], // visualization -> visualiz
  [/(?:ription|riptions|ribing|ribed|ribers?|ribes?|ripts?)$/, 'ri', 4], // transcription/transcribe/transcript -> transcri
  [/atically$/, 'at', 3], // automatically -> automat
  [/ations?$/, 'at', 3], // automation -> automat
  [/ators?$/, 'at', 3], // generator -> generat
  [/ies$/, 'y', 3], // companies -> company
  [/ing$/, '', 3], // scraping -> scrap
  [/(?:ed|es|ers?)$/, '', 4], // automated -> automat, images -> imag, scraper -> scrap
  [/(?<!s)s$/, '', 3], // agents -> agent (but not business)
]

export function stem(word) {
  const w = String(word || '').toLowerCase()
  if (w.length <= 3 || /^\d+$/.test(w)) return w
  let s = w
  for (const [re, rep, min] of STEM_RULES) {
    const m = s.match(re)
    if (!m) continue
    if (s.length - m[0].length < min) continue
    s = s.slice(0, s.length - m[0].length) + rep
    break
  }
  // automate/automat, scrape/scraper, summary/summarize, company/companies
  if (s.length >= 5 && /[ey]$/.test(s)) s = s.slice(0, -1)
  return s
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Every string one edit (insert / delete / substitute / swap) away from root,
// as one regex alternation. Only used for words that matched nothing.
function oneEditPattern(root) {
  const C = '[a-z0-9]'
  const e = escapeRegex
  const alts = new Set()
  for (let i = 0; i <= root.length; i++) alts.add(e(root.slice(0, i)) + C + e(root.slice(i)))
  for (let i = 0; i < root.length; i++) {
    alts.add(e(root.slice(0, i)) + e(root.slice(i + 1)))
    alts.add(e(root.slice(0, i)) + C + e(root.slice(i + 1)))
    if (i < root.length - 1) alts.add(e(root.slice(0, i)) + e(root[i + 1]) + e(root[i]) + e(root.slice(i + 2)))
  }
  return `(?:${[...alts].join('|')})`
}

function makeToken(text, root, { fuzzy = false, phrase = false } = {}) {
  const short = !phrase && root.length <= 2
  const p = phrase ? escapeRegex(root) : fuzzy ? oneEditPattern(root) : escapeRegex(root)
  // word: must start at a word boundary (2-letter tokens must be the whole word)
  // ident: names/slugs are compact identifiers, so a substring is fine there
  const wordSrc = phrase ? p : short ? `\\b${p}\\b` : `\\b${p}`
  const identSrc = phrase ? p : short ? `\\b${p}\\b` : p
  return {
    text,
    root,
    fuzzy,
    wordSrc,
    identSrc,
    wordRe: new RegExp(wordSrc, 'i'),
    identRe: new RegExp(identSrc, 'i'),
  }
}

const GH_URL = /(?:^|[\s/(]|www\.)github\.com\/([A-Za-z0-9_.-]+)(?:\/([A-Za-z0-9_.-]+))?/i
const OWNER_REPO = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/

export function parseQuery(raw) {
  const q = String(raw || '').trim().slice(0, 200)
  let repo = null
  let text = q
  const m = q.match(GH_URL) || q.match(OWNER_REPO)
  if (m) {
    const owner = m[1].toLowerCase()
    const name = (m[2] || '').toLowerCase().replace(/\.git$/, '')
    repo = { owner, name }
    text = [owner, name].filter(Boolean).join(' ')
  }
  const compact = text.toLowerCase().replace(/[^a-z0-9]/g, '')
  const words = text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(Boolean)
  const seen = new Set()
  const tokens = []
  for (const w of words) {
    if (w.length < 2 || /^\d+$/.test(w) || NOISE.has(w)) continue
    const root = stem(w)
    if (seen.has(root)) continue
    seen.add(root)
    tokens.push(makeToken(w, root))
    if (tokens.length >= MAX_TOKENS) break
  }
  // Non-Latin queries (Hindi, Chinese, ...) have no [a-z0-9] words: match the
  // phrase as typed rather than returning nothing.
  if (!tokens.length && !repo && /[^\x00-\x7F]/.test(q)) {
    tokens.push(makeToken(q, q.toLowerCase(), { phrase: true }))
  }
  return { raw: q, compact, repo, tokens }
}

// Same query with the given token roots replaced by one-edit-tolerant ones.
export function withFuzzy(parsed, roots) {
  const want = new Set(roots)
  return {
    ...parsed,
    fuzzy: true,
    tokens: parsed.tokens.map((t) => (want.has(t.root) ? makeToken(t.text, t.root, { fuzzy: true }) : t)),
  }
}

// Fields scored per token: [field, weight, matcher]. A token scores the best
// field it hits, not the sum, so repeating a word across fields doesn't inflate.
const FIELDS = [
  ['name', 3, 'ident'],
  ['slug', 3, 'ident'],
  ['title', 2.5, 'word'],
  ['creator', 2, 'word'],
  ['topics', 2, 'word'],
  ['category', 1.5, 'word'],
  ['descHuman', 1.5, 'word'],
  ['desc', 1, 'word'],
]

// The $or a doc must satisfy to be a candidate (MongoDB $regex is PCRE: \b,
// (?:...) and [a-z0-9] behave as in JS). Scoring re-checks the fields in JS.
export function candidateFilter(parsed) {
  const or = []
  for (const t of parsed.tokens) {
    const word = { $regex: t.wordSrc, $options: 'i' }
    const ident = { $regex: t.identSrc, $options: 'i' }
    or.push(
      { name: ident },
      { slug: ident },
      { title_human: word },
      { creator: word },
      { github_topics: word },
      { category: word },
      { description_human: word },
      { description: word },
    )
  }
  if (parsed.repo) {
    const { owner, name } = parsed.repo
    or.push({ github_url: { $regex: `github\\.com/${escapeRegex(owner)}/${name ? `${escapeRegex(name)}(?:$|[/?#])` : ''}`, $options: 'i' } })
  }
  return or.length ? { $or: or } : null
}

// Only what scoring reads; descriptions are cut server-side so a 195 KB dump
// never leaves the database.
export const SEARCH_PROJECTION = {
  name: 1,
  slug: 1,
  title_human: 1,
  creator: 1,
  category: 1,
  github_topics: 1,
  description_human: 1,
  github_url: 1,
  github_stars: 1,
  description: {
    $cond: [{ $eq: [{ $type: '$description' }, 'string'] }, { $substrCP: ['$description', 0, DESC_SCAN_CHARS] }, ''],
  },
}

export function candidatePipeline(baseQuery, parsed, orderStages) {
  const filter = candidateFilter(parsed)
  const match = filter ? { $and: [baseQuery, filter] } : baseQuery
  return [{ $match: match }, ...orderStages, { $limit: CANDIDATE_CAP }, { $project: SEARCH_PROJECTION }]
}

const compactOf = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
// "MeetingSummarizer" -> "Meeting Summarizer" so camelCase parts count as word starts.
const splitCamel = (s) => String(s || '').replace(/([a-z0-9])([A-Z])/g, '$1 $2')

function fieldsOf(d) {
  return {
    name: splitCamel(d.name),
    slug: String(d.slug || ''),
    title: String(d.title_human || ''),
    creator: String(d.creator || ''),
    topics: Array.isArray(d.github_topics) ? d.github_topics.join(' ') : '',
    category: String(d.category || ''),
    descHuman: String(d.description_human || ''),
    desc: String(d.description || '').slice(0, DESC_SCAN_CHARS),
  }
}

// 3 = the exact GitHub repo pasted, 2 = the listing's own name, 1 = the owner's
// repos (query is an owner name like "microsoft"), 0 = everything else.
function tierOf(d, parsed) {
  if (parsed.repo) {
    const url = String(d.github_url || '').toLowerCase().replace(/(?:\.git)?\/*$/, '')
    const { owner, name } = parsed.repo
    if (name && url.endsWith(`github.com/${owner}/${name}`)) return 3
    if (!name && String(d.creator || '').toLowerCase() === owner) return 1
  }
  const q = parsed.compact
  if (q.length < 3) return 0
  if ([d.name, d.slug, d.title_human].some((v) => compactOf(v) === q)) return 2
  if (compactOf(d.creator) === q) return 1
  return 0
}

// A result must cover at least this share of the best result's query weight.
const MIN_RELATIVE_COVERAGE = 0.4

// Rank candidate docs (in the caller's requested sort order) for a parsed
// query. sortMode 'relevance' orders by score; any other value keeps the
// caller's order among results that match the same number of query words.
// catalogSize is how many listings the search runs over (for IDF); it
// defaults to the candidate count. Returns ranked docs plus the query words
// nothing in the catalog matched.
export function rankSkills(docs, parsed, { sortMode = 'relevance', catalogSize = 0 } = {}) {
  const toks = parsed.tokens
  if (!toks.length && !parsed.repo) return { results: [], unmatched: [], partial: false }

  const rows = docs.map((d, idx) => {
    const f = fieldsOf(d)
    const per = toks.map((t) => {
      let best = 0
      for (const [field, w, kind] of FIELDS) {
        if (w <= best || !f[field]) continue
        if (t.wordRe.test(f[field])) best = w
        // mid-word hit in a name/slug ("seo" in "superseo") counts half
        else if (kind === 'ident' && w / 2 > best && t.identRe.test(f[field])) best = w / 2
      }
      return best
    })
    return { d, idx, per, tier: tierOf(d, parsed) }
  })

  const df = toks.map((_, i) => rows.reduce((n, r) => n + (r.per[i] > 0 ? 1 : 0), 0))
  const n = Math.max(1, Number(catalogSize) || 0, docs.length)
  // Rare words decide relevance; a word in half the catalog barely counts.
  const idf = df.map((c) => (c ? Math.log(1 + n / c) : 0))
  const totalIdf = idf.reduce((a, b) => a + b, 0)

  let maxCoverage = 0
  for (const r of rows) {
    let score = 0
    let covered = 0
    let matched = 0
    r.per.forEach((w, i) => {
      if (w > 0) {
        score += idf[i] * w
        covered += idf[i]
        matched++
      }
    })
    r.coverage = totalIdf ? covered / totalIdf : 0
    // Matching more of the query helps (x0.5 for none .. x1 for all), but a
    // name hit on the rarest word still beats two incidental description hits;
    // mild popularity prior: 100 stars x1.10, 100k stars x1.25.
    r.score = score * (0.5 + 0.5 * r.coverage) * (1 + 0.05 * Math.log10(1 + Math.max(0, Number(r.d.github_stars) || 0)))
    r.matched = matched
    if (r.score > 0 && r.coverage > maxCoverage) maxCoverage = r.coverage
  }

  const kept = rows.filter((r) => r.tier > 0 || (r.score > 0 && r.coverage >= maxCoverage * MIN_RELATIVE_COVERAGE))
  kept.sort((a, b) =>
    b.tier - a.tier ||
    (sortMode === 'relevance' ? b.score - a.score : b.matched - a.matched) ||
    a.idx - b.idx
  )

  const unmatched = toks.filter((t, i) => df[i] === 0).map((t) => t.text)
  // partial: no listing contains every word of the query, so these are the
  // closest matches, not exact ones — the UI and MCP say so.
  const partial = toks.length > 0 && (unmatched.length > 0 || maxCoverage < 0.999)
  return { results: kept.map((r) => r.d), unmatched, partial }
}

// Full search: fetch candidates, rank, and if a word of 5+ letters matched
// nothing, retry once with one-edit tolerance for those words. fetchCandidates
// is (parsed) => Promise<docs> so the route owns the database call;
// catalogSize may be a number or a promise of one.
export async function searchCatalog(query, fetchCandidates, { sortMode = 'relevance', catalogSize = 0 } = {}) {
  const parsed = parseQuery(query)
  if (!parsed.tokens.length && !parsed.repo) return { results: [], unmatched: [], partial: false, fuzzy: false }
  const docs = await fetchCandidates(parsed)
  const size = await catalogSize
  const ranked = rankSkills(docs, parsed, { sortMode, catalogSize: size })
  const retry = parsed.tokens.filter((t) => ranked.unmatched.includes(t.text) && t.root.length >= 5 && !t.fuzzy)
  if (retry.length) {
    const fuzzyParsed = withFuzzy(parsed, retry.map((t) => t.root))
    const again = rankSkills(await fetchCandidates(fuzzyParsed), fuzzyParsed, { sortMode, catalogSize: size })
    // Only a retry that actually found the misspelled word counts.
    const corrected = retry.some((t) => !again.unmatched.includes(t.text))
    if (corrected && again.results.length) return { ...again, fuzzy: true }
  }
  return { ...ranked, fuzzy: false }
}
