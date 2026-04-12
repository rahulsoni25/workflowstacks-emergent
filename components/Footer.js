import Link from 'next/link'
import { Sparkles } from 'lucide-react'

const footerLinks = {
  marketplace: {
    title: 'Marketplace',
    links: [
      { label: 'Browse Skills', href: '/' },
      { label: 'AI Agents', href: '/?category=ai-agent' },
      { label: 'Trending Skills', href: '/?sort=trending' },
      { label: 'New This Week', href: '/?sort=new' }
    ]
  },
  categories: {
    title: 'Categories',
    links: [
      { label: 'Ecommerce', href: '/?domain=commerce' },
      { label: 'Marketing', href: '/?domain=marketing' },
      { label: 'Founder Ops', href: '/?domain=founder_ops' },
      { label: 'Claude Skills', href: '/?category=claude-skill' },
      { label: 'MCP Servers', href: '/?category=mcp-server' },
      { label: 'Prompts', href: '/?category=prompt' }
    ]
  },
  learn: {
    title: 'Learn',
    links: [
      { label: 'How to Use', href: '/help' },
      { label: 'What Are Skills', href: '/help#skills' },
      { label: 'What Are Agents', href: '/help#agents' },
      { label: 'Build My Agent', href: '/builder' },
      { label: 'Playbooks', href: '/playbooks' },
      { label: 'Starter Packs', href: '/packs' }
    ]
  },
  personas: {
    title: 'For You',
    links: [
      { label: 'For Founders', href: '/founder-launch' },
      { label: 'For Agencies', href: '/personas' },
      { label: 'For Ecommerce', href: '/personas' },
      { label: 'Agent Personas', href: '/personas' }
    ]
  },
  resources: {
    title: 'Resources',
    links: [
      { label: 'Upload Skill', href: '/upload' },
      { label: 'GitHub Sync', href: '/#sync' },
      { label: 'API Docs', href: '/api' },
      { label: 'Support', href: '/help' }
    ]
  }
}

const compatibleTools = [
  { name: 'Shopify', icon: '🛍️' },
  { name: 'WhatsApp', icon: '💬' },
  { name: 'Meta Ads', icon: '📱' },
  { name: 'ChatGPT', icon: '🤖' },
  { name: 'Claude', icon: '✨' },
  { name: 'Gemini', icon: '💎' },
  { name: 'Sheets', icon: '📊' },
  { name: 'Ahrefs', icon: '🔍' }
]

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/20 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 md:flex-row md:items-start md:justify-between">
        {/* Left brand block */}
        <div className="max-w-sm">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">
              ShowClawMart
            </span>
          </Link>
          <p className="mt-4 text-sm text-gray-400">
            The marketplace for AI skills that launch offers, rank in AI search, and automate operations. No coding required.
          </p>
          
          {/* Social links */}
          <div className="flex items-center gap-3 mt-6">
            <a 
              href="https://twitter.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <span className="text-gray-400">𝕏</span>
            </a>
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <span className="text-gray-400">⚡</span>
            </a>
            <a 
              href="https://discord.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <span className="text-gray-400">💬</span>
            </a>
          </div>
        </div>

        {/* Link columns */}
        <div className="grid flex-1 gap-8 text-sm sm:grid-cols-2 lg:grid-cols-5">
          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {section.title}
              </h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-gray-400 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Compatible tools row */}
      <div className="border-t border-white/10 bg-black/30">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Compatible with
          </span>
          <div className="flex flex-wrap items-center gap-3">
            {compatibleTools.map((tool) => (
              <div
                key={tool.name}
                className="flex h-12 px-4 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                title={tool.name}
              >
                <span className="text-xl">{tool.icon}</span>
                <span className="text-xs text-gray-400">{tool.name}</span>
              </div>
            ))}
            <button className="rounded-full border border-white/20 px-4 py-2 text-xs text-gray-400 hover:border-white/40 hover:text-gray-300 transition-colors">
              +50 more
            </button>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex flex-col gap-4 text-center text-xs text-gray-500 md:flex-row md:justify-between md:text-left">
            <p>© 2026 ShowClawMart. All rights reserved.</p>
            <div className="flex justify-center gap-6">
              <Link href="/terms" className="hover:text-gray-400 transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-gray-400 transition-colors">
                Privacy
              </Link>
              <Link href="/help" className="hover:text-gray-400 transition-colors">
                Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
