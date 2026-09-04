'use client'

// Homepage — the "describe → match → install" front door.
//
// Step 1: the visitor describes the job in plain English.
// Step 2: we search the real catalog (/api/search-skills) and show the best
//         match with live GitHub numbers, the guide-quality score and the closest
//         alternatives — or an honest "nothing clears the gate yet" state.
// Step 3: pick Claude / ChatGPT / Gemini, how to deliver it, and install: the
//         blueprint is the skill's compiled starter prompt from
//         /api/skills/:slug/claude-skill?format=prompt, the same text the
//         detail page and the MCP connector hand out.
//
// Every number on this page is a real field from the catalog (github_stars,
// github_forks, rewrite_score, installs) or the live published count from
// /api/stats. Nothing is invented client-side.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { trackInstall } from '@/lib/track-install'
import { homeFaqs } from '@/lib/home-faqs'
import {
  TARGETS,
  fmt,
  skillTitle,
  skillDesc,
  skillKey,
  skillCreator,
  skillUseCase,
  healthScore,
  isPaid,
  fetchStarterPrompt,
  openTargetUrl,
  categoryLabel,
  isBlockedPrompt,
} from '@/lib/skill-display'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPEWRITER_PROMPTS = [
  'Send me a weekly report of my Meta and Google ad spend with what changed',
  'Find 50 dentists in Austin with verified emails',
  'Email me when a competitor changes their pricing page',
  'Draft replies to every 1–3 star review the day it lands',
]

const SUGGESTIONS = ['weekly client ad report', 'find leads in my city', 'watch competitor pricing', 'rank in AI search']

const OPTION_DEFS = [
  ['guide', 'Usage guide'],
  ['gotchas', 'Gotchas'],
  ['ask', 'Ask before acting'],
]

const PHASES = ['Reading your description', 'Searching the scored catalog', 'Ranking by guide quality, stars and fit']

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

function Mono({ className = '', children, ...rest }) {
  return (
    <span className={`t-mono ${className}`} {...rest}>
      {children}
    </span>
  )
}

function StepBar({ step, canGoInstall, onGo }) {
  const defs = [
    [1, 'Describe'],
    [2, 'Match'],
    [3, 'Install'],
  ]
  return (
    <div className="t-mono flex items-center text-xs tracking-wider">
      {defs.map(([n, label], i) => {
        const active = n === step
        const past = n < step
        const can = past || (n === 3 && step === 2 && canGoInstall)
        const color = active ? 'text-[#ECEFEA]' : past ? 'text-[#C6F24E]' : 'text-[#5A615D]'
        return (
          <div key={n} className="flex items-center">
            <button
              type="button"
              onClick={() => can && onGo(n)}
              disabled={!can}
              className={`flex items-center gap-2 bg-transparent border-0 p-0 ${color} ${can ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <span
                className={`inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border font-medium ${
                  active
                    ? 'bg-[#C6F24E] text-[#0A0C0D] border-[#C6F24E]'
                    : past
                    ? 'bg-transparent text-[#C6F24E] border-[#C6F24E]'
                    : 'bg-transparent text-[#5A615D] border-[#323A3C]'
                }`}
              >
                {n}
              </span>
              {label}
            </button>
            {i < 2 && <span className={`mx-3.5 h-px w-8 sm:w-12 ${past ? 'bg-[#C6F24E]' : 'bg-[#323A3C]'}`} />}
          </div>
        )
      })}
    </div>
  )
}

function CategoryChip({ children }) {
  return <Mono className="border border-[#323A3C] px-2 py-[3px] rounded text-xs whitespace-nowrap">{children}</Mono>
}

function StatCell({ value, label }) {
  return (
    <div className="bg-[#0A0C0D] px-3.5 py-3 flex flex-col gap-0.5 t-mono min-w-0">
      <span className="text-lg font-medium truncate">{value}</span>
      <span className="text-[11px] text-[#5A615D]">{label}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomeClient({ initialSkills = [], initialStats = null }) {
  // ----- flow state -----
  const [step, setStep] = useState(1)
  const [query, setQuery] = useState('')
  const [placeholder, setPlaceholder] = useState('')
  const [searching, setSearching] = useState(false)
  const [phase, setPhase] = useState(0)
  const [results, setResults] = useState([])
  const [matchTokens, setMatchTokens] = useState([])
  const [agent, setAgent] = useState(null)
  const [target, setTarget] = useState('Claude')
  const [delivery, setDelivery] = useState('Copy')
  const [opts, setOpts] = useState({ guide: true, gotchas: true, ask: false })
  const [done, setDone] = useState(false)
  const [preview, setPreview] = useState(false)
  const [faqOpen, setFaqOpen] = useState(0)
  const [origin, setOrigin] = useState('https://workflowstacks.com')

  // Compiled starter prompts, keyed by slug — fetched once per skill.
  const [prompts, setPrompts] = useState({})
  const [promptLoading, setPromptLoading] = useState(false)

  const timersRef = useRef([])
  const searchSeq = useRef(0)
  const textareaRef = useRef(null)

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  // ----- headline count: real published listings, floored to the nearest 10 so "+" is always true -----
  const publishedCount = Number(initialStats?.publishedSkills || initialStats?.totalSkills) || 0
  const countFloor = publishedCount >= 10 ? Math.floor(publishedCount / 10) * 10 : 0
  const countLabel = countFloor ? `${countFloor.toLocaleString()}+` : ''

  // ----- typewriter placeholder (only while the box is empty on step 1) -----
  useEffect(() => {
    if (step !== 1 || query) return undefined
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setPlaceholder(TYPEWRITER_PROMPTS[0])
      return undefined
    }
    const tw = { i: 0, c: 0, dir: 1, hold: 0 }
    const id = setInterval(() => {
      const full = TYPEWRITER_PROMPTS[tw.i]
      if (tw.dir > 0) {
        tw.c += 1
        if (tw.c >= full.length) {
          tw.dir = 0
          tw.hold = 42 // ≈1.6s at 38ms
        }
      } else if (tw.dir === 0) {
        tw.hold -= 1
        if (tw.hold <= 0) tw.dir = -1
      } else {
        tw.c -= 3
        if (tw.c <= 0) {
          tw.c = 0
          tw.dir = 1
          tw.i = (tw.i + 1) % TYPEWRITER_PROMPTS.length
        }
      }
      setPlaceholder(full.slice(0, Math.max(0, tw.c)) + (tw.dir === 0 ? '' : '|'))
    }, 38)
    return () => clearInterval(id)
  }, [step, query])

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }
  useEffect(() => () => clearTimers(), [])

  // ----- search -----
  const submit = useCallback(
    async (raw) => {
      const q = String(raw ?? query).trim()
      if (!q) {
        textareaRef.current?.focus()
        return
      }
      const seq = ++searchSeq.current
      clearTimers()
      setStep(2)
      setSearching(true)
      setPhase(0)
      setResults([])
      setAgent(null)
      setDone(false)
      // Phase ticks are progress feedback for a request that is genuinely in
      // flight — they are NOT a floor on how long the answer is withheld. An
      // earlier version awaited a 1.3s minimum before showing results, which
      // manufactured an impression of work the search wasn't doing. If the
      // API answers in 80ms, the match renders in 80ms.
      timersRef.current.push(setTimeout(() => setPhase(1), 450))
      timersRef.current.push(setTimeout(() => setPhase(2), 900))

      let data = null
      try {
        const res = await fetch('/api/search-skills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, limit: 6 }),
        })
        data = await res.json()
      } catch {
        data = null
      }
      clearTimers() // stop pending phase ticks; the real answer has arrived
      if (seq !== searchSeq.current) return // a newer search superseded this one
      const list = Array.isArray(data?.results) ? data.results : []
      setResults(list)
      setMatchTokens(Array.isArray(data?.tokens) ? data.tokens : [])
      setAgent(list[0] || null)
      setSearching(false)
    },
    [query]
  )

  const reset = () => {
    clearTimers()
    searchSeq.current += 1
    setStep(1)
    setQuery('')
    setResults([])
    setAgent(null)
    setDone(false)
    setSearching(false)
  }

  const editQuery = () => {
    clearTimers()
    searchSeq.current += 1
    setStep(1)
    setResults([])
    setAgent(null)
    setDone(false)
    setSearching(false)
  }

  const chooseAgent = (s) => {
    setAgent(s)
    setDone(false)
  }

  const installFeatured = (s) => {
    setAgent(s)
    setResults([s])
    setMatchTokens([])
    setQuery(skillTitle(s))
    setStep(3)
    setDone(false)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ----- blueprint -----
  const agentKey = skillKey(agent)
  useEffect(() => {
    if (step !== 3 || !agent || !agentKey || prompts[agentKey]) return
    let cancelled = false
    setPromptLoading(true)
    fetchStarterPrompt(agent, origin)
      .then((text) => {
        if (cancelled) return
        setPrompts((p) => ({ ...p, [agentKey]: text }))
      })
      .finally(() => {
        if (!cancelled) setPromptLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [step, agent, agentKey, prompts, origin])

  const blueprint = useMemo(() => {
    if (!agent) return ''
    const base = prompts[agentKey] || ''
    if (!base) return ''
    if (isBlockedPrompt(base)) return base
    let t = `# ${skillTitle(agent)} — agent blueprint for ${target}\n\n${base}`
    const extras = []
    if (opts.guide) extras.push("Usage guide: read the skill's install command and quick-start above before the first run, and tell me if anything needs to be set up on my side.")
    if (opts.gotchas) extras.push('Known gotchas: verify rate limits and auth scopes for each connected tool before relying on it.')
    if (opts.ask) extras.push('Always ask for confirmation before taking any external action (sending, posting, buying, deleting).')
    if (extras.length) t += '\n\n' + extras.join('\n')
    return t
  }, [agent, agentKey, prompts, target, opts])

  const blueprintLines = blueprint ? blueprint.split('\n').length : 0
  const targetDef = TARGETS.find((t) => t.name === target) || TARGETS[0]

  const installLabel =
    delivery === 'Copy' ? 'Install · copy blueprint' : delivery === 'Download' ? 'Install · download blueprint.md' : `Install · open in ${target}`
  const doneMsg =
    delivery === 'Copy' ? 'Blueprint copied to clipboard' : delivery === 'Download' ? 'blueprint.md downloaded' : `${target} opened in a new tab, blueprint copied`

  const doInstall = async () => {
    if (!agent || !blueprint) return
    const key = agentKey
    if (delivery === 'Download') {
      trackInstall(key, 'download-md')
      const blob = new Blob([blueprint], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${skillTitle(agent).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'agent'}-blueprint.md`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } else {
      trackInstall(key, delivery === 'Open' ? targetDef.channel : 'copy-prompt')
      try {
        await navigator.clipboard?.writeText(blueprint)
      } catch {}
      if (delivery === 'Open') {
        window.open(openTargetUrl(target, blueprint), '_blank', 'noopener,noreferrer')
      }
    }
    setDone(true)
  }

  // ----- derived for render -----
  const alts = results.slice(1, 3)
  const found = !searching && !!agent
  const noMatch = !searching && !agent && step === 2
  const useCase = skillUseCase(agent)
  const health = healthScore(agent)
  const faqs = homeFaqs()
  const featured = initialSkills.slice(0, 6)

  return (
    <div className="min-h-screen bg-[#0A0C0D] text-[#ECEFEA]">
      {/* ------------------------------------------------------------------ */}
      {/* HERO — describe / match / install                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage: 'linear-gradient(#262B2D 1px,transparent 1px),linear-gradient(90deg,#262B2D 1px,transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%,#000 30%,transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%,#000 30%,transparent 100%)',
          }}
        />
        <header id="top" className="relative mx-auto flex max-w-[860px] flex-col items-center gap-5 px-5 pb-24 pt-11 sm:px-10">
          <StepBar step={step} canGoInstall={!!agent} onGo={(n) => { setStep(n); setDone(false) }} />

          {/* ---------- STEP 1 ---------- */}
          {step === 1 && (
            <div className="anim-rise mt-7 flex w-full flex-col items-center gap-[22px]">
              <h1 className="m-0 text-center font-bold tracking-[-0.04em] text-[clamp(44px,6.2vw,76px)] leading-[0.98] [text-wrap:balance]">
                What should your AI agent do?
              </h1>
              <p className="m-0 max-w-[560px] text-center text-lg leading-[1.45] text-[#8B928D] [text-wrap:pretty]">
                Describe the job. We match it against{' '}
                <span className="text-[#ECEFEA]">{countLabel ? `${countLabel} scored open-source repos` : 'our scored open-source catalog'}</span>, wire the
                best one into a blueprint, and install it in Claude, ChatGPT or Gemini. No code.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  submit()
                }}
                className="flex w-full flex-col items-stretch gap-2.5 rounded-2xl border border-[#323A3C] bg-[#101314] p-2 pl-2 shadow-[0_0_0_6px_rgba(198,242,78,0.04)] transition-[border-color,box-shadow] duration-150 focus-within:border-[#C6F24E] focus-within:shadow-[0_0_0_6px_rgba(198,242,78,0.12)] sm:flex-row sm:items-end sm:pl-5"
              >
                <textarea
                  ref={textareaRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      submit()
                    }
                  }}
                  rows={2}
                  placeholder={placeholder || 'e.g. Send me a weekly report of my Meta and Google ad spend with what changed'}
                  aria-label="Describe what your AI agent should do"
                  className="flex-1 resize-none border-0 bg-transparent px-3 py-3 text-lg leading-[1.45] text-[#ECEFEA] outline-none placeholder:text-[#5A615D] sm:px-0"
                />
                <button
                  type="submit"
                  className="whitespace-nowrap rounded-[10px] border-0 bg-[#C6F24E] px-5 py-3.5 text-[15px] font-bold text-[#0A0C0D] transition-[transform,background] duration-150 hover:bg-[#A6D62E] active:scale-[.97]"
                >
                  Find my agent →
                </button>
              </form>
              <div className="t-mono flex flex-wrap justify-center gap-2 text-[13px]">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setQuery(s)
                      submit(s)
                    }}
                    className="rounded-full border border-[#323A3C] bg-transparent px-3 py-[7px] text-[#8B928D] transition-colors hover:border-[#C6F24E] hover:text-[#ECEFEA]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ---------- STEP 2 ---------- */}
          {step === 2 && (
            <div className="anim-rise mt-6 flex w-full flex-col gap-5">
              <div className="flex flex-wrap items-baseline gap-3 text-[17px] leading-[1.45]">
                <Mono className="whitespace-nowrap text-xs text-[#5A615D]">YOU ASKED</Mono>
                <span className="font-medium">“{query}”</span>
                <button type="button" onClick={editQuery} className="ml-auto whitespace-nowrap border-0 bg-transparent text-xs text-[#5A615D] underline hover:text-[#ECEFEA]">
                  edit
                </button>
              </div>

              {searching && (
                <div className="t-mono flex flex-col gap-2.5 py-1 text-[13px]" aria-live="polite">
                  {PHASES.map((text, i) => {
                    const cls = i < phase ? 'text-[#5A615D]' : i === phase ? 'text-[#ECEFEA]' : 'text-[#323A3C]'
                    const dot = i < phase ? 'bg-[#5A615D]' : i === phase ? 'bg-[#C6F24E] anim-blink' : 'bg-[#323A3C]'
                    return (
                      <div key={text} className={`flex items-center gap-2.5 ${cls}`}>
                        <span className={`h-2 w-2 rounded-full ${dot}`} />
                        {text}
                      </div>
                    )
                  })}
                </div>
              )}

              {noMatch && (
                <div className="flex flex-col items-start gap-3 rounded-[14px] border border-dashed border-[#323A3C] p-6 sm:p-8">
                  <Mono className="text-[13px] text-[#8B928D]">Nothing in the catalog matches that description closely enough yet.</Mono>
                  <p className="m-0 leading-normal text-[#8B928D]">
                    Three options: let the Builder recommend a multi-skill stack for this goal, have us build it for you from proven skills (from $500, live in 7 days), or
                    browse the closest categories in the marketplace.
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    <Link href={`/builder?goal=${encodeURIComponent(query)}`} className="rounded-lg bg-[#C6F24E] px-4 py-2.5 text-sm font-bold text-[#0A0C0D] hover:bg-[#A6D62E]">
                      Recommend a stack
                    </Link>
                    <Link href="/build-for-me" className="rounded-lg border border-[#323A3C] px-4 py-2.5 text-sm font-semibold hover:border-[#C6F24E]">
                      Get it built
                    </Link>
                    <Link href={`/skills?q=${encodeURIComponent(query)}`} className="rounded-lg border border-[#323A3C] px-4 py-2.5 text-sm font-semibold hover:border-[#C6F24E]">
                      Browse marketplace
                    </Link>
                    <button type="button" onClick={reset} className="border-0 bg-transparent text-[13px] text-[#5A615D] underline hover:text-[#ECEFEA]">
                      Try another description
                    </button>
                  </div>
                </div>
              )}

              {found && (
                <div className="flex flex-col gap-3.5">
                  <Mono className="text-[13px] text-[#8B928D]">
                    Best match · {matchTokens.length ? `matched "${matchTokens.slice(0, 4).join('", "')}"` : 'closest by popularity and guide quality'}
                  </Mono>

                  <article className="flex flex-col gap-5 rounded-2xl border border-[#C6F24E] bg-[#101314] p-5 shadow-[0_0_0_1px_rgba(198,242,78,0.15),0_24px_60px_-30px_rgba(198,242,78,0.25)] sm:p-7">
                    <div className="t-mono flex flex-wrap items-center justify-between gap-2.5 text-xs text-[#8B928D]">
                      <span className="flex gap-1.5">
                        <span className="rounded bg-[#C6F24E] px-2 py-[3px] text-[#0A0C0D]">{categoryLabel(agent.category)}</span>
                        {agent.language && <CategoryChip>{agent.language}</CategoryChip>}
                      </span>
                      <span className="whitespace-nowrap">
                        {skillCreator(agent) ? `by ${skillCreator(agent)}` : 'open-source'}
                        {health !== null && (
                          <>
                            {' · '}
                            <span className="text-[#C6F24E]">● {health}/10</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2">
                      <h2 className="m-0 text-[26px] font-bold tracking-[-0.03em] sm:text-[30px]">{skillTitle(agent)}</h2>
                      <p className="m-0 text-base leading-normal text-[#8B928D]">{skillDesc(agent)}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-[#262B2D] bg-[#262B2D] sm:grid-cols-4">
                      <StatCell value={`★ ${fmt(agent.github_stars)}`} label="GitHub stars" />
                      <StatCell value={`⑂ ${fmt(agent.github_forks)}`} label="forks" />
                      <StatCell value={health !== null ? `${health}/10` : '—'} label="guide quality" />
                      <StatCell value={isPaid(agent) ? `$${Number(agent.price)}` : 'Free'} label={isPaid(agent) ? 'one-time' : 'open-source'} />
                    </div>

                    {useCase && (
                      <div className="flex flex-col gap-1.5">
                        <Mono className="text-[11px] tracking-wider text-[#5A615D]">EXAMPLE USE CASE</Mono>
                        <div className="t-mono flex min-w-0 items-center gap-2.5 rounded-lg border border-[#262B2D] border-l-[3px] border-l-[#C6F24E] bg-[#0A0C0D] px-3.5 py-2.5 text-[12.5px] leading-normal text-[#ECEFEA]">
                          <span className="min-w-0 [overflow-wrap:anywhere]">{useCase}</span>
                        </div>
                      </div>
                    )}

                    <div className="t-mono flex flex-wrap items-center gap-1.5 text-xs text-[#5A615D]">
                      {Array.isArray(agent.github_topics) && agent.github_topics.length > 0 && (
                        <>
                          <span>Topics:</span>
                          {agent.github_topics.slice(0, 4).map((t) => (
                            <span key={t} className="rounded border border-[#262B2D] bg-[#0A0C0D] px-2 py-[3px]">
                              {t}
                            </span>
                          ))}
                        </>
                      )}
                      <span className="flex-1" />
                      <span>
                        Works with
                        {TARGETS.map((t) => (
                          <span key={t.name} className="ml-1 rounded-[3px] border border-[#323A3C] px-1.5 py-0.5">
                            {t.name}
                          </span>
                        ))}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2.5 pt-1.5 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => {
                          setStep(3)
                          setDone(false)
                        }}
                        className="flex-1 rounded-[10px] border-0 bg-[#C6F24E] p-4 text-base font-bold text-[#0A0C0D] hover:bg-[#A6D62E] active:scale-[.98]"
                      >
                        Install this agent →
                      </button>
                      <Link
                        href={`/skills/${skillKey(agent)}`}
                        className="whitespace-nowrap rounded-[10px] border border-[#323A3C] px-5 py-4 text-center text-[15px] font-semibold hover:border-[#C6F24E]"
                      >
                        Full report ↗
                      </Link>
                    </div>
                  </article>

                  {alts.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <Mono className="text-xs text-[#5A615D]">ALSO CLOSE</Mono>
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {alts.map((a) => (
                          <button
                            key={skillKey(a)}
                            type="button"
                            onClick={() => chooseAgent(a)}
                            className="flex flex-col items-start gap-1.5 rounded-xl border border-[#262B2D] bg-[#101314] px-[18px] py-4 text-left text-[#ECEFEA] hover:border-[#C6F24E]"
                          >
                            <span className="text-base font-bold">{skillTitle(a)}</span>
                            <Mono className="text-xs text-[#5A615D]">
                              {categoryLabel(a.category)} · ★ {fmt(a.github_stars)}
                              {healthScore(a) !== null ? ` · ● ${healthScore(a)}` : ''}
                            </Mono>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button type="button" onClick={reset} className="self-center border-0 bg-transparent text-[13px] text-[#5A615D] underline hover:text-[#ECEFEA]">
                    Describe something else
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ---------- STEP 3 ---------- */}
          {step === 3 && agent && (
            <div className="anim-rise mt-6 flex w-full flex-col gap-[22px]">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <Mono className="text-xs text-[#C6F24E]">INSTALLING</Mono>
                  <h2 className="m-0 text-[22px] font-bold tracking-[-0.03em] sm:text-[26px]">{skillTitle(agent)}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep(2)
                    setDone(false)
                  }}
                  className="whitespace-nowrap rounded-md border border-[#323A3C] bg-transparent px-3 py-2 text-[13px] text-[#8B928D] hover:border-[#C6F24E] hover:text-[#ECEFEA]"
                >
                  ← Change agent
                </button>
              </div>

              <div className="t-mono flex flex-wrap gap-5 text-xs text-[#8B928D]">
                <span className="whitespace-nowrap">
                  <span className="text-[#C6F24E]">✓</span> One paste, nothing to install
                </span>
                <span className="whitespace-nowrap">
                  <span className="text-[#C6F24E]">✓</span> Compiled from the source repo
                </span>
                <span className="whitespace-nowrap">
                  <span className="text-[#C6F24E]">✓</span> Yours to edit and keep
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-3 rounded-[14px] border border-[#262B2D] bg-[#101314] p-5">
                  <Mono className="text-xs text-[#5A615D]">RUN IN</Mono>
                  <div className="flex flex-col gap-2">
                    {TARGETS.map((t) => {
                      const on = t.name === target
                      return (
                        <button
                          key={t.name}
                          type="button"
                          onClick={() => {
                            setTarget(t.name)
                            setDone(false)
                          }}
                          className={`flex items-center justify-between rounded-lg border px-3.5 py-3 font-semibold ${
                            on ? 'border-[#ECEFEA] bg-[#ECEFEA] text-[#0A0C0D]' : 'border-[#323A3C] bg-transparent text-[#ECEFEA] hover:border-[#C6F24E]'
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: t.dot }} />
                            {t.name}
                          </span>
                          <Mono className="text-[11px] opacity-70">{t.hint}</Mono>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 rounded-[14px] border border-[#262B2D] bg-[#101314] p-5">
                    <Mono className="text-xs text-[#5A615D]">DELIVER AS</Mono>
                    <div className="flex gap-1.5">
                      {[
                        ['Copy', 'Copy'],
                        ['Download', 'Download .md'],
                        ['Open', `Open in ${target}`],
                      ].map(([key, label]) => {
                        const on = key === delivery
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setDelivery(key)
                              setDone(false)
                            }}
                            className={`flex-1 whitespace-nowrap rounded-lg border px-1.5 py-2.5 text-[13px] font-semibold ${
                              on ? 'border-[#ECEFEA] bg-[#ECEFEA] text-[#0A0C0D]' : 'border-[#323A3C] bg-transparent text-[#8B928D] hover:border-[#C6F24E]'
                            }`}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2.5 rounded-[14px] border border-[#262B2D] bg-[#101314] p-5">
                    <Mono className="text-xs text-[#5A615D]">INCLUDE</Mono>
                    <div className="flex flex-wrap gap-1.5">
                      {OPTION_DEFS.map(([k, label]) => {
                        const on = !!opts[k]
                        return (
                          <button
                            key={k}
                            type="button"
                            aria-pressed={on}
                            onClick={() => {
                              setOpts((o) => ({ ...o, [k]: !o[k] }))
                              setDone(false)
                            }}
                            className={`whitespace-nowrap rounded-full border px-3 py-[7px] text-[13px] font-semibold ${
                              on ? 'border-[#ECEFEA] bg-[#ECEFEA] text-[#0A0C0D]' : 'border-[#323A3C] bg-transparent text-[#8B928D] hover:border-[#C6F24E]'
                            }`}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => setPreview((p) => !p)}
                  className="t-mono flex items-center gap-2 self-start border-0 bg-transparent p-0 text-xs text-[#5A615D] hover:text-[#ECEFEA]"
                >
                  <span>{preview ? '▾' : '▸'}</span>
                  BLUEPRINT · FORMATTED FOR {target.toUpperCase()} · {promptLoading && !blueprint ? 'COMPILING…' : `${blueprintLines} LINES`}
                </button>
                {preview && (
                  <pre className="t-mono m-0 max-h-[220px] overflow-auto whitespace-pre-wrap rounded-xl border border-[#262B2D] bg-[#101314] p-[18px] text-[12.5px] leading-[1.55] text-[#8B928D]">
                    {blueprint || 'Compiling the blueprint from the source repository…'}
                  </pre>
                )}
              </div>

              {!done ? (
                <button
                  type="button"
                  onClick={doInstall}
                  disabled={!blueprint}
                  className="rounded-[10px] border-0 bg-[#C6F24E] p-[18px] text-[17px] font-bold text-[#0A0C0D] hover:bg-[#A6D62E] disabled:cursor-wait disabled:opacity-60"
                >
                  {blueprint ? installLabel : 'Compiling blueprint…'}
                </button>
              ) : (
                <div className="flex flex-col gap-3.5 rounded-[14px] border border-[#C6F24E] bg-[#101314] p-6">
                  <Mono className="text-[13px] text-[#C6F24E]">✓ {doneMsg}</Mono>
                  <p className="m-0 text-base leading-normal text-[#8B928D]">
                    Paste it as a system prompt or custom instruction in {target} and the agent is live. Want the full report on this repo, or the rest of the catalog?
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    <a
                      href={targetDef.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="whitespace-nowrap rounded-lg bg-[#ECEFEA] px-[18px] py-3 text-sm font-bold text-[#0A0C0D] hover:bg-[#C6F24E]"
                    >
                      Open {target} ↗
                    </a>
                    <Link href={`/skills/${agentKey}`} className="whitespace-nowrap rounded-lg border border-[#323A3C] px-[18px] py-3 text-sm font-semibold hover:border-[#C6F24E]">
                      Full report
                    </Link>
                    <Link href="/skills" className="whitespace-nowrap rounded-lg border border-[#323A3C] px-[18px] py-3 text-sm font-semibold hover:border-[#C6F24E]">
                      Explore the marketplace
                    </Link>
                    <a href="#how" className="whitespace-nowrap rounded-lg border border-[#323A3C] px-[18px] py-3 text-sm font-semibold hover:border-[#C6F24E]">
                      See how it works ↓
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </header>
      </div>

      <div id="more" className="border-t border-[#262B2D]" />

      {/* ------------------------------------------------------------------ */}
      {/* TRENDING                                                            */}
      {/* ------------------------------------------------------------------ */}
      {featured.length > 0 && (
        <section id="agents" className="mx-auto max-w-[1200px] px-5 py-[72px] sm:px-10">
          <div className="mb-7 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="m-0 text-[28px] font-bold tracking-[-0.03em] sm:text-[32px]">Trending this week</h2>
            <Link href="/skills" className="t-mono text-sm text-[#8B928D] hover:text-[#C6F24E]">
              {countLabel ? `All ${countLabel} in the marketplace →` : 'Browse the marketplace →'}
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {featured.map((s) => {
              const h = healthScore(s)
              return (
                <article
                  key={skillKey(s)}
                  className="flex min-w-0 flex-col gap-[18px] rounded-[14px] border border-[#262B2D] bg-[#101314] p-[26px] transition-[transform,border-color] duration-200 hover:-translate-y-[3px] hover:border-[#C6F24E]"
                >
                  <div className="t-mono flex items-center justify-between gap-2 text-xs text-[#8B928D]">
                    <CategoryChip>{categoryLabel(s.category)}</CategoryChip>
                    {h !== null && <span className="whitespace-nowrap text-[#C6F24E]">● {h}/10</span>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="m-0 text-[22px] font-bold tracking-[-0.02em] sm:text-2xl">
                      <Link href={`/skills/${skillKey(s)}`} className="hover:text-[#C6F24E]">
                        {skillTitle(s)}
                      </Link>
                    </h3>
                    <p className="m-0 text-[15px] leading-normal text-[#8B928D] line-clamp-3">{skillDesc(s)}</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2.5 border-t border-[#262B2D] pt-[18px]">
                    <Mono className="min-w-0 truncate text-[13px] text-[#8B928D]">
                      ★ {fmt(s.github_stars)}
                      {s.github_forks > 0 ? ` · ⑂ ${fmt(s.github_forks)}` : ''}
                      {s.installs > 0 ? ` · ${fmt(s.installs)} installs` : ''}
                    </Mono>
                    <button
                      type="button"
                      onClick={() => installFeatured(s)}
                      className="whitespace-nowrap rounded-md border-0 bg-[#ECEFEA] px-4 py-2.5 text-sm font-bold text-[#0A0C0D] hover:bg-[#C6F24E]"
                    >
                      Install
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* HOW IT WORKS (light band)                                           */}
      {/* ------------------------------------------------------------------ */}
      <section id="how" className="border-y border-[#262B2D] bg-[#F3F3EC] px-5 py-[72px] text-[#0A0C0D] sm:px-10">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-12 lg:grid-cols-[1fr_2fr]">
          <div className="flex flex-col gap-4">
            <Mono className="text-[13px] text-[#4E7A00]">HOW INSTALL WORKS</Mono>
            <h2 className="m-0 text-[34px] font-bold leading-none tracking-[-0.04em] sm:text-[40px]">Under a minute from question to working agent.</h2>
            <p className="m-0 text-[17px] leading-normal text-[#4B5468]">
              Nothing to install and no code — some tools need their own API key, and each listing says so up front. An agent is a blueprint: the right open-source repo compiled into one instruction set your AI already understands.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-3.5 rounded-[14px] border border-[#E3E6EC] bg-white p-5">
              <div className="t-mono flex min-h-[96px] items-center gap-2 rounded-lg bg-[#0A0C0D] p-3 text-[11px] text-[#8B928D]">
                <span className="flex-1 truncate">weekly client ad report</span>
                <span className="rounded bg-[#C6F24E] px-2 py-1 font-sans font-bold text-[#0A0C0D]">Find →</span>
              </div>
              <Mono className="text-xs text-[#5A615D]">01</Mono>
              <h3 className="m-0 text-xl tracking-[-0.02em]">Describe the job</h3>
              <p className="m-0 text-[15px] leading-normal text-[#4B5468]">
                Plain English. We match it against {countLabel ? `${countLabel} repos` : 'the repos'} we&apos;ve already scored, every one live on GitHub.
              </p>
            </div>
            <div className="flex flex-col gap-3.5 rounded-[14px] border border-[#E3E6EC] bg-white p-5">
              <div className="t-mono flex min-h-[96px] flex-col justify-center gap-1.5 rounded-lg border border-[#C6F24E] bg-[#0A0C0D] p-3 text-[11px] text-[#8B928D]">
                <span className="font-sans text-[13px] font-bold text-[#ECEFEA]">Best match</span>
                <span>★ stars · ⑂ forks · ● guide quality · Free</span>
              </div>
              <Mono className="text-xs text-[#5A615D]">02</Mono>
              <h3 className="m-0 text-xl tracking-[-0.02em]">Review the match</h3>
              <p className="m-0 text-[15px] leading-normal text-[#4B5468]">
                Guide-quality score, live stars and forks, an example use case, the source repo. Swap to an alternative in one click.
              </p>
            </div>
            <div className="flex flex-col gap-3.5 rounded-[14px] border border-[#E3E6EC] bg-white p-5">
              <div className="t-mono flex min-h-[96px] flex-col justify-center gap-[5px] rounded-lg bg-[#0A0C0D] p-3 text-[11px]">
                <span className="flex justify-between rounded bg-[#ECEFEA] px-2 py-1 font-semibold text-[#0A0C0D]">
                  <span>Claude</span>
                  <span>✓</span>
                </span>
                <span className="rounded border border-[#323A3C] px-2 py-1 text-[#8B928D]">ChatGPT</span>
                <span className="rounded border border-[#323A3C] px-2 py-1 text-[#8B928D]">Gemini</span>
              </div>
              <Mono className="text-xs text-[#4E7A00]">03</Mono>
              <h3 className="m-0 text-xl tracking-[-0.02em]">Install</h3>
              <p className="m-0 text-[15px] leading-normal text-[#4B5468]">Pick Claude, ChatGPT or Gemini and how you want it delivered. Paste. Live in under a minute.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* DONE-FOR-YOU                                                        */}
      {/* ------------------------------------------------------------------ */}
      <section id="dfy" className="mx-auto max-w-[1200px] px-5 py-[72px] sm:px-10">
        <div className="grid grid-cols-1 items-center gap-8 rounded-[18px] bg-[#C6F24E] p-7 text-[#0A0C0D] sm:p-11 lg:grid-cols-[3fr_2fr] lg:gap-12">
          <div className="flex flex-col gap-4">
            <Mono className="text-[13px] opacity-80">DONE-FOR-YOU · FROM $500</Mono>
            <h2 className="m-0 text-[30px] font-bold leading-none tracking-[-0.04em] sm:text-[36px]">Want the outcome without the setup?</h2>
            <p className="m-0 text-[17px] leading-normal opacity-90 [text-wrap:pretty]">
              We build your exact workflow from proven skills, working in your tools within 7 days. 30 days of tweaks included. Pay once, own everything.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2.5 lg:justify-self-end">
            <Link href="/build-for-me" className="rounded-lg bg-[#0A0C0D] px-[26px] py-4 text-base font-bold text-[#ECEFEA] hover:bg-[#ECEFEA] hover:text-[#0A0C0D]">
              Get my agent built
            </Link>
            <Mono className="text-xs opacity-80">Agencies: white-label &amp; multi-agent plans available</Mono>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* FAQ                                                                 */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 border-t border-[#262B2D] px-5 py-[72px] sm:px-10 lg:grid-cols-[1fr_2fr] lg:gap-12">
        <div className="flex flex-col gap-3">
          <h2 className="m-0 text-[32px] font-bold leading-none tracking-[-0.04em]">Questions</h2>
          <p className="m-0 text-sm leading-normal text-[#5A615D]">
            Something else?{' '}
            <Link href="/help" className="text-[#8B928D] underline hover:text-[#C6F24E]">
              Ask us
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-col">
          {faqs.map((f, i) => {
            const open = faqOpen === i
            return (
              <div key={f.q} className="flex flex-col border-b border-[#262B2D]">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setFaqOpen(open ? -1 : i)}
                  className="flex items-center justify-between gap-4 border-0 bg-transparent py-[18px] text-left text-lg font-semibold text-[#ECEFEA] hover:text-[#C6F24E]"
                >
                  <span>{f.q}</span>
                  <Mono className="shrink-0 text-lg text-[#5A615D]">{open ? '–' : '+'}</Mono>
                </button>
                {open && <p className="anim-rise m-0 mb-[18px] max-w-[640px] text-base leading-[1.55] text-[#8B928D]">{f.a}</p>}
              </div>
            )
          })}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* CREATORS                                                            */}
      {/* ------------------------------------------------------------------ */}
      <section id="creators" className="border-t border-[#262B2D] bg-gradient-to-b from-[#0A0C0D] to-[#07090E] px-5 py-14 sm:px-10">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-[18px] md:flex-row md:items-center md:justify-between">
          <div className="flex max-w-[560px] flex-col gap-3">
            <Mono className="text-xs text-[#5A615D]">FOR CREATORS &amp; MAINTAINERS</Mono>
            <h2 className="m-0 text-[26px] font-bold tracking-[-0.03em]">Build or sell AI agents from open-source skills.</h2>
            <p className="m-0 leading-normal text-[#8B928D]">
              Creators keep 85%. Open-source maintainers: get listed and installed by founders and agencies.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/submit" className="rounded-md bg-[#ECEFEA] px-4 py-2.5 text-sm font-semibold text-[#0A0C0D] hover:bg-[#C6F24E]">
              Submit a skill
            </Link>
            <Link href="/learn/creators" className="rounded-md border border-[#323A3C] px-4 py-2.5 text-sm font-semibold hover:border-[#C6F24E]">
              Sell your agents
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
