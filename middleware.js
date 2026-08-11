import { NextResponse } from 'next/server'
import { getOutcome } from '@/lib/outcomes'
import { getTemplate } from '@/lib/templates'
import { getMcpServer } from '@/lib/mcp-servers'
import { getSlashCommand } from '@/lib/commands'
import { getBundle } from '@/lib/bundles'
import { getKit } from '@/lib/kits'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks-emergent.vercel.app'

// 36-char UUID with the standard dash positions (8-4-4-4-12).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Tiny in-memory cache so we don't hit the API on every UUID request from the
// same Edge instance. Slugs are immutable so this can live forever per worker.
const slugCache = new Map()

// Content types whose pages come from generateStaticParams() over a static
// in-memory registry (not the DB). Verified live 2026-08-11: an unmatched
// slug under these renders the literal homepage (200, full index/follow
// signals) instead of running notFound() — a Next 14 App Router quirk where
// SSG dynamic routes don't fall back correctly for params outside the
// pre-rendered set. That produced GSC's "Soft 404" + "Duplicate without
// user-selected canonical" for workflowstacks.com. DB-backed routes
// (/skills, /packs, /personas, /playbooks) don't have this bug — they
// already render a distinct not-found page — so they're left alone.
// Each lookup is a plain synchronous object read, so checking is free (no
// fetch, no added latency for legitimate requests).
const STATIC_LOOKUPS = {
  automate: (slug) => getOutcome(slug),
  mcp: (slug) => getMcpServer(slug),
  templates: (slug) => getTemplate(slug),
  commands: (slug) => getSlashCommand(slug),
  bundles: (slug) => getBundle(slug),
  kits: (slug) => getKit(slug),
}

const LABELS = {
  automate: 'Page',
  mcp: 'MCP server',
  templates: 'Template',
  commands: 'Command',
  bundles: 'Bundle',
  kits: 'Kit',
}

function notFoundResponse(label) {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${label} not found | WorkflowStacks</title><meta name="robots" content="noindex,follow"/>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0c0d;font-family:system-ui,-apple-system,sans-serif;color:#fff}
.wrap{text-align:center;max-width:28rem;padding:0 1rem}
.code{font-size:4rem;font-weight:800;background:linear-gradient(90deg,#2dd4bf,#22d3ee);-webkit-background-clip:text;background-clip:text;color:transparent;margin-bottom:1rem}
p{color:#94a3b8;margin-bottom:2rem}
a{display:inline-block;padding:.6rem 1.4rem;border-radius:.5rem;text-decoration:none;font-weight:500;margin:0 .4rem}
.home{background:linear-gradient(90deg,#14b8a6,#06b6d4);color:#fff}
.browse{border:1px solid #334155;color:#e2e8f0}</style></head>
<body><div class="wrap"><div class="code">404</div><h1>This page wandered off</h1>
<p>The ${label.toLowerCase()} you're looking for doesn't exist or may have been moved.</p>
<a class="home" href="/">Go Home</a><a class="browse" href="/templates">Browse Templates</a>
</div></body></html>`
  return new NextResponse(html, { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } })
}

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // Only fires for exactly one slug segment — leaves nested routes like
  // /bundles/[slug]/unlock untouched.
  const staticMatch = pathname.match(/^\/(automate|mcp|templates|commands|bundles|kits)\/([^/?#]+)\/?$/)
  if (staticMatch) {
    const [, type, slug] = staticMatch
    if (!STATIC_LOOKUPS[type](slug)) {
      return notFoundResponse(LABELS[type])
    }
    return NextResponse.next()
  }

  // --- /skills/{maybe-uuid} -> canonical slug redirect (unchanged) ---
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

// Only run the middleware for these paths — every other request skips it.
export const config = {
  matcher: ['/skills/:path*', '/automate/:path*', '/mcp/:path*', '/templates/:path*', '/commands/:path*', '/bundles/:path*', '/kits/:path*'],
}
