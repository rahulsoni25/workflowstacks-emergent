'use client'

// "Use with Claude" panel — the no-Agent-Builder install paths for one skill.
// Every action is self-serve: download the compiled skill package, open Claude
// with a preloaded starter prompt, or copy a one-liner for Claude Code / MCP.
// Command strings are built here (not imported from lib/claude-skill) so the
// mongo-backed compiler stays out of the browser bundle.

import { useEffect, useState } from 'react'
import { Download, Copy, CheckCircle2, Terminal, Sparkles, ChevronDown, Plug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import LaunchInTools from '@/components/LaunchInTools'
import { installReadiness } from '@/lib/install-readiness'
import { trackInstall } from '@/lib/track-install'

export default function AddToClaude({ skill, codeflow = null }) {
  const slug = skill.slug || skill.id
  const readiness = installReadiness(skill, codeflow)
  const apiPath = `/api/skills/${slug}/claude-skill`
  const [copied, setCopied] = useState('') // which action is showing "copied"
  const [showSteps, setShowSteps] = useState(false)
  const [openingClaude, setOpeningClaude] = useState(false)
  const [triedClaude, setTriedClaude] = useState(false)
  // SSR renders the canonical host; swap to the real origin after mount so the
  // server and first client render match (avoids a hydration mismatch on
  // localhost/preview hosts — in production they're the same string).
  const [base, setBase] = useState('https://workflowstacks.com')
  useEffect(() => { setBase(window.location.origin) }, [])
  const [setupText, setSetupText] = useState('')
  const [saved, setSaved] = useState(false)

  const saveToLibrary = async () => {
    setSaved(true)
    fetch('/api/library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skillId: slug }),
    }).catch(() => {})
  }

  const codeCmd = `mkdir -p ~/.claude/skills/${slug} && curl -fsSL ${base}${apiPath} -o ~/.claude/skills/${slug}/SKILL.md`
  const mcpCmd = `claude mcp add --transport http workflowstacks ${base}/api/mcp`

  const copy = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(''), 2000)
    } catch {}
  }

  const fetchPrompt = async () => {
    const res = await fetch(`${apiPath}?format=prompt`)
    if (!res.ok) throw new Error('prompt unavailable')
    return res.text()
  }

  // Deep link into the Claude app with the starter prompt prefilled; if the
  // app isn't installed nothing happens, so surface the copy-paste fallback.
  const openInClaude = async () => {
    trackInstall(slug, 'try-claude')
    setOpeningClaude(true)
    try {
      const prompt = await fetchPrompt()
      window.location.href = `claude://claude.ai/new?q=${encodeURIComponent(prompt)}`
      setTriedClaude(true)
    } catch {
      setTriedClaude(true)
    } finally {
      setOpeningClaude(false)
    }
  }

  const copyPrompt = async () => {
    trackInstall(slug, 'copy-prompt')
    try {
      const prompt = await fetchPrompt()
      await copy('prompt', prompt)
    } catch {}
  }

  // "Clone the repo and build it" prompt for agentic editors, fetched once.
  const fetchSetup = async () => {
    if (setupText) return setupText
    const res = await fetch(`${apiPath}?format=setup`)
    if (!res.ok) throw new Error('setup prompt unavailable')
    const text = await res.text()
    setSetupText(text)
    return text
  }

  const cursorMcpLink = `cursor://anysphere.cursor-deeplink/mcp/install?name=workflowstacks&config=${encodeURIComponent(
    typeof btoa === 'function' ? btoa(JSON.stringify({ url: `${base}/api/mcp` })) : ''
  )}`

  return (
    <Card className="bg-slate-900/60 border-teal-500/30 backdrop-blur-xl shadow-lg shadow-teal-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-400" />Use with Claude
          </CardTitle>
          <Badge className="bg-teal-500/15 text-teal-300 border-teal-500/30 border text-xs">New</Badge>
        </div>
        <p className="text-slate-400 text-sm mt-1">Skip the builder — one click puts this in Claude, Cursor, Antigravity and more.</p>
        {/* Readiness: set expectations BEFORE the click — what stands between
            "installed" and "working product" for this particular repo. */}
        <div className="mt-2">
          <div className="flex flex-wrap gap-1.5">
            <span className={`inline-flex items-center gap-1 text-xs font-medium border rounded-full px-2.5 py-1 ${readiness.tone}`}>{readiness.label}</span>
            {readiness.verified && (
              <span className="inline-flex items-center gap-1 text-xs font-medium border rounded-full px-2.5 py-1 bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                ✓ Install verified{readiness.verified.at ? ` ${new Date(readiness.verified.at).toLocaleDateString('en-US')}` : ''}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">{readiness.detail}</p>
          <button
            onClick={saveToLibrary}
            disabled={saved}
            className={`mt-2 text-xs transition-colors ${saved ? 'text-teal-300 cursor-default' : 'text-slate-400 hover:text-teal-300'}`}
          >
            {saved ? '✓ Saved to My Library — Claude can recall it via the connector' : '＋ Save to My Library'}
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 1 — Permanent install in the Claude apps */}
        <div>
          <a href={`${apiPath}?format=zip`} download className="block" onClick={() => trackInstall(slug, 'zip')}>
            <Button className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/20" size="lg">
              <Download className="w-4 h-4 mr-2" />Add to Claude — download skill
            </Button>
          </a>
          <button
            onClick={() => setShowSteps((s) => !s)}
            className="mt-2 flex items-center gap-1 text-xs text-slate-400 hover:text-teal-300 transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSteps ? 'rotate-180' : ''}`} />
            How to finish the install (2 steps)
          </button>
          {showSteps && (
            <ol className="mt-2 space-y-1.5 text-sm text-slate-300 bg-slate-950/50 border border-slate-800 rounded-lg p-3">
              <li className="flex gap-2"><span className="text-teal-400 font-semibold">1.</span><span>In the Claude app or claude.ai, open <span className="text-slate-100">Settings → Capabilities → Skills</span>.</span></li>
              <li className="flex gap-2"><span className="text-teal-400 font-semibold">2.</span><span>Click <span className="text-slate-100">Upload skill</span> and pick the .zip you just downloaded. Done — Claude uses it automatically when relevant.</span></li>
              <li className="text-xs text-slate-500 pt-1">Skills require a paid Claude plan (Pro/Max/Team).</li>
            </ol>
          )}
        </div>

        {/* 2 — Zero-install: open Claude with the skill preloaded */}
        <div className="border-t border-slate-700/50 pt-4">
          <div className="text-sm text-slate-300 font-medium mb-2">Try it instantly — no install</div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={openInClaude} disabled={openingClaude} variant="outline" className="border-teal-500/30 text-teal-300 hover:bg-teal-500/10">
              <Sparkles className="w-4 h-4 mr-1.5" />{openingClaude ? 'Opening…' : 'Open in Claude'}
            </Button>
            <Button onClick={copyPrompt} variant="outline" className="border-slate-600 text-slate-200 hover:bg-white/5">
              {copied === 'prompt' ? <><CheckCircle2 className="w-4 h-4 mr-1.5" />Copied</> : <><Copy className="w-4 h-4 mr-1.5" />Copy prompt</>}
            </Button>
          </div>
          {triedClaude && (
            <p className="text-xs text-slate-500 mt-2">App didn't open? Use “Copy prompt” and paste it into a new chat at claude.ai.</p>
          )}
        </div>

        {/* 3 — Claude Code one-liner */}
        <div className="border-t border-slate-700/50 pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-sm text-slate-300 font-medium"><Terminal className="w-4 h-4 text-teal-400" />Claude Code</div>
            <Button onClick={() => { trackInstall(slug, 'claude-code'); copy('code', codeCmd) }} variant="ghost" size="sm" className="h-7 px-2 text-slate-400 hover:text-teal-300">
              {copied === 'code' ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Copied</> : <><Copy className="w-3.5 h-3.5 mr-1" />Copy</>}
            </Button>
          </div>
          <div className="bg-slate-950/60 rounded-lg p-2.5 border border-slate-800 overflow-x-auto">
            <code className="text-teal-300 font-mono text-xs whitespace-nowrap">{codeCmd}</code>
          </div>
        </div>

        {/* 4 — Agentic editors: one click clones the repo / hands the agent the build prompt */}
        <LaunchInTools getPrompt={fetchSetup} repoUrl={skill.github_url || ''} className="border-t border-slate-700/50 pt-4" trackId={slug} />

        {/* 5 — MCP connector for power users */}
        <div className="border-t border-slate-700/50 pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-sm text-slate-300 font-medium"><Plug className="w-4 h-4 text-teal-400" />Connect the whole catalog (MCP)</div>
            <Button onClick={() => { trackInstall(slug, 'mcp-copy'); copy('mcp', mcpCmd) }} variant="ghost" size="sm" className="h-7 px-2 text-slate-400 hover:text-teal-300">
              {copied === 'mcp' ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Copied</> : <><Copy className="w-3.5 h-3.5 mr-1" />Copy</>}
            </Button>
          </div>
          <div className="bg-slate-950/60 rounded-lg p-2.5 border border-slate-800 overflow-x-auto">
            <code className="text-teal-300 font-mono text-xs whitespace-nowrap">{mcpCmd}</code>
          </div>
          <div className="flex items-center justify-between mt-1.5 gap-2">
            <p className="text-xs text-slate-500">Adds a WorkflowStacks connector to Claude Code: search and load any skill here by chatting.</p>
            <a href={cursorMcpLink} className="flex-shrink-0" onClick={() => trackInstall(slug, 'cursor-mcp')}>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-slate-400 hover:text-teal-300 border border-slate-700">
                Add to Cursor
              </Button>
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
