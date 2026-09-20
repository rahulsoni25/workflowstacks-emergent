# Vercel usage: what costs, what changed, what to check

This project runs on the Vercel Hobby plan. The two overages on record were
both driven by the same shape of work — regenerating catalog pages and calling
the site's own API from inside those regenerations — plus scheduled pipelines
that invoke Vercel functions many times a day:

| Date | What the repo recorded | Where |
| --- | --- | --- |
| 2026-08-11 | "blew past the Vercel Hobby Fast Origin Transfer / Fluid Active CPU limits" | `app/skills/[id]/page.js` (comment) |
| 2026-09-01 | "Fluid CPU (5h32m vs 4h Hobby cap)", "ISR writes (128K/200K)" | commit `9842b27` |

The Vercel dashboard (Usage tab) is the only source of truth for the current
period. This document does not repeat plan limits from memory; check the
numbers there and map them to the causes below.

## Where the usage comes from

Every Vercel function invocation, its CPU time, its wall-clock memory, the
bytes it returns to the edge, and every ISR / Data Cache write are billable
units. In this codebase they came from four places.

### 1. Pages that fetched the site's own API (fixed in code)

`app/skills/[id]/page.js`, the homepage, `/skills`, `/skills/page/N`,
`/discover`, `/hot`, `/best`, `/best/<category>`, `/learn/resources`,
`/submit`, `sitemap.xml`, `llms.txt`, `llms-full.txt`, the per-skill
Open Graph image and the MCP connector's `search_skills` all loaded their
data with `fetch("https://workflowstacks.com/api/...")` from inside the
server render.

On Vercel one such render was:

- 1 function invocation for the page
- +1 function invocation per internal API call (a skill page made 3)
- Fast Origin Transfer for each API response (it leaves the API function,
  crosses the edge and re-enters the page function)
- +1 ISR/Data Cache write per `next: { revalidate }` fetch, on top of the
  page's own ISR write

A skill page regeneration was therefore 4 invocations and ~4–5 cache
writes. With `revalidate = 86400` and crawlers (Google, Bing and the AI bots
`robots.txt` explicitly welcomes) re-requesting the ~2,000-page catalog
daily, that alone can exceed the Hobby ISR-write and CPU budgets.

**Change:** `lib/skills-data.js` is now the one implementation of the
catalog queries (list, detail, stats, hot lists, newsletter issues, the
`gems` aggregation and the search re-rank). Pages call it in-process; the
public API in `app/api/[[...path]]/route.js` calls the same functions, so
the API and the site cannot disagree. Each render is one invocation, no
self-transfer, and only the page's own ISR write. Local dev without
`MONGO_URL` falls back to the public API exactly as before; production
falls back only if a direct read throws.

### 2. Live GitHub work during a page render (now opt-in)

A skill page without a stored `codeflow` used to fetch the upstream repo's
metadata, languages and **recursive git tree** (often 1–2 MB) on the
Vercel function and analyse it with regexes — the single most CPU-expensive
thing a render could do — then cache each GitHub response (more ISR
writes). The daily `refresh-content.yml` → `/api/codeflow` job stores the
same result on the skill document, star-sorted so the pages with traffic
fill first.

**Change:** live builds (and the smaller "source spec" fallback) are off
unless `CODEFLOW_LIVE_BUILD=1` is set in Vercel env. Pages the daily job has
not reached yet render without the "How it works" section until it does.

### 3. Scheduled pipelines that invoke Vercel functions

| Schedule | Workflow / cron | Calls into Vercel per run | Status |
| --- | --- | --- | --- |
| daily 05:30 UTC | `blog-daily.yml` | up to ~52 (`rank`, `scout`, `start`, ≤48 × `advance`, `status`); `advance` has `maxDuration = 300` | pausable |
| daily 06:00 UTC | `refresh-content.yml` | up to ~75 (ingest, reclassify, ≤50 × `agent-rewrite`, dedupe, mcp configs, 4 × codeflow, cleanup, did-it-work, discover, ≤11 × refresh-stars, digest, syndicate) | pausable |
| daily 05:17 UTC | `enrich-catalog.yml` | was 3 (a wrapper that forwarded to 2 real calls); now 2 direct calls | pausable |
| daily 06:00 UTC | **Vercel cron** `/api/cron/refresh-skills` | 1 long run: the same GitHub search scrape as `/api/ingest` (06:00 in `refresh-content.yml`) plus a star refresh that `/api/refresh-stars` also does | **removed** |
| daily 04:00 UTC | **Vercel cron** `/api/cron/enrich-batch` | the same enrichment `enrich-catalog.yml` triggers at 05:17 | **removed** |
| daily 02:00 UTC | **Vercel cron** `/api/cron/security-monitor` | 1 cheap call (DNS-over-HTTPS + one audit query) | kept |
| 1st & 16th 04:00 UTC | `seo-optimize.yml` | 1 + ≤3 × `agent-rewrite` | pausable |
| Monday 05:15 UTC | `weekly-seo-review.yml` | ~10 × `/api/gsc`, blog status, a crawl of the live site; commits a report | pausable; report commit no longer triggers a deploy |
| Monday | `daily-newsletter.yml`, `find-creators.yml`, `indexnow.yml`, `verify-installs.yml` | 1 each | unchanged (cheap) |

`agent-rewrite` and the blog `advance` step wait on free-tier LLM
providers, so most of their cost is wall-clock (provisioned memory) rather
than CPU, but each call is still a full invocation.

**Emergency brake:** set the GitHub repository variable `PIPELINES_PAUSED`
to `true` (Settings → Secrets and variables → Actions → Variables). The
scheduled runs of `blog-daily`, `refresh-content`, `enrich-catalog`,
`seo-optimize` and `weekly-seo-review` then skip until it is unset. Manual
"Run workflow" still works. While paused: no new blog posts, no new
listings or rewrites, no star refresh (so `/hot` velocity goes stale), and
no Monday digest (it is a step inside `refresh-content`).

### 4. Deployments and middleware

- Every commit to `main` builds and deploys. `weekly-seo-review.yml` commits
  its report straight to `main`, and other bots/branches push often (the
  30-day log shows ~100 commits). `vercel.json` now has an `ignoreCommand`
  that skips the build when a commit only touches `reports/`, `docs/`,
  `.github/`, `scripts/`, `cli/`, `plugins/`, tests and the Claude/Emergent
  metadata dirs. The old trick of editing `README.md` to force a deploy
  still works because `*.md` at the root is not excluded; "Redeploy" in the
  dashboard does the same.
- Edge Middleware ran on every request under `/skills/*`, `/packs/*`, etc.
  — including every catalog page view — and fell through on nearly all of
  them. The matcher is now limited to UUID-shaped ids (the only case the
  redirect applies to) and to single-slug URLs under the six static
  registries (the only case the 404 check applies to).

## Public API responses now carry their cache header themselves

`vercel.json` already declared `s-maxage` for the public catalog endpoints,
but the API handlers set nothing, and I could not verify from this
environment how the platform merges those with a function's own headers.
`GET /api/skills` (except `all=true`), `GET /api/skills/:id`, `/api/stats`,
`/api/hot` and `/api/newsletter/issues` now set `Cache-Control` on the
response itself, with the same TTLs, so repeat reads from the catalog grid,
the builder, crawlers and the MCP connector are served by the CDN.

## What to verify after deploying

From any machine (this sandbox could not reach the site):

```bash
# API responses: expect cache-control with s-maxage and, on a second request, x-vercel-cache: HIT
curl -sI 'https://workflowstacks.com/api/skills?limit=1' | grep -i -E 'cache-control|x-vercel-cache'
curl -sI 'https://workflowstacks.com/api/stats'          | grep -i -E 'cache-control|x-vercel-cache'

# A skill page: second request should be HIT (or STALE) within the day
curl -sI 'https://workflowstacks.com/skills/<any-slug>'  | grep -i -E 'cache-control|x-vercel-cache'

# A UUID URL should still 308 to the slug; a slug URL should no longer run middleware
curl -sI 'https://workflowstacks.com/skills/<a-uuid>'    | grep -i -E '^HTTP|location'
```

In the Vercel dashboard, over the following 2–3 days, expect:

- Function invocations: roughly a quarter of the previous rate for the
  catalog pages (1 per render instead of 4), and ~3 fewer scheduled runs a
  day from the removed crons and wrapper.
- ISR writes: roughly one per page regeneration instead of four to five.
- Fast Origin Transfer: the internal API payloads disappear; the sitemap's
  two 2,000-row responses were the largest single self-transfer.
- Edge Middleware invocations: a small fraction of the previous count.

## Remaining levers (product decisions, not made here)

1. **Blog cadence.** `blog-daily.yml` is the longest-running pipeline (up to
   48 × 300 s `advance` calls). Running it every other day
   (`cron: '30 5 */2 * *'`) halves that cost.
2. **AI crawlers.** `app/robots.js` explicitly allows GPTBot, ClaudeBot,
   CCBot, Amazonbot, PerplexityBot and others. Each full crawl re-renders
   any page whose day-long cache has expired. Vercel's Firewall has a
   managed "AI bots" rule if the GEO benefit is not worth the render cost.
3. **Star refresh depth.** `refresh-content.yml` runs up to 11 × 80-repo
   star passes a day. Fewer passes means slower `/hot` velocity coverage.
4. **Catalog page TTL.** Skill pages revalidate daily; doubling to 48 h
   halves regenerations again at the cost of staler star counts on pages.

## Rollback

Every change is code in this branch. To restore live GitHub builds on
render set `CODEFLOW_LIVE_BUILD=1`; to re-enable a removed Vercel cron add
its entry back to `vercel.json` (the route handlers were kept); to remove
the build skip delete `ignoreCommand`.
