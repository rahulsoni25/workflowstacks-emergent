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
