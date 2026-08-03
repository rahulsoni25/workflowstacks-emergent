'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Sparkles, Check, Users, DollarSign, Clock, Github, FileText, Tag, Upload, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Revenue split is confirmed at 85% (lib/stripe.js PLATFORM_FEE_PCT = 0.15)
// and already shown on /earnings, /builder, and skill detail pages — safe
// to state here too.
const STATS = [
  { icon: Sparkles, value: '1,500+', label: 'skills indexed' },
  { icon: DollarSign, value: '85%', label: 'you keep, per sale' },
  { icon: Clock, value: 'Days', label: 'typical review time' },
]

const WHILE_YOU_WAIT = [
  { icon: Github, title: 'Make your repo public', body: 'Your GitHub repo needs to be public so our syncer can index it.' },
  { icon: Tag, title: 'Add the right topics', body: 'Tag it "claude-skill", "mcp-server", or "ai-agent" so it’s discoverable.' },
  { icon: FileText, title: 'Write a clear README', body: 'A short description plus usage instructions — this becomes your listing.' },
  { icon: Upload, title: 'Or upload manually now', body: 'You don’t have to wait for approval to list something.' },
]

const STEPS = [
  { n: '1', title: 'Submit your tool', body: 'Fill in the form — takes under 5 minutes. Include a GitHub link if it\'s open-source.' },
  { n: '2', title: 'We review + publish', body: 'Our team checks quality and fit. You\'ll hear back by email within a few days.' },
  { n: '3', title: 'Buyers find you, you earn', body: 'Your tool goes live to our launch audience and client network. Creators earn a revenue share on every sale — full terms shared during onboarding.' },
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
      if (res.ok && d.ok) {
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
        <div className="container mx-auto px-4 py-16 max-w-2xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full mb-5">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">You're in — here's what happens next</h1>
            <p className="text-slate-400 max-w-lg mx-auto">
              We'll review your application and reply at{' '}
              <span className="text-teal-400 font-medium">{form.email}</span> within a few days.
              Here's everything about the creator program while you wait.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-8">
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

          <Card className="bg-slate-900/60 border-slate-700/50 mb-8">
            <CardContent className="py-6">
              <h2 className="text-white font-semibold text-lg mb-5">While you wait, get ready</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {WHILE_YOU_WAIT.map(({ icon: Icon, title, body }) => (
                  <div key={title} className="flex gap-3 items-start">
                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-teal-500/15 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-teal-400" />
                    </div>
                    <div>
                      <div className="text-white font-medium text-sm">{title}</div>
                      <div className="text-slate-400 text-xs mt-0.5">{body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border-teal-500/30 mb-8">
            <CardContent className="py-6">
              <h2 className="text-white font-semibold text-lg mb-3">How earning works</h2>
              <ul className="space-y-2.5 text-slate-300 text-sm">
                <li className="flex gap-2"><Check className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />You set the price on premium skills — free listings are fine too.</li>
                <li className="flex gap-2"><Check className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />You keep 85% of every sale; WorkflowStacks takes a 15% platform fee.</li>
                <li className="flex gap-2"><Check className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />Once approved, connect Stripe payouts on the <Link href="/earnings" className="text-teal-400 hover:underline">earnings page</Link> to get paid automatically.</li>
                <li className="flex gap-2"><Check className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />Approved creators also get an API key for programmatic submissions.</li>
              </ul>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/upload">
              <Button className="w-full sm:w-auto bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold">
                Upload a skill now
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full sm:w-auto border-slate-700 text-slate-300 hover:bg-white/5">
                Back to WorkflowStacks
              </Button>
            </Link>
          </div>
          <p className="text-center text-xs text-slate-500 mt-6 flex items-center justify-center gap-1.5">
            <Mail className="w-3.5 h-3.5" />Questions in the meantime? Reach us at rahul@workflowstacks.com
          </p>
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
            Earn from every sale
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed max-w-lg mx-auto">
            WorkflowStacks surfaces your tool to our launch audience and client network. You submit, we curate, you earn.
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
                We review every application. You'll hear back within a few days.
              </p>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
