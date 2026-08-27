// "Use it today" rail card — renders the post's anchor asset (template, MCP
// config, premium tool, outcome page, catalog) with a real CTA into the
// existing pages. Pure links; the destination pages own download/checkout.
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const KIND_LABEL = {
  template: 'Free n8n template',
  mcp: 'Verified MCP config',
  bundle: 'Premium tool',
  outcome: 'Automation guide',
  skills: 'Open-source catalog',
  commands: 'Slash commands',
}

export default function AssetCard({ asset, campaign }) {
  if (!asset?.url) return null
  const href = campaign ? `${asset.url}${asset.url.includes('?') ? '&' : '?'}utm_source=blog&utm_medium=cta&utm_campaign=${encodeURIComponent(campaign)}` : asset.url
  return (
    <div className="rounded-xl border border-[#262B2D] bg-[#101314] p-5">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-[#6E7772]">
        {KIND_LABEL[asset.kind] || 'On WorkflowStacks'}
      </div>
      <div className="mt-1.5 text-[15px] font-semibold text-[#ECEFEA]">{asset.label}</div>
      <Link
        href={href}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#C6F24E] px-4 py-2 text-[13px] font-semibold text-[#0A0C0D] no-underline hover:bg-[#A6D62E]"
      >
        Open it <ArrowRight className="h-3.5 w-3.5" />
      </Link>
      <div className="mt-4 border-t border-[#262B2D] pt-3 text-[12.5px] text-[#8A938D]">
        Want it built for you?{' '}
        <Link href={`/build-for-me?utm_source=blog&utm_medium=cta&utm_campaign=${encodeURIComponent(campaign || 'blog')}`} className="text-[#C6F24E] no-underline hover:underline">
          Done-for-you from $500
        </Link>
      </div>
    </div>
  )
}
