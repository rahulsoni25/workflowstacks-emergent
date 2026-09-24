// fetch() without Next's data cache.
//
// Next 14 patches globalThis.fetch so that every call — including plain
// GitHub API lookups — is written to the ISR/data cache unless it opts out.
// Opting out with `cache: 'no-store'` inside an ISR page flips the whole route
// to dynamic rendering, which is worse. The unpatched fetch is kept on the
// patched one as `_nextOriginalFetch`; calling it skips the cache and leaves
// the route's rendering mode alone.
//
// Use it for one-shot upstream reads whose cached copy would never be read
// again before it expires (a skill page regenerates every 7 days; its GitHub
// tree, up to 2 MB, was being written to the cache on every regeneration and
// billed per 8 KB — for nothing). Resolved at call time: the patch is applied
// when rendering starts, which can be after this module loads.
export function rawFetch(url, init = {}) {
  const f = globalThis.fetch
  const orig = (f && f._nextOriginalFetch) || f
  const { next, ...rest } = init // `next` is a Next-only option; undici ignores it, but be explicit
  return orig(url, rest)
}
