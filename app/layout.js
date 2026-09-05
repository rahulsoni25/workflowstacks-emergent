import './globals.css'
import SiteHeader from '@/components/SiteHeader'
import Footer from '@/components/Footer'
import { SITE_URL } from '@/lib/site-url'
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google'

const grotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-grotesk', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-mono-jb', display: 'swap' })

export const metadata = {
  title: 'WorkflowStacks — Open-Source AI Skills & Agents',
  description: 'Install quality-gated open-source AI skills, agents and MCP servers into Claude, ChatGPT or Gemini — no code. Free catalog, templates, done-for-you builds.',
  authors: [{ name: 'WorkflowStacks' }],
  creator: 'WorkflowStacks',
  publisher: 'WorkflowStacks',
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: 'WorkflowStacks — Open-Source AI Skills & Agents',
    description: 'Install open-source AI skills and build custom AI agents for paid ads, performance reporting, SEO, outreach, and ecommerce — without coding.',
    type: 'website',
    locale: 'en_US',
    siteName: 'WorkflowStacks',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WorkflowStacks — Open-Source AI Skills & Agents',
    description: 'Install open-source AI skills and build custom AI agents for paid ads, performance reporting, SEO, outreach, and ecommerce — without coding.',
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
    name: 'WorkflowStacks',
    description: 'AI Skills & Agent Marketplace for OpenClaw, Claude, Gemini, and MCP Tools — by WorkflowStacks',
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
    name: 'WorkflowStacks',
    description: 'A free marketplace for open-source AI skills, an agent builder, and group-buy tool deals for founders.',
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
      </body>
    </html>
  )
}
