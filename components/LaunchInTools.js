'use client'

// One-click hand-off of a prompt (and optionally a repo) into agentic AI
// editors — Cursor, Antigravity, VS Code, Windsurf. Shared by the skill
// detail panel, the Agent Builder result, and shared agent pages so every
// surface that shows a prompt gets the same zero-copy-paste launch row.
//
// Behavior per click: copy the prompt to the clipboard first, then fire the
// tool's deep link — Cursor via its official prompt deeplink (opens its agent
// with the text prefilled); the VS Code-family editors via
// <scheme>://vscode.git/clone when a repo is known, else just opening the
// app. If the app isn't installed the user is one paste away, never stuck.

import { useState } from 'react'
import { MousePointerClick } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LaunchInTools({ getPrompt, repoUrl = '', label = 'Open in another AI editor', className = '', gridClass = 'grid-cols-2' }) {
  const [hint, setHint] = useState('')

  const tools = [
    {
      name: 'Cursor',
      link: (prompt) => `cursor://anysphere.cursor-deeplink/prompt?text=${encodeURIComponent(prompt)}`,
    },
    {
      name: 'Antigravity',
      link: () => (repoUrl ? `antigravity://vscode.git/clone?url=${encodeURIComponent(repoUrl)}` : 'antigravity://'),
    },
    {
      name: 'VS Code',
      link: () => (repoUrl ? `vscode://vscode.git/clone?url=${encodeURIComponent(repoUrl)}` : 'vscode://'),
    },
    {
      name: 'Windsurf',
      link: () => (repoUrl ? `windsurf://vscode.git/clone?url=${encodeURIComponent(repoUrl)}` : 'windsurf://'),
    },
  ]

  const launch = async (tool) => {
    let prompt = ''
    try {
      prompt = (await getPrompt()) || ''
      if (prompt) await navigator.clipboard.writeText(prompt).catch(() => {})
    } catch {}
    setHint(tool.name)
    const href = tool.link(prompt)
    if (href) window.location.href = href
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 text-sm text-slate-300 font-medium mb-2">
        <MousePointerClick className="w-4 h-4 text-teal-400" />{label}
      </div>
      <div className={`grid ${gridClass} gap-2`}>
        {tools.map((tool) => (
          <Button key={tool.name} onClick={() => launch(tool)} variant="outline" className="border-slate-600 text-slate-200 hover:bg-white/5 hover:border-teal-500/40">
            {tool.name}
          </Button>
        ))}
      </div>
      <p className="text-xs text-slate-500 mt-2">
        {hint
          ? `The prompt is copied to your clipboard — if ${hint} didn't open, paste it into its agent chat.`
          : `Opens the editor${repoUrl ? ' with this repo' : ''} and copies the prompt for its agent — no copy-paste needed.`}
      </p>
    </div>
  )
}
