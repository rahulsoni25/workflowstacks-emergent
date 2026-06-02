import './globals.css'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'WorkflowStacks — AI Skills & No-Code Agents for Claude, Gemini & OpenClaw',
  description: 'Install OpenClaw-style AI skills, agent personas, and ready-to-use playbooks for Claude, Gemini, and MCP. Build custom AI agents for SEO, outreach, and ecommerce ops — without writing code.',
  keywords: 'WorkflowStacks, AI skills marketplace, OpenClaw skills, Claude skills, Gemini extensions, MCP servers, AI agents, prompt engineering, AI automation, no-code AI, AI for founders, AI for marketers, SEO automation, ecommerce AI',
  authors: [{ name: 'WorkflowStacks' }],
  creator: 'WorkflowStacks',
  publisher: 'WorkflowStacks',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks.com'),
  openGraph: {
    title: 'WorkflowStacks — AI Skills & No-Code Agents for Claude, Gemini & OpenClaw',
    description: 'Install OpenClaw-style AI skills and build custom AI agents for SEO, outreach, and ecommerce — without coding.',
    type: 'website',
    locale: 'en_US',
    siteName: 'WorkflowStacks',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WorkflowStacks — AI Skills & No-Code Agents for Claude, Gemini & OpenClaw',
    description: 'Install OpenClaw-style AI skills and build custom AI agents for SEO, outreach, and ecommerce — without coding.',
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
