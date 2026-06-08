import { NextResponse } from 'next/server'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks-emergent.vercel.app'

// 36-char UUID with the standard dash positions (8-4-4-4-12).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Tiny in-memory cache so we don't hit the API on every UUID request from the
// same Edge instance. Slugs are immutable so this can live forever per worker.
const slugCache = new Map()

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // Only intervene on /skills/{maybe-uuid}
  const m = pathname.match(/^\/skills\/([^/?#]+)\/?$/)
  if (!m) return NextResponse.next()
  const param = m[1]
  if (!UUID_RE.test(param)) return NextResponse.next() // already a slug

  // Cached?
  if (slugCache.has(param)) {
    const slug = slugCache.get(param)
    if (!slug) return NextResponse.next() // negative cache — no slug exists, let it through
    const url = request.nextUrl.clone()
    url.pathname = `/skills/${slug}`
    return NextResponse.redirect(url, 308)
  }

  // Look up the slug via our own API (Edge runtime is allowed to fetch).
  try {
    const r = await fetch(`${BASE}/api/skills/${param}`, { headers: { 'User-Agent': 'WS-Middleware' } })
    if (!r.ok) { slugCache.set(param, null); return NextResponse.next() }
    const data = await r.json()
    const slug = data?.skill?.slug
    if (!slug || slug === param) { slugCache.set(param, null); return NextResponse.next() }
    slugCache.set(param, slug)
    const url = request.nextUrl.clone()
    url.pathname = `/skills/${slug}`
    return NextResponse.redirect(url, 308)
  } catch {
    return NextResponse.next() // never break the page if the lookup fails
  }
}

// Only run the middleware for /skills/* paths — every other request skips it.
export const config = {
  matcher: ['/skills/:path*'],
}
