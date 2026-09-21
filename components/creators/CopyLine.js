'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export default function CopyLine({ text, label = 'Copy' }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setDone(true)
      setTimeout(() => setDone(false), 1800)
    } catch {}
  }
  return (
    <div className="flex items-stretch gap-2">
      <code className="t-mono min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg border border-[#262B2D] bg-[#0A0C0D] px-3 py-2 text-[12px] text-[#9FE3C4]">{text}</code>
      <button type="button" onClick={copy} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#C6F24E]/30 bg-[#C6F24E]/10 px-3 text-xs font-semibold text-[#C6F24E] hover:bg-[#C6F24E]/20">
        {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{done ? 'Copied' : label}
      </button>
    </div>
  )
}
