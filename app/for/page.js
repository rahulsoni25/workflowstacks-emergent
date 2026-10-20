import Link from 'next/link'
import { SITE_URL as BASE } from '@/lib/site-url'
import { breadcrumbSchema } from '@/lib/schema'
import { INSTALL_TARGETS } from '@/lib/install-targets'

// Index of the per-tool hubs (/for/<tool>). Static: the registry is in code.
export const metadata = {
  title: 'AI Skills by Tool — Claude Code, Cursor & More | WorkflowStacks',
  description: 'Open-source AI skills, MCP servers and prompts grouped by the tool they install into: Claude Code, Claude Desktop, Cursor, Windsurf, VS Code, ChatGPT and Gemini.',
  alternates: { canonical: '/for' },
}

export default function ForIndexPage() {
  const crumbs = breadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'By tool', path: '/for' },
  ])
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'AI skills by tool',
    url: `${BASE}/for`,
    numberOfItems: INSTALL_TARGETS.length,
    itemListElement: INSTALL_TARGETS.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: `For ${t.name}`, url: `${BASE}/for/${t.slug}` })),
  }
  return (
    <div className="min-h-screen bg-[#0A0C0D]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <div className="container mx-auto max-w-5xl px-4 py-12">
        <header className="max-w-2xl">
          <div className="t-mono text-[11px] font-semibold uppercase tracking-widest text-[#C6F24E]">By tool</div>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-text-primary">AI skills by the tool you use</h1>
          <p className="mt-3 text-[15.5px] leading-relaxed text-text-muted">
            Pick your agent or editor. Each page lists the best open-source skills, MCP servers and prompts that install into it, with the install path spelled out.
          </p>
        </header>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INSTALL_TARGETS.map((t) => (
            <li key={t.slug}>
              <Link href={`/for/${t.slug}`} className="block h-full rounded-xl border border-[#262B2D] bg-[#101314] p-5 no-underline transition-colors hover:border-[#C6F24E]/50">
                <div className="t-mono text-[11px] uppercase tracking-wider text-text-muted">{t.kind}</div>
                <div className="mt-1 text-lg font-semibold text-text-primary">For {t.name}</div>
                <p className="mt-2 text-[13.5px] leading-relaxed text-text-muted">{t.blurb}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
