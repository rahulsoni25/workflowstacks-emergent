// Outcome-template registry — the artifacts the Builder actually delivers.
// Phase 1 starts file-based (hand-built, tested templates only); moves to the
// outcome_templates Mongo collection once the recommender wiring lands.

import aiProductDescriptions from '../templates/ai-product-descriptions.json'

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
    workflow: aiProductDescriptions,
  },
}

export function getTemplate(slug) {
  return TEMPLATES[slug] || null
}
