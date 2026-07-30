// Finishing Kit registry — curated, LINK-ONLY bundles of creative assets
// (captions, badges, LUT, overlay, SFX, music) picked for one specific ad
// style, not a generic stock-asset directory. We host nothing: every item
// links to its real source, and each is chosen to fill a gap general stock
// libraries (built for filmmakers) don't cover for AI-UGC / performance-
// marketing creators. One kit per hero template — see templates.js.
//
// `linkType`: 'exact' = links to the specific asset page; 'category' =
// links to a real, verified search/category page (used when the source has
// no stable per-item URL, or when results mix free + paid so the user needs
// to filter). Never claim 'exact' for a page that isn't actually one asset.
//
// License strings are written from what we could verify on each source's
// own pricing/license page — do not soften "needs a paid plan" to "free"
// just because the category itself has some free items.

export const KITS = {
  'review-ad-finishing-kit': {
    slug: 'review-ad-finishing-kit',
    title: 'The Review-Ad Finishing Kit',
    template: 'review-reply-drafter',
    persona: 'ecommerce',
    title_seo: 'Free Assets for Review-Style Product Ads — Finishing Kit | WorkflowStacks',
    metaDescription: 'Captions, review-card badges, a product LUT, an overlay and SFX/music picked specifically for a 5-star-review-style product video. Six real, linked picks — nothing to host, nothing generic.',
    h1: 'The Review-Ad Finishing Kit',
    outcome: 'Everything to finish editing a 5-star-review-style product video — captions, badges, grade, and sound.',
    whyItExists: 'Mixkit and Pixabay are built for filmmakers — cinematic grain, lens flares, b-roll. None of that is what a review-ad actually needs. This kit is picked for one specific job: a vertical, caption-led, review-card-style ecommerce ad.',
    groups: [
      {
        category: 'Hook caption overlays',
        items: [
          {
            name: 'Review-Quote Instagram Story templates',
            why: 'Bold, caption-led layouts built for the first 3 seconds of a review-style ad — not a repurposed cinematic title card.',
            url: 'https://www.canva.com/templates/?query=review%20quote%20instagram%20story',
            sourceName: 'Canva',
            license: 'Free templates mixed with Canva Pro in results — filter to "Free"',
            linkType: 'category',
          },
        ],
      },
      {
        category: 'Review-card & badge overlays',
        items: [
          {
            name: '5-Star Rating Badge templates',
            why: 'The exact "verified buyer" / star-rating graphic type generic footage libraries don’t carry — built for sellers, not filmmakers.',
            url: 'https://www.canva.com/templates/?query=5%20star%20rating%20badge',
            sourceName: 'Canva',
            license: 'Free templates mixed with Canva Pro in results — filter to "Free"',
            linkType: 'category',
          },
        ],
      },
      {
        category: 'Vertical-native LUT',
        items: [
          {
            name: 'Food Toner LUT',
            why: 'Graded for warming up food/product close-ups specifically — the review-ad use case, not a general cinema-grade pack.',
            url: 'https://uppbeat.io/luts/asset/food-toner-lut-6318',
            sourceName: 'Uppbeat',
            license: 'Needs the Creator plan ($8.99/mo+) — LUTs aren’t included on Uppbeat’s free tier',
            linkType: 'exact',
          },
        ],
      },
      {
        category: 'Texture & light overlay',
        items: [
          {
            name: 'Overlay video pack',
            why: 'A layer of texture and light to keep the product the hero without the shot looking flat.',
            url: 'https://mixkit.co/free-stock-video/overlay/',
            sourceName: 'Mixkit',
            license: 'Royalty-free, no account needed',
            linkType: 'category',
          },
        ],
      },
      {
        category: 'SFX & music bed',
        items: [
          {
            name: 'Whoosh — airy & swift',
            why: 'Cut for a quick caption reveal, not a generic cinematic swoosh pack.',
            url: 'https://uppbeat.io/sfx/whoosh-airy-swift/13203/32703',
            sourceName: 'Uppbeat',
            license: 'Free: 3 downloads/mo catalog-wide; unlimited from $6.99/mo',
            linkType: 'exact',
          },
          {
            name: 'Boom — stamp & stutter',
            why: 'A short stamp accent for the moment a badge or star rating lands on screen.',
            url: 'https://uppbeat.io/sfx/boom-stamp-stutter/168931/64342',
            sourceName: 'Uppbeat',
            license: 'Free: 3 downloads/mo catalog-wide; unlimited from $6.99/mo',
            linkType: 'exact',
          },
          {
            name: 'Feel-good background music',
            why: 'A warm bed mixed to sit under narration or TTS rather than compete with it.',
            url: 'https://uppbeat.io/music',
            sourceName: 'Uppbeat',
            license: 'Free: 3 downloads/mo catalog-wide; unlimited from $6.99/mo',
            linkType: 'category',
          },
        ],
      },
    ],
  },
}

export function getKit(slug) {
  // hasOwnProperty guard: a plain object lookup would resolve slugs like
  // "__proto__" or "constructor" to prototype members instead of 404ing.
  if (!Object.prototype.hasOwnProperty.call(KITS, slug)) return null
  return KITS[slug]
}

export function kitForTemplate(templateSlug) {
  return Object.values(KITS).find((k) => k.template === templateSlug) || null
}

export function kitItemCount(kit) {
  return kit.groups.reduce((n, g) => n + g.items.length, 0)
}
