'use client'

// Site-wide measurement. Loads Google Tag Manager when NEXT_PUBLIC_GTM_ID is
// set (GA4, Meta Pixel, etc. are then configured inside the container, no
// code changes needed), captures first-touch attribution on every visit, and
// emits a virtual page_view on client-side navigation so SPA route changes
// are counted. Renders nothing visible. Without a GTM id it still captures
// attribution so install_events can be traced to a campaign.
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Script from 'next/script'
import { captureUtm, trackEvent } from '@/lib/analytics'

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || ''
const GTM_OK = /^GTM-[A-Z0-9]{4,12}$/.test(GTM_ID)

export default function Analytics() {
  const pathname = usePathname()

  useEffect(() => {
    captureUtm()
  }, [])

  useEffect(() => {
    if (!pathname) return
    trackEvent('virtual_page_view', { page_path: pathname })
  }, [pathname])

  if (!GTM_OK) return null
  return (
    <Script id="gtm" strategy="afterInteractive">
      {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
    </Script>
  )
}
