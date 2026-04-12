import './globals.css'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'ShowClawMart — AI Skills & Agent Marketplace | Claude, Gemini, MCP Tools',
  description: 'Discover 500+ AI skills, agent personas, and ready-to-use playbooks for Claude, Gemini, and MCP. Build custom AI agents without coding. Perfect for founders, marketers, and ecommerce operators.',
  keywords: 'AI skills marketplace, Claude skills, Gemini extensions, MCP servers, AI agents, prompt engineering, AI automation, no-code AI, AI for founders, AI for marketers',
  authors: [{ name: 'ShowClawMart' }],
  creator: 'ShowClawMart',
  publisher: 'ShowClawMart',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://showclawmart.com'),
  openGraph: {
    title: 'ShowClawMart — AI Skills & Agent Marketplace',
    description: 'Discover 500+ AI skills and build custom AI agents without coding. For Claude, Gemini, MCP and more.',
    type: 'website',
    locale: 'en_US',
    siteName: 'ShowClawMart',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ShowClawMart — AI Skills & Agent Marketplace',
    description: 'Discover 500+ AI skills and build custom AI agents without coding.',
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
  alternates: {
    canonical: '/',
  },
}

export default function RootLayout({ children }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'ShowClawMart',
    description: 'AI Skills & Agent Marketplace for Claude, Gemini, and MCP Tools',
    url: process.env.NEXT_PUBLIC_BASE_URL || 'https://showclawmart.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://showclawmart.com'}/?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ShowClawMart',
    description: 'The leading marketplace for AI skills, agent personas, and automation playbooks.',
    url: process.env.NEXT_PUBLIC_BASE_URL || 'https://showclawmart.com',
    logo: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://showclawmart.com'}/logo.png`,
    sameAs: [
      'https://twitter.com/showclawmart',
      'https://github.com/showclawmart',
    ],
  }

  return (
    <html lang="en" className="dark">
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
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
