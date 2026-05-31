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
| ux_clarity | TBD | — |
| content_depth | TBD | — |
| seo_perf | TBD | — |
| trust_conversion | TBD | — |
| tech_security | TBD | — |
| **Overall** | **TBD** | — |

## How to run
- Rating council: `Workflow({ scriptPath: ".claude/workflows/rating-council.js", args: { baseUrl, baseline } })`
- Competitor council: `Workflow({ scriptPath: ".claude/workflows/competitor-council.js" })`
