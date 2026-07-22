// Premium bundle registry — paid, one-time. Hero templates stay free (they're
// acquisition); bundles are genuinely more-advanced workflows + a written
// playbook, priced $19–79 one-time. Delivery is token-gated (see the bundle
// checkout + webhook + download endpoints).

import reviewMgmtPro from '../templates/premium/review-management-system-pro.json'

export const BUNDLES = {
  'ecommerce-pro-pack': {
    slug: 'ecommerce-pro-pack',
    title: 'Ecommerce Pro Pack',
    tagline: 'The review pipeline that actually protects your rating.',
    price_usd: 29,
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
