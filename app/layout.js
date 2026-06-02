import './globals.css'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'WorkflowStacks — AI Skills & Agent Marketplace for OpenClaw, Claude & Gemini',
  description: 'Install OpenClaw-style AI skills, agent personas, and ready-to-use playbooks for Claude, Gemini, and MCP. Build custom AI agents for SEO, outreach, and ecommerce ops — without writing code.',
  keywords: 'WorkflowStacks, AI skills marketplace, OpenClaw skills, Claude skills, Gemini extensions, MCP servers, AI agents, prompt engineering, AI automation, no-code AI, AI for founders, AI for marketers, SEO automation, ecommerce AI',
  authors: [{ name: 'WorkflowStacks' }],
  creator: 'WorkflowStacks',
  publisher: 'WorkflowStacks',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks.com'),
  openGraph: {
    title: 'WorkflowStacks — AI Skills & Agent Marketplace for OpenClaw, Claude & Gemini',
    description: 'Install OpenClaw-style AI skills and build custom AI agents for SEO, outreach, and ecommerce — without coding.',
    type: 'website',
    locale: 'en_US',
    siteName: 'WorkflowStacks',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WorkflowStacks — AI Skills & Agent Marketplace for OpenClaw, Claude & Gemini',
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

  // FAQPage schema for AEO / AI answer engines (server-rendered so it's always crawlable)
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'What is WorkflowStacks?', acceptedAnswer: { '@type': 'Answer', text: 'WorkflowStacks is a free marketplace of real, trending open-source AI skills, with a no-code agent builder, group-buy deals on AI tools, and a community of AI founders. The open-source catalog is 100% free.' } },
      { '@type': 'Question', name: 'Is WorkflowStacks free?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Browsing 160+ open-source AI skills, reading their full source, and building agents is completely free. WorkflowStacks earns from group-buy tool deals, services, and creator tools — never from the free catalog.' } },
      { '@type': 'Question', name: 'How is it different from paid AI-skill marketplaces?', acceptedAnswer: { '@type': 'Answer', text: 'Unlike paid marketplaces that hide a skill behind a buy button, WorkflowStacks shows the full real source of every free open-source tool before you use it, and lets you build a custom agent from them for free.' } },
      { '@type': 'Question', name: 'What can I build with the Agent Builder?', acceptedAnswer: { '@type': 'Answer', text: 'Pick any skills, set a goal, and the builder generates a ready-to-paste agent blueprint for Claude, ChatGPT, or Gemini — no code required.' } },
      { '@type': 'Question', name: 'What are group-buy tool deals?', acceptedAnswer: { '@type': 'Answer', text: 'Founders pool together to unlock wholesale rates (typically 40–70% off) on paid AI tools like Perplexity and n8n. You reserve a seat for free and the deal unlocks when enough founders join.' } },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      </head>
      <body className="flex min-h-screen flex-col bg-neptune">
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
