import QRCode from 'qrcode'
import { CODE_RE, normCode } from '../../../../../lib/talk'
import { SITE_URL } from '../../../../../lib/site-url'

// Print-ready QR for a Talking Code, as SVG (sharp at any size) or PNG.
//   /api/talk/qr/AST01?src=card            → SVG
//   /api/talk/qr/AST01?src=card&format=png → 1200px PNG
// The QR only encodes the short link, so it never changes when the video
// does. Output is deterministic per URL, so browsers and the CDN may cache it.
// No network call here.
export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  const code = normCode(params.code)
  if (!CODE_RE.test(code)) return new Response('Unknown code', { status: 404 })
  const url = new URL(request.url)
  const src = (url.searchParams.get('src') || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 30)
  const target = `${SITE_URL}/t/${code}${src ? `?src=${src}` : ''}`
  const opts = { errorCorrectionLevel: 'H', margin: 4, color: { dark: '#000000', light: '#ffffff' } }
  const cache = 'public, max-age=86400, s-maxage=2592000, immutable'

  if (url.searchParams.get('format') === 'png') {
    const png = await QRCode.toBuffer(target, { ...opts, type: 'png', width: 1200 })
    return new Response(png, { headers: { 'Content-Type': 'image/png', 'Cache-Control': cache, 'Content-Disposition': `inline; filename="${code}-qr.png"` } })
  }
  const svg = await QRCode.toString(target, { ...opts, type: 'svg' })
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': cache, 'Content-Disposition': `inline; filename="${code}-qr.svg"` } })
}
