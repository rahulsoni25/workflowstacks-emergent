import { PRODUCTS, getProduct } from '@/lib/digital-products'
import { renderProductPage } from '@/lib/digital-products/render'
import { SITE_URL } from '@/lib/site-url'

// /get/<slug> — one sales page per digital product, built from
// lib/digital-products/catalog/<slug>.json. Standalone HTML (no site layout, so
// an ad visitor sees one focused page), rendered once at build time.
export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return Object.keys(PRODUCTS).map((slug) => ({ slug }))
}

export function GET(_request, { params }) {
  const product = getProduct(params.slug)
  if (!product) return new Response('Not found', { status: 404 })
  const html = renderProductPage(product, { siteUrl: SITE_URL, gtmId: process.env.NEXT_PUBLIC_GTM_ID || '' })
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
}
