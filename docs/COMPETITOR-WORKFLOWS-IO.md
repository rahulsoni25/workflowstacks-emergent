# Workflows.io vs WorkflowStacks — competitive analysis

Written 2026-10-27. Companion to `docs/STRATEGY.md` (skills.sh comparison) and
`docs/INDEXING-DIAGNOSIS.md`. Every number below carries its source. Figures
that only Workflows.io itself has published are marked **self-reported**.

## 0. How this was researched, and what could not be checked

- The session's network proxy refused direct connections to `workflows.io`,
  `getstarted.workflows.io`, `newsletter.workflows.io`, `seedtable.com`,
  `crunchbase.com`, `salesforge.ai`, `outboundsync.com` and
  `workflowstacks.com`. **Nothing on their website was read directly.** All
  website facts come from search-engine result snippets, which carry a date
  risk (the homepage snapshot the search engine holds is roughly two years old
  for some fields).
- Read directly: the two public GitHub repositories they publish (cloned,
  read-only), one Explorium business record (via the Vibe Prospecting MCP),
  Indeed's company endpoint, and this repository's own docs and reports.
- Not found anywhere: audited revenue, the newsletter subscriber count, the
  LinkedIn company-page follower count, YouTube or X follower counts, job
  descriptions with salary, employee reviews (Indeed's `cmp/Workflows` page
  has a 3.0 rating, no description and no address, so it may not even be this
  company), and any Product Hunt or Hacker News launch.
- "workflows.io" resolves to exactly one business: a go-to-market services
  agency. It is **not** a skills marketplace. The comparison below is still
  worth doing because they publish open-source Claude Code skills, run a free
  AI-tool directory, sell a Claude-Code-based way of working to the same
  founders and GTM teams WorkflowStacks wants, and own the word "Workflows" on
  LinkedIn.

## 1. Bottom line

| Question asked | Answer | Confidence |
|---|---|---|
| What are they? | AI-native GTM (go-to-market) services agency for B2B tech. Four lines: LinkedIn Content, Outbound, AI RevOps, ABM. Trades as Workflows Agency LLC, New York. | High (Explorium record, Seedtable, Crunchbase snippet) |
| New player? When launched? | Yes. Revenue from zero in **June/July 2025**; roughly 16 months old. One directory says "Est. 2024"; treat that as an outlier (see §2). | Medium-high |
| Revenue? | **Self-reported** ARR: $1M three months after launch; $2M by May 2026; $3.3M announced 16 Oct 2026. Explorium places yearly revenue in the $1M–$5M band. No audited figure exists. | Medium (self-reported, consistent across 4 sources) |
| Funding? | Bootstrapped. No rounds on record. | High |
| Team? | 11–50 band. Their own statements: 20 people (Apr 2026) → 22–24 → "30+" (Sep 2026 recap). | Medium |
| Hired most? | GTM engineers. A GTM Lead manages four GTM engineers; two senior GTM engineers are visible; the recurring job ad is "GTM Engineer". | Medium-high |
| Hiring now? | GTM Engineer (Milan, posted 26 Oct 2026), Senior RevOps Specialist; planned: a founding software engineer and two founding BDRs starting November. | High (careers page, job feed, founder post) |
| Marketing? | Founder-led LinkedIn (3 posts/week system), a Friday newsletter, free playbooks and a free tool directory, open-source GitHub kits, partner directories, self-published case studies, LinkedIn Live milestones. No paid ads evidence, no PH/HN. | High |
| Threat to WorkflowStacks? | Indirect today. Direct if their announced "MCP launch, CLI launch and Creator Program" turns into a GTM skills distribution channel. | Medium |

What we should do (detail in §9): list their 15 open-source skills and build a
GTM hub around them, recruit the two founders as creators, copy the content
engine (not the agency), fill the price gap between our $500 builds and their
$5K/month floor, and make our existing MCP connector and CLI the headline they
have only announced.

## 2. Identity and launch timeline

| Fact | Value | Source |
|---|---|---|
| Legal / trading name | Workflows Agency LLC, brand "Workflows.io" | Seedtable profile; Terms of Use as quoted by OneGTM (getaob.com) |
| Description (their words) | "AI-native GTM services company specializing in helping B2B tech companies scale revenue through 4 service lines: LinkedIn Content, Outbound, AI RevOps, and ABM… Not another software. Not another traditional agency." | Explorium business record (mirrors their LinkedIn description) |
| HQ | New York, United States; 2 US locations in the record | Crunchbase snippet; Explorium record |
| Industry codes | LinkedIn "Marketing Services"; NAICS 5418; SIC 7311 (advertising agencies) | Explorium record |
| Founders | Fivos Aresti and Dan Rosenthal (co-founders); Lorenzo Amadei named as the third builder of the team ("Dan Rosenthal, Fivos Aresti and Lorenzo Amadei built this team") | Seedtable; Clay partner listing; Fivos Aresti LinkedIn activity snippet |
| LinkedIn company page | linkedin.com/company/workflows-io | Explorium record |

Launch-date evidence (none of it is a registry record):

| Signal | Implied start | Source |
|---|---|---|
| "began from zero revenue in July 2025" | Jul 2025 | ARR Club signal page (Oct 2026) |
| Fivos Aresti: Co-Founder, Workflows.io "Jun 2025 — Present"; before that Partner & Head of Growth at ColdIQ "Mar 2024 — Jun 2025" | Jun 2025 | Unifers profile; ZoomInfo gives 2024–2025 for ColdIQ |
| X post of 7 Oct 2026: "I've been running my company for 15 months" | Jul 2025 | x.com/fivosaresti/status/2107908929413849192 (date decoded from the status ID) |
| Company OS README, committed 4 Apr 2026: "We scaled to 20 people in under 9 months. Bootstrapped." | ~Jul 2025 | github.com/Workflowsio/company-os-starter-kit |
| Company logo file on LinkedIn's CDN carries upload timestamp 1751407158560 = 1 Jul 2025 | Jul 2025 | logo URL in the Explorium record (inference from the URL) |
| Dan Rosenthal profile: "grow to $3M ARR in 15 months" | mid-2025 | LinkedIn snippet |
| ZenABM directory: "New York, USA · Est. 2024" | 2024 | zenabm.com listing (outlier; possibly entity formation or the founders' ColdIQ period) |
| ARR Club listing page: "Est. 2026" | 2026 | arr.club/workflows (contradicts its own signal page) |

Conclusion: the business took its first revenue in June/July 2025. It is a
new player, about 16 months old, and about two months older than this
repository's history (first commit 2026-09-02; the project's docs reference
work from May 2026).

## 3. What they sell, and at what price

Service lines (all sources agree): LinkedIn Content ("Content Engine —
LinkedIn for B2B Founders": strategy, ghostwriting, posting calendar), Automated
Outbound (signal-based, Clay + Instantly + HeyReach), AI RevOps (Clay and
HubSpot), ABM programme, plus an "Enterprise" line on the site. Content,
Outbound and RevOps are sold as subscriptions; ABM as a sprint (OneGTM and
PitchKitchen snippets).

| Price signal | Value | Source | Note |
|---|---|---|---|
| Clay Experts listing | "$5k+ a month", "Minimum Engagement: 3 months" | clay.com/experts/partner/workflowsio | Most consistent figure |
| Salesforge review (~Sep 2026) | "$4K to $12K pricing bands" across five services; $5K/month floor for the recommended client; prices are minimums scoped on a discovery call; quarterly commitments | salesforge.ai/blog/workflows-io-review | Salesforge sells a competing product |
| Agency Source | "$5,000+ minimum project", "$300+ hourly rate" | agencysource.com | Directory data |
| Lunar Strategy list | "custom project-based pricing starting at $499" | lunarstrategy.com | Outlier |
| One further agency directory | "$10k–$25k minimum budget", 3-month minimum, outcome-based milestones | surfaced in search; directory not named in the snippet | Low confidence |
| Demand Dept, PitchKitchen | "not published" | their agency lists | |

Free products (the part that overlaps with us):

- **Workflows** — a library of free GTM playbooks on `/workflows` (GTM Funnel
  playbook dated 29 Jul 2026, ABM Guide, 2026 GTM Flywheel Playbook, GTM Roadmap
  2026), each with a "Download playbook" button (whether that gates on email was
  not confirmed).
- **GTM Toolverse** — a free directory of GTM, RevOps, sales and AI tools,
  "organized into 39 categories", where a visitor can "save your own stack with
  pricing included" (Workflows Weekly #23; `/toolverse`).
- **Workflows Weekly** — Friday newsletter (see §7).
- **Two MIT-licensed GitHub kits** (see §7.5).
- **Workflows Academy** — listed on the homepage as a paid educational
  programme, marked "Coming soon" in the snapshot the search engine holds; no
  price, cohort or launch date found. Status unknown.

Clients and proof (all **self-published**): the Clay listing claims "worked
with 200+ companies", "tested 250+ AI sales tools" and "over 10M organic
impressions on LinkedIn"; Salesforge counts "twenty named client logos and ten
detailed case studies" and notes no lead or meeting guarantee is published.
Named case studies and their headline numbers: HeyReach ($470K revenue, 226
leads, 55% LinkedIn acceptance), UniPaaS (+40% marketing-sourced pipeline, 8%
positive reply rate, 20+ hours/week saved), Huzzle ($2M pipeline, +15% revenue,
30+ hours/week saved), Caravelo (60% reply-to-lead conversion, +133% net new
contacts, 90%+ enrichment coverage), Medrio ($1.3M pipeline, 2,831 signals),
Freckle (42% month-on-month growth over 6 months), Meister (15+ hours/week
saved); also Lexroom, Seam AI, BookYourData, FleetPulse, Cluely, Landbase,
Cargo, Proton. Independent reviews: none found. Clay's listing shows "No
reviews yet"; nothing on G2, Clutch or Trustpilot.

## 4. Revenue (every figure self-reported unless stated)

| Date | Claim | Source |
|---|---|---|
| ~Sep/Oct 2025 | "$1M ARR three months after launching Workflows.io" | Growth Unhinged guest post snippet (post dated 3 Dec 2025) |
| 3 Dec 2025 | Subtitle "Workflows.io to $2M ARR and beyond"; "our outbound playbook to add $1M in ARR and finish the year beyond $2m ARR" | growthunhinged.com/p/an-outbound-playbook-for-2025 |
| 20 May 2026 | $2M ARR | arr.club/workflows |
| 11 Jul 2026 | Dan Rosenthal shares an article: "We hit $2,000,000 ARR in 7 months, and one channel did most of the work: LinkedIn" | x.com/dan__rosenthal/status/2076013236646736214 (date decoded from ID) |
| ~Sep 2026 | 2026 recap by Fivos Aresti: signal-based outbound "adding $500K ARR in just the first 3 months"; MCP launch; CLI launch; Partner and Creator Program expansion; team of 30+ | LinkedIn activity snippet |
| 16 Oct 2026 | $3.3M ARR, "up from $2M in May 2026", announced in a LinkedIn Live; "fully bootstrapped" | arr.club signal page |
| undated | "bootstrapping an AI agency to $3M ARR in 12 Months"; "grow to $3M ARR in 15 months" | Dan Rosenthal LinkedIn profile snippets |
| 2026 | Yearly revenue range **$1M–$5M** (third-party estimate, not self-reported) | Explorium business record |
| 2026 | No funding rounds, investors or acquirers on record | Explorium record; Seedtable ("bootstrapped") |

Inconsistencies to keep in mind: the December 2025 post targets $2M by
year-end 2025, ARR Club dates $2M to May 2026, and "7 months" from a July 2025
start would be February 2026. Crunchbase's snippet lists "Raised Funding
Round" events with placeholder dates and no amounts; every other source says
bootstrapped. Derived, for scale only: $3.3M ARR over 20–30 people is roughly
$110K–$165K of ARR per head, which is a services-business ratio, not a
software one.

## 5. Team, roles, hiring

| Metric | Value | Source | Note |
|---|---|---|---|
| Employee band | 11–50 | Explorium record; Crunchbase snippet; GTM jobs feed | |
| Headcount statements | "20 people in under 9 months" (Apr 2026 README); "20-person GTM engineering org" (Workflows Weekly #36); "22-person GTM engineering org" (Dan post); "23-person team" (Fivos profile); "Headcount: 24" (directory); "team of 30+" (Fivos 2026 recap, ~Sep 2026) | as listed | Growth from ~20 to ~30 between April and September 2026 |
| Profiles found per quarter (Q3 2026) | 16 | Explorium workforce trends | Provider only sees part of the team |
| Role mix (Q3 2026) | Engineering roles 25%; marketing roles 6%; other categories not reported | Explorium workforce trends | "Engineering" here is how the provider classifies GTM-engineer titles; the quarter-over-quarter change field is negative but its scale is undocumented, so it is not interpreted here |
| Company LinkedIn post, 11 Sep 2026 | "Looking for more GTM engineers. More info below" (18 likes) | Explorium LinkedIn-posts sample | The company page itself posts rarely enough that this was the only post returned |

People visible in public profiles (titles are snippet-dated and unverified):

- Fivos Aresti — Co-Founder (New York).
- Dan Rosenthal — Co-Founder (New York).
- Lorenzo Amadei — Partner; profile also reads Senior GTM Engineer; per Fivos
  he is "freeing up his time to build our sales team, starting with 2 founding
  BDRs in November".
- Jan Brochwicz — GTM Lead, San Francisco Bay Area; "left Revolut to join
  Workflows.io", moved from Senior GTM Engineer to "managing a team of four GTM
  engineers".
- "Levi" — Director of RevOps, recent hire per Fivos's post.
- William Hellawell — Founders' Associate.
- Marios Charalampous, Jack Katene, Martin Blanchard Melelli — appear on team
  pages; roles not shown in snippets.

Open roles and hiring plans:

| Role | Where | Status | Source |
|---|---|---|---|
| GTM Engineer | GTM team; LinkedIn posting located in Milan, Italy, posted 2026-10-26 | Open | getstarted.workflows.io/careers; gtm-jobs-feed issue #652 |
| Senior RevOps Specialist | GTM team | Open | careers page |
| LinkedIn Content roles | — | "No positions open" | careers page |
| Founding software engineer "for internal software" | — | Planned | Fivos Aresti LinkedIn post |
| Two founding BDRs | starting November 2026 | Planned | Fivos Aresti LinkedIn post |

What they have hired the most: GTM engineers. The evidence is the team of four
under a GTM Lead, at least two Senior GTM Engineer titles, the September
company post asking for "more GTM engineers", the October job ad, and the
provider's 25% engineering share. The next wave is sales (BDRs) and a software
engineer, which is the first sign of productising their internal tooling.

## 6. The founders

**Fivos Aresti** (Co-Founder)

- Career: founder of Apollo Hospitality (Jan 2021–Jan 2023, SignalHire); Sales
  & Growth at Amenitiz (Jan 2023–Jan 2024, SignalHire); Partner & Head of
  Growth at ColdIQ (Mar 2024–Jun 2025, Unifers; ColdIQ's own page called him
  "our Head of Growth"); Co-Founder of Workflows.io from
  Jun 2025.
- Education: University of Cyprus (Accounting and Finance), Athens University
  of Economics and Business, Esade (Master's in Entrepreneurship &
  Innovation) — all from aggregator profiles.
- Ecosystem status: Clay Enterprise Partner; Instantly Certified Expert.
- Audience: ~37K LinkedIn followers (profile snippet; OutboundSync said "about
  30k" earlier). Writes Workflows Weekly, a Substack (fivosa.substack.com), a
  guest post on Kyle Poyar's Growth Unhinged (3 Dec 2025), and X
  (@fivosaresti).
- Builds in public: shipped the 10-skill `workflows-outbound-skills` repo on
  22 Apr 2026 and posted on 7 Oct 2026 that "We turned 70% of our SOPs into
  Claude skills."

**Dan Rosenthal** (Co-Founder)

- Career: "London sales and marketing-automation roles by way of Apple"
  (OutboundSync partner spotlight, single source, no dates or titles);
  education UCL (LinkedIn snippet); his YouTube channel describes him as a
  "neuroscientist turned entrepreneur" in one snapshot and "biologist turned
  entrepreneur" in another, who "has helped 200+ B2B companies" (later
  "250+"). The site publishes no bios (Salesforge).
- Audience: ~51K LinkedIn followers (profile snippet; his own July 2026
  article says about 45,000); an earlier profile text describes growing "from
  6K to nearly 15K followers" with "1.1M impressions in a year" and two viral
  posts at 205K and 174K impressions. An X post describes the company system:
  "3 posts a week… 36 posts after 12 weeks", one top-of-funnel, one
  middle-of-funnel, one bottom-of-funnel post, claiming "8M+ impressions and
  100+ sales calls" for the team (x.com/dan__rosenthal/status/2077468324758179951).
- Builds in public: authored the Company OS Starter Kit (last commit 4 Apr
  2026) and the "How to Build a Company OS on GitHub" post; listed as an
  Instantly expert; YouTube channel @Dan.Rosenthal.

**Strengths of the founding team** (grounded in the above)

1. Operator credibility in exactly the niche they sell: one founder was
   Partner & Head of Growth at ColdIQ, and both are listed experts or partners
   of the tools they deploy (Clay, Instantly).
2. Distribution they own: roughly 88K combined personal LinkedIn followers
   (37K + 51K, snippet figures) and a repeatable posting system; LinkedIn is,
   in their words, the channel that produced most of the revenue.
3. Speed and capital efficiency: zero to a self-reported $3.3M ARR in about
   15 months with no outside money, and ~30 people.
4. Ecosystem leverage: listed as experts or partners by Clay, HeyReach,
   Instantly and OutboundSync, each a referral source and a backlink.
5. Early on the Claude Code wave: tutorials, two open-source kits and a
   "Company OS" narrative since April–May 2026.

**Weaknesses and risks**

1. It is a labour business. Revenue scales with headcount (hence the constant
   GTM-engineer hiring); margins and churn are unknown; quarterly commitments
   and a $5K floor exclude small buyers.
2. Every performance number is self-published; there are no third-party
   reviews, and some timelines contradict each other (§4).
3. Platform concentration on LinkedIn and on partner vendors (their skills
   hard-code "Contacts come from AI Ark + Clay only").
4. Their open-source footprint is Claude-Code-only, small (15 skill files),
   and both repos have had no commits since April 2026.
5. The "MCP launch" and "CLI launch" in the founder's recap could not be
   found as public artefacts as of 2026-10-27 (no install page, repo or
   announcement surfaced in search).

## 7. Their marketing engine, channel by channel

### 7.1 Founder-led LinkedIn (the primary channel)

- Dan Rosenthal, July 2026: "$2,000,000 ARR in 7 months, and one channel did
  most of the work: LinkedIn." Profile: LinkedIn content is "the main channel
  that helped us grow to $3M ARR in 15 months."
- System: 3 posts a week per founder, TOFU/MOFU/BOFU rotation, 12-week cycles
  (X post). Hooks lead with a bold claim, a metric or a contrarian take
  (viralbrain.ai analysis of both founders' writing — a third-party, AI-made
  breakdown).
- Reach claims: "150k+ followers" next to "Workflows.io Team" on their site
  (almost certainly the sum of team members' personal followings; the company
  page itself appears in one snippet with "5K followers", unverified);
  "1.5 million monthly impressions" (Dan on X, repeated in the newsletter);
  "over 10M organic impressions on LinkedIn" (Clay listing).
- Milestones are announced as LinkedIn Live events (the $3.3M ARR announcement
  on 16 Oct 2026).
- They sell the same thing they practise: the Content Engine service does
  "strategy, ghostwriting, posting calendar, and demand generation", with
  "Claude Code doing 80% of the heavy lifting" (their services page snippet).

### 7.2 Newsletter

- Workflows Weekly, newsletter.workflows.io, every Friday, written by Fivos
  Aresti. Format per issue: one workflow, one AI tool, one resource, one AI
  update. Issue #44 was live by late October 2026, so roughly 44 weekly
  issues, which implies a start around late 2025. Subscriber count: not
  published anywhere found.
- Positioning: "GTM alpha, AI workflows, and copyable systems" for B2B tech.

### 7.3 Blog and search content

Titles found (all 2026): "The 2026 GTM Tool Stack: 78 Tools We Use Weekly";
"Claude Code Skill Library: 5 GTM Agents That Replace SOPs"; "Build an
Outbound AI Agent in 60 Minutes With Claude Code" (10 May 2026); "8 MCPs Every
Sales Team Should Connect to Claude Code"; "5 Signal-Based Outbound Plays
Winning in 2026"; "The GTM Flywheel: A Modular Framework for B2B Growth"; "The
7-Step Outbound GTM Framework That Booked 320+ Meetings"; "How to Build a
Company OS on GitHub"; glossary pages such as `/resources/glossary/gtm-engineer`.
Pattern: practitioner tutorials around Claude Code and MCP, plus a glossary for
definitional search terms, plus listicles that double as partner marketing.

### 7.4 Free resource hubs that capture leads

Playbooks (`/workflows`), the GTM Toolverse directory (39 categories), public
Notion pages (the Company OS setup guide; a "gtm-specialist" about-us page),
and `getstarted.workflows.io` as the funnel entry. Each is a reason to visit
without buying, and each is promoted from the LinkedIn posts.

### 7.5 Open source on GitHub (read directly)

| Repo | Published | Contents | Licence | Stars |
|---|---|---|---|---|
| `fivosaresti/workflows-outbound-skills` | Initial release 22 Apr 2026; no later commits | 10 Claude Code skills forming one outbound pipeline (ICP segmentation → campaign strategist → account sourcing → account enrichment → contact sourcing → contact enrichment → lead scoring → copywriter → campaign launcher → campaign analysis); 17 files; wires Discolike, AI Ark, Ocean.io, Clay, Findymail, BetterContact, Zerobounce, Instantly MCPs, HeyReach via REST; install is `git clone … ~/.claude/skills/fivos` | MIT | not readable from this session |
| `Workflowsio/company-os-starter-kit` | Last commit 4 Apr 2026 | `CLAUDE.md` template; `blueprint/` folder structure (company, wiki, hooks, skills, archive, raw); 5 GTM skills (outbound copywriter, LinkedIn post writer, ICP modeller, GTM strategist, discovery prep); a 6-command Claude Code plugin built on EveryInc's Compound Engineering plugin; 3 safety/logging hooks; 36 files | MIT | 39 (note.com, 3 May 2026 snapshot) → 60 (later GitHub snapshot) |

The outbound-skills README is itself marketing: "Built at Workflows.io after
mapping our full GTM process… and running them through hundreds of real-client
campaigns", with "DM me on LinkedIn" as the support channel. The Company OS
README opens with "We scaled to 20 people in under 9 months. Bootstrapped."
and closes with "Follow me on LinkedIn… Star this repo". Third-party skill
directories already mirror the outbound skills (becheetah.com lists
`fivos-campaign-launcher`); **WorkflowStacks does not** (see §8).

### 7.6 Partner ecosystems and directories (each one a backlink and a referral path)

Clay Experts (Enterprise Partner), HeyReach Experts, Instantly Experts (Dan
Rosenthal), OutboundSync agency partner (plus a spotlight article and a
HubSpot attribution case study), Builtfirst marketplace via Cintrifuse Capital
("ABM Program"), Salesforge agency directory and review, OneGTM, ZenABM, Lunar
Strategy, Agency Source, PitchKitchen, Demand Dept. The founder recap mentions
a "Partner and Creator Program expansion"; a HeyReach expert-profile post
announces a creator programme "built for GTM operators" (terms not found).

### 7.7 Earned coverage

Growth Unhinged guest post (3 Dec 2025); mentions in GTM Engineer newsletters
("The GTM Engineer" roundup noted the $2M ARR pillars and "160K followers on
LinkedIn"); ARR Club signals; a Japanese note.com explainer of the Company OS
(May 2026); the Salesforge review.

### 7.8 Video and education

A YouTube channel per founder (no subscriber counts found). Workflows Academy
(paid) listed but unlaunched or unverified.

### 7.9 Not found

Product Hunt, Hacker News, paid advertising, podcasts, G2/Clutch/Trustpilot
reviews, a public MCP server or CLI.

## 8. Side by side

| Dimension | Workflows.io | WorkflowStacks | Source for our side |
|---|---|---|---|
| Business model | Services agency, $5K+/month subscriptions and sprints; free content as top of funnel | Free catalogue; Premium tools $29–$39 one-time; done-for-you builds "from $500 per agent"; custom | `app/pricing/page.js` |
| Age | ~16 months (Jun/Jul 2025) | Repo history from 2026-09-02; docs reference work from May 2026 | `git log`; `docs/RATING-BASELINE.md` |
| Revenue | Self-reported $3.3M ARR (Oct 2026) | Not recorded in the repo | — |
| Funding | Bootstrapped | Not recorded; hosted on Vercel Hobby | `docs/COSTS.md` |
| Team | ~20–30, hiring GTM engineers | Single owner account visible in the repo; team size not recorded | repo metadata |
| Primary channel | Founder LinkedIn (~88K combined personal followers, snippet figures) | Monday email digest; GA4 shows ~25–60 views/day, ~100 on Mondays | `docs/STRATEGY.md` §4 |
| Search | Blog, glossary and playbook pages rank for their names and topics | 0 clicks / 5 impressions in the week to 2026-10-24; 25 of ~840 crawled pages indexed | `reports/seo/2026-10-26.md`; `docs/INDEXING-DIAGNOSIS.md` |
| Open-source skills | 15 skill files in 2 repos, Claude Code only, idle since April 2026 | 1,026 skill pages in the sitemap (1,192 URLs); MCP connector, Claude Code plugin marketplace, `npx workflowstacks add` CLI | `reports/seo/2026-10-26.md`; `README.md` |
| Install targets | Claude Code | Claude Code, Claude Desktop, Cowork, Cursor, Windsurf, VS Code, Antigravity, ChatGPT, Gemini (`/for/<tool>` hubs) | `lib/install-targets.js` |
| First-party proof | Case-study numbers (self-published) | Install counts, "install verified" chip, GitHub stars on every page | `app/skills/[id]/page.js` |
| Directory listings | 10+ agency and vendor directories | None recorded; `docs/STRATEGY.md` §3 lists the targets | `docs/STRATEGY.md` |
| Launch moments | LinkedIn Live, Growth Unhinged guest post | None yet (`docs/STRATEGY.md` §3 item 2) | `docs/STRATEGY.md` |
| GTM/outbound coverage in our catalogue | Their entire product | `search_skills("cold outbound campaign launcher Instantly HeyReach Clay")` returned a torrent list, an Nginx module and a payroll CMS; `search_skills("GTM go-to-market sales prospecting")` returned two CRMs and an SEO skill. None of their skills are listed. | live MCP query, 2026-10-27 |

## 9. What we should do (ordered by impact against effort)

1. **List their skills and build the GTM hub they will never build neutrally.**
   Ingest `fivosaresti/workflows-outbound-skills` and
   `Workflowsio/company-os-starter-kit` (both MIT) so each of the 15 skills has
   a page, then add a `/for/gtm` or `/best/gtm-outbound` hub that also pulls in
   the MCP servers those skills call (Clay, Instantly, Apollo, HubSpot,
   Findymail, Zerobounce; check which are already in the catalogue). The
   ingest pipeline keys on GitHub topics (`README.md`), and these repos are
   not tagged with ours, so they need an explicit seed list. The MCP query
   above shows the catalogue has no answer today for the single most-searched
   agentic use case in their niche; fix search relevance for "outbound",
   "cold email", "GTM" at the same time.

2. **Recruit the two founders as creators, this month.** `/creators/<handle>`
   and the README badge already exist. One post from either founder reaches
   more people than Search Console has sent us all year (37K and 51K
   followers versus 1 click in 28 days). The pitch they will accept: a page
   per skill with install counts and "install verified", cross-tool install
   paths they do not offer, and a badge for their README. Lead with the data,
   not a favour.

3. **Copy the content engine, not the agency.** Their growth came from a
   founder posting three times a week with a TOFU/MOFU/BOFU rotation and a
   Friday "one workflow, one tool, one resource, one update" email. Email is
   already our only working channel (`docs/STRATEGY.md` §4). Pair the Monday
   digest with a founder LinkedIn post that quotes the same Hot list, and give
   every featured creator a ready-to-post line so they repost it.

4. **Fill the price gap under their floor.** They start at $5K/month with a
   three-month minimum and say outright that under-$5K budgets are a poor fit
   (Salesforge). Our `/build-for-me` starts at $500 per agent. A fixed-price
   "Outbound stack installed in your Claude Code" package, built from the
   catalogue's own skills and MCP servers, sits in a gap they have chosen not
   to serve. Demand for it is inferred from their results, not measured; run
   it as an offer and count enquiries.

5. **Make the MCP connector and CLI the headline before they ship theirs.**
   Their founder recap announces an MCP launch and a CLI launch; nothing
   public exists yet. Ours do (`README.md` quick starts). The launch plan in
   `docs/STRATEGY.md` §3 item 2 (Product Hunt plus Show HN with "search and
   install vetted open-source skills from inside Claude Code") is the right
   wedge; do it before they have a comparable artefact to compare against.

6. **Get listed where they are listed, and inside their Toolverse.** The
   Toolverse is a free directory of GTM and AI tools organised into 39
   categories; WorkflowStacks fits its "Workflow Automation" category and a
   listing there is a backlink from a site that already ranks. Also submit to
   the skills directories named in `docs/STRATEGY.md` §3 item 4.

7. **Write the comparison content they cannot.** A neutral page "Skills for
   outbound: Workflows.io's 10 skills vs the alternatives" and "Company OS
   starter kits compared" (theirs is built on EveryInc's Compound Engineering
   plugin; others exist) ranks for their brand and product names, which are
   the only queries about them with volume. Keep it factual and link to their
   repos; it is also the page a creator outreach email can point at.

8. **Add Workflows.io to the competitor watch.** The cached intel in
   `.claude/workflows/competitor-council.js` lists Claw Mart, Agensi,
   Smithery and PromptBase only; the premium n8n template
   `templates/premium/competitor-watch.json` can watch `getstarted.workflows.io/careers`
   and `/toolverse` for change. Signals that would change this analysis:
   a public MCP or CLI, a creator programme with terms, the Academy opening,
   or the "founding software engineer" shipping a product.

## 10. Where we can get ahead, and where we cannot

Advantages we hold that an agency structurally cannot copy:

- **Neutrality and breadth.** They are tied to the vendors who list them as
  partners and their skills say so in the rules ("Contacts come from AI Ark +
  Clay only"). A catalogue can rank every outbound skill and MCP server
  across vendors.
- **First-party proof per listing.** Install counts, CI-verified installs and
  live GitHub signals on each page; a GitHub README cannot show installs.
- **Multi-tool distribution.** Nine install targets against their Claude
  Code only kits; the `/for/<tool>` hubs already exist.
- **Software economics.** Their revenue grows with headcount; ours does not
  have to.

Where they are ahead and will stay ahead for a while:

- Audience and trust: tens of thousands of followers each, weekly email,
  partner listings, earned press. We have 25 indexed pages and a Monday
  email of unrecorded size.
- Depth in one vertical: their 15 skills encode real client work; our 1,026
  pages are broad and, in their vertical, empty.
- Cash: a self-reported $3.3M ARR funds 30 people; this site runs on a Hobby
  plan with a cost guard.

The realistic position for WorkflowStacks is the neutral distribution layer
for exactly the kind of skill they produce: list theirs, measure installs,
and let the measurement be the reason creators (including them) send traffic.

## 11. Open questions

1. Live GitHub star counts and traffic for both repos (not readable from this
   session).
2. The LinkedIn company page follower count (5K in one snippet versus "150k+
   followers" on their site for the team).
3. Workflows Weekly subscriber count; YouTube and X follower counts.
4. Whether the "MCP launch" and "CLI launch" are public products, internal
   tooling, or client deliverables.
5. Terms of the Partner and Creator Program.
6. Whether Workflows Academy has launched and at what price.
7. Job descriptions and salary bands for the GTM Engineer and Senior RevOps
   roles (LinkedIn posting not readable from here).
8. Any independent client reference; none exists in public.

## Sources

Company and profiles: workflows.io (homepage, `/customers`, `/workflows`,
`/toolverse`, `/services/content`, `/services/revops`, `/contact-us`),
getstarted.workflows.io/careers, newsletter.workflows.io (issues #23, #32, #33,
#36, #43, #44), workflowsio.notion.site (Company OS guide, `/gtm`,
`/gtm-specialist`), seedtable.com/companies/workflows-io,
crunchbase.com/organization/workflows-io/growth_outlook, Explorium business
record for workflows.io via the Vibe Prospecting MCP (retrieved 2026-10-27),
indeed.com/cmp/Workflows, linkedin.com/company/workflows-io, LinkedIn profile
snippets for Fivos Aresti, Dan Rosenthal, Lorenzo Amadei, Jan Brochwicz,
William Hellawell and Marios Charalampous, unifers.ai, signalhire.com,
zoominfo.com.

Revenue and timeline: arr.club/workflows and the 16 Oct 2026 signal page;
growthunhinged.com/p/an-outbound-playbook-for-2025 (3 Dec 2025);
thegtmengineer.substack.com 12/8 roundup; x.com/fivosaresti/status/2107908929413849192;
x.com/dan__rosenthal/status/2076013236646736214;
x.com/dan__rosenthal/status/2077468324758179951.

Pricing, partners, reviews: clay.com/experts/partner/workflowsio,
heyreach.io/expert/workflows-io, instantly.ai/experts/dan-rosenthal,
outboundsync.com (partner spotlight, HubSpot attribution case study, agency
page), cintrifuse-capital.builtfirst.com/workflows-io-abm-program,
salesforge.ai/blog/workflows-io-review and the Salesforge agency directory,
getaob.com/agencies/workflows-io, zenabm.com, lunarstrategy.com,
agencysource.com, pitchkitchen.com, demanddept.com.

Open source and coverage: github.com/fivosaresti/workflows-outbound-skills
(cloned), github.com/Workflowsio/company-os-starter-kit (cloned),
github.com/mariellecamba-gtm/gtm-jobs-feed/issues/652,
note.com/_kihonushi/n/n8fcf7dd9b3a0, becheetah.com (skill mirror),
viralbrain.ai (founder content analyses), youtube.com/@Dan.Rosenthal.

Our side: `README.md`, `app/pricing/page.js`, `docs/STRATEGY.md`,
`docs/INDEXING-DIAGNOSIS.md`, `docs/COSTS.md`, `docs/RATING-BASELINE.md`,
`reports/seo/2026-10-26.md`, `.claude/workflows/competitor-council.js`, the
WorkflowStacks MCP `search_skills` tool (queried 2026-10-27).

---

# Part 2 — Growth and marketing scorecard (added 2026-10-27)

Answers the follow-up: score their channels out of 10, say whether they are
SEO-optimised and indexed, list the link-building, organic and paid tactics
behind the growth, and say what we do to get the same. Same sourcing rules as
Part 1. Their pages still could not be opened from this session; website facts
are search-result snippets. New direct sources in this part: Meta's Ad
Library (queried through the Facebook connector), LinkedIn profile snippets
for nine team members, and the two cloned repositories.

## 12. Scorecard

Scores are this analysis's judgement against the "what a 10 looks like"
column; they are not a published rating. Channel average is unweighted.

| Channel | What a 10 looks like | Workflows.io | WorkflowStacks | Evidence |
|---|---|---|---|---|
| Founder-led LinkedIn | Two or more founders posting 3×/week to 50K+ each, revenue attributed to it | 9 | 1 | Dan Rosenthal ~51K, Fivos Aresti ~37K followers (profile snippets); "one channel did most of the work: LinkedIn" (Dan, X, Jul 2026); 3-posts-a-week TOFU/MOFU/BOFU system (X). Ours: the footer links one X account; no LinkedIn page linked anywhere in `components/Footer.js` or the Organization schema in `app/layout.js` |
| LinkedIn company page | 10K+ followers, weekly posts | 4 | 0 | Snippet shows "5K followers · 11-50"; only one post in the LinkedIn-posts sample (11 Sep 2026, "Looking for more GTM engineers", 18 likes); their own playbook calls the company page "a background credibility check". Ours: none found |
| Team LinkedIn reach | Every employee an amplifier | 8 | 0 | Seven team profiles sum to ~126K followers (51K + 37K + 15K + 13K + 5K + 3K + 2K, snippet figures), which explains the "150k+ followers" claim on their site |
| Instagram | Active account where buyers are | 1 | 0 | No company account surfaced; the only hit is a personal account for Fivos Aresti with no company content. Instagram is not where B2B GTM buyers or developers are; low priority for both sides |
| YouTube | Channel per founder, regular uploads | 3 | 0 | Two channels exist (@Dan.Rosenthal, @FivosAresti); no subscriber counts found; never cited by them as a growth driver |
| Email newsletter | Weekly, fixed format, lead magnets, indexed archive | 7 | 4 | Workflows Weekly: 44 Friday issues by 16 Oct 2026, "one workflow, one AI tool, one resource, one AI update", archive pages indexed, playbook downloads feed it; subscriber count unknown. Ours: Monday digest with indexed archive, double opt-in, size unknown, the only channel producing traffic peaks (`docs/STRATEGY.md` §4) |
| Website SEO (on-page and architecture) | Keyword titles, hub-and-spoke, glossary, fresh dates | 7 | 3 | Year-stamped keyword titles, A–Z glossary, 10 playbooks, 18+ blog posts, 12 case studies, 6 service pages, Toolverse; inconsistent page dates; technical SEO not verifiable from here. Ours: structured data, gated sitemap and `/for` hubs are built, but Google rejects on quality (758 "crawled – not indexed", `docs/INDEXING-DIAGNOSIS.md`) |
| Indexing and search visibility | Every section indexed, ranks for non-brand queries | 8 | 1 | Every section and two subdomains surfaced in search; their posts appear for generic "Claude Code outbound" queries. Ours: 25 indexed of ~840 crawled; 0 clicks / 5 impressions in the week to 2026-10-24 |
| Backlinks and off-site authority | 50+ referring domains incl. partners and press | 7 | 1 | 31 third-party domains observed linking or listing them (§15); no press. Ours: no recorded backlinks |
| Developer distribution (GitHub, MCP, CLI) | Active repos with adoption | 5 | 6 | 2 repos, 15 skill files, 60 stars, idle since April 2026. Ours: MCP connector, plugin marketplace, CLI, 1,026 pages, tiny audience |
| Social proof | Case studies with numbers, logos, independent reviews | 8 | 3 | 12 case studies with figures, ~20 logos, partner badges, testimonials; no independent reviews. Ours: real install counts and "install verified" chips; no testimonials |
| Partnerships and ecosystem | Official partner status with the tools buyers use | 8 | 1 | Clay Enterprise Partner, HeyReach and Instantly expert listings, OutboundSync partner, Builtfirst marketplace, HubSpot ecosystem listing. Ours: none |
| Launches and earned media | Product Hunt, Hacker News, press, guest posts | 5 | 0 | Growth Unhinged guest post, LinkedIn Live milestone, GTM newsletter roundups, note.com explainer; no PH/HN/press. Ours: none yet |
| Paid acquisition | Evidence of own paid campaigns | 1 | 0 | None found (§17). Score reflects "not used", and they grew without it |
| **Channel average (14, unweighted)** | | **5.8** | **1.4** | Arithmetic on the rows above |
| **Growth-engine score (judgement, weighted to channels that matter for a B2B/developer audience)** | | **8** | **2** | They picked five channels and executed them to a self-reported $3.3M ARR in ~15 months; we have the product surface and no audience |

## 13. LinkedIn, Instagram, YouTube in detail

LinkedIn is the engine and everything else is secondary. What they do:

- **Two founders, one system.** Dan Rosenthal's published system: "3 posts a
  week… 36 posts after 12 weeks", one top-of-funnel post for reach, one
  middle-of-funnel for authority, one bottom-of-funnel for conversion, claiming
  "8M+ impressions and 100+ sales calls" for the team
  (x.com/dan__rosenthal/status/2077468324758179951). The same system is sold as
  a service and published as a blog post ("The 90-Day LinkedIn Content Plan:
  The Exact Posting System Behind 8M+ Impressions") and a free template
  ("LinkedIn Content Operating System (90-Day Template)").
- **Voice as code.** Their founder-led-marketing playbook keeps a founder's
  voice guide as a Markdown file in GitHub, read by their LinkedIn post-writer
  skill before drafting; cadence floor is two posts a week plus quarterly
  long-form; the company page is "a background credibility check"; pillar four
  is "team brand expansion" (workflows.io/blog/founder-led-marketing).
- **Team as amplifiers.** Nine staff profiles surfaced; seven show follower
  counts totalling ~126K. New names this pass: Monika Kitanoska (Head of GTM),
  Levi Bom (Director of RevOps), Raphael Carandang.
- **Three ICPs for the content**: "Agencies, Sales teams, GTM engineers"
  (LinkedIn snippet). The third ICP is also their hiring pool, so the same
  posts recruit and sell.
- **Milestones as events.** $3.3M ARR announced in a LinkedIn Live on 16 Oct
  2026; "$2M ARR in 7 months" article shared on X on 11 Jul 2026.
- **Company page is deliberately minor**: ~5K followers (snippet), one hiring
  post in the sample.

Instagram: no company presence found. YouTube: a channel per founder, no
numbers found, not credited for growth. Neither is where their buyers are, and
neither should be a priority for us.

## 14. Are they SEO-optimised, and are they indexed?

Yes on both, with the caveat that the evidence is the search engine behind
this session's search tool, not Google Search Console, and that no page could
be opened to check markup, speed or canonicals.

Pages surfaced by section (lower bound):

| Section | URLs surfaced | Examples |
|---|---|---|
| Homepage and services | 7 | `/`, `/services/content`, `/services/revops`, `/services/enterprise`, `/contact-us`, `/terms-of-use`, `/blog` |
| Case studies | 8 URLs, 12 clients named | `/customers/heyreach`, `/unipaas`, `/huzzle`, `/caravelo`, `/seam-ai`, `/meister`, `/bookyourdata`, `/freckle`; Medrio, Lexroom, FleetPulse named |
| Playbooks (`/workflows`) | 10 | GTM Funnel (29 Jul 2026), GTM Flywheel, ABM Guide, GTM Roadmap 2026, Complete Outbound Playbook, Automated Outbound, Founder Connections (Signal), Content RAG Agent, Track Employees' LinkedIn Engagement, LinkedIn Content Operating System |
| Blog | 18 | Founder-Led Marketing; Account-Based Marketing in 2026; GTM Stack Architecture (3-layer); How to Build a Company OS on GitHub; 2026 GTM Tool Stack (78 tools); Social Listening Playbook; LinkedIn Social Selling; Ultimate Guide on Outbound; Signal Architecture; Claude Code Skill Library; Build an Outbound AI Agent in 60 Minutes; 8 MCPs Every Sales Team Should Connect; 5 Signal-Based Outbound Plays; GTM Flywheel; 7-Step Outbound Framework (320+ meetings); GTM Motions Explained; Modern ABM Engine in 2026; 90-Day LinkedIn Content Plan |
| Glossary (`/resources/glossary`) | 4 surfaced, A–Z index | GTM Engineer, TOFU, Buyer Signal, Cold Outbound |
| Toolverse | 1 | `/toolverse` ("Free GTM & Sales Prospecting Tools") |
| Newsletter subdomain | 20+ issues | newsletter.workflows.io issues #5 to #44, essays ("The 2026 GTM Roadmap", "How I Built a $250K/Mo Business in 12 Months") |
| Careers and Notion | 6 | getstarted.workflows.io (home, careers); workflowsio.notion.site (Company OS kit, LinkedIn Content Writer, contentlead, gtm, gtm-specialist) |

On-page patterns visible in titles and descriptions:

- Keyword-first, year-stamped titles: "Account-Based Marketing in 2026: 8
  Steps…", "The 2026 GTM Tool Stack: 78 Tools We Use Weekly".
- Number- and outcome-led headlines: "8 MCPs…", "7-Step… That Booked 320+
  Meetings", "5 GTM Agents That Replace SOPs".
- Service titles carry partner-tool names: "RevOps — Clay & HubSpot for B2B",
  "Enterprise Program — Clay & HubSpot".
- A programmatic glossary ("<Term> — GTM Glossary") for definitional queries.
- Case-study titles in the "How <Client> <result> with Workflows" form.
- Playbook pages with "Download playbook" buttons (lead capture).
- Hub-and-spoke: blog ↔ playbooks ↔ glossary ↔ services, with the newsletter
  and careers on subdomains.
- Weak spots seen: page dates that disagree with crawl metadata, a homepage
  snapshot the search engine considers about two years old, no bios on the
  site (Salesforge).

Our side, for contrast (`reports/seo/2026-10-26.md`, `docs/INDEXING-DIAGNOSIS.md`):
25 indexed pages of ~840 crawled; 1 click and 18 impressions in 28 days; the
pages Google did index are small, specifically named tools. The technical
layer (structured data, sitemap gate, `/for` hubs, `llms.txt`) is ahead of
theirs as far as snippets show; the content and authority layers are far
behind.

## 15. Link building: the footprint and how each link was earned

31 third-party domains were observed linking to or listing Workflows.io in
search results. This is a lower bound from search, not a backlink-tool count.

| How the link was earned | Domains observed |
|---|---|
| Partner and vendor certification pages | clay.com (Experts, Enterprise Partner), heyreach.io (Expert), instantly.ai (Experts: Dan Rosenthal), outboundsync.com (partner page, spotlight, case study), cintrifuse-capital.builtfirst.com (ABM Program), ecosystem.hubspot.com (solutions listing) |
| Agency directories and review sites (submitted or scraped) | salesforge.ai (review + directory), getaob.com (OneGTM), zenabm.com, lunarstrategy.com, agencysource.com, pitchkitchen.com, demanddept.com, foundergrowthos.com |
| Company databases (generated from LinkedIn presence) | seedtable.com, crunchbase.com, arr.club, zoominfo.com, unifers.ai, signalhire.com |
| Guest post | growthunhinged.com and kylepoyar.substack.com ("An outbound playbook for 2025", 3 Dec 2025) |
| Newsletter roundups citing founder posts | thegtmengineer.substack.com, gtmengineerschool.substack.com |
| Open-source releases picked up by others | github.com (2 repos), note.com (Company OS explainer), becheetah.com (skill mirror) |
| Content-analysis sites | viralbrain.ai (two founder pages) |
| Job feeds | github.com/mariellecamba-gtm/gtm-jobs-feed |
| Own properties cross-linking | newsletter.workflows.io, getstarted.workflows.io, workflowsio.notion.site, x.com, youtube.com, linkedin.com |

Pattern: almost every link is a by-product of something else they did for
revenue or hiring (a partner certification, a milestone post, a job ad, an
open-source release). There is no sign of paid link placement, link exchanges
or guest-post farms.

## 16. The organic strategies they credit for the growth, in their words

| Lever | Their claim | Source |
|---|---|---|
| Founder-led LinkedIn | "$2,000,000 ARR in 7 months, and one channel did most of the work: LinkedIn"; "the main channel that helped us grow to $3M ARR in 15 months" | Dan Rosenthal, X (11 Jul 2026) and LinkedIn profile |
| The posting system | 3 posts/week, TOFU/MOFU/BOFU, 12-week cycles; "8M+ impressions and 100+ sales calls" | Dan Rosenthal, X; blog "90-Day LinkedIn Content Plan" |
| Founder audience as outbound | Founders' audience of "65,000+ followers"; best play, LinkedIn connections of founders, "25.4% reply rate" | Growth Unhinged guest post; Ultimate Guide on Outbound |
| Signal-based outbound | Reply rates "2x to 10x higher than standard outbound"; new channel "adding $500K ARR in just the first 3 months" | Signal-based plays post; Fivos Aresti 2026 recap |
| Four-channel outbound mix | Cold calling, automated email sequences, signal-based LinkedIn, manual prospecting for tier-1 accounts | Growth Unhinged (3 Dec 2025) |
| Free resources as lead magnets | Playbooks with downloads, Toolverse (39 categories), glossary, Friday newsletter | site and newsletter snippets |
| Open source as distribution | Company OS kit and 10 outbound skills; READMEs end with "Follow me on LinkedIn" and "Star this repo" | cloned repositories |
| Partner ecosystems | Clay Enterprise Partner, HeyReach/Instantly expert status, OutboundSync | directory pages |
| Milestone PR | LinkedIn Live for $3.3M ARR (16 Oct 2026); "How we scaled Workflows to $250K/mo in 12 months, bootstrapped" (newsletter, 15 Sep 2026) | arr.club; newsletter.workflows.io |
| Guest content | Growth Unhinged (Kyle Poyar) | growthunhinged.com |

Everything in this table is self-reported; nothing has been independently
verified.

## 17. Paid marketing: what was found

- **Meta Ad Library** (queried 2026-10-27 through the Facebook connector): a
  keyword search for "Workflows.io" matched 23,205 ads containing the word
  "workflows", none from a Workflows.io page in the first 25 results; a search
  for "Fivos Aresti" returned 0 ads. No Facebook page ID for the company was
  available for a page-level query.
- **LinkedIn Ad Library and Google Ads Transparency Center**: not reachable
  from this session.
- **Sponsorships**: no "sponsored by" or event-sponsor mentions found.
- **Their stance**: paid appears in their playbooks as one channel among many
  for clients (Meta, LinkedIn, Reddit, Google, retargeting), and ZenABM lists
  them as a LinkedIn Ads agency, but every growth claim they make is organic.
- Conclusion: no evidence they bought their own growth. The 1/10 paid score is
  a statement of fact, not a weakness.

## 18. What we do to get this kind of growth (90 days)

The order mirrors what produced their results: audience first, then proof,
then search. Metrics come from GA4 (live since 2026-10-04) and the weekly
Search Console report; targets reuse `docs/STRATEGY.md` §4.

| Weeks | Move | Concretely | Metric |
|---|---|---|---|
| 1–2 | Fix the social foundations | Create the LinkedIn company page; link LinkedIn (and the X account, verified) in `components/Footer.js` and in the Organization `sameAs` in `app/layout.js`; UTM every outbound link | Referral sessions from linkedin.com in GA4 |
| 1–12 | Founder-led LinkedIn, their system | 3 posts/week: Monday = the Hot list as a data post; Wednesday = one skill teardown or install stat ("most installed this week"); Friday = build-in-public (indexing count, installs, what shipped). Every featured creator gets a ready-to-post line to repost | Impressions and profile followers weekly; GA4 LinkedIn referrals; target 300+ views/day on a weekday |
| 1–12 | Newsletter in their format | Keep Monday; fixed structure "one skill, one MCP server, one template, one AI update"; a lead magnet per hub (an "outbound stack" install pack) | Confirmed subscribers; Monday peak height |
| 2–4 | GTM hub and their skills listed | Ingest both repos (Part 1 §9 item 1); `/for/gtm` hub; fix search relevance for outbound terms | Hub indexed; installs from the hub |
| 2–6 | Creator outreach, founders first | Claim pages, README badges, the data pitch (Part 1 §9 item 2); ten creators adding the badge = ten repo backlinks | Referring domains (Search Console → Links) |
| 3–8 | Search content they cannot write neutrally | Glossary of agentic terms (skill, MCP server, SKILL.md, plugin marketplace, Cowork) with examples from the catalogue; comparison pages ("Workflows.io's 10 outbound skills vs the alternatives"); year-stamped hub titles ("Best Claude Code skills for outbound, 2026") | Indexed pages 25 → 150+; impressions 16 → 300+ (28 days) |
| 4–6 | Launch moment | Product Hunt + Show HN with the MCP connector (`docs/STRATEGY.md` §3 item 2); announce the result as a LinkedIn post, their way | Referring domains 0 → 20+ |
| 4–10 | Link building the way they did it | Submit to the skills directories in `docs/STRATEGY.md` §3 item 4 and to their Toolverse; pitch one data-led guest post to a GTM or AI-tooling newsletter ("what 1,000 open-source skills show"); publish one linkable data report from stars and installs; release our own MIT starter kit whose README points back | Referring domains; guest post live |
| 6–12 | Proof | Public install counters on hubs; honest testimonials from creators and `/build-for-me` clients; one written case study per build | Conversion on `/build-for-me` |
| any | Paid | Optional. They grew without it. If tested, only boost a founder post that already performs organically, and judge it by GA4 referrals, not impressions | — |

## 19. Watch list and open questions

Watch: the LinkedIn company page follower count, new blog and glossary pages,
the careers page, commits to both repos, any public MCP or CLI, the creator
programme terms, Workflows Academy opening, the newsletter issue count, the
next ARR announcement. The premium n8n template
`templates/premium/competitor-watch.json` can watch the careers and Toolverse
pages; a scheduled re-run of this analysis is possible on request.

Still unknown: the company page's exact follower count; newsletter, YouTube
and X audience sizes; backlink-tool counts (Ahrefs and Semrush connectors
could not connect from here); whether playbook downloads gate on email; the
third pillar of their founder-led playbook; anything about paid spend on
LinkedIn.

## Sources added in Part 2

Meta Ad Library (Facebook connector, 2026-10-27); LinkedIn profile snippets
for Jan Brochwicz, Marios Charalampous, Lorenzo Amadei, Martin Blanchard
Melelli, William Hellawell, Raphael Carandang, Levi Bom and the company page
`linkedin.com/company/workflows-io`; workflows.io pages surfaced by
site-restricted search (blog, playbooks, glossary, customers, services,
toolverse); newsletter.workflows.io issues #5–#44 and essays;
workflowsio.notion.site pages; x.com/dan__rosenthal/status/2077468324758179951;
youtube.com/@FivosAresti and @Dan.Rosenthal; instagram.com/fivosaresti;
ecosystem.hubspot.com; the directories and databases named in §15;
`components/Footer.js`, `app/layout.js`, `app/newsletter/page.js`,
`app/api/[[...path]]/route.js` (subscriber count field) in this repository.
