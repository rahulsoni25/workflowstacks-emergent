// Pure helpers for the daily social pipeline (scripts/social-daily.mjs): the
// scout's shortlist, the day's format, the facts sheet every agent works from,
// the mechanical copy rules, post composition, X request signing and the slide
// cards. No network and no database, so tests/social.test.mjs can exercise
// every rule here directly.

import { createHmac, randomBytes } from 'node:crypto'

export const SITE = 'https://workflowstacks.com'
const DAY = 24 * 60 * 60 * 1000

// A skill featured once is not featured again for a year, the same window the
// newsletter uses; the eligible pool is about a thousand skills.
export const NO_REPEAT_DAYS = 365
// "New" means added to the catalog in the last two weeks.
export const NEW_WINDOW_DAYS = 14
// Wednesday is the house-product spotlight; every other day features a repo.
export const PRODUCT_DAY = 3
export const SHORTLIST_SIZE = 5

export const utcDate = (d) => d.toISOString().slice(0, 10)
const daysBetween = (a, b) => (a.getTime() - b.getTime()) / DAY

export function repoOwner(githubUrl) {
  const m = String(githubUrl || '').match(/github\.com\/([^/]+)\/([^/#?]+)/i)
  return m ? { owner: m[1], repo: m[2].replace(/\.git$/, '') } : null
}

export function fmtCount(n) {
  const v = Number(n) || 0
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`
  return String(v)
}

// ------------------------------------------------------------ shortlist

// skills: published, installable, on-topic candidates (the caller applies the
// catalog gates). New to the catalog comes first, then gaining stars, then the
// best-documented rest, because the ask is to post the new repos we have.
export function shortlistSkills(skills, { now, postedSkillIds = new Set(), limit = SHORTLIST_SIZE }) {
  const pool = skills.filter((s) => !postedSkillIds.has(s.id))
  const byQuality = (a, b) => (b.rewrite_score || 0) - (a.rewrite_score || 0) || (b.github_stars || 0) - (a.github_stars || 0)
  const isNew = (s) => s.added_at && daysBetween(now, new Date(s.added_at)) <= NEW_WINDOW_DAYS
  // A provisional velocity covers less than a week; no post may call it "this week".
  const isTrending = (s) => typeof s.velocity_7d === 'number' && s.velocity_7d > 0 && !s.velocity_provisional

  const fresh = pool.filter(isNew).sort(byQuality)
  const trending = pool.filter((s) => !isNew(s) && isTrending(s)).sort((a, b) => b.velocity_7d - a.velocity_7d)
  const rest = pool.filter((s) => !isNew(s) && !isTrending(s)).sort(byQuality)
  return [
    ...fresh.map((skill) => ({ kind: 'skill', skill, reason: 'new' })),
    ...trending.map((skill) => ({ kind: 'skill', skill, reason: 'trending' })),
    ...rest.map((skill) => ({ kind: 'skill', skill, reason: 'catalog' })),
  ].slice(0, limit)
}

// products: scripts/social-products.json. lastPosted: Map(product id -> Date).
// A product added in the last two weeks and never posted goes out on the next
// run, whatever the day. Otherwise products get one day a week, least recently
// posted first.
export function dueProduct(products, { now, lastPosted = new Map(), force = false }) {
  const live = products.filter((p) => p.enabled !== false)
  const fresh = live.filter((p) => p.added && !lastPosted.has(p.id) && daysBetween(now, new Date(p.added)) <= NEW_WINDOW_DAYS)
  if (fresh.length) return { kind: 'product', product: fresh[0], reason: 'new-product' }
  if ((!force && now.getUTCDay() !== PRODUCT_DAY) || live.length === 0) return null
  const last = (p) => (lastPosted.has(p.id) ? lastPosted.get(p.id).getTime() : 0)
  return { kind: 'product', product: [...live].sort((a, b) => last(a) - last(b))[0], reason: 'product-spotlight' }
}

// --------------------------------------------------------------- format

export const FORMATS = ['post', 'carousel', 'reel']
// Sunday first. Two Reels, three carousels and two single posts a week.
const WEEK = ['carousel', 'reel', 'carousel', 'post', 'reel', 'carousel', 'post']
export function formatFor(now, override) {
  return FORMATS.includes(override) ? override : WEEK[now.getUTCDay()]
}

// ---------------------------------------------------------------- facts

// Everything the agents may say. `live` is what the fact-checker read from
// GitHub minutes ago and wins over the catalog's copy of the same numbers.
export function skillFacts(skill, reason, live = {}) {
  const gh = repoOwner(skill.github_url)
  const guide = skill.use_guide || {}
  const stars = typeof live.stars === 'number' ? live.stars : skill.github_stars
  const facts = {
    kind: 'open-source repo listed on WorkflowStacks (WorkflowStacks did not build it)',
    name: skill.title_human || skill.name,
    repo: gh ? `${gh.owner}/${gh.repo}` : skill.name,
    built_by: gh ? gh.owner : null,
    what_it_does: skill.description_human || skill.description || '',
    upstream_description: live.description || skill.description || '',
    category: skill.category || null,
    topics: (Array.isArray(skill.github_topics) ? skill.github_topics : []).slice(0, 8),
    github_stars: typeof stars === 'number' ? stars : null,
    license: live.license || null,
    why_today: reason === 'new' ? 'Added to the WorkflowStacks catalog in the last 14 days.'
      : reason === 'trending' ? `Gained ${skill.velocity_7d} GitHub stars in the last 7 days.`
        : 'A well-documented pick from the WorkflowStacks catalog.',
  }
  if (reason === 'trending') facts.stars_gained_last_7_days = skill.velocity_7d
  if (guide.whatItDoes) facts.guide_what_it_does = guide.whatItDoes
  if (Array.isArray(guide.whenToUse) && guide.whenToUse.length) facts.guide_when_to_use = guide.whenToUse.slice(0, 4)
  if (guide.examplePrompt) facts.guide_example_prompt = guide.examplePrompt
  if (guide.gotcha) facts.guide_gotcha = guide.gotcha
  return facts
}

export function productFacts(product, reason) {
  const by = product.by || 'WorkflowStacks'
  return {
    kind: `a product built by ${by}`,
    name: product.name,
    built_by: by,
    what_it_does: product.facts,
    why_today: reason === 'new-product' ? `Newly launched by ${by}.` : `Weekly ${by} product spotlight.`,
  }
}

export const subjectName = (s) => (s.kind === 'product' ? s.product.name : (s.skill.title_human || s.skill.name))
export const subjectRef = (s) => (s.kind === 'product' ? s.product.id : s.skill.id)

export function subjectUrl(subject, platform) {
  const base = subject.kind === 'product'
    ? subject.product.url
    : `${SITE}/skills/${encodeURIComponent(subject.skill.slug || subject.skill.id)}`
  // LinkedIn's commentary format reserves "_", so an escaped utm_source could
  // break the link; LinkedIn traffic is attributed by referrer anyway.
  if (!platform || platform === 'linkedin' || !base.startsWith(SITE)) return base
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}utm_source=${platform}&utm_medium=social&utm_campaign=daily`
}

// ----------------------------------------------------------- copy rules

export const LIMITS = { hook: 100, x: 150, linkedin: 1600, instagram: 1500, slide: 110 }
export const SLIDES = { min: 3, max: 5 }
// X allows 280 and counts the link as 23, plus four newline characters; the
// margin covers emoji and other characters X weighs double.
export const X_TEXT_BUDGET = 240
const TEXT_KEYS = ['hook', 'x', 'linkedin', 'instagram']

const BANNED = /game[- ]?changer|revolution|\bunlock|supercharg|level up|dive in|🚀/i
const HANDLE = /(^|[^\w.])@\w/
const DOMAIN = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|io|ai|dev|app|net|org|co|sh|so|xyz)\b/gi
const NUMBER = /\d+(?:[.,]\d+)*\s?[kKmM]?\b/g

function normNumber(tok) {
  const t = tok.replace(/\s/g, '').toLowerCase()
  const m = t.match(/^([\d.,]+)([km]?)$/)
  if (!m) return t
  const raw = m[1].replace(/,/g, '')
  return m[2] ? `${Number(raw)}${m[2]}` : String(Number(raw))
}

// Numbers and domains the facts contain, in the forms a writer would use them.
export function allowedTokens(facts) {
  const text = JSON.stringify(facts)
  const numbers = new Set()
  for (const tok of text.match(NUMBER) || []) {
    const n = normNumber(tok)
    numbers.add(n)
    // 12,345 may be written 12.3k or 12k; both are honest roundings.
    const v = Number(n)
    if (v >= 1000) {
      numbers.add(`${Number((v / 1000).toFixed(1))}k`)
      numbers.add(`${Math.round(v / 1000)}k`)
    }
  }
  const domains = new Set((text.match(DOMAIN) || []).map((d) => d.toLowerCase()))
  domains.add('workflowstacks.com')
  return { numbers, domains }
}

const words = (s) => new Set(String(s).toLowerCase().match(/[a-z0-9]{4,}/g) || [])
export function similarity(a, b) {
  const A = words(a), B = words(b)
  if (!A.size || !B.size) return 0
  let shared = 0
  for (const w of A) if (B.has(w)) shared++
  return shared / (A.size + B.size - shared)
}

// The mechanical half of the hygiene check. Returns a list of problems; empty
// means nothing here stops the post. recentHooks: hooks posted in the last 30
// days, so the feed does not repeat itself.
export function validateCopy(copy, facts, { recentHooks = [] } = {}) {
  if (!copy || typeof copy !== 'object') return ['not a JSON object']
  const problems = []
  for (const key of TEXT_KEYS) {
    if (typeof copy[key] !== 'string' || !copy[key].trim()) problems.push(`${key} is missing`)
  }
  if (!Array.isArray(copy.slides) || copy.slides.length < SLIDES.min || copy.slides.length > SLIDES.max
    || !copy.slides.every((s) => typeof s === 'string' && s.trim())) {
    problems.push(`slides must be ${SLIDES.min}-${SLIDES.max} non-empty strings`)
  }
  if (problems.length) return problems

  if (/\n/.test(copy.hook.trim())) problems.push('hook must be one line')
  const xLen = copy.hook.trim().length + copy.x.trim().length
  if (xLen > X_TEXT_BUDGET) problems.push(`hook + x is ${xLen} chars, limit ${X_TEXT_BUDGET}`)
  for (const h of recentHooks) {
    if (similarity(copy.hook, h) >= 0.6) problems.push(`hook is too close to a recent post: "${h}"`)
  }

  const { numbers, domains } = allowedTokens(facts)
  const fields = [...TEXT_KEYS.map((k) => [k, copy[k], LIMITS[k]]), ...copy.slides.map((s, i) => [`slide ${i + 2}`, s, LIMITS.slide])]
  for (const [key, text, limit] of fields) {
    if (text.length > limit) problems.push(`${key} is ${text.length} chars, limit ${limit}`)
    if (HANDLE.test(text)) problems.push(`${key} contains an @handle`)
    if (BANNED.test(text)) problems.push(`${key} uses a banned cliché`)
    for (const d of text.match(DOMAIN) || []) {
      if (!domains.has(d.toLowerCase())) problems.push(`${key} contains a link or domain: ${d}`)
    }
    for (const n of text.match(NUMBER) || []) {
      if (!numbers.has(normNumber(n))) problems.push(`${key} uses a number not in the facts: ${n.trim()}`)
    }
    const emoji = text.match(/\p{Extended_Pictographic}/gu) || []
    if (emoji.length > 2) problems.push(`${key} has ${emoji.length} emoji, limit 2`)
  }
  const tags = copy.hashtags
  if (!Array.isArray(tags) || tags.length < 1 || tags.length > 5
    || !tags.every((t) => /^[A-Za-z][A-Za-z0-9]{1,29}$/.test(String(t).replace(/^#/, '')))) {
    problems.push('hashtags must be 1-5 words of letters and digits')
  }
  return problems
}

export function parseJsonObject(text) {
  const s = String(text || '')
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try { return JSON.parse(s.slice(start, end + 1)) } catch { return null }
}

// ---------------------------------------------------------- composition

// LinkedIn's "little text" commentary format: these characters are markup and
// must be backslash-escaped to appear literally.
export function linkedinEscape(text) {
  return String(text).replace(/[\\|{}@[\]()<>#*_~]/g, (c) => `\\${c}`)
}

export function composePosts(copy, subject) {
  const hook = copy.hook.trim()
  const tags = copy.hashtags.map((t) => String(t).replace(/^#/, ''))
  const linkedinBody = `${hook}\n\n${copy.linkedin.trim()}\n\n👉 ${subjectUrl(subject, 'linkedin')}`
  return {
    x: `${hook}\n\n${copy.x.trim()}\n\n${subjectUrl(subject, 'x')}`,
    linkedin: `${linkedinEscape(linkedinBody)}\n\n${tags.map((t) => `{hashtag|\\#|${t}}`).join(' ')}`,
    // What the LinkedIn post reads as once published, for the run summary.
    linkedinPreview: `${linkedinBody}\n\n${tags.map((t) => `#${t}`).join(' ')}`,
    // Instagram captions cannot carry a clickable link.
    instagram: `${hook}\n\n${copy.instagram.trim()}\n\n🔎 Find it on workflowstacks.com: search "${subjectName(subject)}".\n\n${tags.map((t) => `#${t}`).join(' ')}`,
  }
}

// Last mechanical gate before publishing, on the text exactly as it will go out.
export function platformProblems(composed) {
  const problems = []
  // X counts every link as 23 characters and emoji as two.
  const xText = composed.x.replace(/https?:\/\/\S+/g, 'x'.repeat(23))
  const xLen = [...xText].length + (xText.match(/\p{Extended_Pictographic}/gu) || []).length
  if (xLen > 280) problems.push(`X post is ${xLen} weighted characters, limit 280`)
  if (composed.linkedin.length > 3000) problems.push(`LinkedIn post is ${composed.linkedin.length} characters, limit 3000`)
  if (composed.instagram.length > 2200) problems.push(`Instagram caption is ${composed.instagram.length} characters, limit 2200`)
  const tags = composed.instagram.match(/#\w+/g) || []
  if (tags.length > 30) problems.push(`Instagram caption has ${tags.length} hashtags, limit 30`)
  return problems
}

// -------------------------------------------------------------- X OAuth

// RFC 3986 percent-encoding, as OAuth 1.0a requires.
const pct = (s) => encodeURIComponent(String(s)).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)

// OAuth 1.0a user-context header. A JSON body is not part of the signature;
// extraParams is for query or form parameters (and for the test vector).
export function oauth1Header({ method, url, consumerKey, consumerSecret, token, tokenSecret, extraParams = {}, nonce, timestamp }) {
  const oauth = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce || randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(timestamp || Math.floor(Date.now() / 1000)),
    oauth_token: token,
    oauth_version: '1.0',
  }
  const all = { ...extraParams, ...oauth }
  const paramString = Object.keys(all).map((k) => [pct(k), pct(all[k])])
    .sort(([a, av], [b, bv]) => (a === b ? (av < bv ? -1 : 1) : a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`).join('&')
  const base = [method.toUpperCase(), pct(url), pct(paramString)].join('&')
  const signature = createHmac('sha1', `${pct(consumerSecret)}&${pct(tokenSecret)}`).update(base).digest('base64')
  const header = Object.entries({ ...oauth, oauth_signature: signature })
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${pct(k)}="${pct(v)}"`).join(', ')
  return { header: `OAuth ${header}`, signature }
}

// ---------------------------------------------------------------- cards

const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const FONT = 'DejaVu Sans, Arial, sans-serif'
// The site's OG palette (app/skills/[id]/opengraph-image.js).
const C = { bg0: '#0A0C0D', bg1: '#101314', ink: '#ECEFEA', accent: '#C6F24E', muted: '#9AA39C' }

// Approximate advance widths of DejaVu Sans Bold in em, by character class.
// Wrapping by character count let "Your meeting ended an" run off a 1080px
// card at 76px; this errs wide so a line never reaches the edge.
function emWidth(ch) {
  if (ch === ' ') return 0.36
  if ('ijl.,:;\'!|'.includes(ch)) return 0.36
  if ('frtI()[]-'.includes(ch)) return 0.5
  if ('mwMW'.includes(ch)) return 1.04
  if (/[A-Z0-9]/.test(ch)) return 0.8
  return 0.7
}
export const textWidth = (text, size) => [...String(text)].reduce((w, ch) => w + emWidth(ch), 0) * size

export function wrapLines(text, size, maxPx) {
  const lines = []
  let line = ''
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    if (!line) line = word
    else if (textWidth(`${line} ${word}`, size) <= maxPx) line += ' ' + word
    else { lines.push(line); line = word }
  }
  if (line) lines.push(line)
  return lines
}

export function cardDetail(subject) {
  if (subject.kind === 'product') return `Built by ${subject.product.by || 'WorkflowStacks'}`
  const s = subject.skill
  const gh = repoOwner(s.github_url)
  const parts = []
  if (gh) parts.push(`by ${gh.owner}`)
  const stars = typeof subject.liveStars === 'number' ? subject.liveStars : s.github_stars
  if (typeof stars === 'number' && stars > 0) parts.push(`★ ${fmtCount(stars)} on GitHub`)
  if (subject.reason === 'trending') parts.push(`+${fmtCount(s.velocity_7d)} in 7 days`)
  else if (subject.reason === 'new') parts.push('new on WorkflowStacks')
  // One line at 30px: drop trailing parts rather than run off the card.
  while (parts.length > 1 && textWidth(parts.join('  ·  '), 30) > 912) parts.pop()
  return parts.join('  ·  ')
}

function frame(w, h, inner, { counter } = {}) {
  const pad = 84
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.bg0}"/><stop offset="1" stop-color="${C.bg1}"/></linearGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect x="${pad}" y="${pad}" width="52" height="52" rx="14" fill="${C.accent}"/>
  <text x="${pad + 72}" y="${pad + 40}" font-family="${FONT}" font-size="38" font-weight="700" fill="${C.ink}">workflow<tspan fill="${C.accent}">stacks</tspan></text>
  ${counter ? `<text x="${w - pad}" y="${pad + 40}" text-anchor="end" font-family="${FONT}" font-size="32" fill="${C.muted}">${xml(counter)}</text>` : ''}
  ${inner}
  <text x="${pad}" y="${h - pad}" font-family="${FONT}" font-size="34" fill="${C.muted}">workflowstacks.com</text>
</svg>`
}

function textBlock(lines, { x, y, size, color, weight = 700, lineH = Math.round(size * 1.2) }) {
  return lines.map((l, i) => `<text x="${x}" y="${y + i * lineH}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${color}">${xml(l)}</text>`).join('\n  ')
}

// The story as image frames: a cover with the hook, one frame per story beat,
// and a closing call to action. 1080x1350 (4:5) for feed posts and carousels,
// 1080x1920 (9:16) for Reels. The hook is the largest thing on the cover
// because the image is what people see in the first second.
export function storyFrames({ copy, subject, w = 1080, h = 1350, swipe = false }) {
  const pad = 84
  const inner = w - 2 * pad
  const total = copy.slides.length + 2
  const frames = []

  let size = 76
  let hook = wrapLines(copy.hook, size, inner)
  if (hook.length > 5) { size = 62; hook = wrapLines(copy.hook, size, inner) }
  const lineH = Math.round(size * 1.18)
  const name = wrapLines(subjectName(subject), 44, inner).slice(0, 2)
  const blockH = hook.length * lineH + 70 + name.length * 54 + 60
  const top = Math.max(300, Math.round((h - blockH) / 2))
  const nameTop = top + hook.length * lineH + 70
  frames.push(frame(w, h, [
    textBlock(hook, { x: pad, y: top, size, color: C.ink, lineH }),
    `<rect x="${pad}" y="${nameTop - 52}" width="96" height="6" rx="3" fill="${C.accent}"/>`,
    textBlock(name, { x: pad, y: nameTop + 20, size: 44, color: C.accent, lineH: 54 }),
    `<text x="${pad}" y="${nameTop + 20 + name.length * 54 + 16}" font-family="${FONT}" font-size="30" fill="${C.muted}">${xml(cardDetail(subject))}</text>`,
    swipe ? `<text x="${w - pad}" y="${h - pad}" text-anchor="end" font-family="${FONT}" font-size="34" font-weight="700" fill="${C.accent}">Swipe →</text>` : '',
  ].join('\n  '), { counter: swipe ? `1/${total}` : '' }))

  copy.slides.forEach((beat, i) => {
    const lines = wrapLines(beat, 64, inner)
    const y = Math.round((h - lines.length * 78) / 2) + 40
    frames.push(frame(w, h, [
      `<rect x="${pad}" y="${y - 110}" width="96" height="6" rx="3" fill="${C.accent}"/>`,
      textBlock(lines, { x: pad, y, size: 64, color: C.ink, lineH: 78 }),
    ].join('\n  '), { counter: `${i + 2}/${total}` }))
  })

  const cta = wrapLines(`Search "${subjectName(subject)}"`, 40, inner).slice(0, 3)
  const cy = Math.round(h / 2) - 60
  frames.push(frame(w, h, [
    `<text x="${pad}" y="${cy}" font-family="${FONT}" font-size="64" font-weight="700" fill="${C.ink}">Find it on</text>`,
    `<text x="${pad}" y="${cy + 80}" font-family="${FONT}" font-size="64" font-weight="700" fill="${C.accent}">workflowstacks.com</text>`,
    textBlock(cta, { x: pad, y: cy + 180, size: 40, color: C.muted, weight: 400, lineH: 52 }),
    `<text x="${pad}" y="${cy + 180 + cta.length * 52 + 40}" font-family="${FONT}" font-size="40" fill="${C.muted}">Save this for later.</text>`,
  ].join('\n  '), { counter: `${total}/${total}` }))

  return frames
}
