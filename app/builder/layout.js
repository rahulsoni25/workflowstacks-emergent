import { softwareApplicationSchema, breadcrumbSchema } from '@/lib/schema'

export const metadata = {
  title: 'AI Agent Builder — Free, No Code | WorkflowStacks',
  description: 'Pick AI skills, set a goal, and instantly generate a ready-to-paste agent blueprint for Claude, ChatGPT, or Gemini. Free, no code.',
  alternates: { canonical: '/builder' },
}

// SoftwareApplication tells search and answer engines that this page IS a
// tool, not an article about one — the distinction that lets it compete for
// "AI agent builder" style queries at all.
const appSchema = softwareApplicationSchema({
  name: 'WorkflowStacks AI Agent Builder',
  description:
    'A free no-code AI agent builder. Describe your goal, pick from open-source AI skills, and generate a ready-to-run agent blueprint for Claude, ChatGPT, or Gemini — plus matching n8n workflow templates you can import and run.',
  url: '/builder',
  applicationCategory: 'BusinessApplication',
  priceUsd: 0,
})

const crumbs = breadcrumbSchema([
  { name: 'Home', path: '/' },
  { name: 'AI Agent Builder', path: '/builder' },
])

export default function BuilderLayout({ children }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      {children}
    </>
  )
}
