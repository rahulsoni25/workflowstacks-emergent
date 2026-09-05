// Premium bundle registry — paid, one-time. Hero templates stay free (they're
// acquisition); bundles are genuinely more-advanced workflows + a written
// playbook, priced $19–79 one-time. Delivery is token-gated (see the bundle
// checkout + webhook + download endpoints).

import reviewMgmtPro from '../templates/premium/review-management-system-pro.json'
import leadFinder from '../templates/premium/lead-finder.json'
import competitorWatch from '../templates/premium/competitor-watch.json'
import rankTracker from '../templates/premium/rank-tracker.json'
import reviewWatchdog from '../templates/premium/review-watchdog.json'

export const BUNDLES = {
  'lead-finder': {
    slug: 'lead-finder',
    hero: true,
    title: 'Lead Finder',
    tagline: 'Turn a business type + city into a spreadsheet of real leads.',
    price_usd: 39,
    needs: 'Google Places API key (free tier)',
    description:
      'Enter a business type and location and get a clean spreadsheet of matching businesses — name, address, phone, website, rating — straight from Google’s own business data. Your outbound list, built in minutes instead of days.',
    includes: [
      'Lead Finder PRO workflow (Google Places-powered)',
      'Name, address, phone, website, rating per lead',
      'Change the query, run again, new list — unlimited',
      'Setup playbook inside the workflow',
      'Free updates',
    ],
    preview: {
      note: 'Illustrative example — your results depend on the search you run.',
      unlockNote: 'Unlock the full spreadsheet — including contact details — with your own search after purchase.',
      columns: ['Business', 'Category', 'Address', 'Phone', 'Website'],
      blurredColumns: ['Phone', 'Website'],
      rows: [
        ['Riverside Dental Studio', 'Dentist', '214 Elm St, Austin, TX', '(512) 555-0148', 'riversidedental.com'],
        ['Copper & Co. Coffee', 'Cafe', '88 Congress Ave, Austin, TX', '(512) 555-0173', 'copperandco.co'],
        ['BrightPath Legal', 'Law Firm', '4021 Guadalupe St, Austin, TX', '(512) 555-0119', 'brightpathlegal.com'],
      ],
    },
    files: [
      { key: 'lead-finder', name: 'Lead Finder PRO', filename: 'workflowstacks-lead-finder.n8n.json', workflow: leadFinder },
    ],
  },
  'competitor-watch': {
    slug: 'competitor-watch',
    hero: true,
    title: 'Competitor Watch',
    tagline: 'Get emailed the moment a rival changes their price or pitch.',
    price_usd: 29,
    needs: 'No extra API — just watches the pages you list',
    description:
      'Every morning it checks the competitor pages you list, reads the one thing you care about with AI (their price, their headline, their plan), and emails you the instant it changes — with old vs new. Stop refreshing rivals’ pages by hand.',
    includes: [
      'Competitor Watch PRO workflow (self-contained)',
      'AI reads the exact value you specify per page',
      'Only emails you when something actually changed',
      'No scraping service needed',
      'Free updates',
    ],
    preview: {
      note: 'Illustrative example — your results depend on the pages you watch.',
      unlockNote: 'Unlock live change-detection on your own pages after purchase — set it up once, it runs itself.',
      columns: ['Label', 'URL', 'Watch For', 'Old Value', 'New Value'],
      blurredColumns: ['Old Value', 'New Value'],
      rows: [
        ['Rival Pro Plan Price', 'rivalsite.com/pricing', 'Price of the Pro plan', '$49/mo', '$59/mo'],
        ['Competitor Homepage Headline', 'otherco.com', 'Main hero headline', 'Automate your busywork', 'Automate everything, instantly'],
      ],
    },
    files: [
      { key: 'competitor-watch', name: 'Competitor Watch PRO', filename: 'workflowstacks-competitor-watch.n8n.json', workflow: competitorWatch },
    ],
  },
  'rank-tracker': {
    slug: 'rank-tracker',
    hero: true,
    title: 'Rank Tracker',
    tagline: 'A weekly email of where you actually rank on Google.',
    price_usd: 29,
    needs: 'SerpAPI key (free tier)',
    description:
      'Every Monday it checks where your site ranks on Google for the keywords you care about, logs the movement, and emails you a clean report — so you finally know whether your SEO is working.',
    includes: [
      'Rank Tracker PRO workflow (SerpAPI-powered)',
      'Weekly automated ranking report by email',
      'Tracks movement week over week',
      'Setup playbook inside the workflow',
      'Free updates',
    ],
    preview: {
      note: 'Illustrative example — your results depend on the keywords you track.',
      unlockNote: 'Unlock your real ranking data after purchase — tracked automatically every week.',
      columns: ['Keyword', 'Domain', 'Old Rank', 'Last Rank'],
      blurredColumns: ['Old Rank', 'Last Rank'],
      rows: [
        ['best crm for agencies', 'yoursite.com', '14', '9'],
        ['ai workflow automation', 'yoursite.com', '22', '19'],
        ['no-code ai agent builder', 'yoursite.com', '41', '31'],
      ],
    },
    files: [
      { key: 'rank-tracker', name: 'Rank Tracker PRO', filename: 'workflowstacks-rank-tracker.n8n.json', workflow: rankTracker },
    ],
  },
  'review-watchdog': {
    slug: 'review-watchdog',
    hero: true,
    title: 'Review Watchdog',
    tagline: 'Catch every bad review the day it lands — with a reply ready.',
    price_usd: 29,
    needs: 'Google Places API key (free tier)',
    description:
      'Every day it checks your Google Business reviews, catches new low-star ones, drafts a careful reply, and emails it to you so you can respond fast — before a bad review sits there costing you customers.',
    includes: [
      'Review Watchdog PRO workflow (Google Places-powered)',
      'Daily check, alerts only on 3★ and below',
      'A ready-to-edit reply drafted for each',
      'Setup playbook inside the workflow',
      'Free updates',
    ],
    preview: {
      note: 'Illustrative example — your results depend on your own reviews.',
      unlockNote: 'Unlock ready-to-send replies for your own reviews after purchase — drafted automatically, every day.',
      columns: ['Reviewer', 'Rating', 'When', 'Review', 'Suggested Reply'],
      blurredColumns: ['Suggested Reply'],
      rows: [
        ['J. Martinez', '2★', '3 days ago', 'Waited 20 minutes past our reservation time with no update.', "Hi J., we're sorry about the wait..."],
        ['A. Chen', '1★', '1 week ago', 'Order arrived damaged and support never responded.', 'Hi A., that’s on us — please reply here...'],
      ],
    },
    files: [
      { key: 'review-watchdog', name: 'Review Watchdog PRO', filename: 'workflowstacks-review-watchdog.n8n.json', workflow: reviewWatchdog },
    ],
  },
  'ecommerce-pro-pack': {
    slug: 'ecommerce-pro-pack',
    title: 'Ecommerce Pro Pack',
    tagline: 'The review pipeline that actually protects your rating.',
    price_usd: 29,
    needs: 'OpenAI API key',
    description:
      'A full review-management system — not just a reply drafter. Routes negative reviews to a priority alert in your inbox, drafts careful replies, tags sentiment, and logs everything. Includes the setup playbook.',
    includes: [
      'Review Management System PRO (9-node branching workflow)',
      'Priority owner-alert routing for at-risk reviews',
      'Sentiment tagging + a Handled log for your records',
      'Setup playbook (inside the workflow, step by step)',
      'Free updates to this pack',
    ],
    files: [
      { key: 'review-management-system-pro', name: 'Review Management System PRO', filename: 'workflowstacks-review-management-system-pro.n8n.json', workflow: reviewMgmtPro },
    ],
  },
}

// Which paid pack finishes the job a free listing starts. Keyword rules over
// the listing's category, topics and description; category alone is the
// fallback. Returns null for categories with no natural pack (devtools, MCP
// servers, prompts) so the card never appears where it would be noise.
const BUNDLE_RULES = [
  { slug: 'rank-tracker', re: /\b(seo|serp|rank(ing)?s?|keyword|backlink|search console)\b/i },
  { slug: 'lead-finder', re: /\b(lead|prospect|outreach|cold[- ]?email|crm|sales pipeline|b2b)\b/i },
  { slug: 'review-watchdog', re: /\b(review|reputation|rating|testimonial|customer feedback)\b/i },
  { slug: 'competitor-watch', re: /\b(competitor|pricing page|price (change|monitor)|market intel)\b/i },
  { slug: 'ecommerce-pro-pack', re: /\b(e-?commerce|shopify|woocommerce|storefront|product catalog)\b/i },
]
const CATEGORY_FALLBACK = {
  marketing: 'rank-tracker',
  sales: 'lead-finder',
  support: 'review-watchdog',
  analytics: 'competitor-watch',
}

export function relatedBundle(skill) {
  if (!skill) return null
  const text = [
    skill.name, skill.title_human, skill.description, skill.description_human, skill.category,
    Array.isArray(skill.github_topics) ? skill.github_topics.join(' ') : '',
  ].filter(Boolean).join(' ')
  const hit = BUNDLE_RULES.find((r) => r.re.test(text)) || null
  const slug = hit?.slug || CATEGORY_FALLBACK[skill.category] || null
  const b = slug ? BUNDLES[slug] : null
  return b ? { slug: b.slug, title: b.title, tagline: b.tagline, price_usd: b.price_usd, needs: b.needs } : null
}

export function getBundle(slug) {
  if (!Object.prototype.hasOwnProperty.call(BUNDLES, slug)) return null
  return BUNDLES[slug]
}

export function bundleMeta(b) {
  const { files, ...meta } = b
  return { ...meta, file_count: files.length }
}
