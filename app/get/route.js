import { listedProducts } from '@/lib/digital-products'
import { renderStorePage } from '@/lib/digital-products/render'
import { SITE_URL } from '@/lib/site-url'

// /get — the AI Kits store. A standalone HTML page (no site layout), rendered
// once at build time from the product registry; nothing here calls out.
export const dynamic = 'force-static'

export function GET() {
  const html = renderStorePage(listedProducts(), { siteUrl: SITE_URL, gtmId: process.env.NEXT_PUBLIC_GTM_ID || '' })
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
}
