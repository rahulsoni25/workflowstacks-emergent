'use client'

import { ArrowUpRight } from 'lucide-react'

// Fires a best-effort click count then lets the normal <a> navigation
// proceed — never blocks or delays opening the source link.
export default function AssetLink({ kitSlug, assetName, href, children }) {
  function track() {
    try {
      fetch(`/api/kits/${kitSlug}/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset: assetName }),
        keepalive: true,
      }).catch(() => {})
    } catch {}
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={track}
      className="inline-flex items-center gap-1.5 border border-[#323A3C] hover:border-[#C6F24E] text-white hover:text-[#C6F24E] text-xs font-medium px-3 py-1.5 rounded-md whitespace-nowrap transition-colors"
    >
      {children}
      <ArrowUpRight className="w-3 h-3" />
    </a>
  )
}
