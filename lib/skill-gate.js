import { isAiRelevant, guideRichness } from './skill-relevance'

// The one definition of "a catalog page we want Google to index".
//
// Two places read it and must agree:
//   - app/sitemap.js        which catalog URLs are submitted
//   - app/skills/[id]/page.js  which catalog pages carry index,follow and which
//                              carry noindex,follow
//
// They used to disagree. The sitemap submitted the ~500 pages that pass this
// gate, but every one of the ~2,500 catalog pages stayed indexable, so what
// Google evaluated was the whole catalog of README-derived pages, not the
// gated slice. Search Console, 2026-09-28: 549 "Crawled - currently not
// indexed", 504 "Discovered - currently not indexed", 0 indexed out of 674
// submitted. That is the signature of a site-level quality judgement, not a
// technical block (robots, canonicals, server rendering all check out).
//
// A page that fails the gate stays live and internally linked (follow), so
// discovery and link equity keep working; it just stops asking to be indexed.
// The indexable set and the sitemap are now the same set.
export const SKILL_GATE = {
  minRewriteScore: 8, // == the publish gate; relevance is handled separately
  minStars: 1000, // upstream notability => real query volume for the tool name
  minGuideRichness: 600, // chars of OUR written guidance
}

// Fields passesSkillGate() reads. Query with this projection so a sitemap
// build does not pull README previews and codeflow blobs for 2,500 docs.
export const SKILL_GATE_PROJECTION = {
  _id: 0, id: 1, slug: 1, name: 1, title_human: 1, description: 1,
  github_topics: 1, github_stars: 1, rewrite_score: 1, use_guide: 1,
  dead_repo: 1, last_updated: 1, rewritten_at: 1,
}

// Coarse Mongo-side pre-filter matching the numeric parts of the gate, so the
// sitemap query returns hundreds of docs instead of thousands. The JS check
// below is still the authority (relevance and guide richness need JS).
export const SKILL_GATE_QUERY = {
  published: { $ne: false },
  dead_repo: { $ne: true },
  slug: { $nin: [null, ''] },
  rewrite_score: { $gte: SKILL_GATE.minRewriteScore },
  github_stars: { $gte: SKILL_GATE.minStars },
}

export function passesSkillGate(s) {
  if (!s) return false
  const score = typeof s.rewrite_score === 'number' ? s.rewrite_score : 0
  const stars = typeof s.github_stars === 'number' ? s.github_stars : 0
  return (
    !s.dead_repo &&
    // Topical relevance judged from the upstream repo, not our `category`
    // field, which has filed the Linux kernel and Flutter as `ai-agent`.
    isAiRelevant(s) &&
    // No slug means a /skills/<uuid> URL: no keyword signal, unreadable in a
    // SERP. The slug backfill gives it one; until then it is not indexable.
    !!s.slug &&
    score >= SKILL_GATE.minRewriteScore &&
    stars >= SKILL_GATE.minStars &&
    guideRichness(s.use_guide) >= SKILL_GATE.minGuideRichness
  )
}

// When OUR content on the page last changed. `rewritten_at` is the date the
// title, description and guide were (re)written; `last_updated` is the
// upstream repo's push date and moves daily for active repos, which told
// Google "everything changed" every day while the rewrites that mattered
// went unannounced. Returns undefined when neither is a usable date, so the
// caller omits <lastmod> rather than inventing one.
export function skillLastModified(s) {
  for (const v of [s?.rewritten_at, s?.last_updated]) {
    if (!v) continue
    const d = new Date(v)
    if (!Number.isNaN(d.getTime())) return d
  }
  return undefined
}
