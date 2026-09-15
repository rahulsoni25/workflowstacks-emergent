'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

// "Share on X" + copy-to-clipboard for the public Hot list. The text is the
// same ready-made thread the digest and the Discord post use.
export default function ShareButtons({ text, url, className = '' }) {
  const [copied, setCopied] = useState(false)
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <a
        href={xUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md border border-[#262B2D] bg-[#101314] px-3 py-2 text-[13px] font-semibold text-text-primary no-underline hover:border-[#C6F24E]/50"
      >
        Share on X
      </a>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-md border border-[#262B2D] bg-[#101314] px-3 py-2 text-[13px] font-semibold text-text-primary hover:border-[#C6F24E]/50"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-[#C6F24E]" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Copied' : 'Copy the list'}
      </button>
    </div>
  )
}
