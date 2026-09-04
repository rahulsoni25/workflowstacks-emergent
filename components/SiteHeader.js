'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Menu, X, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import WsMark from '@/components/WsMark'

// Single source of truth for site navigation — used by both the desktop
// dropdowns and the mobile menu, so they can never drift apart. Grouped by
// what a user is trying to DO, not by when each section shipped (the
// previous nav was homepage-only and predated most of these routes, which
// is why the site felt like it had pages nobody could find).
const NAV_GROUPS = [
  {
    label: 'Templates & Tools',
    items: [
      { href: '/templates', label: 'Workflow Templates', note: 'Free, working n8n automations' },
      { href: '/kits', label: 'Finishing Kits', note: 'Captions, LUTs, SFX, music — curated' },
      { href: '/mcp', label: 'MCP Configs', note: 'Add tools to Claude Desktop' },
      { href: '/commands', label: 'Slash Commands', note: 'Verified Claude Code commands' },
      { href: '/tools', label: 'Premium Tools', note: 'Paid, one-time automations' },
      { href: '/bundles', label: 'Bundles', note: 'Advanced workflow + playbook' },
    ],
  },
  {
    label: 'Browse',
    items: [
      { href: '/skills', label: 'All Skills', note: 'The open-source catalog' },
      { href: '/ask', label: 'Ask', note: 'Describe your problem, get real tools' },
      { href: '/discover', label: 'Discover', note: "What's trending" },
      { href: '/personas', label: 'Personas', note: 'Role-in-a-box agents' },
      { href: '/packs', label: 'Starter Packs', note: 'Skill bundles' },
      { href: '/library', label: 'My Library', note: 'Your saved skills — synced with Claude' },
      { href: '/playbooks', label: 'Playbooks', note: 'Solve one problem' },
    ],
  },
  {
    label: 'Community',
    items: [
      { href: '/problems', label: 'Problems Board', note: 'Vote on what to build next' },
      { href: '/deals', label: 'Deals', note: 'Group-buy tool pricing' },
      { href: '/community', label: 'Community Gallery', note: 'Agents others built' },
      { href: '/members', label: 'Members', note: 'The network' },
    ],
  },
  {
    label: 'Learn',
    items: [
      { href: '/blog', label: 'Journal', note: 'Tested guides, published daily' },
      { href: '/learn/how-it-works', label: 'How It Works' },
      { href: '/learn/skills', label: 'What Are Skills' },
      { href: '/learn/agents', label: 'What Are Agents' },
      { href: '/learn/mcp', label: 'What Is MCP' },
      { href: '/learn/security', label: 'Security' },
    ],
  },
]

function DesktopDropdown({ group, openLabel, setOpenLabel }) {
  const isOpen = openLabel === group.label
  return (
    <div className="relative">
      <button
        onClick={() => setOpenLabel(isOpen ? null : group.label)}
        className="flex items-center gap-1 text-sm text-slate-300 hover:text-white px-3 py-2 rounded-md hover:bg-white/5 transition-colors"
        aria-expanded={isOpen}
      >
        {group.label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full pt-2 z-50">
          <div className="min-w-[240px] rounded-xl border border-[#262B2D] bg-[#101314] backdrop-blur-xl p-1.5 shadow-2xl shadow-black/40">
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpenLabel(null)}
                className="block rounded-lg px-3 py-2 hover:bg-white/5 transition-colors"
              >
                <span className="block text-sm text-slate-200">{item.label}</span>
                {item.note && <span className="block text-[11px] text-slate-500">{item.note}</span>}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function SiteHeader() {
  const [openLabel, setOpenLabel] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const headerRef = useRef(null)

  // Close any open dropdown when navigating, and on outside click.
  useEffect(() => { setOpenLabel(null); setMobileOpen(false) }, [pathname])

  useEffect(() => {
    function onClickOutside(e) {
      if (headerRef.current && !headerRef.current.contains(e.target)) setOpenLabel(null)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <header ref={headerRef} className="border-b border-[#262B2D] bg-[#0A0C0D]/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#C6F24E' }}>
              <WsMark className="w-6 h-6" style={{ color: '#0A0C0D' }} />
            </div>
            <span className="wm text-xl text-slate-100">workflow<span className="s" style={{ color: '#C6F24E' }}>stacks</span></span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_GROUPS.map((group) => (
              <DesktopDropdown key={group.label} group={group} openLabel={openLabel} setOpenLabel={setOpenLabel} />
            ))}
            <Link href="/pricing" className="text-sm text-slate-300 hover:text-white px-3 py-2 rounded-md hover:bg-white/5 transition-colors">
              Pricing
            </Link>
            <Link href="/learn/creators" className="text-sm text-slate-300 hover:text-white px-3 py-2 rounded-md hover:bg-white/5 transition-colors">
              Creators
            </Link>
            <div className="w-px h-6 bg-slate-700 mx-2" />
            <Link href="/builder">
              <Button size="sm" className="bg-[#C6F24E] hover:bg-[#A6D62E] text-[#0A0C0D] font-semibold shadow-lg shadow-lime-500/20">
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                Build Agent
              </Button>
            </Link>
          </nav>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-md text-slate-300 hover:text-white hover:bg-white/5"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-[#262B2D] bg-[#0A0C0D] max-h-[calc(100vh-57px)] overflow-y-auto">
          <div className="container mx-auto px-4 py-4">
            <Link href="/builder" onClick={() => setMobileOpen(false)} className="block mb-5">
              <Button className="w-full bg-[#C6F24E] hover:bg-[#A6D62E] text-[#0A0C0D] font-semibold">
                <Zap className="w-4 h-4 mr-1.5" />Build Agent
              </Button>
            </Link>
            <Link href="/pricing" onClick={() => setMobileOpen(false)} className="block text-sm text-slate-200 font-semibold mb-6">
              Pricing
            </Link>
            <Link href="/learn/creators" onClick={() => setMobileOpen(false)} className="block text-sm text-slate-200 font-semibold mb-6">
              Creators
            </Link>
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="mb-6">
                <h4 className="text-[11px] uppercase tracking-wider text-slate-500 font-mono mb-2">{group.label}</h4>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-lg px-2.5 py-2 hover:bg-white/5 transition-colors"
                    >
                      <span className="block text-sm text-slate-200">{item.label}</span>
                      {item.note && <span className="block text-[11px] text-slate-500">{item.note}</span>}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
