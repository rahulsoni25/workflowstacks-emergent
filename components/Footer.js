import Link from 'next/link'
import { Sparkles } from 'lucide-react'

const footerLinks = {
  marketplace: {
    title: 'Marketplace',
    links: [
      { label: 'Browse Skills', href: '/' },
      { label: 'AI Agents', href: '/?category=ai-agent' },
      { label: 'Claude Skills', href: '/?category=claude-skill' },
      { label: 'MCP Servers', href: '/?category=mcp-server' },
      { label: 'Prompts', href: '/?category=prompt' },
    ]
  },
  solutions: {
    title: 'Solutions',
    links: [
      { label: 'For Founders', href: '/personas' },
      { label: 'For Agencies', href: '/personas' },
      { label: 'For Ecommerce', href: '/personas' },
      { label: 'Agent Builder', href: '/builder' },
      { label: 'Starter Packs', href: '/packs' },
      { label: 'Playbooks', href: '/playbooks' },
    ]
  },
  learn: {
    title: 'Learn',
    links: [
      { label: 'How It Works', href: '/learn/how-it-works' },
      { label: 'What Are Skills', href: '/learn/skills' },
      { label: 'What Are Agents', href: '/learn/agents' },
      { label: 'What Is MCP', href: '/learn/mcp' },
      { label: 'For Creators', href: '/learn/creators' },
      { label: 'Security', href: '/learn/security' },
    ]
  },
  company: {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Enterprise', href: '/enterprise' },
      { label: 'API Docs', href: '/docs' },
      { label: 'Terms', href: '/terms' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Support', href: '/help' },
    ]
  },
}

const compatibleTools = [
  { name: 'ChatGPT', icon: '🤖' },
  { name: 'Claude', icon: '✨' },
  { name: 'Gemini', icon: '💎' },
  { name: 'Shopify', icon: '🛍️' },
  { name: 'Ahrefs', icon: '🔍' },
  { name: 'Sheets', icon: '📊' },
  { name: 'WhatsApp', icon: '💬' },
  { name: 'Meta Ads', icon: '📱' },
]

export default function Footer() {
  return (
    <footer className="border-t border-teal-500/10 bg-slate-950/80 backdrop-blur-xl" itemScope itemType="https://schema.org/WPFooter">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-12 md:flex-row md:items-start md:justify-between">
        {/* Brand */}
        <div className="max-w-sm">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              Workflow<span className="text-teal-400">Stacks</span>
            </span>
          </Link>
          <p className="mt-4 text-sm text-slate-400 leading-relaxed">
            The marketplace for AI skills that launch offers, rank in AI search, and automate operations. No coding required.
          </p>
          <div className="flex items-center gap-3 mt-6">
            <a href="https://twitter.com/workflowstacks" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-slate-800/50 hover:bg-teal-500/20 border border-slate-700/50 hover:border-teal-500/30 flex items-center justify-center transition-all" aria-label="Twitter">
              <span className="text-slate-400 text-sm">𝕏</span>
            </a>
            <a href="https://github.com/workflowstacks" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-slate-800/50 hover:bg-teal-500/20 border border-slate-700/50 hover:border-teal-500/30 flex items-center justify-center transition-all" aria-label="GitHub">
              <span className="text-slate-400 text-sm">⚡</span>
            </a>
            <a href="https://discord.gg/workflowstacks" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-slate-800/50 hover:bg-teal-500/20 border border-slate-700/50 hover:border-teal-500/30 flex items-center justify-center transition-all" aria-label="Discord">
              <span className="text-slate-400 text-sm">💬</span>
            </a>
          </div>
        </div>

        {/* Link Columns */}
        <nav className="grid flex-1 gap-8 text-sm sm:grid-cols-2 lg:grid-cols-4" aria-label="Footer navigation">
          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {section.title}
              </h4>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-slate-400 transition-colors hover:text-teal-300">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      {/* Compatible Tools */}
      <div className="border-t border-slate-800/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Compatible with</span>
          <div className="flex flex-wrap items-center gap-2">
            {compatibleTools.map((tool) => (
              <div key={tool.name} className="flex h-10 px-3 items-center gap-1.5 rounded-lg border border-slate-700/50 bg-slate-800/30 hover:bg-teal-500/10 hover:border-teal-500/20 transition-all" title={tool.name}>
                <span className="text-lg">{tool.icon}</span>
                <span className="text-xs text-slate-400">{tool.name}</span>
              </div>
            ))}
            <span className="rounded-full border border-slate-700/50 px-3 py-1.5 text-xs text-slate-500">+50 more</span>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800/80">
        <div className="mx-auto max-w-7xl px-4 py-5">
          <div className="flex flex-col gap-3 text-center text-xs text-slate-500 md:flex-row md:justify-between md:text-left">
            <p>&copy; {new Date().getFullYear()} WorkflowStacks. All rights reserved.</p>
            <div className="flex justify-center gap-6">
              <Link href="/terms" className="hover:text-teal-400 transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-teal-400 transition-colors">Privacy</Link>
              <Link href="/help" className="hover:text-teal-400 transition-colors">Support</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
