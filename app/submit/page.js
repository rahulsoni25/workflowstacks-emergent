'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Sparkles, Check, Users, DollarSign, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const STATS = [
  { icon: Sparkles, value: '182', label: 'tools indexed' },
  { icon: DollarSign, value: '85%', label: 'revenue to creators' },
  { icon: Clock, value: '48h', label: 'review time' },
]

const STEPS = [
  { n: '1', title: 'Submit your tool', body: 'Fill in the form — takes under 5 minutes. Include a GitHub link if it\'s open-source.' },
  { n: '2', title: 'We review + publish', body: 'Our team checks quality and fit. You\'ll hear back by email within 48 hours.' },
  { n: '3', title: 'Founders buy, you earn', body: 'Your tool goes live to thousands of founders. You keep 85% of every sale, paid monthly.' },
]

export default function SubmitPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    github: '',
    twitter: '',
    what_you_want_to_list: '',
    bio: '',
  })
  const [status, setStatus] = useState('idle') // idle | submitting | done | error
  const [errMsg, setErrMsg] = useState('')

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setStatus('submitting')
    setErrMsg('')
    try {
      const res = await fetch('/api/creator-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await res.json()
      if (res.ok && d.success) {
        setStatus('done')
      } else {
        setErrMsg(d.error || 'Something went wrong — please try again.')
        setStatus('error')
      }
    } catch {
      setErrMsg('Network error — please check your connection and try again.')
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div className="min-h-screen bg-neptune">
        <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-4">
            <Link href="/">
              <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">
                <ArrowLeft className="w-4 h-4 mr-2" />WorkflowStacks
              </Button>
            </Link>
          </div>
        </header>
        <div className="container mx-auto px-4 py-20 max-w-lg text-center">
          <Card className="bg-slate-900/60 border-teal-500/30">
            <CardContent className="py-14">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full mb-5">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-3">Application received!</h1>
              <p className="text-slate-400 mb-6">
                We'll review within 48 hours and email you at{' '}
                <span className="text-teal-400 font-medium">{form.email}</span>.
              </p>
              <Link href="/">
                <Button className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white">
                  Back to WorkflowStacks
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neptune">
      {/* Header */}
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">
              <ArrowLeft className="w-4 h-4 mr-2" />WorkflowStacks
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-14 max-w-2xl">

        {/* Hero */}
        <div className="text-center mb-10">
          <Badge className="mb-4 bg-teal-500/15 text-teal-400 border-teal-500/30 hover:bg-teal-500/20">
            Creator program
          </Badge>
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl mb-5">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3 leading-tight">
            Earn 85% of every sale
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed max-w-lg mx-auto">
            WorkflowStacks surfaces your tool to thousands of founders. You submit, we curate, you earn. Review within 48 hours.
          </p>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3 mb-12">
          {STATS.map(({ icon: Icon, value, label }) => (
            <Card key={label} className="bg-slate-900/60 border-slate-700/50">
              <CardContent className="py-4 text-center">
                <Icon className="w-5 h-5 text-teal-400 mx-auto mb-1.5" />
                <div className="text-xl font-bold text-white">{value}</div>
                <div className="text-xs text-slate-400">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* How it works */}
        <div className="mb-12">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-5">How it works</h2>
          <div className="space-y-3">
            {STEPS.map((step) => (
              <div key={step.n} className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold mt-0.5">
                  {step.n}
                </div>
                <div>
                  <div className="text-white font-semibold">{step.title}</div>
                  <div className="text-slate-400 text-sm mt-0.5">{step.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Application form */}
        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="py-8">
            <h2 className="text-white font-semibold text-lg mb-6">Apply to list your tool</h2>
            <form onSubmit={submit} className="space-y-5">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-300 mb-1.5 block">Your name *</label>
                  <Input
                    value={form.name}
                    onChange={set('name')}
                    required
                    placeholder="Jane Doe"
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-300 mb-1.5 block">Your email *</label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    required
                    placeholder="jane@example.com"
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-300 mb-1.5 block">GitHub profile URL</label>
                  <Input
                    value={form.github}
                    onChange={set('github')}
                    placeholder="https://github.com/you"
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-300 mb-1.5 block">X / Twitter handle</label>
                  <Input
                    value={form.twitter}
                    onChange={set('twitter')}
                    placeholder="@yourhandle"
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-300 mb-1.5 block">
                  What tool or skill do you want to list? *
                </label>
                <p className="text-xs text-slate-500 mb-1.5">
                  Include the GitHub URL if it's open-source.
                </p>
                <Textarea
                  value={form.what_you_want_to_list}
                  onChange={set('what_you_want_to_list')}
                  required
                  rows={4}
                  placeholder="e.g. My MCP server for Shopify automation — https://github.com/..."
                  className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 resize-none"
                />
              </div>

              <div>
                <label className="text-sm text-slate-300 mb-1.5 block">Brief bio (optional)</label>
                <Textarea
                  value={form.bio}
                  onChange={set('bio')}
                  rows={3}
                  placeholder="Tell us what you build and who you build for"
                  className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 resize-none"
                />
              </div>

              {(status === 'error') && (
                <p className="text-red-400 text-sm">{errMsg}</p>
              )}

              <Button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold"
                size="lg"
              >
                {status === 'submitting' ? 'Submitting…' : 'Submit application →'}
              </Button>

              <p className="text-center text-xs text-slate-500">
                We review every application. You'll hear back within 48 hours.
              </p>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
