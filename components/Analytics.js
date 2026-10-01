'use client'

// Site-wide measurement. Renders nothing; the consent prompt it needs is
// <ConsentBanner />, mounted here so the two can never drift apart.
//
// Three optional tags, each switched on by a public env var and inert without
// it (ids are validated, so a typo loads nothing rather than a broken script):
//   NEXT_PUBLIC_GA_ID          G-XXXXXXXXXX      GA4, loaded directly
//   NEXT_PUBLIC_META_PIXEL_ID  15-16 digits      Meta Pixel, loaded directly
//   NEXT_PUBLIC_GTM_ID         GTM-XXXXXXX       Tag Manager, for anything else
// Use the direct ids OR configure the same GA4 property / pixel inside the GTM
// container — never both, or every event is counted twice.
//
// Also captures first-touch attribution on every visit and emits a virtual
// page_view on the dataLayer for GTM. Client-side navigations: GA4 counts them
// itself (enhanced measurement → "page changes based on browser history", on by
// default — leave it on). The Pixel's own history listener is switched off and
// PageView is sent from here instead, so each route counts exactly once.
// Nothing loads on /admin.
//
// Consent Mode v2: defaults are set before any tag loads. In a consent region
// GA4 runs cookieless until the visitor accepts, and the Pixel does not load
// at all. See lib/analytics.js for who counts as "in a consent region".
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import ConsentBanner from '@/components/ConsentBanner'
import { captureUtm, getUtm, trackEvent, getConsent, onConsentChange, consentModeState } from '@/lib/analytics'

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || ''
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || ''
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || ''
const GTM_OK = /^GTM-[A-Z0-9]{4,12}$/.test(GTM_ID)
const GA_OK = /^G-[A-Z0-9]{6,14}$/.test(GA_ID)
const PIXEL_OK = /^\d{10,20}$/.test(PIXEL_ID)
export const TAGS_ON = GTM_OK || GA_OK || PIXEL_OK

let booted = false
let pixelPath = null // last path the Pixel was told about

function addScript(src) {
  const s = document.createElement('script')
  s.async = true
  s.src = src
  document.head.appendChild(s)
}

function loadPixel() {
  if (window.fbq) {
    window.fbq('consent', 'grant')
    return
  }
  const fbq = function () { fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments) }
  fbq.push = fbq
  fbq.loaded = true
  fbq.version = '2.0'
  fbq.queue = []
  fbq.disablePushState = true
  window.fbq = fbq
  window._fbq = fbq
  addScript('https://connect.facebook.net/en_US/fbevents.js')
  fbq('init', PIXEL_ID)
  fbq('track', 'PageView')
  pixelPath = window.location.pathname
}

function boot() {
  if (booted || !TAGS_ON) return
  booted = true
  const consent = getConsent()

  if (GA_OK || GTM_OK) {
    window.dataLayer = window.dataLayer || []
    // Must push the `arguments` object itself — gtag.js ignores plain arrays.
    const gtag = function () { window.dataLayer.push(arguments) }
    gtag('consent', 'default', { ...consentModeState(consent), wait_for_update: 500 })
    onConsentChange((v) => gtag('consent', 'update', consentModeState(v)))
    if (GA_OK) {
      // Only exposed with a direct GA4 id: under GTM alone, trackEvent's
      // dataLayer push is already the event and a gtag copy would double it.
      window.gtag = gtag
      gtag('js', new Date())
      gtag('config', GA_ID)
      addScript(`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`)
    }
    if (GTM_OK) {
      window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
      addScript(`https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`)
    }
  }

  if (PIXEL_OK) {
    if (consent === 'granted') loadPixel()
    onConsentChange((v) => {
      if (v === 'granted') loadPixel()
      else if (window.fbq) window.fbq('consent', 'revoke')
    })
  }
}

export default function Analytics() {
  const pathname = usePathname()
  const isAdmin = (pathname || '').startsWith('/admin')

  // Declared first so the tags exist before the effects below send events.
  useEffect(() => {
    if (!isAdmin) boot()
  }, [isAdmin])

  useEffect(() => {
    captureUtm()
    // Fire the answer-engine arrival as its own event so the GEO channel shows
    // up in GA4 next to organic search, rather than being buried in "referral".
    const attribution = getUtm()
    if (attribution?.ai_engine) {
      trackEvent('ai_referral', {
        ai_engine: attribution.ai_engine,
        landing: attribution.landing || '',
        referrer: attribution.referrer || '',
      })
    }
  }, [])

  useEffect(() => {
    if (!pathname) return
    trackEvent('virtual_page_view', { page_path: pathname })
    if (!isAdmin && pixelPath !== null && pixelPath !== pathname && window.fbq && getConsent() === 'granted') {
      pixelPath = pathname
      window.fbq('track', 'PageView')
    }
  }, [pathname])

  if (!TAGS_ON || isAdmin) return null
  return <ConsentBanner />
}
