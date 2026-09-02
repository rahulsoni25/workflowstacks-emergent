'use client'

// Progressive-disclosure fold used across content-heavy pages (skill detail,
// builder result): newbies get a short page, and every deeper section
// collapses behind one of these toggles.

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export default function Disclosure({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-slate-700/50 rounded-lg bg-slate-800/20">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left text-slate-200 text-sm font-medium hover:text-teal-300 transition-colors"
      >
        <span>{title}</span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4 space-y-4">{children}</div>}
    </div>
  )
}
