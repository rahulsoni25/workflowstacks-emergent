'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { BadgeCheck, Search, Star } from 'lucide-react'

// Cards are added a page at a time: 2k cards at once is a slow page for no gain.
const PAGE = 120

const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n || 0))

export function CreatorCard({ c }) {
  // Multi-repo and verified creators have a profile worth visiting; a
  // single-repo owner's best page is the skill itself.
  const href = c.verified || c.skills > 1 ? `/creators/${c.handle.toLowerCase()}` : `/skills/${c.top_slug}`
  return (
    <Link prefetch={false} href={href} className="group flex items-center gap-3 rounded-xl border border-[#262B2D] bg-[#101314] p-3.5 no-underline transition-colors hover:border-[#C6F24E]/40">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={c.avatar || `https://github.com/${c.handle}.png?size=80`} alt="" width={40} height={40} loading="lazy" className="h-10 w-10 shrink-0 rounded-full border border-[#262B2D] bg-[#0A0C0D]" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-semibold text-text-primary group-hover:text-[#C6F24E]">{c.handle}</span>
          {c.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-[#C6F24E]" aria-label="Verified creator" />}
          {c.founding && <span className="t-mono shrink-0 rounded-full border border-[#C6F24E]/40 px-1.5 text-[9.5px] font-semibold uppercase tracking-wider text-[#C6F24E]">Founding</span>}
        </div>
        <div className="truncate text-[12.5px] text-text-muted">{c.skills > 1 ? `${c.skills} skills · ` : ''}{c.top_name}</div>
      </div>
      <div className="flex shrink-0 items-center gap-1 text-[12px] text-text-muted"><Star className="h-3.5 w-3.5" />{fmt(c.stars)}</div>
    </Link>
  )
}

export default function CreatorsBrowser({ initial, total }) {
  const [q, setQ] = useState('')
  const [all, setAll] = useState(null)
  const [limit, setLimit] = useState(initial.length)
  const loading = useRef(false)

  // The full ~2k-row list is fetched only when someone searches or asks for
  // it — the CDN-cached JSON, not part of every page view.
  const load = async () => {
    if (all || loading.current) return
    loading.current = true
    try {
      const r = await fetch('/api/creator-directory')
      const j = await r.json()
      if (Array.isArray(j.creators)) setAll(j.creators)
    } catch {} finally {
      loading.current = false
    }
  }

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase()
    const pool = all || initial
    if (term) return pool.filter((c) => c.handle.toLowerCase().includes(term) || (c.top_name || '').toLowerCase().includes(term)).slice(0, 120)
    // Verified creators have their own section above the list.
    return (all ? all.filter((c) => !c.verified) : initial).slice(0, limit)
  }, [q, all, initial, limit])

  return (
    <div>
      <label className="relative block max-w-md">
        <span className="sr-only">Search creators</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          value={q}
          onFocus={load}
          onChange={(e) => { setQ(e.target.value); load() }}
          placeholder="Find a GitHub username or project"
          className="w-full rounded-lg border border-[#262B2D] bg-[#101314] py-2.5 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-[#C6F24E]/50 focus:outline-none"
        />
      </label>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((c) => <CreatorCard key={c.handle} c={c} />)}
      </div>
      {shown.length === 0 && <p className="mt-6 text-sm text-text-muted">No one by that name yet. <Link href="/submit" className="text-[#C6F24E]">Submit your repo →</Link></p>}
      {!q && limit < total && (
        <button type="button" onClick={async () => { await load(); setLimit((n) => n + PAGE) }} className="mt-6 rounded-lg border border-[#262B2D] px-4 py-2 text-sm text-text-muted hover:border-[#C6F24E]/40 hover:text-[#C6F24E]">
          Show more ({Math.min(limit, total).toLocaleString('en-US')} of {total.toLocaleString('en-US')})
        </button>
      )}
    </div>
  )
}
