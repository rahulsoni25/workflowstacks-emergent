'use client'

// Marketplace — the browsable catalog.
//
// Server-renders the first page (trending) and re-fetches /api/skills as the
// visitor filters, searches, sorts or loads more. Facets are the catalog's
// real category slugs; sorts are the API's real, verifiable orderings; every
// number on a card is a stored field (github_stars, github_forks,
// rewrite_score, installs). The slide-over panel installs a listing the same
// way the homepage does: the compiled starter prompt becomes the blueprint.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { trackInstall } from '@/lib/track-install'
import {
  TARGETS,
  TYPE_CATEGORIES,
  FOR_CATEGORIES,
  categoryLabel,
  isBlockedPrompt,
  fmt,
  skillTitle,
  skillDesc,
  skillKey,
  skillCreator,
  skillUseCase,
  healthScore,
  isPaid,
  priceLabel,
  fetchStarterPrompt,
  openTargetUrl,
} from '@/lib/skill-display'

// All rankings use REAL, verifiable signals — sorting happens server-side.
const SORTS = [
  { key: 'trending', label: 'Trending' },
  { key: 'popular', label: 'Most stars' },
  { key: 'quality', label: 'Best guides' },
  { key: 'newest', label: 'Newest' },
  { key: 'updated', label: 'Recently updated' },
  { key: 'gems', label: 'Hidden gems' },
]

function buildQuery({ category, sort, search, freeOnly, offset, pageSize }) {
  const params = new URLSearchParams({ sort, limit: String(pageSize), offset: String(offset) })
  if (category && category !== 'all') params.set('category', category)
  if (search.trim()) params.set('search', search.trim())
  if (freeOnly) params.set('free', 'true')
  return params.toString()
}

function Mono({ className = '', children, ...rest }) {
  return (
    <span className={`t-mono ${className}`} {...rest}>
      {children}
    </span>
  )
}

function FacetButton({ on, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between rounded-[7px] border-0 px-2.5 py-2 text-left text-sm ${
        on ? 'bg-[#ECEFEA] font-semibold text-[#0A0C0D]' : 'bg-transparent text-[#8B928D] hover:text-[#ECEFEA]'
      }`}
    >
      <span>{children}</span>
    </button>
  )
}

function StatCell({ value, label, accent = false }) {
  return (
    <div className="t-mono flex min-w-0 flex-col gap-0.5 bg-[#0A0C0D] p-3">
      <span className={`truncate text-[17px] font-medium ${accent ? 'text-[#C6F24E]' : ''}`}>{value}</span>
      <span className="text-[10.5px] text-[#5A615D]">{label}</span>
    </div>
  )
}

export default function SkillsCatalogClient({ initialSkills = [], initialTotal = 0, initialHasMore = false, pageSize = 48 }) {
  // ----- filters (seeded from the URL so landing-page links land pre-filtered) -----
  const initialParams = useMemo(() => {
    if (typeof window === 'undefined') return {}
    const p = new URLSearchParams(window.location.search)
    return { sort: p.get('sort'), category: p.get('category'), q: p.get('q') || p.get('search'), free: p.get('free') }
  }, [])
  const [category, setCategory] = useState(() => initialParams.category || 'all')
  const [sort, setSort] = useState(() => (SORTS.some((s) => s.key === initialParams.sort) ? initialParams.sort : 'trending'))
  const [searchInput, setSearchInput] = useState(() => initialParams.q || '')
  const [search, setSearch] = useState(() => initialParams.q || '')
  const [freeOnly, setFreeOnly] = useState(() => initialParams.free === 'true')

  const [skills, setSkills] = useState(initialSkills)
  const [total, setTotal] = useState(initialTotal)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // ----- panel -----
  const [sel, setSel] = useState(null)
  const [target, setTarget] = useState('Claude')
  const [showBp, setShowBp] = useState(false)
  const [copied, setCopied] = useState(false)
  const [prompts, setPrompts] = useState({})
  const [promptLoading, setPromptLoading] = useState(false)
  const [origin, setOrigin] = useState('https://workflowstacks.com')

  const requestId = useRef(0)
  const isFirstRun = useRef(true)

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  // Debounce free-text search.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400)
    return () => clearTimeout(t)
  }, [searchInput])

  // Re-fetch page 1 whenever a filter changes. The very first render is
  // skipped when the server already gave us the unfiltered first page.
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false
      const hasUrlFilters = category !== 'all' || sort !== 'trending' || search.trim() || freeOnly
      if (!hasUrlFilters) return undefined
    }
    const id = ++requestId.current
    setLoading(true)
    fetch(`/api/skills?${buildQuery({ category, sort, search, freeOnly, offset: 0, pageSize })}`)
      .then((r) => r.json())
      .then((data) => {
        if (id !== requestId.current) return
        setSkills(data.skills || [])
        setTotal(data.total || 0)
        setHasMore(!!data.hasMore)
      })
      .catch(() => {
        if (id !== requestId.current) return
        setSkills([])
        setTotal(0)
        setHasMore(false)
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false)
      })
    return undefined
  }, [category, sort, search, freeOnly, pageSize])

  // Keep the URL shareable without triggering navigation.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const p = new URLSearchParams()
    if (category !== 'all') p.set('category', category)
    if (sort !== 'trending') p.set('sort', sort)
    if (search.trim()) p.set('q', search.trim())
    if (freeOnly) p.set('free', 'true')
    const qs = p.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
  }, [category, sort, search, freeOnly])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/skills?${buildQuery({ category, sort, search, freeOnly, offset: skills.length, pageSize })}`)
      const data = await res.json()
      setSkills((prev) => [...prev, ...(data.skills || [])])
      setHasMore(!!data.hasMore)
    } catch {
      // leave the list as-is; the button stays available to retry
    } finally {
      setLoadingMore(false)
    }
  }

  const clearAll = () => {
    setCategory('all')
    setSearchInput('')
    setSearch('')
    setFreeOnly(false)
  }

  // ----- panel behaviour -----
  const openPanel = useCallback((s, withBlueprint) => {
    setSel(s)
    setShowBp(!!withBlueprint)
    setCopied(false)
  }, [])
  const closePanel = () => setSel(null)

  useEffect(() => {
    if (!sel) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') closePanel()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [sel])

  const selKey = skillKey(sel)
  useEffect(() => {
    if (!sel || !selKey || prompts[selKey] || isPaid(sel)) return undefined
    let cancelled = false
    setPromptLoading(true)
    fetchStarterPrompt(sel, origin)
      .then((text) => {
        if (!cancelled) setPrompts((p) => ({ ...p, [selKey]: text }))
      })
      .finally(() => {
        if (!cancelled) setPromptLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [sel, selKey, prompts, origin])

  const blueprint = sel && prompts[selKey] ? (isBlockedPrompt(prompts[selKey]) ? prompts[selKey] : `# ${skillTitle(sel)} — agent blueprint for ${target}\n\n${prompts[selKey]}`) : ''
  const targetDef = TARGETS.find((t) => t.name === target) || TARGETS[0]

  const copyBlueprint = async () => {
    if (!blueprint) return
    trackInstall(selKey, 'copy-prompt')
    try {
      await navigator.clipboard?.writeText(blueprint)
    } catch {}
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openInTarget = async () => {
    if (!blueprint) return
    trackInstall(selKey, targetDef.channel)
    try {
      await navigator.clipboard?.writeText(blueprint)
    } catch {}
    window.open(openTargetUrl(target, blueprint), '_blank', 'noopener,noreferrer')
  }

  // ----- derived -----
  const q = search.trim()
  const noFilters = category === 'all' && !q && !freeOnly
  const heroes = useMemo(() => {
    if (!noFilters || skills.length < 2) return []
    const byStars = [...skills].sort((a, b) => (b.github_stars || 0) - (a.github_stars || 0))
    const mostStarred = byStars[0]
    const byHealth = [...skills].filter((s) => s !== mostStarred && healthScore(s) !== null).sort((a, b) => healthScore(b) - healthScore(a))
    const topHealth = byHealth[0]
    const out = []
    if (mostStarred) out.push({ s: mostStarred, kicker: 'MOST STARRED', lime: true })
    if (topHealth) out.push({ s: topHealth, kicker: 'BEST GUIDE', lime: false })
    return out
  }, [skills, noFilters])

  const active = []
  if (category !== 'all') active.push({ label: categoryLabel(category), clear: () => setCategory('all') })
  if (freeOnly) active.push({ label: 'Free', clear: () => setFreeOnly(false) })
  if (q) active.push({ label: `"${q}"`, clear: () => { setSearchInput(''); setSearch('') } })

  const facetGroups = [
    { title: 'TYPE', items: TYPE_CATEGORIES },
    { title: 'FOR', items: FOR_CATEGORIES },
  ]

  return (
    <div className="min-h-screen bg-[#0A0C0D] text-[#ECEFEA]">
      {/* ---------- header + search ---------- */}
      <section className="mx-auto flex max-w-[1280px] flex-col gap-[18px] px-5 pb-2 pt-10 sm:px-10">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h1 className="m-0 text-[34px] font-bold leading-none tracking-[-0.04em]">Marketplace</h1>
          <Mono className="whitespace-nowrap text-xs text-[#5A615D]">
            {total ? `${total.toLocaleString()} listings` : 'Loading listings'} · GitHub stats refreshed daily · quality gate ≥ 8/10
          </Mono>
        </div>
        <div className="flex items-center gap-2 rounded-[10px] border border-[#323A3C] bg-[#101314] pl-3.5 pr-1.5 transition-colors focus-within:border-[#C6F24E]">
          <span className="text-sm text-[#5A615D]">⌕</span>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search agents, skills, MCPs…"
            aria-label="Search the marketplace"
            className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-[15px] text-[#ECEFEA] outline-none placeholder:text-[#5A615D]"
          />
          {searchInput && (
            <button type="button" onClick={() => { setSearchInput(''); setSearch('') }} className="border-0 bg-transparent px-2 py-1.5 text-[13px] text-[#5A615D] hover:text-[#ECEFEA]">
              Clear
            </button>
          )}
        </div>

        {heroes.length > 0 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[3fr_2fr]">
            {heroes.map(({ s, kicker, lime }) => (
              <button
                key={skillKey(s)}
                type="button"
                onClick={() => openPanel(s, false)}
                className={`flex min-w-0 flex-col gap-3.5 rounded-2xl border p-6 text-left transition-transform duration-200 hover:-translate-y-0.5 ${
                  lime ? 'border-[#C6F24E] bg-[#C6F24E] text-[#0A0C0D]' : 'border-[#323A3C] bg-[#101314] text-[#ECEFEA]'
                }`}
              >
                <div className="t-mono flex justify-between gap-2.5 text-[11px] tracking-wider opacity-80">
                  <span>{kicker}</span>
                  <span className="whitespace-nowrap">
                    ★ {fmt(s.github_stars)}
                    {healthScore(s) !== null ? ` · ● ${healthScore(s)}` : ''}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[26px] font-bold leading-[1.05] tracking-[-0.03em]">{skillTitle(s)}</span>
                  <span className="text-[14.5px] leading-[1.45] opacity-85 line-clamp-2">{skillDesc(s)}</span>
                </div>
                <div className="t-mono mt-auto flex items-center justify-between gap-2.5 text-xs">
                  <span className="whitespace-nowrap opacity-75">
                    {categoryLabel(s.category)} · {priceLabel(s)}
                  </span>
                  <span className={`whitespace-nowrap rounded-md px-3.5 py-2 font-sans text-[13px] font-bold ${lime ? 'bg-[#0A0C0D] text-[#ECEFEA]' : 'bg-[#ECEFEA] text-[#0A0C0D]'}`}>View →</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ---------- sidebar + results ---------- */}
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-start gap-8 px-5 pb-24 pt-6 sm:px-10 lg:grid-cols-[200px_1fr]">
        <aside className="sticky top-[78px] hidden flex-col gap-[22px] lg:flex">
          <div className="flex flex-col gap-1">
            <FacetButton on={category === 'all'} onClick={() => setCategory('all')}>
              All listings
            </FacetButton>
          </div>
          {facetGroups.map((g) => (
            <div key={g.title} className="flex flex-col gap-1">
              <Mono className="px-2.5 pb-1.5 text-[11px] tracking-[.06em] text-[#5A615D]">{g.title}</Mono>
              {g.items.map(([slug, label]) => (
                <FacetButton key={slug} on={category === slug} onClick={() => setCategory(category === slug ? 'all' : slug)}>
                  {label}
                </FacetButton>
              ))}
            </div>
          ))}
          <label className="flex cursor-pointer items-center gap-2.5 px-2.5 text-sm text-[#8B928D]">
            <input type="checkbox" checked={freeOnly} onChange={() => setFreeOnly((v) => !v)} className="h-[15px] w-[15px] accent-[#C6F24E]" />
            Free only
          </label>
        </aside>

        <main className="flex min-w-0 flex-col gap-4">
          {/* mobile facet strip */}
          <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 lg:hidden">
            <button
              type="button"
              onClick={() => setCategory('all')}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] ${category === 'all' ? 'border-[#ECEFEA] bg-[#ECEFEA] text-[#0A0C0D]' : 'border-[#323A3C] text-[#8B928D]'}`}
            >
              All
            </button>
            {[...TYPE_CATEGORIES, ...FOR_CATEGORIES].map(([slug, label]) => (
              <button
                key={slug}
                type="button"
                onClick={() => setCategory(category === slug ? 'all' : slug)}
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] ${category === slug ? 'border-[#ECEFEA] bg-[#ECEFEA] text-[#0A0C0D]' : 'border-[#323A3C] text-[#8B928D]'}`}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFreeOnly((v) => !v)}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] ${freeOnly ? 'border-[#C6F24E] bg-[#C6F24E] text-[#0A0C0D]' : 'border-[#323A3C] text-[#8B928D]'}`}
            >
              Free only
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="t-mono flex flex-wrap items-center gap-2 text-xs text-[#5A615D]">
              <span>{loading ? '…' : total.toLocaleString()} results</span>
              {active.map((f) => (
                <button
                  key={f.label}
                  type="button"
                  onClick={f.clear}
                  className="flex items-center gap-1.5 rounded-full border border-[#323A3C] bg-[#101314] px-2.5 py-1 text-xs text-[#ECEFEA] hover:border-[#C6F24E]"
                >
                  {f.label}
                  <span className="text-[#5A615D]">×</span>
                </button>
              ))}
            </div>
            <div className="t-mono flex items-center gap-2 text-xs text-[#5A615D]">
              <label htmlFor="mk-sort">Sort</label>
              <select
                id="mk-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-md border border-[#323A3C] bg-[#101314] px-2.5 py-[7px] text-[13px] text-[#ECEFEA]"
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="t-mono flex items-center gap-2.5 py-16 text-[13px] text-[#8B928D]">
              <span className="anim-blink h-2 w-2 rounded-full bg-[#C6F24E]" />
              Loading listings…
            </div>
          ) : skills.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-[14px] border border-dashed border-[#323A3C] p-10 text-center text-[#8B928D] sm:p-14">
              <span className="text-xl text-[#ECEFEA]">Nothing in the catalog matches those filters yet.</span>
              <span className="text-sm text-[#5A615D]">We can build it for you from proven skills, working in your tools within 7 days.</span>
              <div className="flex flex-wrap justify-center gap-2.5">
                <Link href="/build-for-me" className="rounded-md bg-[#C6F24E] px-4 py-2.5 text-sm font-bold text-[#0A0C0D] hover:bg-[#A6D62E]">
                  Get it built
                </Link>
                <button type="button" onClick={clearAll} className="rounded-md border border-[#323A3C] bg-transparent px-4 py-2.5 text-sm font-semibold text-[#ECEFEA] hover:border-[#C6F24E]">
                  Clear filters
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                {skills.map((s) => {
                  const h = healthScore(s)
                  const uc = s.explainer?.use_case_example || ''
                  const paid = isPaid(s)
                  return (
                    <article
                      key={skillKey(s)}
                      className="anim-rise flex min-w-0 flex-col gap-3.5 rounded-[14px] border border-[#262B2D] bg-[#101314] p-5 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-[#C6F24E]"
                    >
                      <button type="button" onClick={() => openPanel(s, false)} className="flex min-w-0 flex-col gap-3 border-0 bg-transparent p-0 text-left text-inherit">
                        <div className="t-mono flex w-full items-center justify-between gap-2 text-[11px] text-[#8B928D]">
                          <span className="flex flex-wrap gap-1.5">
                            <span className="whitespace-nowrap rounded bg-[#C6F24E] px-[7px] py-[3px] font-medium text-[#0A0C0D]">{categoryLabel(s.category)}</span>
                            {s.language && <span className="whitespace-nowrap rounded border border-[#323A3C] px-[7px] py-[3px]">{s.language}</span>}
                          </span>
                          <span className={`whitespace-nowrap font-medium ${paid ? 'text-[#ECEFEA]' : 'text-[#C6F24E]'}`}>{priceLabel(s)}</span>
                        </div>
                        <div className="flex w-full flex-col gap-[5px]">
                          <h3 className="m-0 text-[19px] font-bold tracking-[-0.02em]">{skillTitle(s)}</h3>
                          <p className="m-0 text-sm leading-[1.45] text-[#8B928D] line-clamp-2">{skillDesc(s)}</p>
                        </div>
                        {uc && (
                          <div className="t-mono w-full min-w-0 rounded-md border border-[#262B2D] border-l-[3px] border-l-[#C6F24E] bg-[#0A0C0D] px-2.5 py-[7px] text-[11px] leading-[1.45] text-[#8B928D] line-clamp-2 [overflow-wrap:anywhere]">
                            {uc}
                          </div>
                        )}
                      </button>
                      <div className="mt-auto flex items-center justify-between gap-2.5 border-t border-[#262B2D] pt-3">
                        <span className="t-mono flex min-w-0 flex-wrap gap-[9px] text-[11.5px] text-[#8B928D]">
                          <span className="whitespace-nowrap">★ {fmt(s.github_stars)}</span>
                          {h !== null && <span className="whitespace-nowrap text-[#C6F24E]">● {h}</span>}
                          {s.installs > 0 && <span className="whitespace-nowrap">↓ {fmt(s.installs)}</span>}
                        </span>
                        {paid ? (
                          <Link href={`/skills/${skillKey(s)}`} className="whitespace-nowrap rounded-md bg-[#ECEFEA] px-[13px] py-2 text-[13px] font-bold text-[#0A0C0D] hover:bg-[#C6F24E]">
                            View
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openPanel(s, true)}
                            className="whitespace-nowrap rounded-md border-0 bg-[#ECEFEA] px-[13px] py-2 text-[13px] font-bold text-[#0A0C0D] transition-colors hover:bg-[#C6F24E]"
                          >
                            Install
                          </button>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>

              {hasMore && (
                <div className="flex justify-center pt-6">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="rounded-md border border-[#323A3C] bg-transparent px-5 py-2.5 text-sm font-semibold text-[#ECEFEA] hover:border-[#C6F24E] disabled:opacity-60"
                  >
                    {loadingMore ? 'Loading…' : `Load more (${(total - skills.length).toLocaleString()} left)`}
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ---------- slide-over panel ---------- */}
      {sel && (
        <div onClick={closePanel} className="fixed inset-0 z-50 flex justify-end bg-[rgba(5,7,12,.6)]" role="presentation">
          <aside
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={skillTitle(sel)}
            className="anim-slidein flex h-full w-[520px] max-w-full flex-col gap-[22px] overflow-auto border-l border-[#323A3C] bg-[#101314] p-6 sm:p-7"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-2">
                <span className="t-mono flex flex-wrap gap-1.5 text-[11px]">
                  <span className="whitespace-nowrap rounded bg-[#C6F24E] px-[7px] py-[3px] font-medium text-[#0A0C0D]">{categoryLabel(sel.category)}</span>
                  {sel.language && <span className="whitespace-nowrap rounded border border-[#323A3C] px-[7px] py-[3px] text-[#8B928D]">{sel.language}</span>}
                  {skillCreator(sel) && <span className="whitespace-nowrap rounded border border-[#323A3C] px-[7px] py-[3px] text-[#8B928D]">by {skillCreator(sel)}</span>}
                </span>
                <h2 className="m-0 text-[28px] font-bold leading-[1.05] tracking-[-0.03em]">{skillTitle(sel)}</h2>
              </div>
              <button type="button" onClick={closePanel} aria-label="Close" className="shrink-0 border-0 bg-transparent text-2xl leading-none text-[#8B928D] hover:text-[#ECEFEA]">
                ×
              </button>
            </div>
            <p className="m-0 text-base leading-[1.55] text-[#8B928D]">{skillDesc(sel)}</p>

            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-[#262B2D] bg-[#262B2D] sm:grid-cols-4">
              <StatCell value={`★ ${fmt(sel.github_stars)}`} label="stars" />
              <StatCell value={`⑂ ${fmt(sel.github_forks)}`} label="forks" />
              <StatCell value={healthScore(sel) !== null ? String(healthScore(sel)) : '—'} label="guide quality /10" accent={healthScore(sel) !== null} />
              <StatCell value={sel.installs > 0 ? fmt(sel.installs) : '—'} label="installs here" />
            </div>

            {skillUseCase(sel) && (
              <div className="flex flex-col gap-1.5">
                <Mono className="text-[11px] tracking-wider text-[#5A615D]">EXAMPLE USE CASE</Mono>
                <div className="t-mono rounded-lg border border-[#262B2D] border-l-[3px] border-l-[#C6F24E] bg-[#0A0C0D] px-3.5 py-2.5 text-[12.5px] leading-normal text-[#ECEFEA] [overflow-wrap:anywhere]">
                  {skillUseCase(sel)}
                </div>
              </div>
            )}

            <div className="t-mono flex flex-col gap-2 text-xs text-[#5A615D]">
              {Array.isArray(sel.github_topics) && sel.github_topics.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span>Topics</span>
                  {sel.github_topics.slice(0, 6).map((t) => (
                    <span key={t} className="whitespace-nowrap rounded border border-[#262B2D] bg-[#0A0C0D] px-2 py-[3px] text-[#8B928D]">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-1.5">
                <span>Runs in</span>
                {TARGETS.map((t) => (
                  <span key={t.name} className="whitespace-nowrap rounded border border-[#323A3C] px-2 py-[3px] text-[#8B928D]">
                    {t.name}
                  </span>
                ))}
              </div>
              {sel.github_url && (
                <a href={sel.github_url} target="_blank" rel="noopener noreferrer" className="w-fit text-[#8B928D] underline hover:text-[#C6F24E]">
                  Source on GitHub ↗
                </a>
              )}
            </div>

            <div className="mt-auto flex flex-col gap-[18px] border-t border-[#262B2D] pt-[22px]">
              {isPaid(sel) ? (
                <>
                  <div className="flex items-center justify-between rounded-[10px] border border-[#323A3C] bg-[#0A0C0D] px-4 py-3.5">
                    <span className="flex flex-col gap-0.5">
                      <strong className="text-sm">Creator listing · one-time purchase</strong>
                      <span className="text-[12.5px] text-[#8B928D]">Pricing and checkout are on the listing page.</span>
                    </span>
                    <span className="text-[22px] font-bold">${Number(sel.price)}</span>
                  </div>
                  <Link href={`/skills/${selKey}`} className="rounded-lg bg-[#C6F24E] p-3.5 text-center text-[15px] font-bold text-[#0A0C0D] hover:bg-[#A6D62E]">
                    View listing →
                  </Link>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <Mono className="text-[11px] tracking-wider text-[#5A615D]">RUN IN</Mono>
                    <div className="flex gap-1.5">
                      {TARGETS.map((t) => {
                        const on = t.name === target
                        return (
                          <button
                            key={t.name}
                            type="button"
                            onClick={() => {
                              setTarget(t.name)
                              setCopied(false)
                            }}
                            className={`flex-1 rounded-lg border p-2.5 text-sm font-semibold ${
                              on ? 'border-[#ECEFEA] bg-[#ECEFEA] text-[#0A0C0D]' : 'border-[#323A3C] bg-transparent text-[#ECEFEA] hover:border-[#C6F24E]'
                            }`}
                          >
                            {t.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  {showBp && (
                    <pre className="t-mono m-0 max-h-[180px] overflow-auto whitespace-pre-wrap rounded-[10px] border border-[#323A3C] bg-[#0A0C0D] p-3.5 text-xs leading-[1.55] text-[#8B928D]">
                      {blueprint || 'Compiling the blueprint from the source repository…'}
                    </pre>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={copyBlueprint}
                      disabled={!blueprint}
                      className="flex-1 rounded-lg border-0 bg-[#C6F24E] p-3.5 text-[15px] font-bold text-[#0A0C0D] transition-transform hover:bg-[#A6D62E] active:scale-[.98] disabled:cursor-wait disabled:opacity-60"
                    >
                      {!blueprint && promptLoading ? 'Compiling blueprint…' : copied ? `Copied ✓ — paste into ${target}` : 'Install · copy blueprint'}
                    </button>
                    <button
                      type="button"
                      onClick={openInTarget}
                      disabled={!blueprint}
                      className="whitespace-nowrap rounded-lg border border-[#323A3C] bg-transparent px-4 py-3.5 text-sm font-semibold text-[#ECEFEA] hover:border-[#C6F24E] disabled:opacity-60"
                    >
                      Open {target} ↗
                    </button>
                  </div>
                  <div className="t-mono flex items-center justify-between text-[11px] text-[#5A615D]">
                    <button type="button" onClick={() => setShowBp((v) => !v)} className="border-0 bg-transparent p-0 text-[11px] text-[#5A615D] hover:text-[#ECEFEA]">
                      {showBp ? '▾ Hide blueprint' : '▸ Preview blueprint'}
                    </button>
                    <Link href={`/skills/${selKey}`} className="text-[#8B928D] underline hover:text-[#C6F24E]">
                      Full report ↗
                    </Link>
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
