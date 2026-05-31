# Rating Baseline — WorkflowStacks

The **Rating Council** (`.claude/workflows/rating-council.js`) scores the live site
across the dimensions below on every meaningful change. It compares the new score to
this baseline; if any dimension **regresses**, it auto-spawns remediation agents and we
fix until it improves. Update the scores here after each accepted council run.

## Dimensions (0–10 each)

| Key | Dimension | What it covers |
|-----|-----------|----------------|
| `ux_clarity` | UX & Clarity | Is each page self-explanatory? Are inner pages and CTAs clear? Concept clarity (skills vs packs vs playbooks vs personas). |
| `content_depth` | Content Depth | Do pages deliver the outcome on-page (how-to-use guides, playbook steps, persona briefs) vs sending users away? |
| `seo_perf` | SEO & Performance | SSR content, per-page metadata, sitemap/robots, OG images, first paint, mobile. |
| `trust_conversion` | Trust & Conversion | Real metrics, quality score, "verified", free positioning; working CTAs; the land→evaluate→build→save funnel. |
| `tech_security` | Technical & Security | Auth on expensive endpoints, quality gate, no broken buttons/dupes, error/404/loading states. |

## Current baseline (to be set/updated by the council)

_Run `rating-council` to populate. The first run sets the baseline._

| Dimension | Score | Last updated |
|-----------|-------|--------------|
| ux_clarity | 7.0 | 2026-05-31 (run 1) |
| content_depth | 5.0 | 2026-05-31 (run 1) |
| seo_perf | 7.5 | 2026-05-31 (run 1) |
| trust_conversion | 3.0 → fixing | 2026-05-31 (run 1) |
| tech_security | 6.0 → fixing | 2026-05-31 (run 1) |
| **Overall** | **5.7** | 2026-05-31 (run 1) |

### Run 1 findings (remediated)
- Security: `/api/seed-ecommerce` unauthenticated (FIXED — guarded), fail-open auth (FIXED — fail-closed)
- Trust: fabricated testimonials/SOC2/uptime/user-count, misleading paid tiers, broken OG image (ALL FIXED)
- Remaining: content depth (quickStart boilerplate, playbook/persona paste-ready configs), inflated stars on some repos, per-page OG on section pages

### Competitor Council deploy plan (run 1) — next opportunities
1. **Read-the-source spec sheet** — render full skill source (file tree, named components, line counts) inline & free, before install (inverts rivals' pay-to-inspect)
2. **GitHub-native trust strip** on every card (live stars/forks/maintainer/recency)
3. **Listing IS the installer** — one-click copy install command
4. **Transparent security-scan strip** — honest checklist + linked raw output

## How to run
- Rating council: `Workflow({ scriptPath: ".claude/workflows/rating-council.js", args: { baseUrl, baseline } })`
- Competitor council: `Workflow({ scriptPath: ".claude/workflows/competitor-council.js" })`
