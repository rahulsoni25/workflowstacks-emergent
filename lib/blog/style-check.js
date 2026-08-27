// Deterministic "does this read like AI slop?" linter. No LLM — these are the
// measurable tells Google's scaled-content classifiers and human readers both
// key on: stock phrases, uniform sentence rhythm, hedge-fluff, zero
// contractions, listicle-speak. The pipeline runs it at the edit step and the
// humanize pass must clear it before a post can publish.
import { stripMarkdown } from './markdown'

// Phrases that almost never appear in human trade writing but are endemic in
// LLM output. Case-insensitive, matched on the plain text.
export const AI_TELL_PHRASES = [
  'delve into', 'dive into', "let's dive", 'in today’s fast-paced', "in today's fast-paced",
  'in the ever-evolving', 'ever-changing landscape', 'the landscape of', 'navigate the world of',
  'game-changer', 'game changing', 'revolutionize', 'supercharge', 'unlock the power',
  'unleash', 'elevate your', 'take your .{0,20} to the next level', 'seamlessly integrate',
  'seamless integration', 'robust solution', 'harness the power', 'leverage the power',
  'it’s important to note', "it's important to note", 'it is important to note',
  'it’s worth noting', "it's worth noting", 'needless to say',
  'in conclusion,', 'in summary,', 'to summarize,', 'to sum up,', 'wrapping up,',
  'whether you’re a', "whether you're a", 'look no further',
  'in this article, we will', 'in this post, we will', 'in this guide, we will',
  'without further ado', 'at the end of the day', 'when it comes to',
  'a plethora of', 'a myriad of', 'plays a crucial role', 'plays a pivotal role',
  'crucial aspect', 'pivotal role', 'paramount', 'furthermore,', 'moreover,',
  'additionally, it', 'firstly,', 'secondly,', 'lastly,',
  'digital age', 'digital landscape', 'treasure trove', 'comprehensive guide to',
  'step-by-step guide to success', 'best practices to follow', 'key takeaway here is',
  'as an ai', 'as a language model', 'i cannot', 'knowledge cutoff',
]

const CONTRACTIONS = /\b(?:don't|doesn't|didn't|isn't|aren't|wasn't|weren't|can't|couldn't|won't|wouldn't|shouldn't|hasn't|haven't|it's|that's|there's|here's|what's|we're|we've|we'll|you're|you've|you'll|they're|let's)\b/gi

export function styleCheck(post) {
  const plain = stripMarkdown(post.body_md || (post.sections || []).map((s) => s.md).join('\n'))
  const lower = plain.toLowerCase()
  const findings = []

  // 1. AI-tell phrases
  const hits = []
  for (const p of AI_TELL_PHRASES) {
    const re = new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, (c) => (c === '.' || c === '{' || c === '}' ? c : `\\${c}`)), 'i')
    // allow the deliberate ".{0,20}" wildcard entries through unescaped
    const rx = p.includes('{0,20}') ? new RegExp(p, 'i') : re
    if (rx.test(lower)) hits.push(p)
  }
  if (hits.length) findings.push({ id: 'ai_phrases', detail: `stock AI phrases: ${hits.slice(0, 8).join(' · ')}`, count: hits.length })

  // 2. Sentence-length monotony. Human writing mixes short punches with long
  // explanations; LLM drafts cluster tightly around the mean.
  const sentences = plain.split(/(?<=[.!?])\s+/).map((s) => s.split(/\s+/).length).filter((n) => n > 2 && n < 90)
  if (sentences.length > 30) {
    const mean = sentences.reduce((a, b) => a + b, 0) / sentences.length
    const sd = Math.sqrt(sentences.reduce((a, b) => a + (b - mean) ** 2, 0) / sentences.length)
    const cv = sd / mean // coefficient of variation
    if (cv < 0.42) findings.push({ id: 'monotone_rhythm', detail: `sentence-length variation too uniform (cv ${cv.toFixed(2)} < 0.42) — mix short sentences in`, cv })
    const short = sentences.filter((n) => n <= 7).length
    if (short / sentences.length < 0.08) findings.push({ id: 'no_short_sentences', detail: `only ${short} short sentences in ${sentences.length} — add punchy ones` })
  }

  // 3. Contractions — zero contractions across 2,500 words reads machine-stiff.
  const contractions = (plain.match(CONTRACTIONS) || []).length
  if (plain.length > 4000 && contractions < 5) {
    findings.push({ id: 'too_formal', detail: `${contractions} contractions in whole article — write like you talk` })
  }

  // 4. Every section opening with the same shape ("X is ..." / "The ...").
  const openers = (post.sections || []).map((s) => stripMarkdown(s.md).split(/\s+/).slice(0, 2).join(' ').toLowerCase()).filter(Boolean)
  const openerDupes = openers.length - new Set(openers).size
  if (openerDupes >= 2) findings.push({ id: 'repetitive_openers', detail: `${openerDupes} sections open with identical first words` })

  // 5. Bold-term-colon listicle pattern density ("**Thing:** explanation")
  const boldColon = ((post.body_md || '').match(/\*\*[^*]{2,40}:?\*\*:?\s/g) || []).length
  const words = plain.split(/\s+/).length
  if (boldColon > words / 180) findings.push({ id: 'listicle_bolding', detail: `${boldColon} bold-label bullets — too template-shaped, convert some to prose` })

  const score = Math.max(0, 100 - hits.length * 8 - findings.filter((f) => f.id !== 'ai_phrases').length * 12)
  return { score, pass: score >= 75 && hits.length <= 2, findings, stats: { sentences: sentences.length, contractions } }
}

// Cross-post duplication guard: 8-gram shingle overlap between this post and
// every other post in the collection (cheap enough at daily volume). Catches
// the "every article has the same install section" failure that makes a blog
// read machine-generated in aggregate.
export function overlapWithCorpus(post, others) {
  const shingles = (text) => {
    const w = stripMarkdown(text).toLowerCase().split(/\s+/).filter(Boolean)
    const out = new Set()
    for (let i = 0; i + 8 <= w.length; i++) out.add(w.slice(i, i + 8).join(' '))
    return out
  }
  const mine = shingles(post.body_md || '')
  if (!mine.size) return { max: 0, worst: null }
  let max = 0
  let worst = null
  for (const o of others) {
    if (o.slug === post.slug || !o.body_md) continue
    const theirs = shingles(o.body_md)
    let common = 0
    for (const s of mine) if (theirs.has(s)) common++
    const ratio = common / mine.size
    if (ratio > max) { max = ratio; worst = o.slug }
  }
  return { max, worst }
}

export const OVERLAP_LIMIT = 0.06 // >6% shared 8-grams with a sibling post = fail
