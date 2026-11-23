// node --test tests/   (no dependencies; Node 20+)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { stem, parseQuery, rankSkills, searchCatalog, candidateFilter } from '../lib/catalog-search.js'

// In-memory stand-in for the MongoDB candidate query: same $or of $regex
// clauses, evaluated with JS RegExp (the patterns are PCRE/JS-compatible).
function fetcherFor(docs) {
  return async (parsed) => {
    const f = candidateFilter(parsed)
    if (!f) return docs
    return docs.filter((d) =>
      f.$or.some((clause) => {
        const [field, { $regex, $options }] = Object.entries(clause)[0]
        const re = new RegExp($regex, $options)
        const v = d[field]
        return Array.isArray(v) ? v.some((x) => re.test(x)) : typeof v === 'string' && re.test(v)
      })
    )
  }
}

const doc = (slug, extra = {}) => ({ _id: slug, slug, name: slug, description: '', github_stars: 100, ...extra })
const slugs = (r) => r.results.map((d) => d.slug)

test('stem folds word forms onto one root', () => {
  for (const w of ['transcribe', 'transcribes', 'transcription', 'transcript']) assert.equal(stem(w), 'transcri', w)
  for (const w of ['automate', 'automated', 'automation', 'automating']) assert.equal(stem(w), 'automat', w)
  for (const w of ['scrape', 'scraper', 'scraping']) assert.equal(stem(w), 'scrap', w)
  assert.equal(stem('visualization'), 'visualiz')
  assert.equal(stem('notes'), 'note')
  assert.equal(stem('business'), 'business')
  for (const w of ['ads', 'aws', 'css', 'mcp']) assert.equal(stem(w), w)
})

test('parseQuery drops filler words from natural-language queries', () => {
  const p = parseQuery('I want a tool that transcribes my zoom meetings and summarizes them')
  assert.deepEqual(p.tokens.map((t) => t.root), ['transcri', 'zoom', 'meeting', 'summariz'])
})

test('parseQuery reads a GitHub URL or owner/repo as a repo, not as "github"/"com" words', () => {
  for (const q of ['https://github.com/unclecode/crawl4ai', 'github.com/unclecode/crawl4ai/tree/main', 'unclecode/crawl4ai']) {
    const p = parseQuery(q)
    assert.deepEqual(p.repo, { owner: 'unclecode', name: 'crawl4ai' }, q)
    assert.deepEqual(p.tokens.map((t) => t.text), ['unclecode', 'crawl4ai'], q)
  }
})

test('two-letter words are kept but only match as whole words', () => {
  const docs = [doc('chat-ui', { description: 'A chat UI kit' }), doc('builder', { description: 'Build and guide quick apps' })]
  assert.deepEqual(slugs(rankSkills(docs, parseQuery('ui'))), ['chat-ui'])
})

test('a huge description dump cannot match words far past its start', () => {
  const dump = 'x '.repeat(5000) + 'gmail voice instagram resume'
  const docs = [doc('junk', { description: dump }), doc('gmail-processor', { description: 'Process Gmail messages' })]
  assert.deepEqual(slugs(rankSkills(docs, parseQuery('gmail'))), ['gmail-processor'])
})

test('a rare word decides relevance; listings matching only a common word drop out', async () => {
  const docs = [
    ...Array.from({ length: 40 }, (_, i) => doc(`automation-${i}`, { description: 'Automate your workflow', github_stars: 50000 })),
    doc('gmail-processor', { description: 'Process Gmail messages and attachments', github_stars: 500 }),
    doc('inbox-zero', { description: 'Get your Gmail inbox to zero', github_stars: 300 }),
  ]
  const r = await searchCatalog('automate my gmail inbox', fetcherFor(docs), { catalogSize: 500 })
  assert.deepEqual(slugs(r), ['inbox-zero', 'gmail-processor'])
})

test('word-start matching: "art" does not hit "start" or "smart" in prose', () => {
  const docs = [doc('launcher', { description: 'Start fast with smart defaults' }), doc('pixel', { description: 'AI art generator' })]
  assert.deepEqual(slugs(rankSkills(docs, parseQuery('art'))), ['pixel'])
})

test('a name hit inside a word counts half ("seo" in "paseo")', () => {
  const docs = [doc('paseo', { github_stars: 50000 }), doc('claude-seo', { github_stars: 500 })]
  assert.deepEqual(slugs(rankSkills(docs, parseQuery('seo'))), ['claude-seo', 'paseo'])
})

test('exact repo, then exact name, then owner rank first', () => {
  const docs = [
    doc('playwright-mcp', { github_stars: 90000, description: 'Browser automation with browser use' }),
    doc('browser-use', { github_stars: 100, github_url: 'https://github.com/browser-use/browser-use' }),
    doc('crawl4ai', { creator: 'unclecode', github_url: 'https://github.com/unclecode/crawl4ai' }),
    doc('crawl4ai-mcp', { github_stars: 90000, description: 'MCP server for crawl4ai' }),
  ]
  assert.equal(slugs(rankSkills(docs, parseQuery('browser use')))[0], 'browser-use')
  assert.equal(slugs(rankSkills(docs, parseQuery('https://github.com/unclecode/crawl4ai')))[0], 'crawl4ai')
  assert.deepEqual(slugs(rankSkills(docs, parseQuery('unclecode'))), ['crawl4ai'])
})

test('one-edit typo tolerance when a word matches nothing', async () => {
  const docs = [doc('instagram-skills', { description: 'Grow on Instagram' }), doc('seo-kit')]
  const r = await searchCatalog('instgram', fetcherFor(docs))
  assert.equal(r.fuzzy, true)
  assert.deepEqual(slugs(r), ['instagram-skills'])
})

test('a word nothing mentions is reported, not silently fuzzed', async () => {
  const docs = [doc('score-board', { description: 'Live scores dashboard' })]
  const r = await searchCatalog('cricket scores', fetcherFor(docs))
  assert.equal(r.fuzzy, false)
  assert.equal(r.partial, true)
  assert.deepEqual(r.unmatched, ['cricket'])
  assert.deepEqual(slugs(r), ['score-board'])
})

test('explicit sort keeps the caller order among equally-matching results', () => {
  const docs = [doc('pdf-b', { github_stars: 9 }), doc('pdf-a', { github_stars: 99999 })] // caller order: b then a
  assert.deepEqual(slugs(rankSkills(docs, parseQuery('pdf'), { sortMode: 'newest' })), ['pdf-b', 'pdf-a'])
})
