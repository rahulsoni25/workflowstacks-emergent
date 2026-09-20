import { NextResponse } from 'next/server'
import { getOutcome } from '@/lib/outcomes'
import { getTemplate } from '@/lib/templates'
import { getMcpServer } from '@/lib/mcp-servers'
import { getSlashCommand } from '@/lib/commands'
import { getBundle } from '@/lib/bundles'
import { getKit } from '@/lib/kits'
import { SITE_URL as BASE } from '@/lib/site-url'
import { slugifyName } from '@/lib/collections'

// 36-char UUID with the standard dash positions (8-4-4-4-12).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Tiny in-memory cache so we don't hit the API on every UUID request from the
// same Edge instance. A found slug is immutable and lives for the worker's
// life. A MISS is not: 495 catalog entries have no slug today and a backfill
// assigns them in one pass, so a worker that cached "no slug" for a UUID would
// keep serving the UUID page after the slug exists. Misses expire.
const slugCache = new Map()
const MISS_TTL_MS = 10 * 60 * 1000

function cachedSlug(key) {
  const hit = slugCache.get(key)
  if (!hit) return undefined
  if (hit.slug) return hit.slug
  if (Date.now() - hit.at < MISS_TTL_MS) return null
  slugCache.delete(key)
  return undefined
}
function remember(key, slug) {
  slugCache.set(key, { slug: slug || null, at: Date.now() })
}

// How to turn an API response for a UUID into the slug its page lives at.
// Skills store a slug; packs, playbooks and personas derive one from the name
// (see lib/collections.js), so the same derivation runs here — otherwise this
// redirect and the page's canonical could disagree about the URL.
const SLUG_SOURCES = {
  skills: (d) => d?.skill?.slug || null,
  packs: (d) => slugifyName(d?.pack?.name),
  playbooks: (d) => slugifyName(d?.playbook?.title || d?.playbook?.name),
  personas: (d) => slugifyName(d?.persona?.name),
}

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

  // --- /{skills|packs|playbooks|personas}/{uuid} -> canonical slug, 308 ---
  //
  // This has to happen here rather than in the page. app/loading.js is a root
  // Suspense boundary, so every page starts streaming before its async work
  // finishes — and a redirect() thrown after the first flush cannot change the
  // status code. It degrades to a 200 carrying <meta http-equiv="refresh">,
  // which is what /skills/<uuid> was serving in production. The Edge runs
  // before any of that.
  const m = pathname.match(/^\/(skills|packs|playbooks|personas)\/([^/?#]+)\/?$/)
  if (!m) return NextResponse.next()
  const [, kind, param] = m
  if (!UUID_RE.test(param)) return NextResponse.next() // already a slug
  const key = `${kind}:${param}`

  const known = cachedSlug(key)
  if (known === null) return NextResponse.next() // recent miss — let it through
  if (known) {
    const url = request.nextUrl.clone()
    url.pathname = `/${kind}/${known}`
    return NextResponse.redirect(url, 308)
  }

  // Look up via our own API (Edge runtime is allowed to fetch).
  try {
    const r = await fetch(`${BASE}/api/${kind}/${param}`, { headers: { 'User-Agent': 'WS-Middleware' } })
    if (!r.ok) { remember(key, null); return NextResponse.next() }
    const slug = SLUG_SOURCES[kind](await r.json())
    if (!slug || slug === param) { remember(key, null); return NextResponse.next() }
    remember(key, slug)
    const url = request.nextUrl.clone()
    url.pathname = `/${kind}/${slug}`
    return NextResponse.redirect(url, 308)
  } catch {
    return NextResponse.next() // never break the page if the lookup fails
  }
}

// Only run the middleware where it can do something — every other request
// skips it entirely. Each run is a billable Edge Middleware invocation, and
// the previous `/skills/:path*` matcher fired on every catalog page view,
// the index and the pagination chain, only to fall through on all of them:
// the UUID redirect can only apply to a UUID-shaped id, and the static-
// registry 404 check only to exactly one slug segment under those six types.
// (Next.js reads `config` statically, so the patterns must be literals.)
export const config = {
  matcher: [
    '/(skills|packs|playbooks|personas)/:id([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})',
    // Explicit pattern on purpose: Next appends "(.json)?" to every matcher
    // for its data routes, and a bare ":slug" would swallow that as its own
    // pattern and match nothing.
    '/(automate|mcp|templates|commands|bundles|kits)/:slug([^/]+)',
  ],
}
