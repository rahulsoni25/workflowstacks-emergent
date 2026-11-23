# Traffic plan: indexing fixes and 1,000 US visitors a month

Written 2026-11-23. Follows `docs/INDEXING-DIAGNOSIS.md` (2026-10-20) and
`docs/STRATEGY.md`. Every number has its source next to it. Nothing here
came from Google Analytics, which this session could not reach.

## 1. Where traffic stands

| Metric | Value | Source |
|---|---|---|
| Google, 28 days (22 Oct – 18 Nov), all countries | 1 click, 33 impressions, avg position 23.4 | GitHub Actions run 44684730429 ("SEO report (Search Console)", 20 Nov), `/api/gsc?action=overview` |
| Google, same window, **United States** | **0 clicks, 21 impressions**, avg position 12.5 | same run, `action=countries` |
| Google, 7 days to 7 Nov | 0 clicks, 3 impressions | `reports/seo/2026-11-09.md` |
| Pages with impressions (28 days) | `/` plus 5 niche skill pages (facebook-ads-analyzer, lookml-generator, rileytestut-clip, obsidian-clipper, claude-opus-interface-toolkit) | same run, `action=pages` |
| Sitemap | 1,186 URLs submitted, downloaded by Google 19 Nov, 0 errors | same run, `action=sitemaps` |
| URL inspection sample | only `/` indexed; `/skills`, `/collections`, `/bundles/lead-finder`, a blog post: "URL is unknown to Google"; template/automate/mcp pages: crawled–not indexed, last crawl 23 Jul – 18 Aug | `reports/seo/2026-11-09.md` |
| Outage | site answered HTTP 402 (Vercel paused the project) 14–18 Nov | commit `980598e` |
| Blog | nothing published since 18 Oct; 22 Nov run failed on an OpenRouter 404 | issue #124, run 45027927941 |
| GA4 page views | ~25–60/day, ~100 on Mondays (as of 20 Oct; no newer figure in the repo) | `docs/STRATEGY.md` §4 |

**Live audit (this session, 23 Nov).** Every non-skill URL in the sitemap
and 120 random skill pages (291 URLs), fetched as Googlebot: all 200, no
`noindex`, all self-canonical. Skill pages carry a median 7,650 characters of
text. Nothing technical blocks indexing. What is wrong is Google's judgement
of the site (see `docs/INDEXING-DIAGNOSIS.md` §1a), made worse by the outages
and a near-zero link profile.

## 2. Can search deliver 1,000 US visitors by 30 November?

No. Google showed the site to US searchers 21 times in 28 days. Pages
Google has not fetched since July do not start ranking within a week, and
the code below ships with the 30 Nov release. Search is a 2–3 month
project. **This month's number has to come from distribution and, if you
want a guaranteed number on a date, paid traffic** (§5).

## 3. What changed in code (branch `claude/relaxed-ptolemy-d7t7tt`)

Found on the live site: the homepage, the only indexed page, linked 11 skill
pages and **6 of them were `noindex`**: all 5 in the Hot strip plus
`mcp-toolbox`. The Hot five are the fastest-growing repos this week
(+6,029 to +14,152 GitHub stars in 7 days, live `/api/skills/<slug>`), i.e.
the tools people are searching for now. Seven of the top ten had never been
scored because the daily rewrite walks the catalog oldest-first.

- `?mode=hot-gate` (`app/api/agent-rewrite/route.js`), run daily from
  `refresh-content.yml`: brings Hot skills up to the index gate, never
  unpublishes or downgrades anything, and pushes newly indexable pages to
  IndexNow (Bing → ChatGPT search, Copilot).
- Homepage featured rail only links pages that pass the index gate.
- Unknown `mode` values answer 400 instead of running the default rewrite.

## 4. What only you can do, in order

1. **Vercel → Usage**, then the project banner: find what caused the
   14–18 Nov pause. For those four days every URL Googlebot requested got a
   402. How Google treats a 4xx is in Search Central's "HTTP status codes,
   network and DNS errors" page
   (developers.google.com/search/docs/crawling-indexing/http-network-errors).
   **Not verified here:** that host was unreachable from this session, so
   read the page yourself rather than taking this doc's word for it. Hobby is
   also non-commercial only (`docs/COSTS.md`), and moving to **Vercel Pro**
   removes the pause risk (`docs/INDEXING-DIAGNOSIS.md` §3 item 6; check
   current terms and pricing on vercel.com).
2. **Merge PR #121** ("agent-rewrite: stop LLM failures and hidden skills
   from changing what's published"). Until it ships, an LLM outage during
   the daily run can set up to 150 live skill pages to `published: false`.
   Then merge this branch. Both ship in the 30 Nov release. To ship sooner,
   put `[deploy]` in the merge title (`AGENTS.md`).
3. **Search Console:**
   - Pages report: check whether `/` is still indexed after the outage.
   - URL Inspection → Request indexing (about 10 a day): `/`, `/for/claude-code`,
     `/hot`, `/skills`, `/blog`, then the Hot skill pages once the daily log
     ("Bring this week's Hot skills up to the index gate") shows
     `"indexable": true`.
4. **Bing Webmaster Tools**: add and verify the site and submit the
   sitemap. ChatGPT search and Copilot answer from Bing's index
   (`lib/indexnow.js` header comment).
5. **Distribution this week** (drafts in §6). Check each community's
   self-promotion rules before posting:
   - Show HN, one day; Product Hunt on a separate day.
   - Reddit: r/ClaudeAI, r/ClaudeCode, r/mcp, r/n8n, with the Hot list as
     the content and the site as the source, not an ad.
   - Directories that list skills.sh accept submissions: agenticskills.io,
     everydev.ai, toolworthy.ai, mcpservers.org, openskillindex.com
     (`docs/STRATEGY.md` §3, verified there on 2026-09-04, not re-checked).
   - Your own X / LinkedIn.
6. **Measure in GA4**: Reports → Demographics → country = United States,
   users per day. 1,000 a month is about 33 a day.

## 5. Paid traffic: the only lever with a date on it

US-targeted Meta, Reddit or Google ads to `/for/claude-code` or `/hot`
can deliver a set number of visits by a date. The cost is CPC × visits, and
this repo has no CPC data for this audience, so no number is given here. A
small, capped test (one ad set, US only, a 2–3 day daily cap) gives a real
CPC before you commit more.

## 6. Drafts (check every claim against the live page before posting)

**Show HN**

> Show HN: WorkflowStacks – find and install open-source AI skills from the terminal
>
> WorkflowStacks is a free catalog of open-source AI skills, agents and MCP
> servers from GitHub. Each listing has a short guide we wrote (what it does,
> when to use it, install, a first prompt, a gotcha), and only listings that
> pass a quality gate are indexed.
>
> `npx workflowstacks add <slug>` writes the skill's SKILL.md into
> `~/.claude/skills/`; `npx workflowstacks mcp` prints the MCP connector
> command so you can search the catalog from inside Claude.
>
> https://workflowstacks.com/hot ranks this week's skills by GitHub stars
> gained in 7 days. Feedback on the guides is very welcome.

**Reddit (r/ClaudeAI / r/ClaudeCode)**

> Title: The 5 fastest-growing Claude skills on GitHub this week (by stars gained in 7 days)
>
> 1. claude-bughunter (+11,225): Claude Code skill bundle for bug hunting and red-team work
> 2. superpowers (+6,349): agent framework and development methodology
> 3. soduwork (+6,029): self-hosted multi-agent workflows
> 4. …
>
> Full list, updated weekly: https://workflowstacks.com/hot

Figures from `/api/hot` on 2026-11-23 14:11 UTC. They change daily;
re-pull before posting and pick the entries that fit the subreddit.

**Product Hunt tagline (≤60 chars)**: "Find and install open-source AI skills in one command"

## 7. How we know it is working

| Signal | 23 Nov | Where |
|---|---|---|
| US users/day (GA4) | not available to this session | GA4 |
| Hot skills indexable | 0 of 5 on the homepage | daily `refresh-content` log |
| `/` indexed | yes as of 31 Oct crawl; recheck after outage | URL Inspection |
| 28-day impressions | 33 | Monday report `reports/seo/<date>.md` |
| Referring domains | not recorded | Search Console → Links |
