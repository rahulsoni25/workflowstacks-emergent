'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

// Copy-to-clipboard command block. The content is server-rendered into
// `code` (SEO-visible); this only adds the copy affordance.
export default function CopyCommand({ code }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="relative">
      <button
        onClick={copy}
        className="absolute right-3 top-3 flex items-center gap-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded px-2.5 py-1.5 transition-colors z-10"
      >
        {copied ? <><Check className="w-3.5 h-3.5 text-[#C6F24E]" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
      </button>
      <pre className="bg-slate-950 border border-slate-700 rounded-lg p-4 pt-12 overflow-x-auto text-sm text-slate-200 leading-relaxed max-h-[32rem] overflow-y-auto">
        <code>{code}</code>
      </pre>
    </div>
  )
}
