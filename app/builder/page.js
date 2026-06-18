'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Zap, CheckCircle2, Copy, Sparkles, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { getUserId, getHandle, setHandle as saveHandle } from '@/lib/identity'

export default function BuilderPage() {
  const [step, setStep] = useState(1)
  const [goal, setGoal] = useState('')
  const [skills, setSkills] = useState([])
  const [selectedSkillIds, setSelectedSkillIds] = useState([])
  const [loading, setLoading] = useState(false)
  const [agentBlueprint, setAgentBlueprint] = useState(null)
  const [copied, setCopied] = useState(false)
  const [publish, setPublish] = useState(false)
  const [handle, setHandle] = useState('')
  const [price, setPrice] = useState('')
  const [dfyEmail, setDfyEmail] = useState('')
  const [dfyName, setDfyName] = useState('')
  const [dfyTime, setDfyTime] = useState('')
  const [dfyTier, setDfyTier] = useState('starter')
  const [dfyRequested, setDfyRequested] = useState(false)

  const requestDfy = async (e) => {
    e.preventDefault()
    if (!dfyEmail.trim()) return
    try {
      await fetch('/api/dfy-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: dfyEmail.trim(),
          name: dfyName.trim(),
          agent_goal: goal,
          skill_ids: selectedSkillIds,
          preferred_contact_time: dfyTime.trim(),
          tier: dfyTier,
        }),
      })
      setDfyRequested(true)
    } catch {
      setDfyRequested(true)
    }
  }

  const DFY_TIERS = [
    { id: 'starter', label: 'Starter', price: 99, desc: 'We configure + test this one agent for you' },
    { id: 'pro', label: 'Pro', price: 249, desc: 'Starter + custom skill picks + 1 week support' },
    { id: 'agency', label: 'Agency', price: 499, desc: 'Pro + 3 agents + white-label setup' },
  ]

  useEffect(() => {
    try { setHandle(getHandle()) } catch (e) {}
    loadSkills()
  }, [])

  const loadSkills = async () => {
    try {
      const res = await fetch('/api/skills?limit=60')
      const data = await res.json()
      let list = data.skills || []

      // Carry intent from a skill detail (?skill=id) OR a bundle
      // (?skillIds=a,b,c&goal=...) — packs, playbooks, and personas.
      const sp = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams()
      const multi = sp.get('skillIds')
      const single = sp.get('skill')
      const goalParam = sp.get('goal')
      const preselect = multi
        ? multi.split(',').map((s) => s.trim()).filter(Boolean)
        : single
          ? [single]
          : []

      // Make sure every pre-selected skill is in the list (fetch any missing)
      for (const id of preselect) {
        if (!list.find((s) => s.id === id)) {
          try {
            const r = await fetch(`/api/skills/${id}`)
            const d = await r.json()
            if (d.skill) list = [d.skill, ...list]
          } catch (e) { /* ignore */ }
        }
      }

      if (goalParam) setGoal(goalParam)
      if (preselect.length) {
        setSelectedSkillIds(preselect)
        setStep(2) // jump straight to skill selection with the bundle loaded
      }
      setSkills(list)
    } catch (e) {
      console.error('Error loading skills:', e)
    }
  }

  const toggleSkill = (skillId) => {
    setSelectedSkillIds(prev => {
      if (prev.includes(skillId)) {
        return prev.filter(id => id !== skillId)
      } else {
        return [...prev, skillId]
      }
    })
  }

  const handleGenerateAgent = async () => {
    if (!goal.trim()) { alert('Please enter your agent goal'); return }
    if (selectedSkillIds.length === 0) { alert('Please select at least one skill'); return }
    // Paid agents must be complete, tuned systems — not a single free tool with a price slapped on.
    if (publish && parseFloat(price) > 0 && selectedSkillIds.length < 3) {
      alert('Paid agents must be a complete system — combine at least 3 skills (buyers can get any single tool free on GitHub). Add more skills, or set the price to $0.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/agent-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: goal.trim(),
          selectedSkillIds,
          userId: getUserId(),
          isPublic: publish,
          creatorName: publish ? (saveHandle(handle) || 'anonymous') : undefined,
          price: publish ? (parseFloat(price) || 0) : 0,
        })
      })
      const data = await res.json()
      if (data.success) {
        setAgentBlueprint(data.template)
        setStep(3)
      } else {
        alert('Error generating agent: ' + (data.error || 'Unknown error'))
      }
    } catch (e) {
      console.error('Error:', e)
      alert('Error generating agent')
    }
    setLoading(false)
  }

  const handleCopy = async () => {
    if (agentBlueprint?.agentBlueprint) {
      await navigator.clipboard.writeText(agentBlueprint.agentBlueprint)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Launch the finished blueprint straight into an AI chat with the prompt prefilled.
  // Always copy to clipboard first so that if the prompt is too long for a URL
  // (browsers cap query strings), the user can paste it with one keystroke.
  const launchIn = async (tool) => {
    const text = agentBlueprint?.agentBlueprint
    if (!text) return
    try { await navigator.clipboard.writeText(text) } catch {}
    const q = encodeURIComponent(text)
    const fits = q.length <= 6000
    const urls = {
      claude: fits ? `https://claude.ai/new?q=${q}` : 'https://claude.ai/new',
      chatgpt: fits ? `https://chatgpt.com/?q=${q}` : 'https://chatgpt.com/',
      gemini: 'https://gemini.google.com/app',
    }
    if (!fits) { setCopied(true); setTimeout(() => setCopied(false), 2500) }
    window.open(urls[tool] || urls.claude, '_blank', 'noopener,noreferrer')
  }

  const getCategoryColor = (cat) => {
    const colors = {
      'claude-skill': 'bg-violet-500/10 text-violet-400',
      'gemini-extension': 'bg-blue-500/10 text-blue-400',
      'mcp-server': 'bg-emerald-500/10 text-emerald-400',
      'prompt': 'bg-amber-500/10 text-amber-400',
      'ai-agent': 'bg-cyan-500/10 text-cyan-400',
      'ai-tool': 'bg-indigo-500/10 text-indigo-400'
    }
    return colors[cat] || 'bg-slate-500/10 text-slate-400'
  }

  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl mb-4 shadow-lg shadow-cyan-500/20">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Build My Agent</h1>
          <p className="text-xl text-slate-300">Combine multiple skills into one powerful AI agent prompt</p>
        </motion.div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {[{ n: 1, label: 'Define Goal' }, { n: 2, label: 'Select Skills' }, { n: 3, label: 'Get Blueprint' }].map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              {i > 0 && <div className="w-12 h-0.5 bg-slate-700"></div>}
              <div className={`flex items-center gap-2 ${step >= s.n ? 'text-teal-400' : 'text-slate-500'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= s.n ? 'bg-teal-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                  {s.n}
                </div>
                <span className="hidden sm:inline text-sm">{s.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">What do you want your agent to do?</CardTitle>
                <CardDescription className="text-slate-400">
                  Describe your agent's purpose in natural language
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-4">
                  <h3 className="text-teal-300 font-semibold mb-2">💡 Examples:</h3>
                  <ul className="text-slate-300 text-sm space-y-1 list-disc list-inside">
                    <li>"Help me write professional emails to clients"</li>
                    <li>"Analyze customer feedback and create monthly reports"</li>
                    <li>"Generate social media content for my business"</li>
                    <li>"Review my code for bugs and suggest improvements"</li>
                  </ul>
                </div>
                <Textarea
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Example: Help me analyze customer feedback, generate reports, and suggest improvements..."
                  className="min-h-[150px] bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-500 focus:border-teal-500/50"
                />
                <Button
                  onClick={() => setStep(2)}
                  disabled={!goal.trim()}
                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/20"
                  size="lg"
                >
                  Next: Select Skills
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">Select Skills for Your Agent</CardTitle>
                <CardDescription className="text-slate-400">
                  Choose the capabilities your agent needs ({selectedSkillIds.length} selected)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-h-[500px] overflow-y-auto space-y-3 pr-2">
                  {skills.map((skill) => (
                    <div
                      key={skill.id}
                      onClick={() => toggleSkill(skill.id)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedSkillIds.includes(skill.id)
                          ? 'bg-teal-500/10 border-teal-500/50'
                          : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox checked={selectedSkillIds.includes(skill.id)} className="mt-1" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-white font-semibold text-sm">{skill.title_human || skill.name}</h3>
                            <Badge className={getCategoryColor(skill.category)}>{skill.category}</Badge>
                          </div>
                          <p className="text-slate-400 text-sm line-clamp-2">{skill.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Publish to community — the viral loop */}
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 mb-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} className="w-4 h-4 accent-teal-500" />
                    <span className="text-white text-sm font-medium">🌍 Publish to the community</span>
                    <span className="text-slate-500 text-xs">— get a shareable page others can remix</span>
                  </label>
                  {publish && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-sm">@</span>
                        <input
                          value={handle}
                          onChange={(e) => setHandle(e.target.value.replace(/^@/, '').slice(0, 30))}
                          placeholder="your-handle"
                          className="flex-1 bg-slate-900/60 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-white focus:border-teal-500/50 outline-none"
                        />
                        <span className="text-slate-500 text-xs">creator</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-sm">$</span>
                        <input
                          value={price}
                          onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                          placeholder="0"
                          inputMode="decimal"
                          className="w-24 bg-slate-900/60 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-white focus:border-teal-500/50 outline-none"
                        />
                        <span className="text-slate-500 text-xs">{price && parseFloat(price) > 0 ? `you keep 85% ($${(parseFloat(price) * 0.85).toFixed(2)}) · 3+ skills required` : 'free — or charge for a complete, tuned system'}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button onClick={() => setStep(1)} variant="outline" className="flex-1 border-slate-600 text-slate-200 hover:bg-white/5">
                    Back
                  </Button>
                  <Button
                    onClick={handleGenerateAgent}
                    disabled={selectedSkillIds.length === 0 || loading}
                    className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/20"
                    size="lg"
                  >
                    {loading ? 'Generating...' : publish ? 'Generate & Publish' : 'Generate Agent Blueprint'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 3 */}
        {step === 3 && agentBlueprint && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-xl">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  <CardTitle className="text-white">Your Agent Blueprint is Ready!</CardTitle>
                </div>
                <CardDescription className="text-slate-400">
                  Copy and paste this into Claude, ChatGPT, Gemini, or your favorite AI tool
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                  <Label className="text-white font-semibold">Agent Goal</Label>
                  <p className="text-slate-300 mt-1">{agentBlueprint.goal}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                  <Label className="text-white font-semibold">Skills Used ({agentBlueprint.skillIds.length})</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {agentBlueprint.skills?.map((skill) => (
                      <Badge key={skill.id} className={getCategoryColor(skill.category)}>{skill.name}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-white font-semibold">Complete Agent Prompt</Label>
                    <Button onClick={handleCopy} variant="outline" size="sm" className="border-slate-600 text-slate-200 hover:bg-teal-500/10">
                      {copied ? <><CheckCircle2 className="w-4 h-4 mr-2" />Copied!</> : <><Copy className="w-4 h-4 mr-2" />Copy</>}
                    </Button>
                  </div>
                  <div className="bg-slate-950 rounded-lg p-4 border border-slate-700/50 max-h-[400px] overflow-y-auto">
                    <pre className="text-slate-300 whitespace-pre-wrap font-mono text-sm">{agentBlueprint.agentBlueprint}</pre>
                  </div>
                </div>

                {/* One-click launch — opens the chat with the prompt prefilled (clipboard fallback) */}
                <div>
                  <Label className="text-white font-semibold">Run it now — one click</Label>
                  <div className="flex flex-col sm:flex-row gap-2 mt-2">
                    <Button onClick={() => launchIn('claude')} className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/20">
                      <Sparkles className="w-4 h-4 mr-2" />Open in Claude<ExternalLink className="w-3.5 h-3.5 ml-2 opacity-80" />
                    </Button>
                    <Button onClick={() => launchIn('chatgpt')} variant="outline" className="flex-1 border-slate-600 text-slate-200 hover:bg-white/5">
                      Open in ChatGPT<ExternalLink className="w-3.5 h-3.5 ml-2 opacity-70" />
                    </Button>
                    <Button onClick={() => launchIn('gemini')} variant="outline" className="flex-1 border-slate-600 text-slate-200 hover:bg-white/5">
                      Open in Gemini<ExternalLink className="w-3.5 h-3.5 ml-2 opacity-70" />
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Opens a new chat with your prompt prefilled. We also copy it to your clipboard, so for longer agents just paste (Ctrl/⌘+V).</p>
                </div>

                {/* Done-for-You — captures interest until Stripe is set up */}
                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-semibold mb-1">Want us to set this up for you?</h4>
                      <p className="text-slate-400 text-sm mb-3">We'll configure and test this exact agent for your specific workflow — you get a ready-to-use, fully customised setup. Pick a tier below; <strong className="text-amber-300">one-time payment</strong>, no subscription.</p>
                      {dfyRequested ? (
                        <div className="flex items-center gap-2 text-emerald-300 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                          <CheckCircle2 className="w-4 h-4" />
                          Application received. We'll email you within 24 hours to confirm scope and send a Stripe link.
                        </div>
                      ) : (
                        <form onSubmit={requestDfy} className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {DFY_TIERS.map((t) => {
                              const active = dfyTier === t.id
                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => setDfyTier(t.id)}
                                  className={`text-left rounded-lg border p-3 transition-all ${
                                    active
                                      ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/40'
                                      : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-500'
                                  }`}
                                >
                                  <div className="flex items-baseline justify-between mb-1">
                                    <span className="text-white font-semibold text-sm">{t.label}</span>
                                    <span className="text-amber-300 font-bold text-sm">${t.price}</span>
                                  </div>
                                  <p className="text-xs text-slate-400 leading-snug">{t.desc}</p>
                                </button>
                              )
                            })}
                          </div>
                          <input
                            type="text"
                            value={dfyName}
                            onChange={(e) => setDfyName(e.target.value)}
                            placeholder="your name"
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-md px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
                          />
                          <input
                            type="email"
                            value={dfyEmail}
                            onChange={(e) => setDfyEmail(e.target.value)}
                            required
                            placeholder="your email"
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-md px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
                          />
                          <input
                            type="text"
                            value={dfyTime}
                            onChange={(e) => setDfyTime(e.target.value)}
                            placeholder="preferred contact time (e.g. weekdays 9–11am PT)"
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-md px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
                          />
                          <Button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/20" size="sm">
                            Request Done-for-You — ${DFY_TIERS.find((t) => t.id === dfyTier)?.price}
                          </Button>
                        </form>
                      )}
                      <p className="text-xs text-slate-500 mt-2">No payment yet — we confirm scope first, then send a one-time Stripe checkout link.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-teal-400 mt-0.5" />
                    <div>
                      <h4 className="text-teal-300 font-semibold mb-1">How to Use</h4>
                      <p className="text-slate-300 text-sm">
                        1. Click <strong className="text-white">Open in Claude</strong> above (or Copy the prompt)<br />
                        2. Your prompt is prefilled in a new chat — or paste it if it didn't fit<br />
                        3. Start chatting with your custom AI agent!
                      </p>
                    </div>
                  </div>
                </div>
                {agentBlueprint?.isPublic ? (
                  <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-teal-300 font-semibold mb-2">🎉 Live in the community!</div>
                    <p className="text-slate-300 text-sm mb-3">Anyone can now view and remix your agent. Share the link:</p>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/a/${agentBlueprint.id}`}>
                        <Button className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white" size="sm">View public page →</Button>
                      </Link>
                      <Button
                        onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/a/${agentBlueprint.id}`); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                        variant="outline" size="sm" className="border-teal-500/30 text-teal-300 hover:bg-teal-500/10"
                      >
                        {copied ? 'Link copied!' : 'Copy share link'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-teal-400" />
                    Saved to <Link href="/my-agents" className="text-teal-300 underline hover:text-teal-200">My Agents</Link> — come back anytime, no login needed.
                  </div>
                )}
                <div className="flex gap-3">
                  <Button
                    onClick={() => { setStep(1); setGoal(''); setSelectedSkillIds([]); setAgentBlueprint(null) }}
                    variant="outline"
                    className="flex-1 border-slate-600 text-slate-200 hover:bg-white/5"
                  >
                    Build Another Agent
                  </Button>
                  <Link href="/my-agents" className="flex-1">
                    <Button className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white">
                      View My Agents
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}
