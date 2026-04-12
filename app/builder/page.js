'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Zap, CheckCircle2, Copy, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function BuilderPage() {
  const [step, setStep] = useState(1)
  const [goal, setGoal] = useState('')
  const [skills, setSkills] = useState([])
  const [selectedSkillIds, setSelectedSkillIds] = useState([])
  const [loading, setLoading] = useState(false)
  const [agentBlueprint, setAgentBlueprint] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadSkills()
  }, [])

  const loadSkills = async () => {
    try {
      const res = await fetch('/api/skills?limit=30')
      const data = await res.json()
      setSkills(data.skills || [])
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
    setLoading(true)
    try {
      const res = await fetch('/api/agent-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goal.trim(), selectedSkillIds })
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
                    {loading ? 'Generating...' : 'Generate Agent Blueprint'}
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
                <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-teal-400 mt-0.5" />
                    <div>
                      <h4 className="text-teal-300 font-semibold mb-1">How to Use</h4>
                      <p className="text-slate-300 text-sm">
                        1. Copy the agent prompt above<br />
                        2. Paste it into Claude, ChatGPT, Gemini, or create a Custom GPT<br />
                        3. Start chatting with your custom AI agent!
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => { setStep(1); setGoal(''); setSelectedSkillIds([]); setAgentBlueprint(null) }}
                    variant="outline"
                    className="flex-1 border-slate-600 text-slate-200 hover:bg-white/5"
                  >
                    Build Another Agent
                  </Button>
                  <Link href="/" className="flex-1">
                    <Button className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white">
                      Browse More Skills
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
