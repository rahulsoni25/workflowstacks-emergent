// The SEO hygiene checks for catalog records, in one place.
//
// Two routes read them and must agree:
//   - app/api/seo-optimize       applies the mechanical fixes and reports the
//                                records it cannot fix (needsRewrite)
//   - app/api/agent-rewrite      ?seoFlagged=true rewrites exactly those
//                                records, so the fortnightly workflow's LLM
//                                step only touches what the mechanical step
//                                gave up on
//
// Before they shared this, the workflow's rewrite step selected by
// `rewritten_by` instead (?pending=true), which has nothing to do with these
// checks: it picked live, healthy pages and skipped thin ones.

export const MAX_TITLE = 60 // SERP truncation point
export const MIN_TITLE = 15
export const MAX_DESC = 160
export const MIN_DESC = 50
export const COOLDOWN_DAYS = 45

// The working set: live records not touched by the optimizer in the last
// COOLDOWN_DAYS. The cooldown prevents the flip-flopping that makes Google
// distrust a page. Both routes stamp `seo_optimized_at` when they act on a
// record, so the cooldown covers the mechanical and the rewrite step alike.
export function seoWorkingSetQuery(now = Date.now()) {
  const cooldown = new Date(now - COOLDOWN_DAYS * 86400000)
  return {
    published: { $ne: false },
    $or: [{ seo_optimized_at: { $exists: false } }, { seo_optimized_at: { $lt: cooldown } }],
  }
}

export const SEO_WORKING_SET_PROJECTION = {
  id: 1, slug: 1, name: 1, title_human: 1, description_human: 1,
  description: 1, github_url: 1, github_stars: 1,
}

export const SEO_WORKING_SET_MAX = 2000

// Truncate ONLY at a clean word boundary. Returns null when it cannot cut
// cleanly — the caller then leaves the text alone and defers to the
// judge-gated rewriter.
//
// This refusal is the whole point. A naive character cut turns
// "Content Generation with content-generation-solution-accelerator" into
// "...solution-acceler", which is exactly the mid-word junk that got
// /api/rewrite-titles disabled. Emitting nothing beats emitting garbage.
export function trimTo(text, max) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  // Require the boundary to retain at least 60% of the budget, otherwise the
  // result is too stunted to be a faithful shortening of the original.
  if (lastSpace < max * 0.6) return null
  const out = cut.slice(0, lastSpace).replace(/[,;:\-–—\s]+$/, '')
  return out.length >= max * 0.5 ? out : null
}

// Owner login from the repo URL — a factual disambiguator for duplicate
// titles. Using real provenance rather than inventing a differentiator.
export function ownerOf(skill) {
  const m = /github\.com\/([^/]+)/.exec(skill.github_url || '')
  return m ? m[1] : ''
}

// Runs every check over the working set, in order. Returns one action per
// record that fails a check: { id, slug, reasons, set, needsRewrite }, where
// `set` is the mechanical fix (null when there is none) and `needsRewrite`
// marks a record only an LLM rewrite can repair. Records that pass every
// check are not returned.
//
// Duplicate titles are counted across the whole working set before any
// record is judged, so the first occurrence can be left alone and only the
// collisions repaired. A record's result depends only on the records before
// it, so taking the first N actions equals stopping after N.
export function auditSeo(docs) {
  const titleCounts = new Map()
  for (const d of docs) {
    const t = (d.title_human || d.name || '').trim().toLowerCase()
    if (t) titleCounts.set(t, (titleCounts.get(t) || 0) + 1)
  }
  const seenTitle = new Set()

  const actions = []
  for (const d of docs) {
    const set = {}
    const reasons = []

    const title = (d.title_human || d.name || '').trim()
    const titleKey = title.toLowerCase()

    // Anything trimTo refuses to shorten cleanly is escalated to the
    // judge-gated rewriter instead of being mangled here.
    let unfixable = false

    // 1. Duplicate title — disambiguate with the real repo owner.
    if (title && titleCounts.get(titleKey) > 1) {
      if (seenTitle.has(titleKey)) {
        const owner = ownerOf(d)
        if (owner && !titleKey.includes(owner.toLowerCase())) {
          const next = trimTo(`${title} by ${owner}`, MAX_TITLE)
          if (next) {
            set.title_human = next
            reasons.push('duplicate-title')
          } else {
            unfixable = true
            reasons.push('duplicate-title-needs-rewrite')
          }
        }
      } else {
        seenTitle.add(titleKey)
      }
    }

    // 2. Title too long for the SERP.
    if (!set.title_human && title.length > MAX_TITLE) {
      const next = trimTo(title, MAX_TITLE)
      if (next) {
        set.title_human = next
        reasons.push('title-too-long')
      } else {
        unfixable = true
        reasons.push('title-too-long-needs-rewrite')
      }
    }

    // 3. Description length. Too-long is mechanically fixable; too-short is
    //    NOT — inventing words would be fabrication, so it's only reported
    //    and handed to agent-rewrite, which is judge-gated.
    const desc = (d.description_human || d.description || '').trim()
    if (desc.length > MAX_DESC) {
      const next = trimTo(desc, MAX_DESC)
      if (next) {
        set.description_human = next
        reasons.push('description-too-long')
      } else {
        unfixable = true
        reasons.push('description-too-long-needs-rewrite')
      }
    }

    const needsRewrite = unfixable || title.length < MIN_TITLE || desc.length < MIN_DESC

    if (Object.keys(set).length > 0) {
      actions.push({ id: d.id, slug: d.slug, reasons, set, needsRewrite })
    } else if (needsRewrite) {
      actions.push({ id: d.id, slug: d.slug, reasons: ['too-thin-for-deterministic-fix'], set: null, needsRewrite })
    }
  }
  return actions
}
