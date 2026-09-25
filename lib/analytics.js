// Client-side measurement helpers. Everything here is fire-and-forget and
// safe to call during SSR (every function no-ops without `window`).
//
// Two jobs:
//  1. Attribution — remember how a visitor arrived (UTM params, ad click ids,
//     landing page, referrer) for the rest of the session, so an install or
//     purchase can be traced back to the campaign that paid for it.
//  2. Events — one trackEvent() call reaches window.dataLayer (Google Tag
//     Manager), GA4 (gtag) and the Meta Pixel, whichever of them
//     components/Analytics.js has loaded. With no ids set the calls are
//     harmless and attribution still works, so install_events stays useful.
//  3. Consent — who has to opt in, what they chose, and the Consent Mode v2
//     state that follows from it.

import { aiEngineFor } from '@/lib/ai-referrers'

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
    if (ref && ref !== window.location.hostname) {
      out.referrer = ref
      // Split answer-engine referrals out of the generic referral pool, so the
      // GEO work has a number attached to it rather than an assumption.
      const engine = aiEngineFor(ref)
      if (engine) {
        out.ai_engine = engine
        out.channel = 'ai_answer'
      }
    }
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

// ── Consent ──────────────────────────────────────────────────────────────────
// Visitors in a consent region (EEA / UK / CH, guessed from the browser's
// timezone — no geo lookup, no server cost) must opt in before any ad or
// analytics cookie is set. Everyone else is granted by default. A Global
// Privacy Control signal is always honoured as "denied". The choice lives in
// localStorage; components/ConsentBanner.js writes it.
const CONSENT_KEY = 'ws_consent'
const CONSENT_EVENT = 'ws:consent'
const CONSENT_TZ = /^(Europe\/|Atlantic\/(Reykjavik|Canary|Madeira|Azores|Faroe)$|Arctic\/Longyearbyen$)/

export function inConsentRegion() {
  if (typeof window === 'undefined') return false
  try {
    return CONSENT_TZ.test(Intl.DateTimeFormat().resolvedOptions().timeZone || '')
  } catch {
    return true
  }
}

// 'granted' | 'denied' | 'unset' (unset = consent region, no choice made yet)
export function getConsent() {
  if (typeof window === 'undefined') return 'unset'
  try {
    if (navigator.globalPrivacyControl === true) return 'denied'
    const stored = localStorage.getItem(CONSENT_KEY)
    if (stored === 'granted' || stored === 'denied') return stored
  } catch {}
  return inConsentRegion() ? 'unset' : 'granted'
}

// A refusal after an earlier acceptance also removes what was already set.
function clearTagCookies() {
  try {
    const host = window.location.hostname
    const domains = ['', host, `.${host}`, `.${host.split('.').slice(-2).join('.')}`]
    for (const pair of document.cookie.split(';')) {
      const name = pair.split('=')[0].trim()
      if (!/^(_ga|_gid|_gat|_gcl_|_fbp$|_fbc$)/.test(name)) continue
      for (const d of domains) {
        document.cookie = `${name}=; Max-Age=0; path=/${d ? `; domain=${d}` : ''}`
      }
    }
  } catch {}
}

export function setConsent(value) {
  if (typeof window === 'undefined') return
  const v = value === 'granted' ? 'granted' : 'denied'
  try { localStorage.setItem(CONSENT_KEY, v) } catch {}
  if (v === 'denied') clearTagCookies()
  try { window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: v })) } catch {}
}

export function onConsentChange(fn) {
  if (typeof window === 'undefined') return () => {}
  const handler = (e) => fn(e.detail)
  window.addEventListener(CONSENT_EVENT, handler)
  return () => window.removeEventListener(CONSENT_EVENT, handler)
}

// The four Consent Mode v2 signals, all moved together.
export function consentModeState(consent) {
  const v = consent === 'granted' ? 'granted' : 'denied'
  return { ad_storage: v, ad_user_data: v, ad_personalization: v, analytics_storage: v }
}

// ── Events ───────────────────────────────────────────────────────────────────
// One call site, three destinations: the dataLayer (GTM), GA4 via gtag, and
// the Meta Pixel. Site event names are mapped to each platform's standard
// event so ad delivery can optimise on them without custom conversions.
// Only ids, slugs and amounts are forwarded — never an email address.
const GA4_EVENT = {
  newsletter_signup: 'generate_lead',
  dfy_request: 'generate_lead',
  checkout_start: 'begin_checkout',
  site_search: 'search',
}
const META_EVENT = {
  newsletter_signup: 'Lead',
  dfy_request: 'Contact',
  checkout_start: 'InitiateCheckout',
  purchase: 'Purchase',
  site_search: 'Search',
  creator_claim: 'CompleteRegistration',
  skill_submit: 'SubmitApplication',
}
const META_PARAMS = ['value', 'currency', 'content_name', 'content_category', 'search_string']

export function trackEvent(name, params = {}) {
  if (typeof window === 'undefined' || !name) return
  try {
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({ event: name, ...params })
  } catch {}
  try {
    // GA4's enhanced measurement already counts history-based page changes.
    if (typeof window.gtag === 'function' && name !== 'virtual_page_view') {
      window.gtag('event', GA4_EVENT[name] || name, { ...params, ws_event: name })
    }
  } catch {}
  try {
    if (typeof window.fbq === 'function' && getConsent() === 'granted') {
      const metaParams = {}
      for (const k of META_PARAMS) if (params[k] !== undefined && params[k] !== '') metaParams[k] = params[k]
      if (META_EVENT[name]) window.fbq('track', META_EVENT[name], metaParams)
      else if (name === 'install') window.fbq('trackCustom', 'SkillInstall', { content_name: params.skill_id || '', content_category: params.channel || '' })
    }
  } catch {}
}
