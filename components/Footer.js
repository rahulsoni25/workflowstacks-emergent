import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import WsMark from '@/components/WsMark'

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
      { label: 'Submit a Tool', href: '/submit' },
      { label: 'Security', href: '/learn/security' },
    ]
  },
  company: {
    title: 'Company',
    links: [
      { label: 'Become a Creator', href: '/submit' },
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
    <footer className="border-t border-[#262B2D] bg-[#0A0C0D] backdrop-blur-xl" itemScope itemType="https://schema.org/WPFooter">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-12 md:flex-row md:items-start md:justify-between">
        {/* Brand */}
        <div className="max-w-sm">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#C6F24E' }}>
              <WsMark className="w-6 h-6" style={{ color: '#0A0C0D' }} />
            </div>
            <span className="wm text-xl text-white">workflow<span className="s" style={{ color: '#C6F24E' }}>stacks</span></span>
          </Link>
          <p className="mt-4 text-sm text-slate-400 leading-relaxed">
            The marketplace for AI skills that launch offers, rank in AI search, and automate operations. No coding required.
          </p>
          <div className="flex items-center gap-3 mt-6">
            <a href="https://twitter.com/workflowstacks" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-[#101314] hover:bg-[#C6F24E]/15 border border-[#262B2D] hover:border-[#C6F24E]/30 flex items-center justify-center transition-all" aria-label="Twitter">
              <span className="text-slate-400 text-sm">𝕏</span>
            </a>
            <a href="https://github.com/workflowstacks" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-[#101314] hover:bg-[#C6F24E]/15 border border-[#262B2D] hover:border-[#C6F24E]/30 flex items-center justify-center transition-all" aria-label="GitHub">
              <span className="text-slate-400 text-sm">⚡</span>
            </a>
            <a href="https://discord.gg/workflowstacks" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-[#101314] hover:bg-[#C6F24E]/15 border border-[#262B2D] hover:border-[#C6F24E]/30 flex items-center justify-center transition-all" aria-label="Discord">
              <span className="text-slate-400 text-sm">💬</span>
            </a>
          </div>
        </div>

        {/* Link Columns */}
        <nav className="grid flex-1 gap-8 text-sm sm:grid-cols-2 lg:grid-cols-4" aria-label="Footer navigation">
          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h4 className="mb-4 text-[#8B928D] font-mono text-xs uppercase tracking-wider">
                {section.title}
              </h4>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-slate-400 transition-colors hover:text-[#C6F24E]">
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
      <div className="border-t border-[#262B2D]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6">
          <span className="text-[#8B928D] font-mono text-xs uppercase tracking-wider">Compatible with</span>
          <div className="flex flex-wrap items-center gap-2">
            {compatibleTools.map((tool) => (
              <div key={tool.name} className="flex h-10 px-3 items-center gap-1.5 rounded-lg border border-[#262B2D] bg-[#101314] hover:border-[#C6F24E]/40 transition-all" title={tool.name}>
                <span className="text-lg">{tool.icon}</span>
                <span className="text-xs text-slate-400">{tool.name}</span>
              </div>
            ))}
            <span className="rounded-full border border-[#262B2D] px-3 py-1.5 text-xs text-[#5A615D]">+50 more</span>
            <Link href="/submit" className="rounded-full border border-[#C6F24E]/30 bg-[#C6F24E]/10 px-3 py-1.5 text-xs text-[#C6F24E] hover:bg-[#C6F24E]/20 hover:border-[#C6F24E]/50 transition-all">
              Creator program →
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[#262B2D]">
        <div className="mx-auto max-w-7xl px-4 py-5">
          <div className="flex flex-col gap-3 text-center text-xs text-[#5A615D] md:flex-row md:justify-between md:text-left">
            <p>&copy; {new Date().getFullYear()} WorkflowStacks. All rights reserved.</p>
            <div className="flex justify-center gap-6">
              <Link href="/terms" className="hover:text-[#C6F24E] transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-[#C6F24E] transition-colors">Privacy</Link>
              <Link href="/help" className="hover:text-[#C6F24E] transition-colors">Support</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
