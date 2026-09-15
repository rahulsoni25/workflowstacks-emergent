import Link from 'next/link'
import { categoryLabel } from '@/lib/skill-display'

// One ranked catalog row, shared by /hot, the newsletter archive and the
// /best/<category> pages. Server-renderable (no hooks) so those pages stay
// static HTML with real links for crawlers.
export default function SkillRow({ skill: s, rank = null, showVelocity = false }) {
  const href = `/skills/${s.slug || s.id}`
  const blurb = (s.use_guide && s.use_guide.whatItDoes) || s.description_human || s.description || ''
  return (
    <li className="flex items-start gap-4 px-5 py-4">
      {rank !== null && <span className="t-mono mt-0.5 w-6 shrink-0 text-sm text-text-muted">{rank}</span>}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link href={href} className="text-[16px] font-semibold text-text-primary hover:text-[#C6F24E]">{s.title_human || s.name}</Link>
          {showVelocity && s.velocity_7d > 0 && (
            <span className="t-mono rounded-full border border-[#C6F24E]/30 bg-[#C6F24E]/10 px-2 py-0.5 text-[11px] text-[#C6F24E]">
              +{Number(s.velocity_7d).toLocaleString('en-US')}★ this week{s.velocity_provisional ? ' · early data' : ''}
            </span>
          )}
        </div>
        <div className="t-mono mt-0.5 text-xs text-text-muted">
          {categoryLabel(s.category)} · ★ {(s.github_stars || 0).toLocaleString('en-US')}{s.creator ? ` · ${s.creator}` : ''}
        </div>
        {blurb && <p className="m-0 mt-1.5 text-[13.5px] leading-relaxed text-text-secondary line-clamp-2">{blurb}</p>}
      </div>
    </li>
  )
}
