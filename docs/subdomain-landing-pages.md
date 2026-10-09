# Standalone landing pages

Marketing pages that deploy with this repo but share nothing with the
WorkflowStacks app: one folder of plain HTML, CSS, JS and media under
`public/sites/<dir>/`, with no Next layout, header, footer or analytics.

## Live pages

| Canonical URL | Hostname variant | Folder |
| --- | --- | --- |
| `https://workflowstacks.com/ai-avatar` | `founder-avatar.workflowstacks.com` (once attached in Vercel) | `public/sites/founder-avatar-studio/` |

## Why a path on the main site is canonical

A path needs nothing outside the repo: merge, and Vercel serves it. A hostname
also needs the domain attached to the Vercel project, a manual dashboard step
that is easy to miss (an unattached hostname returns Vercel's own
`404 DEPLOYMENT_NOT_FOUND`). So the page's canonical tag, share URLs,
structured data and the sitemap entry all point at the path, and the hostname
is an optional alias. If the hostname should become canonical later, swap the
URLs in the page and add a redirect from the path; the routing already serves
both.

The slug is chosen for search: `ai-avatar` is the head term in the page's
title ("AI Avatar Videos for Founders"), short enough to share, and the page's
title, H1 and JSON-LD `Service` all describe the same thing.

## How a request is served

Everything is driven by `LANDING_PAGES` at the top of `next.config.js`. For
each entry:

- `rewrites().beforeFiles` maps `path` to the folder's `index.html`. Pages
  link their media by absolute `/sites/<dir>/…` paths, which are ordinary
  static files, so no per-asset rules are needed.
- On the hostname, `/` maps to the same `index.html` and any other path
  (except `_next/`, `sites/` and the canonical path) to the same-named file in
  the folder, so `robots.txt` and `sitemap.xml` there come from the folder.
- `redirects()` keeps one URL per page: the folder's real path and its
  `index.html` 308 to the canonical path, and `/index.html` on the hostname
  folds back to `/`.
- Locally: `npm run dev`, then `http://127.0.0.1:3001/ai-avatar`
  or `http://founder-avatar.localhost:3001/` (browsers resolve `*.localhost`
  to loopback; the host regex accepts it).

Unknown paths return the normal 404, so no soft-404s.

## Attaching the hostname (optional, manual)

In the Vercel project `workflowstacks-emergent`: Settings → Domains → Add →
`founder-avatar.workflowstacks.com`, environment **Production**. The zone is
already on Vercel's nameservers, so no DNS record is needed and it verifies
immediately. Until this is done the hostname shows Vercel's
`DEPLOYMENT_NOT_FOUND` page; the path keeps working regardless.

To check any URL from outside your own network, run the `http-check`
workflow under Actions: it prints status, key headers, the first bytes of the
body and the DNS records.

## Measurement

The page loads the same Google Tag Manager container as the main site when
`GTM_ID` at the top of its script is set (GA4, Meta Pixel and so on are
configured inside GTM, not in the page). With it empty nothing is loaded, but
events are still pushed to `window.dataLayer`: `generate_lead` when the
WhatsApp message is prepared (with `need`, `has_phone`, `has_email`),
`whatsapp_open` when the WhatsApp button is tapped, and `contact_click` with
`channel` for the footer contact links.

## Adding another landing page

1. Put the site in `public/sites/<new-dir>/` with an `index.html`. Link media
   as `/sites/<new-dir>/file.ext`. Give it a `<title>`, meta description,
   canonical, Open Graph tags and JSON-LD of its own; nothing from
   `app/layout.js` applies.
2. Add an entry to `LANDING_PAGES` in `next.config.js`:

   ```js
   { path: '/new-slug', dir: 'new-dir', host: 'new-name\\.(?:workflowstacks\\.com|localhost)' }
   ```

3. Add `'/new-slug'` to `STATIC_ROUTES` in `app/sitemap.js`.
4. Optionally attach the hostname in Vercel as above.

## SEO, AEO and GEO

What the page carries for search engines, answer engines (Google AI
Overviews, Bing Copilot) and generative engines (ChatGPT, Perplexity, Claude):

- **Indexability.** `meta robots` is `index,follow` with unlimited snippet,
  image and video previews; the canonical is the apex path; `/ai-avatar/`
  308s to `/ai-avatar`. The site `robots.txt` (`app/robots.js`) allows every
  major search crawler and explicitly allows GPTBot, OAI-SearchBot,
  ClaudeBot, PerplexityBot, Google-Extended and the other AI agents, so the
  page is readable by the engines that cite sources.
- **Discovery.** `/ai-avatar` is in the site sitemap at priority 0.9
  (`app/sitemap.js`), linked from every page's footer, and described in
  `/llms.txt` (`app/llms.txt/route.js`) with its prices and contact so an
  answer engine can quote it without parsing the HTML. The weekly IndexNow
  workflow pushes the whole sitemap to Bing, Yandex, Seznam and Naver (and
  through Bing to ChatGPT search and Copilot); run it on demand under Actions
  after a content change. Google has no push endpoint: request indexing in
  Search Console (URL inspection → Request indexing).
- **Words.** The title, meta description, the plain-words line inside the
  h1, the lead of the "How it works" section and four of the h2s carry the
  terms the page is about: *AI avatar videos*, *founders*, *Dubai*, *Mumbai*,
  *digital twin*, *English and Arabic*. The FAQ answers the long-tail
  questions (cost in Dubai, time to build, Arabic, platforms, where based,
  and the synonyms people search for: AI clone, AI spokesperson video) in one
  short paragraph each, so they can be lifted as direct answers. The words
  were checked against live autocomplete strings for the UAE and India
  (`keyword-suggest` run of 2026-10-09): "ai avatar video agency / service /
  production", "ai video agency in dubai / mumbai", "ai clone video", "ai
  spokesperson video", "ai avatar arabic", "personal branding video".
- **No script needed.** Every pricing tier is in the HTML; the tabs only
  choose which panel is visible. Most AI crawlers do not run JavaScript, and
  before this change they saw an empty pricing section.
- **Structured data.** One JSON-LD graph: `Organization` (FluoDigital, with
  both studios and contact points), `Person` (the founder), `WebPage` with
  `BreadcrumbList`, `VideoObject` for the hero sample (duration and size read
  from the file), `Service` with every tier as an `Offer` carrying a monthly
  `UnitPriceSpecification`, and `FAQPage` built from the visible `<details>`.
  The graph is generated from the page by `scripts/founder-avatar-jsonld.py`
  so the FAQ markup and the visible answers cannot drift apart; run it from
  the repo root after editing the title, description, h1, prices or FAQ.
- **Checks.** The `http-check` workflow (with `match`) confirms what is live;
  the `lighthouse` workflow reports the SEO category; the `keyword-suggest`
  workflow prints live autocomplete strings per market for choosing words.
  Rankings and impressions are only visible in Search Console and Bing
  Webmaster Tools, which need the property verified by the site owner.

Other notes:

- Keep media as separate files rather than base64 inside the HTML.
- The site sitemap lists the canonical path; the folder's own `robots.txt`
  and `sitemap.xml` are served only on the hostname variant and point at the
  canonical URL.
