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

export function getBundle(slug) {
  if (!Object.prototype.hasOwnProperty.call(BUNDLES, slug)) return null
  return BUNDLES[slug]
}

export function bundleMeta(b) {
  const { files, ...meta } = b
  return { ...meta, file_count: files.length }
}
