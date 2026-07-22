// Outcome-template registry — the artifacts the Builder actually delivers.
// Phase 1 starts file-based (hand-built, tested templates only); moves to the
// outcome_templates Mongo collection once template count outgrows this file.
//
// match_keywords power the recommender bridge: when a user's goal hits enough
// of them, the matching template is surfaced ABOVE the skill stack — a working
// download beats a reading list.

import aiProductDescriptions from '../templates/ai-product-descriptions.json'
import reviewReplyDrafter from '../templates/review-reply-drafter.json'
import meetingSummaryEmail from '../templates/meeting-summary-email.json'

export const TEMPLATES = {
  'ai-product-descriptions': {
    slug: 'ai-product-descriptions',
    title: 'AI Product Description Writer',
    outcome: 'Turn a Google Sheet of product names + features into polished, conversion-focused descriptions — in bulk.',
    persona: 'ecommerce',
    deliverable_type: 'n8n',
    filename: 'workflowstacks-ai-product-descriptions.n8n.json',
    setup_minutes: 5,
    requires: ['A free n8n account (cloud or self-hosted)', 'A Google account (for Sheets)', 'An OpenAI API key (any OpenAI-compatible key works)'],
    match_keywords: ['product', 'description', 'copy', 'listing', 'shopify', 'ecommerce', 'store', 'catalog', 'write', 'seo'],
    workflow: aiProductDescriptions,
  },
  'review-reply-drafter': {
    slug: 'review-reply-drafter',
    title: 'Review Reply Drafter',
    outcome: 'Draft personalized, on-brand replies to every customer review — including careful responses to negative ones. You approve before anything is posted.',
    persona: 'ecommerce',
    deliverable_type: 'n8n',
    filename: 'workflowstacks-review-reply-drafter.n8n.json',
    setup_minutes: 5,
    requires: ['A free n8n account (cloud or self-hosted)', 'A Google account (for Sheets)', 'An OpenAI API key (any OpenAI-compatible key works)'],
    match_keywords: ['review', 'reviews', 'reply', 'respond', 'customer', 'feedback', 'rating', 'reputation', 'shopify', 'amazon', 'support'],
    workflow: reviewReplyDrafter,
  },
  'meeting-summary-email': {
    slug: 'meeting-summary-email',
    title: 'Meeting Summary Email',
    outcome: 'Paste any meeting transcript into a private form and get a clean summary email — decisions, action items with owners, open questions.',
    persona: 'founder',
    deliverable_type: 'n8n',
    filename: 'workflowstacks-meeting-summary-email.n8n.json',
    setup_minutes: 5,
    requires: ['A free n8n account (cloud or self-hosted)', 'A Gmail account (or swap in Outlook/SMTP)', 'An OpenAI API key (any OpenAI-compatible key works)'],
    match_keywords: ['meeting', 'transcript', 'transcribe', 'summary', 'summarize', 'notes', 'action', 'zoom', 'call', 'minutes', 'recap'],
    workflow: meetingSummaryEmail,
  },
}

export function getTemplate(slug) {
  return TEMPLATES[slug] || null
}

// Public metadata only — safe to return from APIs (no workflow payload).
export function templateMeta(tpl) {
  const { workflow, ...meta } = tpl
  return meta
}

// Keyword-overlap match of a user goal against the registry. Requires 2+ hits
// (1 for goals under 5 words) so vague goals don't get a wrong template.
export function matchTemplate(goal) {
  const words = String(goal || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
  if (words.length === 0) return null
  const wordSet = new Set(words)
  const minHits = words.length < 5 ? 1 : 2
  let best = null
  let bestHits = 0
  for (const tpl of Object.values(TEMPLATES)) {
    let hits = 0
    for (const k of tpl.match_keywords) if (wordSet.has(k)) hits++
    if (hits >= minHits && hits > bestHits) {
      best = tpl
      bestHits = hits
    }
  }
  return best ? templateMeta(best) : null
}
