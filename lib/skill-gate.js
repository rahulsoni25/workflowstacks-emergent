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
//
// Why there is NO star threshold (2026-10-20). The sitemap gate used to
// require 1,000+ upstream stars on the theory that a famous tool's name has
// query volume. Search Console says the opposite: of the 13 pages that got
// impressions in the 28 days to 2026-10-17, the skill pages were
// oysterworkflow (position 1), supoclip, clippedai, clipper2, video-use,
// lookml-generator, facebook-ads-analyzer and openclaw-marketing-skills —
// small, specifically named tools, not the catalog's 10k-star entries.
// For a famous tool Google already has GitHub and the official docs, so a
// README-derived page is a duplicate; for a small one this site is one of the
// only pages on the web. Stars still order lists and set sitemap priority;
// they no longer decide whether a page may be indexed. What does decide it is
// whether WE wrote something substantive about the tool (guide richness and
// rewrite score), which is also the only thing that separates these pages
// from scaled, templated content in Google's eyes.
export const SKILL_GATE = {
  minRewriteScore: 8, // == the publish gate; relevance is handled separately
  minGuideRichness: 600, // chars of OUR written guidance
  priorityStars: 1000, // sitemap priority only (0.6 vs 0.5), never indexability
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
}

export function passesSkillGate(s) {
  if (!s) return false
  const score = typeof s.rewrite_score === 'number' ? s.rewrite_score : 0
  return (
    !s.dead_repo &&
    // Topical relevance judged from the upstream repo, not our `category`
    // field, which has filed the Linux kernel and Flutter as `ai-agent`.
    isAiRelevant(s) &&
    // No slug means a /skills/<uuid> URL: no keyword signal, unreadable in a
    // SERP. The slug backfill gives it one; until then it is not indexable.
    !!s.slug &&
    score >= SKILL_GATE.minRewriteScore &&
    guideRichness(s.use_guide) >= SKILL_GATE.minGuideRichness
  )
}

// Sitemap priority: our own content quality decides indexability above; stars
// only nudge the order Google is told to prefer within the indexable set.
export function skillPriority(s) {
  const stars = typeof s?.github_stars === 'number' ? s.github_stars : 0
  return stars >= SKILL_GATE.priorityStars ? 0.6 : 0.5
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
