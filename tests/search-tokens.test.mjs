// node --test tests/search-tokens.test.mjs
//
// The tokenizer behind every catalog search surface (/api/skills?search=,
// /api/search-skills, the recommender pre-filter, the MCP search_skills tool).
// The first group pins the regression that motivated it: a search for
// "ui-ux-pro-max" used to tokenize to [pro, max] and return a crypto miner.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tokenize, tokenPattern, tokenMatcher, phrasePattern, normalizeName, words } from '../lib/search-tokens.js'

test('two-letter design/AI tokens survive tokenization', () => {
  assert.deepEqual(tokenize('ui-ux-pro-max'), ['ui', 'ux', 'pro', 'max'])
  assert.deepEqual(tokenize('UI/UX design'), ['ui', 'ux', 'design'])
  assert.deepEqual(tokenize('ai agents'), ['ai', 'agent'])
  assert.deepEqual(tokenize('3d models'), ['3d', 'model'])
})

test('two-letter function words are still noise', () => {
  assert.deepEqual(tokenize('an app to do it by me'), ['app'])
  assert.deepEqual(tokenize('a'), [])
})

test('stemming never shortens a token below three chars', () => {
  // Used to become "cs", "ad", "aw" and then be discarded by the length filter.
  assert.deepEqual(tokenize('css ads aws'), ['css', 'ads', 'aws'])
  // Longer tokens still stem as before.
  assert.deepEqual(tokenize('transcribe transcribed transcription'), ['transcribe'])
  assert.deepEqual(tokenize('scrape websites'), ['scrape', 'websit'])
  assert.deepEqual(tokenize('tools apis'), ['tool', 'api'])
})

test('tokenize dedupes and drops punctuation', () => {
  assert.deepEqual(tokenize('  Scraper, scraper!! SCRAPER '), ['scraper'])
})

test('two-letter tokens match only whole words', () => {
  const ui = tokenMatcher('ui')
  assert.equal(ui('ui-ux-pro-max-skill'), true)
  assert.equal(ui('Material UI'), true)
  assert.equal(ui('shadcn/ui'), true)
  assert.equal(ui('build a guide quickly'), false)
  assert.equal(ui('uikit'), false)
  const ux = tokenMatcher('ux')
  assert.equal(ux('UX research'), true)
  assert.equal(ux('linux flux'), false)
  const ai = tokenMatcher('ai')
  assert.equal(ai('ai-agent'), true)
  assert.equal(ai('email chain train'), false)
})

test('three-letter tokens anchor at a word start so stems still reach their words', () => {
  const rag = tokenMatcher('rag')
  assert.equal(rag('rag'), true)
  assert.equal(rag('ragflow'), true)
  assert.equal(rag('rag-agent'), true)
  assert.equal(rag('storage average drag'), false)
  const cod = tokenMatcher('cod') // stem of "codes"
  assert.equal(cod('code'), true)
  assert.equal(cod('coding assistant'), true)
  assert.equal(cod('decode'), false)
  const ads = tokenMatcher('ads')
  assert.equal(ads('google-ads-mcp'), true)
  assert.equal(ads('loads threads'), false)
})

test('longer tokens remain plain substrings', () => {
  assert.equal(tokenPattern('tool'), 'tool')
  assert.equal(tokenMatcher('tool')('devtools'), true)
  assert.equal(tokenMatcher('scrape')('web scraper'), true)
})

test('tokenPattern escapes regex metacharacters', () => {
  assert.equal(tokenPattern('c++'), '(^|[^a-z0-9])c\\+\\+')
  assert.equal(tokenPattern('a.b'), '(^|[^a-z0-9])a\\.b')
  assert.equal(tokenPattern('llama.cpp'), 'llama\\.cpp')
  assert.doesNotThrow(() => new RegExp(tokenPattern('c++'), 'i'))
})

test('phrasePattern pins a listing named what was typed, in any spelling', () => {
  const re = new RegExp(phrasePattern('ui-ux-pro-max'), 'i')
  assert.equal(re.test('ui-ux-pro-max-skill'), true)
  assert.equal(re.test('UI UX Pro Max: Design Intelligence'), true)
  assert.equal(re.test('uiuxpromax'), true)
  assert.equal(re.test('ui_ux_pro_max'), true)
  assert.equal(re.test('ui-kit-pro'), false)
  assert.equal(re.test('Maximize Profit with MultiPoolMiner'), false)
  // Same pattern whatever separators the visitor used.
  assert.equal(phrasePattern('UI UX Pro Max'), phrasePattern('ui-ux-pro-max'))
  assert.equal(phrasePattern('ui/ux pro max'), phrasePattern('ui-ux-pro-max'))
})

test('phrasePattern for a single word follows the token boundary rules', () => {
  assert.equal(phrasePattern('ai'), tokenPattern('ai'))
  assert.equal(phrasePattern('n8n'), tokenPattern('n8n'))
  assert.equal(new RegExp(phrasePattern('n8n'), 'i').test('n8n-workflows'), true)
  assert.equal(new RegExp(phrasePattern('firecrawl'), 'i').test('firecrawl-mcp-server'), true)
})

test('phrasePattern is null when there is nothing to match', () => {
  assert.equal(phrasePattern(''), null)
  assert.equal(phrasePattern('   '), null)
  assert.equal(phrasePattern('!!'), null)
  assert.equal(phrasePattern('c'), null)
})

test('phrasePattern caps the number of words', () => {
  const long = Array.from({ length: 20 }, (_, i) => `w${i}`).join(' ')
  assert.equal((phrasePattern(long).match(/\[\^a-z0-9\]\*/g) || []).length, 7)
})

test('normalizeName gives one spelling for a name and a query', () => {
  assert.equal(normalizeName('UI/UX Pro Max'), 'ui-ux-pro-max')
  assert.equal(normalizeName('ui-ux-pro-max'), 'ui-ux-pro-max')
  assert.equal(normalizeName('  Crawl4AI  '), 'crawl4ai')
  assert.deepEqual(words('UI/UX Pro-Max'), ['ui', 'ux', 'pro', 'max'])
})
