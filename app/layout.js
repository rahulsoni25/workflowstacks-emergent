import './globals.css'
import SiteHeader from '@/components/SiteHeader'
import Footer from '@/components/Footer'
import Analytics from '@/components/Analytics'
import { SITE_URL } from '@/lib/site-url'
import { SITE_NAME, TAGLINE, DESCRIPTION } from '@/lib/positioning'
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google'

const grotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-grotesk', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-mono-jb', display: 'swap' })

// Title, description and the JSON-LD descriptions below all come from
// lib/positioning.js so this file, the footer, About and the README say the
// same thing. The title stays under 65 characters for the SERP.
const TITLE = `${SITE_NAME} — Open-Source AI Skills, Agents & MCP Servers`

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    locale: 'en_US',
    siteName: SITE_NAME,
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({ children }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    alternateName: TAGLINE,
    description: DESCRIPTION,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    description: DESCRIPTION,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
    sameAs: ['https://github.com/rahulsoni25/workflowstacks-emergent'],
  }

  // Note: FAQPage schema is intentionally NOT global — it lives on the homepage
  // (app/page.js) so each route can carry its own page-specific structured data.

  return (
    <html lang="en" className={`dark ${grotesk.variable} ${mono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </head>
      <body className="flex min-h-screen flex-col bg-neptune">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  )
}
