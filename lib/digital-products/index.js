// Digital products registry: one JSON file per product in ./catalog/, rendered
// by ./render.js at /get/<slug> (app/get/[slug]/route.js) and listed at /get.
//
// To add a product: put its JSON in ./catalog/ (copy an existing one), import it
// below and add it to CATALOG. "status": "draft" renders the page (noindex) but
// keeps it out of the store, the sitemap and the homepage.
//
// The product files buyers download are NOT here: this repo is public. They live
// on the checkout platform named in each product's "checkout".
import uae from './catalog/ai-employee-kit-uae.json'
import dubai from './catalog/ai-property-agent-kit-dubai.json'
import india from './catalog/ai-employee-kit-india.json'

const CATALOG = [uae, dubai, india]

// Fail the build, not the page, if a product file is missing a section.
const REQUIRED = ['slug', 'status', 'name', 'card', 'seo', 'price', 'buy', 'whatsapp', 'hero', 'inside', 'offer', 'refund', 'faq', 'final']
for (const p of CATALOG) {
  const missing = REQUIRED.filter((k) => p[k] === undefined)
  if (missing.length) throw new Error(`digital product "${p.slug || '?'}" is missing: ${missing.join(', ')}`)
}

export const PRODUCTS = Object.fromEntries(CATALOG.map((p) => [p.slug, p]))

export function getProduct(slug) {
  return Object.prototype.hasOwnProperty.call(PRODUCTS, slug) ? PRODUCTS[slug] : null
}

export function listedProducts() {
  return CATALOG.filter((p) => p.status === 'live')
}

// What a card needs, and nothing more (pages pass the browser only what they render).
export function productCards() {
  return listedProducts().map(({ slug, name, card, price, storeTag }) => ({ slug, name, card, price: price.label, tag: storeTag || '' }))
}
