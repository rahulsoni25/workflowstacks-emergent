// SERP-length helpers for <title> and meta description.
//
// Google cuts titles at roughly 600px (about 60-65 characters) and snippets at
// about 155-160 characters, and scripts/seo-check.mjs flags anything over 65 /
// 165. A crawl of 303 sitemap pages on 2026-11-19 found 115 titles over 60
// characters (skill pages built from long `title_human` copy plus the
// " | WorkflowStacks" suffix, and every /best page) and 85 descriptions over
// 160 (templates, bundles, commands, newsletter issues, /best, /for). Google
// shows those with its own mid-phrase cut, so the part that reads as the
// promise of the page is often the part that gets dropped.

export const TITLE_MAX = 65
export const DESC_MAX = 160

const DANGLING = /\s+(?:for|and|with|to|of|in|on|at|by|from|the|a|an|your|&|\+|or|vs\.?)$/i

// Trim prose to a clean snippet. Prefers ending on a complete sentence;
// otherwise cuts on a word boundary and appends …, never mid-word.
export function clipText(text, max = DESC_MAX) {
  const t = String(text || '').replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max - 1)
  const sentenceEnd = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '))
  if (sentenceEnd > max * 0.55) return cut.slice(0, sentenceEnd + 1)
  const lastSpace = cut.lastIndexOf(' ')
  let out = lastSpace > max * 0.55 ? cut.slice(0, lastSpace) : cut
  out = out.replace(/[\s,;:.\-–—]+$/, '')
  while (DANGLING.test(out)) out = out.replace(DANGLING, '')
  return out + '…'
}

// Cut a title on a word boundary without an ellipsis (Google adds its own when
// it truncates, and a title ending in … reads as broken in a browser tab).
// A clause break (": ", " – ", " — ", " | ") late in the string is preferred
// over a bare word break; an early one would leave only the tool's name
// ("ktx-ai-data-agents-mcp-context-skills"), so it must keep 70% of the room.
function clipTitle(t, max) {
  if (t.length <= max) return t
  const cut = t.slice(0, max + 1)
  let best = -1
  for (const sep of [': ', ' – ', ' — ', ' | ', ' - ']) {
    const i = cut.lastIndexOf(sep)
    if (i > max * 0.7 && i > best) best = i
  }
  let out = best > 0 ? t.slice(0, best) : cut.slice(0, cut.lastIndexOf(' ') > max * 0.5 ? cut.lastIndexOf(' ') : max)
  out = out.replace(/[\s,;:.\-–—|]+$/, '')
  while (DANGLING.test(out)) out = out.replace(DANGLING, '')
  return out
}

// "<main> | WorkflowStacks" when it fits the SERP; the brand is dropped first
// (Google prints the site name above the result anyway), then the main text is
// cut on a clause or word boundary.
export function seoTitle(main, { brand = 'WorkflowStacks', max = TITLE_MAX } = {}) {
  const m = String(main || '').replace(/\s+/g, ' ').trim()
  if (!m) return brand
  if (brand) {
    const branded = `${m} | ${brand}`
    if (branded.length <= max) return branded
  }
  return clipTitle(m, max)
}

// A description built from a primary sentence plus an optional call-to-action
// suffix. Keeps both when they fit. When they don't, a long primary (the part
// unique to the page) is kept and clipped on its own; a short one keeps as much
// of the suffix as fits, so a 74-character blurb isn't left without its CTA.
export function seoDescription(primary, suffix = '', max = DESC_MAX) {
  const p = String(primary || '').replace(/\s+/g, ' ').trim()
  const s = String(suffix || '').replace(/\s+/g, ' ').trim()
  const both = s ? `${p} ${s}` : p
  if (both.length <= max) return both
  return p.length >= max * 0.6 ? clipText(p, max) : clipText(both, max)
}
