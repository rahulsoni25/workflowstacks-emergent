import './globals.css'
import Footer from '@/components/Footer'
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google'

const grotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-grotesk', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-mono-jb', display: 'swap' })

export const metadata = {
  title: 'WorkflowStacks — AI Skills & No-Code Agents for Claude, ChatGPT & Gemini',
  description: 'Install open-source AI skills, agent personas, and ready-to-use playbooks for Claude, Gemini, and MCP. Build custom AI agents for paid ads, performance reporting, SEO, market research, outreach, and ecommerce — without writing code.',
  keywords: 'WorkflowStacks, AI skills marketplace, Claude skills, Gemini extensions, MCP servers, AI agents, no-code AI, paid ads automation, Meta ads AI, Google ads AI, TikTok ads AI, performance marketing AI, performance reporting AI, marketing dashboards, attribution AI, market research AI, competitor intelligence AI, SEO automation, AEO, GEO, ecommerce AI, AI for founders, AI for agencies',
  authors: [{ name: 'WorkflowStacks' }],
  creator: 'WorkflowStacks',
  publisher: 'WorkflowStacks',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks.com'),
  openGraph: {
    title: 'WorkflowStacks — AI Skills & No-Code Agents for Claude, ChatGPT & Gemini',
    description: 'Install open-source AI skills and build custom AI agents for paid ads, performance reporting, SEO, outreach, and ecommerce — without coding.',
    type: 'website',
    locale: 'en_US',
    siteName: 'WorkflowStacks',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WorkflowStacks — AI Skills & No-Code Agents for Claude, ChatGPT & Gemini',
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
  alternates: {
    canonical: '/',
  },
}

export default function RootLayout({ children }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'WorkflowStacks',
    description: 'AI Skills & Agent Marketplace for OpenClaw, Claude, Gemini, and MCP Tools — by WorkflowStacks',
    url: process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks.com'}/?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'WorkflowStacks',
    description: 'A free marketplace for open-source AI skills, an agent builder, and group-buy tool deals for founders.',
    url: process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks-emergent.vercel.app',
    logo: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks-emergent.vercel.app'}/icon.svg`,
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
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
