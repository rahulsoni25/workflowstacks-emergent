# Founder Avatar Studio — design system

Page: `public/sites/founder-avatar-studio/index.html`, served at
`founder-avatar.workflowstacks.com`. This document records the design system
the page follows and how it was checked against the open-source
[UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
design-intelligence skill (its rule set, `--design-system` generator and
multi-viewport audit script).

## Classification (skill Step 1)

| Question | Answer |
| --- | --- |
| Product type | Creative / marketing agency service, personal-brand video for founders |
| Audience | Founders and directors in Dubai and Mumbai, mostly on phones via WhatsApp and LinkedIn links |
| Tone | Premium, dark, editorial, direct |
| Stack | Static HTML, inline CSS and JS, no framework, no build step |

## Style (skill Step 2, verified against `--domain style`)

The generator's top matches for the generic query ("AI-Native UI", purple)
and the agency query ("Liquid Glass", black and gold, Cormorant/Montserrat)
were checked for fit and **not adopted**: the page already commits to a
coherent aesthetic that maps onto the skill's **Exaggerated Minimalism**
entry (oversized serif display type, dark ground, one vibrant accent,
extreme negative space; listed as best for agency landing pages, luxury and
editorial). Its implementation checklist is met: typography oversized,
whitespace extreme, single action accent, minimal elements, clear statement.

Landing pattern: a hybrid of the skill's **Pricing-Focused Landing** and
**Trust & Authority + Conversion** entries: Hero with form → Problem
(arithmetic) → Proof (own founder's avatar) → How it works → Distribution →
Pricing (three tiers, recommended tier flagged, fine print) → Control →
FAQ → Final CTA with direct contact.

## Tokens

Colours (contrast measured with the WCAG formula):

| Token | Value | Role | Contrast |
| --- | --- | --- | --- |
| `--ground` | `#14111C` | page background | |
| `--surface` | `#1E1927` | cards, form | |
| `--surface2` | `#271F33` | phone frame | |
| `--text` | `#F4EEE6` | primary text | 16.2:1 on ground |
| `--muted` | `#A99DB4` | secondary text | 7.3:1 ground, 6.7:1 surface |
| `--dim` | `#8B8296` | labels, fine print (was `#7C7288`, 4.1:1) | 5.1:1 ground, 4.7:1 surface |
| `--tally` | `#FF4A1C` | action only: CTAs, brand dot, REC | 5.6:1 on ground; `#170B06` text on it 5.8:1 |
| `--amber` | `#F2A65A` | accents, eyebrows, focus ring, recommended flag | 9.2:1 on ground |
| `--mint` | `#7FD1B9` | success state | 10.4:1 on ground |
| `--line` / `--line-strong` | white at .13 / .26 | dividers, ghost borders | |
| field border | white at .40 | input boundary | 3.5:1 ground, 3.2:1 surface (non-text 3:1) |

Type: `--fd` Instrument Serif (display, h1/h2/prices), `--fb` Archivo (body,
UI), `--fm` IBM Plex Mono (labels, eyebrows, tags). Body 17px, line-height
1.6; minimum information text 12px; form controls 16px (prevents iOS zoom);
card paragraphs 16px under 720px.

Layout: `--maxw` 1180px; gutters `clamp(20px, 3.5vw, 36px)` plus safe-area
insets; breakpoints sm 560, md 720, lg 900, xl 960 (comment in `:root`).
Header height `--bar-h` 69px drives `scroll-padding-top` so anchor jumps
and focused fields never land under the sticky bar. Motion token `--t`
160ms; all motion respects `prefers-reduced-motion`.

## What the skill review changed

Findings came from five reviewers (accessibility and colour; touch, forms and
navigation; performance and layout; style and landing pattern; visual review
of six viewport screenshots), were merged, and the high-severity items were
adversarially verified by two independent agents each; the rest were
verified by hand against the source before applying.

- **Contrast**: `--dim` lightened in place to clear 4.5:1 everywhere it is
  used; field borders raised to 3:1 non-text contrast; pricing unit line
  moved off the 11px tag style to 14px `--muted`.
- **Touch targets**: every button, tab, input, FAQ row and contact link is
  at least 44px tall; tabs stretch to one row under 420px.
- **Focus**: the `outline:none` on form controls removed so the global 2px
  amber ring applies; `overflow:hidden` removed from the tab strip that was
  clipping the ring; skip link added.
- **Forms**: inline per-field errors tied with `aria-invalid` and
  `aria-describedby`; validation on blur for email and phone format; required
  and optional markers on labels; phone field is `type="tel"`; honeypot
  failure now gives a recovery message.
- **Video**: visible Pause/Play control; pauses when off-screen; honours
  reduced motion and Save-Data.
- **Tabs**: WAI-ARIA tabs contract completed with roving tabindex and
  Arrow/Home/End keys; plan names are `h3`; the recommended tier carries a
  visible "Recommended" flag, not colour alone.
- **Navigation**: anchor scrolling offset for the sticky header, smooth
  scroll under no-preference, nav appears from 720px, current section
  marked with `aria-current`.
- **Layout**: three-up grids collapse together at 900px so tablet columns
  keep readable line lengths; contact rows draw one hairline instead of
  three; footer closes the hairline system; numerals in fact cards scale
  below the section heading; phone mock-up sticks beside the form on
  desktop.
- **Performance**: Google Fonts CSS loaded non-blocking with a `noscript`
  fallback; sample images lazy-loaded with intrinsic sizes.
- **Typography**: `text-wrap:pretty` on copy, balanced eyebrow, no split
  price range.

Deliberately not applied: rem conversion, a font-size token set, a full
4/8px spacing rewrite, metric-matched font fallbacks (percentages were
unmeasured), WebP exports, and the generator's palette or font swaps.

## Re-checking

```bash
git clone https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
python3 ui-ux-pro-max-skill/src/ui-ux-pro-max/scripts/search.py "<query>" --domain ux
cd ui-ux-pro-max-skill/stack && npm install && \
  node scripts/design-audit.mjs --file ../../public/sites/founder-avatar-studio/index.html
```

The audit's remaining "focus-visible" count is a tooling artefact
(programmatic `el.focus()` does not trigger `:focus-visible` on buttons in
Chromium) and its one sub-44px target is the intentionally 1px honeypot
field.
