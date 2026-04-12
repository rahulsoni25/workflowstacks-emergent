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
    if (!goal.trim()) {
      alert('Please enter your agent goal')
      return
    }
    if (selectedSkillIds.length === 0) {
      alert('Please select at least one skill')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/agent-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: goal.trim(),
          selectedSkillIds
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

  const getCategoryColor = (cat) => {
    const colors = {
      'claude-skill': 'bg-purple-500/10 text-purple-500',
      'gemini-extension': 'bg-blue-500/10 text-blue-500',
      'mcp-server': 'bg-green-500/10 text-green-500',
      'prompt': 'bg-orange-500/10 text-orange-500',
      'ai-agent': 'bg-cyan-500/10 text-cyan-500',
      'ai-tool': 'bg-indigo-500/10 text-indigo-500'
    }
    return colors[cat] || 'bg-gray-500/10 text-gray-500'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/">
            <Button variant="ghost" className="text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-2xl mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Build My Agent</h1>
          <p className="text-xl text-gray-300">
            Combine multiple skills into one powerful AI agent prompt
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-purple-400' : 'text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-purple-500' : 'bg-gray-700'}`}>
              1
            </div>
            <span className="hidden sm:inline">Define Goal</span>
          </div>
          <div className="w-12 h-0.5 bg-gray-700"></div>
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-purple-400' : 'text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-purple-500' : 'bg-gray-700'}`}>
              2
            </div>
            <span className="hidden sm:inline">Select Skills</span>
          </div>
          <div className="w-12 h-0.5 bg-gray-700"></div>
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-purple-400' : 'text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-purple-500' : 'bg-gray-700'}`}>
              3
            </div>
            <span className="hidden sm:inline">Get Blueprint</span>
          </div>
        </div>

        {/* Step 1: Define Goal */}
        {step === 1 && (
          <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-white">What do you want your agent to do?</CardTitle>
              <CardDescription className="text-gray-400">
                Describe your agent's purpose in natural language - just write like you're talking to a friend!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h3 className="text-blue-400 font-semibold mb-2">💡 Examples of Good Goals:</h3>
                <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside">
                  <li>"Help me write professional emails to clients"</li>
                  <li>"Analyze customer feedback and create monthly reports"</li>
                  <li>"Generate social media content for my business"</li>
                  <li>"Review my code for bugs and suggest improvements"</li>
                </ul>
              </div>

              <Textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Example: Help me analyze customer feedback, generate reports, and suggest improvements based on sentiment analysis..."
                className="min-h-[150px] bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              />
              <p className="text-gray-500 text-sm">
                👉 Be specific! The clearer you are, the better your agent will work.
              </p>

              <Button
                onClick={() => setStep(2)}
                disabled={!goal.trim()}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                size="lg"
              >
                Next: Select Skills
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Select Skills */}
        {step === 2 && (
          <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-white">Select Skills for Your Agent</CardTitle>
              <CardDescription className="text-gray-400">
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
                        ? 'bg-purple-500/20 border-purple-500'
                        : 'bg-white/5 border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedSkillIds.includes(skill.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-white font-semibold">{skill.title_human || skill.name}</h3>
                          <Badge className={getCategoryColor(skill.category)}>
                            {skill.category}
                          </Badge>
                        </div>
                        <p className="text-gray-400 text-sm line-clamp-2">
                          {skill.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  Back
                </Button>
                <Button
                  onClick={handleGenerateAgent}
                  disabled={selectedSkillIds.length === 0 || loading}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  size="lg"
                >
                  {loading ? 'Generating...' : 'Generate Agent Blueprint'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Agent Blueprint */}
        {step === 3 && agentBlueprint && (
          <div className="space-y-6">
            <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  <CardTitle className="text-white">Your Agent Blueprint is Ready! 🎉</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Copy and paste this into Claude, ChatGPT, Gemini, or your favorite AI tool
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-white font-semibold">Agent Goal</Label>
                  </div>
                  <p className="text-gray-300">{agentBlueprint.goal}</p>
                </div>

                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-white font-semibold">
                      Skills Used ({agentBlueprint.skillIds.length})
                    </Label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {agentBlueprint.skills?.map((skill) => (
                      <Badge key={skill.id} className={getCategoryColor(skill.category)}>
                        {skill.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-white font-semibold">Complete Agent Prompt</Label>
                    <Button
                      onClick={handleCopy}
                      variant="outline"
                      size="sm"
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="bg-slate-950 rounded-lg p-4 border border-white/10 max-h-[400px] overflow-y-auto">
                    <pre className="text-gray-300 whitespace-pre-wrap font-mono text-sm">
                      {agentBlueprint.agentBlueprint}
                    </pre>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div>
                      <h4 className="text-blue-400 font-semibold mb-1">How to Use</h4>
                      <p className="text-gray-300 text-sm">
                        1. Copy the agent prompt above<br />
                        2. Paste it into Claude, ChatGPT, Gemini, or create a Custom GPT<br />
                        3. Use it as system instructions or a skill configuration<br />
                        4. Start chatting with your custom AI agent!
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setStep(1)
                      setGoal('')
                      setSelectedSkillIds([])
                      setAgentBlueprint(null)
                    }}
                    variant="outline"
                    className="flex-1 border-white/20 text-white hover:bg-white/10"
                  >
                    Build Another Agent
                  </Button>
                  <Link href="/" className="flex-1">
                    <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                      Browse More Skills
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
