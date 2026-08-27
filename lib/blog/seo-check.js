// Deterministic SEO / AEO checks for a post. Pure functions, no LLM — this is
// what the editor agent runs FIRST, and what the admin SEO panel shows. Each
// check returns {id, ok, weight, detail}. Score = weighted pass ratio (0–100).
import { classifyLinks } from './links'
import { assembleBody, stripMarkdown } from './markdown'
import { countWords } from './store'

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

export function runSeoChecks(post) {
  const body = post.body_md || assembleBody(post)
  const words = countWords(body)
  const primary = norm(post.seo?.primary)
  const title = post.title || ''
  const meta = post.meta_description || post.seo?.meta_description || ''
  const slug = post.slug || ''
  const first100 = norm(stripMarkdown((post.sections?.[0]?.md) || body)).split(' ').slice(0, 100).join(' ')
  const h2s = (post.sections || []).map((s) => s.h2 || '')
  const links = classifyLinks(body)
  const answerWords = countWords(post.answer)
  const checks = []
  const add = (id, ok, weight, detail) => checks.push({ id, ok: !!ok, weight, detail })

  add('primary_set', !!primary, 3, primary ? `primary: "${post.seo.primary}"` : 'no primary keyword')
  add('kw_in_title', primary && norm(title).includes(primary), 3, `title: ${title}`)
  add('kw_title_front', primary && norm(title).indexOf(primary) <= 15, 1, 'keyword within first ~15 chars of title')
  add('title_len', title.length > 0 && title.length <= 60, 2, `title length ${title.length}/60`)
  add('meta_len', meta.length >= 120 && meta.length <= 160, 2, `meta length ${meta.length} (120–160)`)
  add('kw_in_meta', primary && norm(meta).includes(primary), 2, 'keyword in meta description')
  add('kw_in_slug', primary && slug.split('-').filter((w) => primary.includes(w)).length >= Math.min(2, primary.split(' ').length), 2, `slug: ${slug}`)
  add('slug_len', slug.split('-').length <= 7, 1, `${slug.split('-').length} words in slug (≤7)`)
  add('kw_first100', primary && first100.includes(primary), 3, 'keyword in first 100 words')
  add('kw_in_h2', primary && h2s.some((h) => norm(h).includes(primary)), 2, 'keyword in one H2')
  add('answer_block', answerWords >= 35 && answerWords <= 70, 3, `answer block ${answerWords} words (40–60)`)
  add('tldr', Array.isArray(post.tldr) && post.tldr.length >= 3 && post.tldr.length <= 6, 2, `${post.tldr?.length || 0} TL;DR bullets`)
  add('word_count', words >= 2200 && words <= 2900, 3, `${words} words (2,200–2,900)`)
  add('sections', (post.sections || []).length >= 6 && (post.sections || []).length <= 9, 2, `${post.sections?.length || 0} sections (6–9)`)
  add('h2_questions', h2s.filter((h) => /\?$|^(how|what|why|which|when|is|are|can|do|does|should)\b/i.test(h.trim())).length >= 3, 1, 'at least 3 question-style H2s')
  add('has_table', /\n\|.*\|\s*\n\|[\s:|-]+\|/.test(body), 2, 'contains a markdown table')
  add('has_code_or_config', /```/.test(body), 1, 'contains a code/config block')
  add('firsthand', (post.sections || []).some((s) => /^(we tried it|what we verified|we verified|we tested)/i.test(s.h2 || '')), 3, 'first-hand "We tried it / What we verified" section')
  add('gotchas', /what breaks|gotcha|pitfall|common mistakes|troubleshoot/i.test(body), 1, 'a "what breaks / gotchas" passage')
  add('internal_links', links.internal.length >= 5, 3, `${links.internal.length} internal links (≥5)`)
  add('internal_links_valid', links.badInternal.length === 0, 3, links.badInternal.length ? `unknown internal paths: ${links.badInternal.map((l) => l.path).join(', ')}` : 'all internal links resolve to known paths')
  add('external_citations', links.external.length >= 3 || (post.sources || []).length >= 3, 2, `${links.external.length} external links, ${post.sources?.length || 0} sources (≥3)`)
  add('faq', Array.isArray(post.faq) && post.faq.length >= 5, 1, `${post.faq?.length || 0} Q&As (≥5)`)
  add('takeaways', Array.isArray(post.key_takeaways) && post.key_takeaways.length >= 4, 1, `${post.key_takeaways?.length || 0} key takeaways (≥4)`)
  add('anchor_asset', !!post.anchor_asset?.url, 2, post.anchor_asset?.url || 'no anchor asset')
  add('no_dup_h2', new Set(h2s.map(norm)).size === h2s.length, 1, 'no duplicate H2s')
  add('excerpt', (post.excerpt || '').length >= 60 && (post.excerpt || '').length <= 220, 1, `excerpt ${post.excerpt?.length || 0} chars`)

  const totalW = checks.reduce((a, c) => a + c.weight, 0)
  const okW = checks.filter((c) => c.ok).reduce((a, c) => a + c.weight, 0)
  const score = Math.round((okW / totalW) * 100)
  return { score, checks, failed: checks.filter((c) => !c.ok), words, links: { internal: links.internal.length, external: links.external.length, bad: links.badInternal.map((l) => l.path) } }
}

export const SEO_PASS_MARK = 85
