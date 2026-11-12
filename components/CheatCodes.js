'use client'

// Homepage "Cheat codes" — the shortcuts, prefixes and commands most people
// never find in Claude Code, Claude Cowork, Google Antigravity and OpenAI
// Codex. The data lives in lib/cheat-codes.js; every entry there carries the
// official page it was checked against, and each card links to it.
//
// Only the active tab is rendered, so the server HTML carries one tool's list,
// not all four. The list is static, so regenerations stay byte-identical (see
// docs/COSTS.md: no timestamps or counters in page output).

import { useRef, useState } from 'react'
import { CHEAT_CODE_TOOLS, CHEAT_CODES_CHECKED } from '@/lib/cheat-codes'
import { trackEvent } from '@/lib/analytics'

function CodeChip({ entry, tool, copied, onCopy }) {
  const chip = (
    <span className="t-mono inline-block max-w-full break-words rounded-md border border-[#323A3C] bg-[#0A0C0D] px-2.5 py-1.5 text-[14px] font-medium text-[#C6F24E]">
      {entry.code}
    </span>
  )
  if (entry.kind !== 'copy') return chip
  const isCopied = copied === `${tool}:${entry.code}`
  return (
    <span className="flex min-w-0 items-center gap-2">
      {chip}
      <button
        type="button"
        onClick={() => onCopy(entry)}
        aria-label={`Copy ${entry.code}`}
        className="t-mono shrink-0 rounded border border-[#323A3C] bg-transparent px-2 py-1 text-[11px] text-text-muted hover:border-[#C6F24E] hover:text-[#C6F24E]"
      >
        {isCopied ? 'Copied' : 'Copy'}
      </button>
    </span>
  )
}

export default function CheatCodes() {
  const [active, setActive] = useState(CHEAT_CODE_TOOLS[0].id)
  const [copied, setCopied] = useState(null)
  const tabRefs = useRef({})
  const tool = CHEAT_CODE_TOOLS.find((t) => t.id === active) || CHEAT_CODE_TOOLS[0]

  function select(id, focus = false) {
    setActive(id)
    trackEvent('cheat_codes_tab', { tool: id })
    if (focus) tabRefs.current[id]?.focus()
  }

  // Left/Right arrows move between tabs, per the WAI-ARIA tabs pattern.
  function onTabKey(e) {
    const ids = CHEAT_CODE_TOOLS.map((t) => t.id)
    const i = ids.indexOf(active)
    if (e.key === 'ArrowRight') select(ids[(i + 1) % ids.length], true)
    else if (e.key === 'ArrowLeft') select(ids[(i - 1 + ids.length) % ids.length], true)
    else return
    e.preventDefault()
  }

  async function onCopy(entry) {
    try {
      await navigator.clipboard?.writeText(entry.code)
      const key = `${tool.id}:${entry.code}`
      setCopied(key)
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500)
      trackEvent('cheat_code_copy', { tool: tool.id, code: entry.code.slice(0, 60) })
    } catch {
      // Clipboard can be blocked (insecure context, permissions); the code is
      // still on screen to select by hand.
    }
  }

  return (
    <section id="cheat-codes" className="border-t border-[#262B2D] px-5 py-[72px] sm:px-10">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-8 flex max-w-[720px] flex-col gap-3">
          <span className="t-mono text-[13px] text-[#C6F24E]">CHEAT CODES</span>
          <h2 className="m-0 text-[30px] font-bold leading-[1.05] tracking-[-0.04em] sm:text-[36px]">
            Secret codes for the AI tools you already use.
          </h2>
          <p className="m-0 text-[16px] leading-normal text-text-secondary [text-wrap:pretty]">
            The shortcuts, prefixes and commands most people never find. Each one is checked against the tool&apos;s own
            documentation. Tap <span className="text-text-primary">Source</span> on any card to see it there.
          </p>
        </div>

        <div role="tablist" aria-label="Choose a tool" className="mb-6 flex flex-wrap gap-2" onKeyDown={onTabKey}>
          {CHEAT_CODE_TOOLS.map((t) => {
            const on = t.id === active
            return (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[t.id] = el
                }}
                type="button"
                role="tab"
                id={`cheat-tab-${t.id}`}
                aria-selected={on}
                aria-controls="cheat-panel"
                tabIndex={on ? 0 : -1}
                onClick={() => select(t.id)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  on
                    ? 'border-[#C6F24E] bg-[#C6F24E] text-[#0A0C0D]'
                    : 'border-[#323A3C] bg-transparent text-text-secondary hover:border-[#C6F24E] hover:text-text-primary'
                }`}
              >
                {t.name}
              </button>
            )
          })}
        </div>

        <div id="cheat-panel" role="tabpanel" aria-labelledby={`cheat-tab-${tool.id}`}>
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
            <p className="m-0 text-[15px] text-text-secondary">{tool.tagline}</p>
            <a
              href={tool.docs}
              target="_blank"
              rel="noopener noreferrer"
              className="t-mono text-sm text-text-muted hover:text-[#C6F24E]"
            >
              Official docs ↗
            </a>
          </div>

          <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2 lg:grid-cols-3">
            {tool.codes.map((c) => (
              <li
                key={`${c.code}|${c.where || ''}`}
                className="flex min-w-0 flex-col gap-3 rounded-[14px] border border-[#262B2D] bg-[#101314] p-5"
              >
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <CodeChip entry={c} tool={tool.id} copied={copied} onCopy={onCopy} />
                  {c.where && (
                    <span className="t-mono whitespace-nowrap rounded border border-[#323A3C] px-2 py-[3px] text-[11px] text-text-muted">
                      {c.where}
                    </span>
                  )}
                </div>
                <p className="m-0 text-[15px] leading-normal text-text-primary">{c.does}</p>
                {c.note && <p className="m-0 text-[13px] leading-normal text-text-muted">{c.note}</p>}
                <a
                  href={c.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="t-mono mt-auto self-start text-xs text-text-muted hover:text-[#C6F24E]"
                >
                  Source ↗
                </a>
              </li>
            ))}
          </ul>

          <p className="t-mono m-0 mt-5 text-xs text-text-muted">
            Checked against official docs on {CHEAT_CODES_CHECKED}. These tools ship fast. If a code has changed, the
            Source link shows the current version.
          </p>
        </div>
      </div>
    </section>
  )
}
