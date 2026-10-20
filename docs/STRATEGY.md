# Strategy: what skills.sh teaches, and what we do about it

Written 2026-10-20. Companion to `docs/INDEXING-DIAGNOSIS.md` (why Google is
not indexing this site) and `docs/RATING-BASELINE.md`.

skills.sh (Vercel's agent-skills directory, launched 20 Jan 2026) was indexed
by Google within weeks. WorkflowStacks has 25 indexed pages out of ~840
crawled. The comparison below is built only from what Google itself returns
for skills.sh (search results are indexed pages) and from launch coverage;
the site could not be fetched directly. Sources are listed at the end.

## 1. What we learn

| # | skills.sh | WorkflowStacks before today | Can code fix it? |
|---|---|---|---|
| 1 | **Every level is a page, and the URL is the query.** Owner pages (`/anthropics`), repo pages (`/anthropics/claude-code`), skill pages (`/anthropics/skills/frontend-design`), per-agent hubs (`/agent/claude-code`, titled "Skills for Claude Code — Install via the skills CLI") and topic hubs (`/topic/design`). Each skill page hangs off several hubs. | One hub type (`/best/<category>`) named after internal categories. 168 of 400 crawled pages had one inbound link. No page answers "skills for Cursor". | Yes |
| 2 | **First-party data on every page.** Install counts in the snippet ("875 installs"); ranking by installs and 8-week activity. The number exists nowhere else, so the page is not a copy of GitHub. | Install counts, CI-verified installs and the Codeflow setup verdict are all recorded, but none of them reach the `<title>`, description or structured data. | Yes |
| 3 | **The author's words.** Each page shows the SKILL.md description its author wrote. | 1,175 of 2,582 pages carried the same machine-written template ("Get X with Y, for founders…"); the repo's own description was not shown. | Yes |
| 4 | **Authority from a launch, not from SEO.** Vercel changelog and blog, Product Hunt #3 of the day, InfoQ, TechInformed, DEV, then a layer of third-party directories and framework docs linking in. Thousands of links in weeks. | No Product Hunt, HN or Reddit mention in the repo; no recorded backlinks. The README badge and creator emails exist but are the only link engine. | No — owner playbook (§3) |
| 5 | **(From our own data, not skills.sh)** The pages Google *did* index here are small, specifically named tools (oysterworkflow, supoclip, clippedai, lookml-generator…), not the famous ones. | The sitemap gate assumed the opposite (1,000+ stars). | Yes — done (`lib/skill-gate.js`) |

What we deliberately do **not** copy: 1.37M bulk-indexed pages and a
leaderboard whose ranking is partly circular (installs drive the leaderboard,
the leaderboard drives installs). skills.sh can carry that volume on Vercel's
authority; this domain got a site-level quality verdict for far less. Fewer,
better pages is the only path from here.

## 2. What is implemented (branch `claude/busy-heisenberg-27qcit`)

**Learning 1 — structure**
- `/for/<tool>` hub pages for Claude Code, Claude Desktop, Claude Cowork,
  Cursor, Windsurf, VS Code, Antigravity, ChatGPT and Gemini, plus the `/for`
  index (`lib/install-targets.js`, `app/for/`). Each lists the best listings
  that install into that tool, ranked by the depth of our guide and the
  rewrite score first, then stars; the hot and new ones; the install paths
  for that tool; cross-links to every other hub and to `/best/<type>`.
- Linked from the header "Browse" menu, the footer and the sitemap
  (priority 0.8, same as `/best`).
- The existing hubs stay: `/best/<category>`, `/mcp`, `/collections`,
  `/creators/<handle>` (indexable once claimed).

**Learning 2 — first-party proof**
- Skill page meta description now ends with "· N installs · install
  verified" when the numbers exist (`app/skills/[id]/page.js`).
- `SoftwareApplication` JSON-LD carries `interactionStatistic`
  (InstallAction, server-side count).
- The page shows "N installs via WorkflowStacks" next to the existing
  "Install verified" chip (`SkillDetailClient.js`).
- Installs are now counted from every channel, including the CLI and the
  MCP connector (`lib/track-install-server.js`), so the number is real.

**Learning 3 — author's words**
- Under our plain-English description, the page prints the repo's own
  description verbatim, labelled "From the repo", whenever it differs.
- The daily rewrite backfill keeps replacing the templated copy; the
  fortnightly SEO job has a 45-day per-record cooldown so pages stop
  rewriting themselves.

**Learning 5 — which pages ask to be indexed**
- The index gate (`lib/skill-gate.js`) is our content quality only: rewrite
  score ≥ 8, ≥ 600 characters of guide we wrote, a slug, AI relevance, a
  live repo. No star floor. Pages outside it are `noindex,follow`; the
  sitemap lists exactly the indexable set with honest `lastmod`.

## 3. What only the owner can do (learning 4, in order)

1. **Search Console this week**: Sitemaps → confirm "Success"; Crawl stats →
   look for 5xx/host errors in Aug–Oct; Request indexing for `/for`,
   `/for/claude-code`, `/for/cursor`, `/skills`, `/templates`, `/automate`,
   `/blog` and the eight niche skill pages that already rank.
2. **Launch, properly, once the Monday release is live**: Product Hunt and a
   Hacker News "Show HN" on the same day, with the MCP connector and the
   `/for/claude-code` page as the hook ("search and install 900 vetted
   open-source skills from inside Claude Code"). Post in the n8n community
   forum with the free templates. That is the first 50 links.
3. **Turn creators into links**: every skill page already offers the README
   badge markdown. The weekly featured-creator email should lead with it.
   Ten creators adding the badge is ten repo READMEs linking in.
4. **Get listed where skills.sh is listed**: the same third-party directories
   that link to skills.sh (agenticskills.io, everydev.ai, toolworthy.ai,
   mcpservers.org, openskillindex.com) accept submissions.
5. **Vercel Pro**: Hobby is non-commercial and pauses on overage; a paused
   project is an outage to Googlebot.

## 4. How we know it is working (weekly, from `reports/seo/<date>.md`)

| Signal | Now (2026-10-20) | Target in 6 weeks |
|---|---|---|
| Indexed pages (Search Console → Pages) | 25 | 150+ |
| "Crawled – currently not indexed" | 758 | falling; most of the catalog moves to "Excluded by noindex" |
| `/skills` crawl date | none | present, then "Indexed" |
| 28-day impressions | 16 | 300+ |
| Pages with ≤1 inbound link (crawl) | 168 | under 60 |
| Homepage mobile Lighthouse | 59 | 75+ |
| Referring domains (Search Console → Links) | not recorded | 20+ |

If after six weeks the ~900 gated pages are still "Crawled – not indexed",
raise `minGuideRichness` and cut the set again; if the niche pages keep
getting indexed, that confirms the thesis and the next move is more original
guide content on exactly those pages, not more pages.

## Sources

skills.sh pages as indexed by Google: `/agent/claude-code`,
`/anthropics/claude-code`, `/anthropics/skills/frontend-design`,
`/topic/design`, `/anthropics`, `/kostja94/marketing-skills/robots-txt`.
Launch and coverage: Vercel changelog "Introducing skills, the open agent
skills ecosystem" (2026-01-20), Vercel blog "Introducing skills", the Product
Hunt launch listing (2026-01-31, #3 Product of the Day), InfoQ (Feb 2026),
TechInformed, DEV Community, Skillselion install rankings (Jul–Aug 2026),
agenticskills.io's directory comparison (verified 2026-09-04), AG2 docs
(SkillSearchToolkit), ToolWorthy.
