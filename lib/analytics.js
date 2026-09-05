// Client-side measurement helpers. Everything here is fire-and-forget and
// safe to call during SSR (every function no-ops without `window`).
//
// Two jobs:
//  1. Attribution — remember how a visitor arrived (UTM params, ad click ids,
//     landing page, referrer) for the rest of the session, so an install or
//     purchase can be traced back to the campaign that paid for it.
//  2. Events — push named events onto window.dataLayer, which Google Tag
//     Manager (see components/Analytics.js) forwards to GA4 / Meta / anything
//     else configured in the container. With no GTM id set the pushes are
//     harmless and attribution still works, so install_events stays useful.

const STORAGE_KEY = 'ws_attribution'
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'ref']
const MAX_LEN = 120

function clean(v) {
  return typeof v === 'string' ? v.replace(/[^\w\-.:/ ]/g, '').slice(0, MAX_LEN) : ''
}

// Capture once per session: the first touch wins so a later internal
// navigation never overwrites the campaign that brought the visitor in.
export function captureUtm() {
  if (typeof window === 'undefined') return
  try {
    if (sessionStorage.getItem(STORAGE_KEY)) return
    const params = new URLSearchParams(window.location.search)
    const out = {}
    for (const k of UTM_KEYS) {
      const v = clean(params.get(k))
      if (v) out[k] = v
    }
    out.landing = clean(window.location.pathname)
    const ref = document.referrer ? clean(new URL(document.referrer).hostname) : ''
    if (ref && ref !== window.location.hostname) out.referrer = ref
    out.first_seen = new Date().toISOString()
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(out))
  } catch {}
}

export function getUtm() {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function trackEvent(name, params = {}) {
  if (typeof window === 'undefined' || !name) return
  try {
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({ event: name, ...params })
  } catch {}
}
