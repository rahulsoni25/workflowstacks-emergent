'use client'

import { ArrowLeft, Play, Copy, Zap, Package, BookOpen, Upload, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function HelpPage() {
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

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl mb-4 shadow-lg shadow-emerald-500/20">
            <Play className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">How to Use ShowClawMart</h1>
          <p className="text-xl text-slate-300">Complete guide for non-technical users — No coding required!</p>
        </motion.div>

        {/* Quick Start */}
        <Card className="bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border-teal-500/30 backdrop-blur-xl mb-8">
          <CardHeader>
            <CardTitle className="text-white text-2xl">⚡ Quick Start (2 Minutes)</CardTitle>
            <CardDescription className="text-slate-300 text-lg">The fastest way to get your AI agent working</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {['Click "Playbooks" in the menu', 'Click "Create This Agent"', 'Copy the generated text', 'Paste into ChatGPT or Claude'].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">{i + 1}</div>
                <div>
                  <h3 className="text-white font-semibold mb-1">{step}</h3>
                  <p className="text-slate-300 text-sm">{['Pick a ready-made solution like "Validate a New Offer in 48 Hours"', 'We\'ll automatically combine the best skills for you', 'Click the "Copy" button — we\'ve created your agent prompt!', 'Open ChatGPT, Claude, or Gemini and paste it in. Done!'][i]}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Separator className="bg-slate-700/50 my-12" />

        {/* Methods */}
        {[
          { icon: BookOpen, title: 'Method 1: Use Playbooks (Easiest)', desc: 'Pre-built solutions for common problems', color: 'amber', href: '/playbooks', cta: 'Try Playbooks Now',
            steps: ['Go to Playbooks page', 'Pick a playbook that matches your problem', 'Click "View Playbook"', 'Click "Create This Agent"', 'Copy the blueprint text', 'Use it in ChatGPT/Claude/Gemini'] },
          { icon: Package, title: 'Method 2: Use Starter Packs', desc: 'Curated bundles for specific roles', color: 'teal', href: '/packs', cta: 'Browse Starter Packs',
            steps: ['Go to Starter Packs', 'Choose your role', 'Click "Open in Agent Builder"', 'Describe what you want', 'Generate and copy'] },
          { icon: Zap, title: 'Method 3: Build Custom Agent', desc: 'For when you want specific skills combined your way', color: 'cyan', href: '/builder', cta: 'Build Custom Agent',
            steps: ['Click "Build Agent" in menu', 'Describe your goal', 'Select skills that sound useful', 'Click "Generate Agent Blueprint"', 'Copy and use!'] },
        ].map((method, i) => (
          <Card key={i} className="bg-slate-900/60 border-slate-700/50 backdrop-blur-xl mb-8">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <method.icon className={`w-6 h-6 text-${method.color}-400`} />
                <CardTitle className="text-white text-2xl">{method.title}</CardTitle>
              </div>
              <CardDescription className="text-slate-400">{method.desc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {method.steps.map((step, j) => (
                  <div key={j} className="flex gap-3">
                    <CheckCircle2 className={`w-5 h-5 text-${method.color}-400 flex-shrink-0 mt-0.5`} />
                    <p className="text-white font-medium">{j + 1}. {step}</p>
                  </div>
                ))}
              </div>
              <Link href={method.href}>
                <Button className={`bg-gradient-to-r from-${method.color}-500 to-teal-500 hover:from-${method.color}-600 hover:to-teal-600 text-white`}>
                  {method.cta}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}

        <Separator className="bg-slate-700/50 my-12" />

        {/* How to Use in AI Tools */}
        <Card className="bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border-teal-500/30 backdrop-blur-xl mb-8">
          <CardHeader>
            <CardTitle className="text-white text-2xl">💬 How to Use Your Agent</CardTitle>
            <CardDescription className="text-slate-300 text-lg">Once you've copied your agent blueprint:</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {[
              { name: 'ChatGPT', emoji: '🤖', url: 'https://chat.openai.com', steps: ['Go to chat.openai.com', 'Start a new chat', 'Paste your blueprint', 'Press Enter', 'Start chatting!'] },
              { name: 'Claude', emoji: '✨', url: 'https://claude.ai', steps: ['Go to claude.ai', 'Start a new conversation', 'Paste your blueprint', 'Claude will acknowledge', 'Start asking!'] },
              { name: 'Gemini', emoji: '💎', url: 'https://gemini.google.com', steps: ['Go to gemini.google.com', 'Open a new chat', 'Paste your blueprint', 'Gemini will process', 'You\'re ready!'] },
            ].map((tool, i) => (
              <div key={i} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <span className="text-2xl">{tool.emoji}</span> For {tool.name}
                </h3>
                <ol className="space-y-1 text-slate-300 list-decimal list-inside text-sm">
                  {tool.steps.map((s, j) => <li key={j}>{s}</li>)}
                </ol>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Pro Tips */}
        <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-xl">
          <CardHeader><CardTitle className="text-white text-2xl">💡 Pro Tips</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { emoji: '🎯', title: 'Start with Playbooks', desc: 'They\'re the easiest way to get started' },
                { emoji: '🔄', title: 'Try Different Combinations', desc: 'You can create as many agents as you want' },
                { emoji: '💾', title: 'Save Your Blueprints', desc: 'Copy them to a note file to reuse later' },
                { emoji: '🚀', title: 'No Coding Required!', desc: 'Everything is point-and-click' },
              ].map((tip, i) => (
                <div key={i} className="flex gap-3">
                  <div className="text-2xl">{tip.emoji}</div>
                  <div>
                    <h3 className="text-white font-semibold">{tip.title}</h3>
                    <p className="text-slate-400">{tip.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
