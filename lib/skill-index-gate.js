import { isAiRelevant, guideRichness } from './skill-relevance'

// Which skill pages we ask Google to index. One rule, two consumers:
// app/sitemap.js submits the pages that pass, and app/skills/[id]/page.js
// marks every page that fails `noindex, follow`.
//
// --- Why skill pages are gated at all ------------------------------------
// Google Search Console (2026-07-29) reported 1,450 URLs "Discovered –
// currently not indexed" and 45 "Crawled – currently not indexed". Google
// sampled 45 skill pages, indexed none, then stopped crawling the rest.
//
// Skill pages are largely derived from third-party GitHub READMEs. At 1,749
// of 1,827 sitemap URLs (96%) they consumed nearly all crawl budget on a
// domain with little authority, starving the pages that are original work
// (templates, /automate outcome pages, MCP configs) — the ones that can
// actually rank. Google's scaled-content-abuse policy judges usefulness, not
// production method, so volume alone is a liability here.
//
// --- Why the gate now drives noindex, not just the sitemap (2026-09-29) ---
// Narrowing the sitemap alone did not work. Every skill page stayed live,
// linked from /skills/page/N and the related-skills module, and indexable,
// so Google still found ~1,800 thin or off-topic pages (/skills/hyprland,
// the Linux kernel, Flutter) by crawling. Search Console then moved pages
// that ARE original work out of the index too: /templates/cold-email-
// personalizer and /automate/triage-your-inbox went from "Submitted and
// indexed" (2026-09-10) to "Crawled – currently not indexed" (2026-09-28),
// and none of the 11 sampled URLs except "/" has been crawled since
// 2026-09-06. That is a site-level quality judgement, and the lever for it
// is what the site asks to have indexed. A URL outside the sitemap is only a
// discovery hint; `noindex` is the actual request.
//
// Pages that fail stay live and keep `follow`, so visitors and install links
// work and crawlers still pass through them to the pages that do pass.
//
// --- Thresholds (staged widening; stage 1 set 2026-09-06) ----------------
//   score>=9, stars>=1000, guide>=600  ->  143 pages
//   score>=8, stars>=1000, guide>=600  ->  447 pages   (current)
//   score>=8, stars>=100,  guide>=600  ->  871 pages
//   score>=8, stars>=0,    guide>=600  ->  952 pages
// (counts measured against the live catalog on 2026-09-06)
//
// 8 is the publish gate, so every page that passes already cleared the
// quality bar we set for showing it to a human at all, carries 600+ chars of
// guidance we wrote, and describes a tool notable enough (1k+ stars) for its
// name to have real query volume. Widen only when Search Console shows the
// pages inside the gate getting indexed — not by another guess.
export const SKILL_INDEX_GATE = {
  minRewriteScore: 8, // == the publish gate; relevance is handled separately
  minStars: 1000, // upstream notability => real query volume for the tool name
  minGuideRichness: 600, // chars of OUR written guidance; ~1/3 of the catalog falls below this
}

export function passesSkillIndexGate(s) {
  if (!s) return false
  const score = typeof s.rewrite_score === 'number' ? s.rewrite_score : 0
  const stars = typeof s.github_stars === 'number' ? s.github_stars : 0
  return (
    s.published !== false &&
    !s.dead_repo &&
    // Topical relevance, judged from the upstream repo rather than our stored
    // `category` field — that field is unreliable enough to have filed the
    // Linux kernel, Flutter and yt-dlp as `ai-agent`. See lib/skill-relevance.
    isAiRelevant(s) &&
    // Entries without a slug only have /skills/<uuid> — a URL carrying no
    // keyword signal, unreadable in a SERP and unquotable by an answer engine.
    // They wait for the slug backfill.
    !!s.slug &&
    score >= SKILL_INDEX_GATE.minRewriteScore &&
    stars >= SKILL_INDEX_GATE.minStars &&
    guideRichness(s.use_guide) >= SKILL_INDEX_GATE.minGuideRichness
  )
}
