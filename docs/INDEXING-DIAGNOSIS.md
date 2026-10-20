# Why Google is not indexing workflowstacks.com — diagnosis, fixes, owner checklist

Written 2026-10-20 from the repository, the weekly Search Console reports in
`reports/seo/`, and the Search Console figures recorded in code comments. The
live site could not be fetched from the session that wrote this, so every
number below has a file reference.

## 1. What Google has actually done

| Date | Search Console | Source |
|---|---|---|
| 2026-07-29 | 1,450 URLs "Discovered – currently not indexed", 45 "Crawled – currently not indexed". Google sampled 45 skill pages, indexed none, stopped crawling. | `app/sitemap.js` header comment |
| 2026-09-28 | 549 "Crawled – currently not indexed", 504 "Discovered – currently not indexed", **0 indexed out of 674 submitted**. | `.github/workflows/rewrite-backfill.yml:7-10` |
| 2026-10-19 | Only `/` is "Submitted and indexed". `/skills`, `/skills/page/2`, `/collections`, `/bundles/lead-finder`, `/skills/browser-use` are "Discovered – not indexed" with **no crawl date**. `/templates/cold-email-personalizer`, `/automate/triage-your-inbox`, `/mcp/filesystem`, `/skills/ogcode` are "Crawled – not indexed", last crawled **23 Jul – 18 Aug**. A blog post is "URL is unknown to Google". | `reports/seo/2026-10-19.md:92-104` |
| 2026-10-19 | 1 click / 16 impressions in 28 days. Weekly impressions: 584 (wk of 12 Aug) → 60 → 63 → 20 → … → 3. | `reports/seo/2026-10-19.md:16`, `reports/seo/2026-09-10-review.md:27` |

Search Console "Page indexing" on 2026-10-20 (screenshot from the owner):

| Reason | Pages | What it is here |
|---|---|---|
| Crawled – currently not indexed | **758**, trend rising | Fetched and rejected on quality. Was 549 on 09-28, so Google *is* crawling more, and still saying no. |
| Discovered – currently not indexed | **516** | Known from the sitemap or links, never fetched. Crawl budget withheld. |
| Alternate page with proper canonical tag | 35 | Fine: `/skills/<uuid>`, `www.` and `?cb=` variants pointing at the right canonical. |
| Page with redirect | 11 | Fine: the UUID → slug 308s and www → apex. |
| Duplicate without user-selected canonical | 6 | Pages Google sees as copies of another URL. Needs the URL list to say which. |
| Soft 404 | 5 | Unknown skill ids served 200 (fixed on this branch: root `loading.js` removed). |
| Duplicate, Google chose different canonical | 2 | Needs the URL list. |
| Not found (404) | 0 | — |

So roughly 840 pages have been crawled and 25 are indexed. Crawling is not
the bottleneck; Google's judgement of the crawled pages is.

### What the indexed pages have that the others don't

The list of the 25 indexed URLs is not in the repository. The closest
evidence is the 13 pages that got impressions in the 28 days to 2026-10-17
(a page must be indexed to get an impression — `reports/seo/2026-10-19.json`,
`gsc.top_pages_28d`):

`/` · `/commands` · `/templates/ai-support-agent` · `/skills/oysterworkflow`
(position 1) · `/skills/supoclip` · `/skills/facebook-ads-analyzer` ·
`/skills/clippedai` · `/skills/clipper2` · `/skills/video-use` ·
`/skills/lookml-generator` · `/skills/openclaw-marketing-skills` · two
`/skills/<uuid>` pages.

The pattern: **small, specifically named tools**, not the catalog's
famous ones. For litellm, browser-use or langflow (`/skills/browser-use` is
"Discovered – not indexed") Google already has GitHub plus the official docs,
so a README-derived page is one more copy. For "oysterworkflow" or
"supoclip" this site is one of the only pages on the web that describes the
tool, so Google keeps it. Three of the eight are video-clip tools and two are
marketing tools, which matches the site's stated audience.

That is the opposite of the sitemap gate's old assumption (1,000+ stars =
worth submitting), so the star floor was removed from the index gate on this
branch (`lib/skill-gate.js`). Our own content quality (rewrite score, chars
of guide we wrote) now decides indexability; stars only set sitemap priority.

To confirm this against the real 25, export them (Page indexing → Indexed →
"View data about indexed pages" → Export, or Performance → Pages → Export)
and run, anywhere with network access:

```
node scripts/indexed-vs-catalog.mjs path/to/export.csv
```

It prints stars, rewrite score, guide length, category and slug/uuid for each
indexed skill page next to the same medians for a random sample of the
non-indexed catalog.

Two different things are going on, and they need different fixes.

### 1a. "Crawled – currently not indexed" on hundreds of pages, and no return visit for 2–3 months

This is Google's **quality verdict**, not a technical block. Googlebot fetched
the pages, read them, decided they were not worth an index entry, and has not
been back. Everything technical checks out (robots.txt, canonicals, server
rendering, structured data, no `noindex` on the pages concerned, Googlebot not
in the firewall deny list in `vercel.json`); the repo's own audit scores 8.9/10.

What Google saw when it sampled the site (July–August):

- ~2,500 catalog pages derived from third-party GitHub READMEs, of which
  **1,175 carried the same machine-written template** ("Get X with Y, for
  founders…"). The repo identified this as the leading hypothesis itself
  (`scripts/rewrite-backfill.mjs:6-8`). This is exactly the pattern Google's
  March 2024 "scaled content abuse" policy targets.
- 96% of sitemap URLs were those catalog pages (`app/sitemap.js` comment).
- Every one of the ~2,500 pages was **indexable**. The sitemap gate only
  controlled which ~500 were *submitted*; the other ~2,000 still said
  `index,follow` and were linked from `/skills/page/N`, so the site Google
  evaluated was the full catalog, not the gated slice.
- ~105 creator profile pages at crawl depth 2 (26% of the crawled graph), most
  with one inbound link (`reports/seo/2026-10-19.json` → `crawl.weak_inbound`:
  104 of 168 are `/creators/*`). They are `noindex` when unclaimed, which is
  right, but Googlebot still has to fetch each one to find that out.
- Unknown skill IDs returned HTTP **200** with a not-found body (soft 404),
  because the root `app/loading.js` Suspense boundary streamed the 200 before
  `notFound()` could run (`app/skills/[id]/page.js` comment, `middleware.js`
  comment). Search Console had reported "Soft 404" (`middleware.js:53-58`).

Once a site is judged this way, Google cuts its crawl rate for the host, which
is what produces the second symptom.

### 1b. "Discovered – currently not indexed" with no crawl date, 6 weeks after the crawl path was fixed

The 11 Aug commit `79a23ae` ("Move /skills catalog to real server-side
pagination") removed every `<a>` link to skill pages from `/skills`; impressions
fell from 584/week to 60 the following week. `15aa9d4` restored the links on
7 Sep (PR #31, merged 10 Sep). Structurally the fix is live (48 anchors on
`/skills`, `/skills/page/2` → 200), but Google still has not fetched `/skills`
at all. On a host it has already down-ranked, a URL it merely "discovered"
can sit unfetched for months. Nothing in the code can force that fetch; only
the owner actions in §3 can.

Two things in the code were making this worse:

- **The sitemap lied about `lastmod`.** Every static entry carried
  `lastModified: now` and was regenerated daily (since `a39a843`, 31 May), so
  the sitemap claimed 150 pages changed every day. Google documents that it
  ignores `<lastmod>` when it is not consistently accurate. Worse, skill
  entries used the upstream repo's push date, not the date *our* copy was
  rewritten — so when the rewrite backfill fixed the templated pages, the
  sitemap never told Google they had changed.
- **The sitemap was slow on a cold deploy.** It made two self-fetches of
  `/api/skills?limit=2000` with 15 s timeouts; after each weekly deploy the
  first fetch could time out and silently publish a sitemap with zero skill
  URLs (the code's own comment says so). A crawler's fetch of `/sitemap.xml`
  can give up before that.

### 1c. Things that were checked and are *not* the cause

- robots.txt allows Googlebot and points at the sitemap (`app/robots.js`).
- The www → apex 308 has been live since 22 Jul (`25a0c53`); the
  `www.workflowstacks.com/skills/<uuid>` rows still in Search Console are
  stale index entries that will consolidate.
- Content churn is bounded: the daily rewrite backfill only touches pages that
  still match the old template and exits when none remain; the fortnightly
  SEO-optimize job has a 45-day per-record cooldown.
- No `noindex` header or tag on the pages Google is not indexing.
- The crawler used for the weekly report saw 0 non-200 internally linked pages
  in every report since 10 Sep, so there was no multi-day outage at report
  time. Whether Vercel's Hobby-plan overage in September (`docs/COSTS.md:3-5`)
  paused the project on other days can only be seen in Search Console's crawl
  stats (§3).

## 2. What shipped on this branch for indexing

| Change | Files | Why |
|---|---|---|
| One catalog gate for both the sitemap and `robots` | `lib/skill-gate.js` (new), `app/sitemap.js`, `app/skills/[id]/page.js` | Catalog pages that fail the gate (score < 8, < 600 chars of our guidance, no slug, not AI-relevant, dead repo) now carry `noindex,follow`. They stay live and linked. The indexable set and the sitemap are now the same list (~950 URLs by the counts in the old sitemap comment) instead of ~500 submitted and ~2,500 indexable. No star threshold: see §1 for why. |
| Honest `<lastmod>` | `app/sitemap.js`, `lib/skill-gate.js` | Omitted where unknown; the rewrite date for skills; `updated_at` for posts (it was reading a field the store never returned). |
| Sitemap reads Mongo directly | `app/sitemap.js` | No more self-fetch timeouts on a cold deploy; same pattern the blog entries already used. |
| Real 404s | `app/loading.js` removed; comments in `app/skills/[id]/page.js`, `middleware.js` | `notFound()` now sets the status before anything streams. Soft 404s stop costing crawl budget. |
| Homepage LCP | `components/Analytics.js`, `app/HomeClient.js` | Tag scripts (gtag, GTM, Meta Pixel) load after idle or first interaction instead of during hydration; the hero no longer fades in from opacity 0. Mobile Lighthouse went 83 → 47 across the release that shipped the pixels (`reports/seo/2026-09-21.json` vs `2026-10-12.json`). |
| No UUID links from the homepage | `app/page.js` | The Hot rail skips slug-less entries. |
| SERP-length titles and descriptions | 16 page files | 14 titles over 65 chars and 12 descriptions over 165 chars shortened; the audit had flagged them every week since 10 Sep. |
| One positioning line everywhere | `lib/positioning.js` (new), `app/layout.js`, `components/Footer.js`, `app/about/page.js`, `README.md` | Six different descriptions of the site collapsed to one; JSON-LD `WebSite`/`Organization` now say the same thing as the title tag. |
| Slug backfill on the daily schedule | `.github/workflows/refresh-content.yml` | 495 catalog entries never had a slug; the backfill endpoint existed but was manual. |

Nothing above deploys until the Monday release (`docs/COSTS.md`).

## 3. What only the owner can do (in priority order)

1. **Search Console → Settings → Crawl stats.** Look at Aug–Oct for host
   status errors, 5xx, or a crawl-rate collapse. This is the one report that
   shows whether Googlebot was being turned away (Vercel pause, challenge
   mode) rather than choosing to stay away.
2. **Search Console → Sitemaps.** Confirm `https://workflowstacks.com/sitemap.xml`
   is listed, "Success", and shows the discovered-URL count. If it says
   "Couldn't fetch" or the count is far below ~600, that is §1b.
3. **URL Inspection → Request indexing** for, in this order: `/skills`,
   `/skills/page/2`, `/templates`, `/automate`, `/blog`, the five most recent
   blog posts, and the ten `/skills/*` pages with the highest stars. Quota is
   ~10/day; it is the only way to make Google fetch a URL it has merely
   "discovered".
4. **Links.** A zero-authority domain does not recover from a quality verdict
   without external links. The site already has a README badge
   (`/api/badge/<slug>.svg`) and a featured-creator email; those are the link
   engine. A Product Hunt / Hacker News "Show" launch and a post on the n8n
   community forum are the usual first three links for a site like this.
   There are no Product Hunt, HN or Reddit mentions anywhere in the code.
5. **Confirm the footer's social accounts exist** (`twitter.com/workflowstacks`,
   `github.com/workflowstacks`, `discord.gg/workflowstacks` in
   `components/Footer.js`). Dead profile links are a trust signal in the wrong
   direction.
6. **Vercel plan.** Hobby is for non-commercial use and the site takes
   payments (`docs/COSTS.md:47-51`); the September overage can pause the
   project, which Googlebot experiences as an outage. Pro removes both risks.
7. **Set the analytics env vars** if they are not set (`NEXT_PUBLIC_GA_ID`,
   `NEXT_PUBLIC_META_PIXEL_ID`); nothing in the repo shows whether any tag is
   live, so none of the conversion tracking can be confirmed.
8. **Re-run the catalog gate decision in 4–6 weeks** from Search Console
   coverage for the ~500 indexable pages, as `app/sitemap.js` always intended.
   Widen only if those get indexed; otherwise raise `minStars`.

## 4. How to tell it is working

Weekly, from `reports/seo/<date>.md`:

- "Indexation sample": `/skills` gains a crawl date, then flips to "Indexed".
- "Search Console": 28-day impressions climb back above 100.
- Google Search Console → Pages: "Crawled – currently not indexed" falls as
  the ~2,000 gated pages drop out (they will show under "Excluded by noindex
  tag", which is the intended state).
- Homepage mobile Lighthouse back above 75 in the "Core Web Vitals" table.
