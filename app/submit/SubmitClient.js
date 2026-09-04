'use client'

// Submit a skill — list a GitHub repo (free) or a packaged paid agent.
//
// Step 1 checks the repo against our published gates via /api/repo-check
// (real GitHub facts: stars, license, last push, README). We do not show an
// invented pre-score — the health score is produced by the enrichment pass
// after submission. Submissions go to /api/upload and stay unpublished until
// reviewed, exactly like every other user-submitted listing.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { FOR_CATEGORIES, TARGETS, fmt } from '@/lib/skill-display'

const TYPES = [
  ['Skill', 'claude-skill'],
  ['Agent', 'ai-agent'],
  ['MCP', 'mcp-server'],
  ['Template', 'prompt'],
]

const PAYOUT_PCT = 0.85 // lib/stripe.js PLATFORM_FEE_PCT = 0.15
const DESC_MAX = 140
const BP_MIN = 40

const WHAT_WE_CHECK = [
  'Permissive license (MIT, Apache, BSD)',
  'Commit in the last 90 days',
  'README with install + usage',
  'Content-safety screen: no injected prompts or baked-in credentials',
  'Runs from a pasted blueprint, no server required',
]

function Mono({ className = '', children }) {
  return <span className={`t-mono ${className}`}>{children}</span>
}

function Label({ children }) {
  return <label className="t-mono text-[11px] tracking-[.06em] text-[#5A615D]">{children}</label>
}

const inputCls =
  'min-w-0 rounded-[10px] border border-[#323A3C] bg-[#101314] px-3.5 py-[13px] text-[15px] text-[#ECEFEA] outline-none placeholder:text-[#5A615D] focus:border-[#C6F24E]'

function prettyName(repo) {
  const part = String(repo || '').split('/')[1] || ''
  return part.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function SubmitClient({ publishedCount = 0 }) {
  const [repo, setRepo] = useState('')
  const [checking, setChecking] = useState(false)
  const [check, setCheck] = useState(null) // { repo, listed } from /api/repo-check
  const [checkError, setCheckError] = useState('')

  const [type, setType] = useState('Skill')
  const [works, setWorks] = useState(['Claude', 'ChatGPT', 'Gemini'])
  const [name, setName] = useState('')
  const [cat, setCat] = useState('')
  const [desc, setDesc] = useState('')

  const [paid, setPaid] = useState(false)
  const [price, setPrice] = useState(29)
  const [bp, setBp] = useState('')

  const [email, setEmail] = useState('')
  const [handle, setHandle] = useState('')
  const [agreed, setAgreed] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [sent, setSent] = useState(null) // { id }

  const normalizedRepo = useMemo(() => {
    const raw = repo
      .trim()
      .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
      .replace(/\.git$/i, '')
      .replace(/\/+$/, '')
    return /^[\w.-]+\/[\w.-]+$/.test(raw) ? raw : ''
  }, [repo])

  const runCheck = async () => {
    if (!normalizedRepo || checking) return
    setChecking(true)
    setCheck(null)
    setCheckError('')
    try {
      const r = await fetch(`/api/repo-check?repo=${encodeURIComponent(normalizedRepo)}`)
      const j = await r.json()
      if (!r.ok || !j.ok) {
        setCheckError(j.error || 'Could not check that repository.')
      } else {
        setCheck(j)
        setRepo(j.repo.full_name)
        if (!name.trim()) setName(j.repo.name ? prettyName(j.repo.full_name) : '')
        if (!handle.trim()) setHandle(j.repo.owner || '')
        if (!desc.trim() && j.repo.description) setDesc(j.repo.description.slice(0, DESC_MAX))
      }
    } catch {
      setCheckError('Network error — please try again.')
    } finally {
      setChecking(false)
    }
  }

  // Reset the check when the repo field changes.
  useEffect(() => {
    setCheck((c) => (c && c.repo.full_name.toLowerCase() !== normalizedRepo.toLowerCase() ? null : c))
  }, [normalizedRepo])

  const payout = Math.round(Number(price || 0) * PAYOUT_PCT)
  const typeSlug = (TYPES.find((t) => t[0] === type) || TYPES[0])[1]

  const checks = [
    [!!check, 'Check your repo'],
    [!!name.trim(), 'Add a display name'],
    [!!cat, 'Pick what it is for'],
    [desc.trim().length >= 20, 'Describe it in one sentence (20+ chars)'],
    [works.length > 0, 'Pick at least one model'],
    [!paid || (price >= 9 && price <= 499 && bp.trim().length >= BP_MIN), 'Add the blueprint buyers receive'],
    [/^\S+@\S+\.\S+$/.test(email), 'Add your email'],
    [agreed, 'Confirm you have the right to list it'],
  ]
  const done = checks.filter((c) => c[0]).length
  const ready = done === checks.length
  const pct = Math.round((done / checks.length) * 100)
  const next = checks.find((c) => !c[0])

  const fillBp = () =>
    setBp(
      `# ${name || 'Agent'} — agent blueprint\nGoal: ${desc || '…'}\nSource: github.com/${normalizedRepo || 'owner/repo'}\nWorks with: ${works.join(', ')}\n\nYou are ${name || 'the agent'}. Follow the skill's usage guide. Ask for missing inputs before running.`
    )

  const submit = async () => {
    if (!ready || submitting) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: desc.trim(),
          category: typeSlug,
          use_case: cat,
          price: paid ? Number(price) : 0,
          creator: handle.trim() || check?.repo?.owner || 'Anonymous',
          github_url: check?.repo?.html_url || `https://github.com/${normalizedRepo}`,
          source_url: check?.repo?.html_url || `https://github.com/${normalizedRepo}`,
          email: email.trim(),
          works_with: works,
          blueprint: paid ? bp.trim() : '',
        }),
      })
      const j = await res.json()
      if (res.ok && j.success) setSent({ id: j.skill?.id || '' })
      else setSubmitError(j.error || 'Something went wrong — please try again.')
    } catch {
      setSubmitError('Network error — please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setSent(null)
    setRepo('')
    setCheck(null)
    setName('')
    setCat('')
    setDesc('')
    setPaid(false)
    setPrice(29)
    setBp('')
    setAgreed(false)
  }

  const countLabel = publishedCount >= 10 ? `${(Math.floor(publishedCount / 10) * 10).toLocaleString()}+` : ''
  const meta = check?.repo
  const allPass = meta ? meta.passed === meta.total : false
  const failing = meta ? meta.checks.filter((c) => !c.ok) : []
  const dots = Object.fromEntries(TARGETS.map((t) => [t.name, t.dot]))
  const on = 'border-[#ECEFEA] bg-[#ECEFEA] text-[#0A0C0D]'
  const off = 'border-[#323A3C] bg-transparent text-[#8B928D] hover:border-[#C6F24E]'

  return (
    <div className="min-h-screen bg-[#0A0C0D] text-[#ECEFEA]">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-start gap-10 px-5 pb-24 pt-14 sm:px-10 lg:grid-cols-[1fr_440px] lg:gap-16">
        {/* ---------------- left: form ---------------- */}
        <div className="flex min-w-0 flex-col gap-8">
          <div className="flex flex-col gap-3.5">
            <Mono className="text-xs tracking-[.06em] text-[#C6F24E]">SUBMIT A SKILL</Mono>
            <h1 className="m-0 text-[clamp(36px,4.6vw,56px)] font-bold leading-none tracking-[-0.04em] [text-wrap:balance]">Get your repo installed by founders and agencies.</h1>
            <p className="m-0 max-w-[560px] text-[17px] leading-normal text-[#8B928D] [text-wrap:pretty]">
              Paste a GitHub URL. We pull the stats, run it through our 8/10 quality gate and list it with a one-click install. Free listings stay free; paid agents pay you 85%.
            </p>
          </div>

          {!sent ? (
            <div className="anim-rise flex flex-col gap-7">
              {/* 1 · Repository */}
              <div className="flex flex-col gap-2.5">
                <Label>1 · REPOSITORY</Label>
                <div className={`flex items-center gap-2.5 rounded-xl border bg-[#101314] py-1.5 pl-4 pr-1.5 transition-colors focus-within:border-[#C6F24E] ${check ? 'border-[#C6F24E]' : 'border-[#323A3C]'}`}>
                  <Mono className="whitespace-nowrap text-[13px] text-[#5A615D]">github.com/</Mono>
                  <input
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        runCheck()
                      }
                    }}
                    placeholder="owner/repo"
                    aria-label="GitHub repository"
                    className="t-mono min-w-0 flex-1 border-0 bg-transparent py-2.5 text-base text-[#ECEFEA] outline-none placeholder:text-[#5A615D]"
                  />
                  <button
                    type="button"
                    onClick={runCheck}
                    disabled={!normalizedRepo || checking}
                    className="whitespace-nowrap rounded-lg border-0 bg-[#ECEFEA] px-4 py-[11px] text-sm font-bold text-[#0A0C0D] hover:bg-[#C6F24E] disabled:opacity-50"
                  >
                    {check ? 'Re-check' : 'Check repo'}
                  </button>
                </div>
                {checking && (
                  <div className="t-mono flex items-center gap-2 text-xs text-[#8B928D]">
                    <span className="anim-blink h-[7px] w-[7px] rounded-full bg-[#C6F24E]" />
                    Reading README, stars, license, last commit…
                  </div>
                )}
                {checkError && <Mono className="text-xs text-[#E8B36A]">{checkError}</Mono>}
                {meta && (
                  <>
                    <div className="anim-rise grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-[#262B2D] bg-[#262B2D] sm:grid-cols-4">
                      <div className="t-mono flex flex-col gap-0.5 bg-[#0A0C0D] p-3">
                        <span className="text-[17px] font-medium">★ {fmt(meta.stars)}</span>
                        <span className="text-[10.5px] text-[#5A615D]">stars</span>
                      </div>
                      <div className="t-mono flex flex-col gap-0.5 bg-[#0A0C0D] p-3">
                        <span className="truncate text-[17px] font-medium">{meta.license || '—'}</span>
                        <span className="text-[10.5px] text-[#5A615D]">license</span>
                      </div>
                      <div className="t-mono flex flex-col gap-0.5 bg-[#0A0C0D] p-3">
                        <span className="text-[17px] font-medium">{meta.days_since_push === null ? '—' : meta.days_since_push === 0 ? 'today' : `${meta.days_since_push}d ago`}</span>
                        <span className="text-[10.5px] text-[#5A615D]">last commit</span>
                      </div>
                      <div className="t-mono flex flex-col gap-0.5 bg-[#0A0C0D] p-3">
                        <span className={`text-[17px] font-medium ${allPass ? 'text-[#C6F24E]' : 'text-[#ECEFEA]'}`}>
                          {meta.passed}/{meta.total}
                        </span>
                        <span className="text-[10.5px] text-[#5A615D]">automated gates</span>
                      </div>
                    </div>
                    <Mono className={`text-xs ${allPass ? 'text-[#8B928D]' : 'text-[#E8B36A]'}`}>
                      {allPass
                        ? 'Clears every automated gate. Full review still checks README quality and runtime safety before the guide-quality score is assigned.'
                        : `Not yet: ${failing.map((c) => `${c.label.toLowerCase()} (${c.detail})`).join('; ')}. You can still submit; we'll tell you what to fix.`}
                    </Mono>
                    {check.listed && (
                      <Mono className="text-xs text-[#8B928D]">
                        Already in the catalog as{' '}
                        <Link href={`/skills/${check.listed.slug}`} className="text-[#C6F24E] underline">
                          {check.listed.title}
                        </Link>
                        {check.listed.published ? '.' : ' (in review).'} Submitting again will not create a duplicate listing.
                      </Mono>
                    )}
                  </>
                )}
              </div>

              {/* 2 · Listing */}
              <div className="flex flex-col gap-2.5">
                <Label>2 · LISTING</Label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {TYPES.map(([t]) => (
                    <button key={t} type="button" onClick={() => setType(t)} className={`whitespace-nowrap rounded-full border px-[13px] py-[7px] text-[13px] font-semibold ${type === t ? on : off}`}>
                      {t}
                    </button>
                  ))}
                  <span className="mx-1 h-[18px] w-px bg-[#323A3C]" />
                  {TARGETS.map((t) => {
                    const a = works.includes(t.name)
                    return (
                      <button
                        key={t.name}
                        type="button"
                        aria-pressed={a}
                        onClick={() => setWorks(a ? works.filter((w) => w !== t.name) : [...works, t.name])}
                        className={`flex items-center gap-2 whitespace-nowrap rounded-full border px-[13px] py-[7px] text-[13px] font-semibold ${a ? on : off}`}
                      >
                        <span className="h-2 w-2 rounded-sm" style={{ background: dots[t.name] }} />
                        {t.name}
                      </button>
                    )
                  })}
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" aria-label="Display name" className={inputCls} />
                  <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="What it is for" className={`${inputCls} ${cat ? 'text-[#ECEFEA]' : 'text-[#5A615D]'}`}>
                    <option value="">What is it for?</option>
                    {FOR_CATEGORIES.map(([slug, label]) => (
                      <option key={slug} value={slug}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value.slice(0, DESC_MAX))}
                  rows={3}
                  placeholder="One sentence a founder would understand. What goes in, what comes out."
                  aria-label="Description"
                  className={`${inputCls} resize-y leading-[1.45]`}
                />
                <div className="t-mono flex justify-between text-[11px] text-[#5A615D]">
                  <span>Plain English, no jargon.</span>
                  <span className={desc.length > 125 ? 'text-[#E8B36A]' : ''}>
                    {desc.length}/{DESC_MAX}
                  </span>
                </div>
              </div>

              {/* 3 · Pricing */}
              <div className="flex flex-col gap-2.5">
                <Label>3 · PRICING</Label>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setPaid(false)}
                    className={`flex flex-col gap-1.5 rounded-xl border p-4 text-left ${!paid ? 'border-[#C6F24E] bg-[rgba(198,242,78,.06)]' : 'border-[#323A3C] bg-[#101314]'}`}
                  >
                    <span className="text-base font-bold">Free listing</span>
                    <span className="text-[13px] leading-[1.45] text-[#8B928D]">Open-source tool, installed as-is. You get the traffic and the stars.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaid(true)}
                    className={`flex flex-col gap-1.5 rounded-xl border p-4 text-left ${paid ? 'border-[#C6F24E] bg-[rgba(198,242,78,.06)]' : 'border-[#323A3C] bg-[#101314]'}`}
                  >
                    <span className="flex justify-between gap-2 text-base font-bold">
                      <span>Paid agent</span>
                      <Mono className="whitespace-nowrap text-[11px] text-[#C6F24E]">YOU KEEP 85%</Mono>
                    </span>
                    <span className="text-[13px] leading-[1.45] text-[#8B928D]">A packaged blueprint with your prompts and setup. One-time price, Stripe payouts.</span>
                  </button>
                </div>
                {paid && (
                  <>
                    <div className="anim-rise flex flex-wrap items-center gap-3.5">
                      <div className="flex items-center gap-1.5 rounded-[10px] border border-[#323A3C] bg-[#101314] px-3.5">
                        <span className="text-base text-[#5A615D]">$</span>
                        <input
                          type="number"
                          min={9}
                          max={499}
                          value={price}
                          onChange={(e) => setPrice(Number(e.target.value))}
                          aria-label="Price in USD"
                          className="t-mono w-20 border-0 bg-transparent py-3 text-base text-[#ECEFEA] outline-none"
                        />
                      </div>
                      <Mono className="whitespace-nowrap text-xs text-[#8B928D]">
                        You receive <span className="text-[#C6F24E]">${payout}</span> per sale
                      </Mono>
                    </div>
                    <div className="anim-rise flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <Label>BLUEPRINT BUYERS RECEIVE</Label>
                        <button type="button" onClick={fillBp} className="t-mono border-0 bg-transparent p-0 text-[11px] text-[#8B928D] underline hover:text-[#C6F24E]">
                          Start from template
                        </button>
                      </div>
                      <textarea
                        value={bp}
                        onChange={(e) => setBp(e.target.value)}
                        rows={6}
                        placeholder={'# Agent blueprint\nGoal: …\nSkills: …\nInstructions: …'}
                        aria-label="Blueprint"
                        className="t-mono resize-y rounded-[10px] border border-[#323A3C] bg-[#0A0C0D] px-3.5 py-[13px] text-[12.5px] leading-[1.55] text-[#8B928D] outline-none placeholder:text-[#5A615D] focus:border-[#C6F24E]"
                      />
                      <Mono className={`text-[11px] ${bp.trim().length >= BP_MIN ? 'text-[#5A615D]' : 'text-[#E8B36A]'}`}>
                        {bp.trim().length >= BP_MIN ? `${bp.split('\n').length} lines · delivered formatted for ${works.join(', ') || 'the models you pick'}` : `Min ${BP_MIN} characters. This is what buyers paste into their model.`}
                      </Mono>
                    </div>
                  </>
                )}
              </div>

              {/* 4 · You */}
              <div className="flex flex-col gap-2.5">
                <Label>4 · YOU</Label>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" aria-label="Email" className={inputCls} />
                  <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="Creator name shown on listing" aria-label="Creator name" className={inputCls} />
                </div>
                <label className="flex cursor-pointer items-start gap-2.5 text-[13.5px] leading-[1.45] text-[#8B928D]">
                  <input type="checkbox" checked={agreed} onChange={() => setAgreed((v) => !v)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#C6F24E]" />
                  I own this repo or have the right to list it. Listings must clear an 8/10 guide-quality score; we re-check stats daily and delist abandoned repos.
                </label>
              </div>

              <div className="flex flex-col gap-2.5 pt-1.5">
                {submitError && <Mono className="text-xs text-[#E8B36A]">{submitError}</Mono>}
                <button
                  type="button"
                  onClick={submit}
                  disabled={!ready || submitting}
                  className={`rounded-[10px] border-0 p-[18px] text-[17px] font-bold transition-[transform,background] ${
                    ready ? 'cursor-pointer bg-[#C6F24E] text-[#0A0C0D] hover:bg-[#A6D62E] active:scale-[.98]' : 'cursor-not-allowed bg-[#1C2123] text-[#5A615D]'
                  }`}
                >
                  {submitting ? 'Submitting…' : !check ? 'Check your repo first' : !ready ? 'Complete the form to submit' : paid ? `Submit for review · $${price} listing` : 'Submit for review · free listing'}
                </button>
                <Mono className="text-center text-xs text-[#5A615D]">We review every submission and email you either way, usually within a few days.</Mono>
              </div>
            </div>
          ) : (
            <div className="anim-rise flex flex-col gap-4 rounded-2xl border border-[#C6F24E] bg-[#101314] p-6 shadow-[0_0_0_1px_rgba(198,242,78,.15),0_24px_60px_-30px_rgba(198,242,78,.25)] sm:p-8">
              <Mono className="text-[13px] text-[#C6F24E]">✓ SUBMITTED · IN REVIEW{sent.id ? ` · REF ${sent.id.slice(0, 8).toUpperCase()}` : ''}</Mono>
              <h2 className="m-0 text-[30px] font-bold leading-[1.05] tracking-[-0.03em]">{name} is in the queue.</h2>
              <p className="m-0 text-base leading-[1.55] text-[#8B928D]">
                We&apos;ll run the full health check on <Mono className="text-[#ECEFEA]">github.com/{normalizedRepo}</Mono> and email <span className="text-[#ECEFEA]">{email}</span> either way, usually within a few days. If its guide clears 8/10 it goes live with one-click install.
              </p>
              <div className="t-mono grid grid-cols-1 gap-px overflow-hidden rounded-[10px] border border-[#262B2D] bg-[#262B2D] text-xs sm:grid-cols-3">
                <div className="flex flex-col gap-1 bg-[#0A0C0D] p-3.5">
                  <span className="text-[#C6F24E]">● Now</span>
                  <span className="leading-[1.4] text-[#8B928D]">Automated health check and content-safety screen</span>
                </div>
                <div className="flex flex-col gap-1 bg-[#0A0C0D] p-3.5">
                  <span className="text-[#ECEFEA]">○ Next</span>
                  <span className="leading-[1.4] text-[#8B928D]">Human review of README, safety and description</span>
                </div>
                <div className="flex flex-col gap-1 bg-[#0A0C0D] p-3.5">
                  <span className="text-[#ECEFEA]">○ Then</span>
                  <span className="leading-[1.4] text-[#8B928D]">Live with one-click install{paid ? ` · $${payout} to you per sale` : ''}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <Link href="/skills" className="rounded-lg bg-[#ECEFEA] px-[18px] py-3 text-sm font-bold text-[#0A0C0D] hover:bg-[#C6F24E]">
                  See the marketplace
                </Link>
                <button type="button" onClick={reset} className="whitespace-nowrap rounded-lg border border-[#323A3C] bg-transparent px-[18px] py-3 text-sm font-semibold text-[#ECEFEA] hover:border-[#C6F24E]">
                  Submit another
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ---------------- right: progress + preview ---------------- */}
        <aside className="flex flex-col gap-5 lg:sticky lg:top-[88px]">
          {!sent && (
            <div className="flex flex-col gap-2">
              <div className="t-mono flex justify-between text-[11px] tracking-[.06em] text-[#5A615D]">
                <span>COMPLETION</span>
                <span className="text-[#ECEFEA]">{pct}%</span>
              </div>
              <div className="h-1 overflow-hidden rounded-sm bg-[#262B2D]">
                <div className="h-full bg-[#C6F24E] transition-[width] duration-300" style={{ width: `${pct}%` }} />
              </div>
              <Mono className="text-[11.5px] text-[#8B928D]">{ready ? 'Ready to submit.' : `Next: ${next[1]}`}</Mono>
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <Mono className="text-[11px] tracking-[.06em] text-[#5A615D]">LIVE PREVIEW · HOW IT WILL LOOK</Mono>
            <article className="flex min-w-0 flex-col gap-3.5 rounded-[14px] border border-[#262B2D] bg-[#101314] p-5">
              <div className="t-mono flex items-center justify-between gap-2 text-[11px] text-[#8B928D]">
                <span className="flex flex-wrap gap-1.5">
                  <span className="whitespace-nowrap rounded bg-[#C6F24E] px-[7px] py-[3px] font-medium text-[#0A0C0D]">{type}</span>
                  <span className="whitespace-nowrap rounded border border-[#323A3C] px-[7px] py-[3px]">{(FOR_CATEGORIES.find(([s]) => s === cat) || [])[1] || 'Category'}</span>
                </span>
                <span className={`whitespace-nowrap font-medium ${paid ? 'text-[#ECEFEA]' : 'text-[#C6F24E]'}`}>{paid ? `$${price}` : 'FREE'}</span>
              </div>
              <div className="flex flex-col gap-[5px]">
                <h3 className={`m-0 text-[19px] font-bold tracking-[-0.02em] ${name ? 'text-[#ECEFEA]' : 'text-[#5A615D]'}`}>{name || 'Your skill name'}</h3>
                <p className={`m-0 text-sm leading-[1.45] ${desc ? 'text-[#8B928D]' : 'text-[#5A615D]'}`}>{desc || 'One sentence on what it does, shown to every founder and agency browsing.'}</p>
              </div>
              <div className="t-mono flex flex-wrap items-center gap-1.5 text-[11px] text-[#5A615D]">
                <span className="whitespace-nowrap">by {handle || 'you'}</span>
                {works.map((w) => (
                  <span key={w} className="whitespace-nowrap rounded-[3px] border border-[#323A3C] px-1.5 py-0.5">
                    {w}
                  </span>
                ))}
              </div>
              <div className="mt-auto flex items-center justify-between gap-2.5 border-t border-[#262B2D] pt-3">
                <span className="t-mono flex gap-[9px] text-[11.5px] text-[#8B928D]">
                  <span className="whitespace-nowrap">★ {meta ? fmt(meta.stars) : '—'}</span>
                  <span className="whitespace-nowrap text-[#C6F24E]">● {meta ? `${meta.passed}/${meta.total} gates` : '—'}</span>
                </span>
                <span className="whitespace-nowrap rounded-md bg-[#ECEFEA] px-[13px] py-2 text-[13px] font-bold text-[#0A0C0D]">{paid ? 'View' : 'Install'}</span>
              </div>
            </article>
          </div>

          <div className="flex flex-col gap-3 rounded-[14px] border border-[#262B2D] p-5">
            <Mono className="text-[11px] tracking-[.06em] text-[#5A615D]">WHAT WE CHECK</Mono>
            <div className="flex flex-col gap-[9px] text-sm leading-[1.4] text-[#8B928D]">
              {WHAT_WE_CHECK.map((t) => (
                <span key={t} className="flex gap-2.5">
                  <span className="text-[#C6F24E]">✓</span>
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="t-mono flex flex-col gap-1.5 px-1 text-xs leading-normal text-[#5A615D]">
            <span>{countLabel ? `${countLabel} repos listed · ` : ''}85% creator payout via Stripe</span>
            <Link href="/learn/creators" className="text-[#8B928D] underline hover:text-[#C6F24E]">
              Listing guidelines →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
