# AI Invisibility Report — landing page and free scan

Page: `public/sites/ai-visibility-audit/index.html`, served at
`https://workflowstacks.com/ai-visibility` (canonical) and, once the hostname
is attached in Vercel, at `ai-visibility.workflowstacks.com`. Routing, the
sitemap entry and the hostname files work exactly as described in
`docs/subdomain-landing-pages.md`.

## The offer on the page

| Step | Offer | Price (AED, excl. VAT) |
| --- | --- | --- |
| 1 | Free scan (on the page) | 0 |
| 2 | AI Invisibility Report: 25 prompts × ChatGPT, Gemini, Perplexity, Google AI Overviews; score; competitor battleboard; citation-source map; top 20 missed prompts; technical/entity issues; 90-day fix plan; 30-minute walkthrough. 5 business days | 1,995 (USD 545), one-time |
| 3 | 30-Day Visibility Fix: top 5 gaps | 4,995 |
| 4 | 90-Day AI Visibility Sprint: full implementation | 12,500 |
| 5 | Monthly AI Visibility Retainer | 6,500–12,000 a month |
| 6 | Agency white-label | from 1,500 per client a month |

Prices appear in four places that must agree: the page HTML, the offer lists
in `scripts/ai-visibility-jsonld.py`, the FAQ answers on the page, and the
`/llms.txt` entry (`app/llms.txt/route.js`). The JSON-LD script asserts that
every price it publishes is also on the page. After editing the title,
description, h1, prices or FAQ, run:

```
python3 scripts/ai-visibility-jsonld.py
```

## How the free scan works

It runs entirely in the visitor's browser: no route handler, no LLM call, no
database, so it adds nothing to the Vercel meters in `docs/COSTS.md` or to an
AI bill.

1. The visitor enters business name, what they sell, city, and optionally a
   speciality and website.
2. The page writes six discovery prompts (none names the business; the
   question is whether AI brings it up unprompted) and one unscored brand
   prompt ("What do you know about …").
3. Each assistant button copies the prompt and opens the assistant in a new
   tab: `chatgpt.com/?q=`, `perplexity.ai/search?q=`, `google.com/search?q=`
   (the AI Overview, when Google shows one). Gemini has no documented prefill,
   so it opens empty and the visitor pastes. If a site ever ignores its
   prefill, the copied prompt still works.
4. The visitor marks each answer Named / Not named and types who was named
   instead. The page computes the score (named ÷ answers checked, overall and
   per assistant), ranks the competitors by how many prompts named them, and
   lists the prompts where no checked assistant named the business.
5. The order form at the bottom builds a WhatsApp message to
   +971 52 208 6253 that includes the scan summary.

Scan state is kept in `localStorage` (`aiv-scan-v1`) on the visitor's device
so a reload doesn't lose their marks. Nothing reaches FluoDigital until the
visitor sends the WhatsApp message.

## Links for outreach and partners

The form can be prefilled from the URL, which suits cold outreach ("I ran a
quick check on your business…"):

```
https://workflowstacks.com/ai-visibility?b=Acme+Realty&s=real+estate+agency&c=Dubai&sp=off-plan+investment
```

| Param | Fills |
| --- | --- |
| `b` | Business name |
| `s` | What they sell |
| `c` | City |
| `sp` | Speciality |
| `w` | Website |
| `ref` | Partner tag, `[a-z0-9-]`, up to 40 characters. Added to the WhatsApp message as `Referred by: <ref>`; never shown on the page |

Values only ever fill input fields; the visitor still presses *Scan*.

## Measurement

Same pattern as the avatar page: `GTM_ID` at the top of the page script is
empty, so nothing loads, but events go to `window.dataLayer`:

| Event | Params |
| --- | --- |
| `scan_start` | `service`, `city` |
| `scan_ask` | `engine` (`chatgpt`, `gemini`, `perplexity`, `google`) |
| `cta_click` | `need` |
| `generate_lead` | `method`, `need`, `has_phone`, `has_email`, `scan_checked`, `scan_named`, `ref` |
| `whatsapp_open` | `method` |
| `contact_click` | `channel` |

No business names, personal names or contact details are pushed.

## Share image

`og.jpg` (1200×630) was rendered from HTML with the pre-installed Chromium.
The competitor and directory names on it, and in the hero card on the page,
are placeholders ("Competitor A", "Directory 1"), labelled as such on the
page. Replace them only with results from a real scan you are allowed to
publish.
