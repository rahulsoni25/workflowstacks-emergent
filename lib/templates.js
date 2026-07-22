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
import weeklyClientReport from '../templates/weekly-client-report.json'
import contentRepurposer from '../templates/content-repurposer.json'
import coldEmailPersonalizer from '../templates/cold-email-personalizer.json'
import inboxReplyTriage from '../templates/inbox-reply-triage.json'
import abandonedCartWinback from '../templates/abandoned-cart-winback.json'

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
  'weekly-client-report': {
    slug: 'weekly-client-report',
    title: 'Weekly Client Report',
    outcome: 'Every Monday, turn the week’s metrics into a clear client-facing narrative report — what happened, why, what’s next — and email it automatically.',
    persona: 'agency',
    deliverable_type: 'n8n',
    filename: 'workflowstacks-weekly-client-report.n8n.json',
    setup_minutes: 5,
    requires: ['A free n8n account (cloud or self-hosted)', 'A Google account (for Sheets)', 'A Gmail account (or swap in Outlook/SMTP)', 'An OpenAI API key (any OpenAI-compatible key works)'],
    match_keywords: ['report', 'reporting', 'client', 'weekly', 'dashboard', 'performance', 'metrics', 'analytics', 'agency', 'roas', 'kpi'],
    workflow: weeklyClientReport,
  },
  'content-repurposer': {
    slug: 'content-repurposer',
    title: 'Content Repurposer',
    outcome: 'Paste one blog post or script into a private form and get back a LinkedIn post, an X thread, an Instagram caption, and an email blurb — in your voice.',
    persona: 'agency',
    deliverable_type: 'n8n',
    filename: 'workflowstacks-content-repurposer.n8n.json',
    setup_minutes: 5,
    requires: ['A free n8n account (cloud or self-hosted)', 'A Gmail account (or swap in Outlook/SMTP)', 'An OpenAI API key (any OpenAI-compatible key works)'],
    match_keywords: ['content', 'repurpose', 'social', 'linkedin', 'twitter', 'thread', 'post', 'blog', 'caption', 'instagram', 'newsletter', 'poster'],
    workflow: contentRepurposer,
  },
  'cold-email-personalizer': {
    slug: 'cold-email-personalizer',
    title: 'Cold Email Personalizer',
    outcome: 'Turn a list of prospects into genuinely specific, personalized cold-email openers — each scored 1-5 for specificity so you can kill the generic ones.',
    persona: 'sales',
    deliverable_type: 'n8n',
    filename: 'workflowstacks-cold-email-personalizer.n8n.json',
    setup_minutes: 5,
    requires: ['A free n8n account (cloud or self-hosted)', 'A Google account (for Sheets)', 'An OpenAI API key (any OpenAI-compatible key works)'],
    match_keywords: ['cold', 'email', 'outreach', 'prospect', 'personalize', 'personalized', 'opener', 'sales', 'lead', 'outbound', 'sequence', 'sdr'],
    workflow: coldEmailPersonalizer,
  },
  'inbox-reply-triage': {
    slug: 'inbox-reply-triage',
    title: 'Inbox Reply Triage',
    outcome: 'Classify every incoming email — Hot lead / Needs reply / FYI / Ignore — with a reason and a suggested reply, logged to a ranked sheet so you never miss what matters.',
    persona: 'founder',
    deliverable_type: 'n8n',
    filename: 'workflowstacks-inbox-reply-triage.n8n.json',
    setup_minutes: 6,
    requires: ['A free n8n account (cloud or self-hosted)', 'A Gmail account (or swap in Outlook/IMAP)', 'A Google account (for Sheets)', 'An OpenAI API key (any OpenAI-compatible key works)'],
    match_keywords: ['inbox', 'email', 'triage', 'reply', 'prioritize', 'sort', 'classify', 'gmail', 'lead', 'respond', 'manage', 'filter'],
    workflow: inboxReplyTriage,
  },
  'abandoned-cart-winback': {
    slug: 'abandoned-cart-winback',
    title: 'Abandoned Cart Win-Back',
    outcome: 'Draft a personalized, non-pushy win-back email for every abandoned cart — referencing the exact product left behind. You approve before sending.',
    persona: 'ecommerce',
    deliverable_type: 'n8n',
    filename: 'workflowstacks-abandoned-cart-winback.n8n.json',
    setup_minutes: 5,
    requires: ['A free n8n account (cloud or self-hosted)', 'A Google account (for Sheets)', 'An OpenAI API key (any OpenAI-compatible key works)'],
    match_keywords: ['abandoned', 'cart', 'winback', 'win-back', 'recover', 'recovery', 'checkout', 'ecommerce', 'shopify', 'sales', 'email', 'customer'],
    workflow: abandonedCartWinback,
  },
}

// Node whose prompt gets rewritten by /api/templates/[slug]/personalize.
// One AI node per template carries the "voice" — that's the personalization surface.
export const PERSONALIZABLE_NODE = {
  'ai-product-descriptions': 'Write description (AI)',
  'review-reply-drafter': 'Draft reply (AI)',
  'meeting-summary-email': 'Summarize (AI)',
  'weekly-client-report': 'Write the report (AI)',
  'content-repurposer': 'Repurpose (AI)',
  'cold-email-personalizer': 'Write opener (AI)',
  'inbox-reply-triage': 'Classify (AI)',
  'abandoned-cart-winback': 'Write win-back (AI)',
}

export function getTemplate(slug) {
  // hasOwnProperty guard: a plain object lookup would resolve slugs like
  // "__proto__" or "constructor" to prototype members instead of 404ing.
  if (!Object.prototype.hasOwnProperty.call(TEMPLATES, slug)) return null
  return TEMPLATES[slug]
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
