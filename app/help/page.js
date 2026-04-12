'use client'

import { ArrowLeft, Play, Copy, Zap, Package, BookOpen, Upload, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'

export default function HelpPage() {
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

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-cyan-500 rounded-2xl mb-4">
            <Play className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">How to Use ShowClawMart</h1>
          <p className="text-xl text-gray-300">
            Complete guide for non-technical users - No coding required! 🎉
          </p>
        </div>

        {/* Quick Start */}
        <Card className="bg-gradient-to-br from-green-500/20 to-cyan-500/20 border-green-500/30 backdrop-blur-xl mb-8">
          <CardHeader>
            <CardTitle className="text-white text-2xl">⚡ Quick Start (2 Minutes)</CardTitle>
            <CardDescription className="text-gray-300 text-lg">
              The fastest way to get your AI agent working
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">1</div>
              <div>
                <h3 className="text-white font-semibold mb-1">Click "Playbooks" in the menu</h3>
                <p className="text-gray-300">Pick a ready-made solution like "Validate a New Offer in 48 Hours"</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">2</div>
              <div>
                <h3 className="text-white font-semibold mb-1">Click "Create This Agent"</h3>
                <p className="text-gray-300">We'll automatically combine the best skills for you</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">3</div>
              <div>
                <h3 className="text-white font-semibold mb-1">Copy the generated text</h3>
                <p className="text-gray-300">Click the "Copy" button - we've created your agent prompt!</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">4</div>
              <div>
                <h3 className="text-white font-semibold mb-1">Paste into ChatGPT or Claude</h3>
                <p className="text-gray-300">Open ChatGPT, Claude, or Gemini and paste it in. Done! 🎉</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator className="bg-white/10 my-12" />

        {/* Method 1: Playbooks */}
        <Card className="bg-black/40 border-white/10 backdrop-blur-xl mb-8">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="w-6 h-6 text-orange-400" />
              <CardTitle className="text-white text-2xl">Method 1: Use Playbooks (Easiest)</CardTitle>
            </div>
            <CardDescription className="text-gray-400">
              Pre-built solutions for common problems - perfect for beginners
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <h3 className="text-white font-semibold mb-3">📖 What are Playbooks?</h3>
              <p className="text-gray-300 mb-3">
                Playbooks are step-by-step guides that already have the right AI skills picked for you. 
                Think of them like recipes - we've already figured out which ingredients (skills) work best together!
              </p>
              <p className="text-gray-300">
                <strong className="text-white">Examples:</strong> "Validate a Business Idea", "Write Cold Emails", "Turn Meetings into Tasks"
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-white font-semibold">Step-by-Step:</h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">1. Go to Playbooks page</p>
                    <p className="text-gray-400 text-sm">Click "Playbooks" in the top menu</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">2. Pick a playbook that matches your problem</p>
                    <p className="text-gray-400 text-sm">Read the description and "Problem This Solves" section</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">3. Click "View Playbook"</p>
                    <p className="text-gray-400 text-sm">See all the skills included</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">4. Click "Create This Agent"</p>
                    <p className="text-gray-400 text-sm">We'll automatically build your agent with all the skills</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">5. Copy the blueprint text</p>
                    <p className="text-gray-400 text-sm">Click the "Copy" button</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">6. Use it in ChatGPT/Claude/Gemini</p>
                    <p className="text-gray-400 text-sm">See instructions below ⬇️</p>
                  </div>
                </div>
              </div>
            </div>

            <Link href="/playbooks">
              <Button className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600">
                Try Playbooks Now
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Method 2: Starter Packs */}
        <Card className="bg-black/40 border-white/10 backdrop-blur-xl mb-8">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-6 h-6 text-pink-400" />
              <CardTitle className="text-white text-2xl">Method 2: Use Starter Packs</CardTitle>
            </div>
            <CardDescription className="text-gray-400">
              Curated bundles for specific roles (Founder, Marketer, Developer, Creator)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <h3 className="text-white font-semibold mb-3">📦 What are Starter Packs?</h3>
              <p className="text-gray-300">
                Starter Packs are collections of AI skills picked for specific roles. 
                If you're a founder, marketer, or creator, we've already selected the best skills for you!
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-white font-semibold">Step-by-Step:</h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">1. Go to Starter Packs</p>
                    <p className="text-gray-400 text-sm">Click "Starter Packs" in the menu</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">2. Choose your role</p>
                    <p className="text-gray-400 text-sm">Founder Launch Pack, Content Creator Pack, etc.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">3. Click "Open in Agent Builder"</p>
                    <p className="text-gray-400 text-sm">All skills will be pre-selected for you</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">4. Describe what you want</p>
                    <p className="text-gray-400 text-sm">Type your goal in plain English</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">5. Generate and copy</p>
                    <p className="text-gray-400 text-sm">Click "Generate" then "Copy"</p>
                  </div>
                </div>
              </div>
            </div>

            <Link href="/packs">
              <Button className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600">
                Browse Starter Packs
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Method 3: Build Custom */}
        <Card className="bg-black/40 border-white/10 backdrop-blur-xl mb-8">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-6 h-6 text-cyan-400" />
              <CardTitle className="text-white text-2xl">Method 3: Build Custom Agent</CardTitle>
            </div>
            <CardDescription className="text-gray-400">
              For when you want specific skills combined your way
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-white font-semibold">Step-by-Step:</h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">1. Click "Build Agent" in menu</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">2. Describe your goal</p>
                    <p className="text-gray-400 text-sm">Example: "Help me write professional emails to clients"</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">3. Select skills that sound useful</p>
                    <p className="text-gray-400 text-sm">Check the boxes - pick 2-5 skills</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">4. Click "Generate Agent Blueprint"</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">5. Copy and use!</p>
                  </div>
                </div>
              </div>
            </div>

            <Link href="/builder">
              <Button className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600">
                Build Custom Agent
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Separator className="bg-white/10 my-12" />

        {/* How to Use in ChatGPT/Claude */}
        <Card className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/30 backdrop-blur-xl mb-8">
          <CardHeader>
            <CardTitle className="text-white text-2xl">💬 How to Use Your Agent in ChatGPT/Claude</CardTitle>
            <CardDescription className="text-gray-300 text-lg">
              Once you've copied your agent blueprint, here's what to do:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-white/10 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <span className="text-2xl">🤖</span> For ChatGPT (OpenAI)
              </h3>
              <ol className="space-y-2 text-gray-300 list-decimal list-inside">
                <li>Go to <a href="https://chat.openai.com" target="_blank" className="text-blue-400 underline">chat.openai.com</a></li>
                <li>Start a new chat</li>
                <li><strong className="text-white">Paste your agent blueprint</strong> in the message box</li>
                <li>Press Enter - ChatGPT will confirm it understands</li>
                <li>Now chat normally! It will use all your selected skills</li>
              </ol>
            </div>

            <div className="bg-white/10 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <span className="text-2xl">✨</span> For Claude (Anthropic)
              </h3>
              <ol className="space-y-2 text-gray-300 list-decimal list-inside">
                <li>Go to <a href="https://claude.ai" target="_blank" className="text-blue-400 underline">claude.ai</a></li>
                <li>Start a new conversation</li>
                <li><strong className="text-white">Paste your agent blueprint</strong> as the first message</li>
                <li>Claude will acknowledge and be ready to help</li>
                <li>Start asking questions or requesting tasks!</li>
              </ol>
            </div>

            <div className="bg-white/10 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <span className="text-2xl">💎</span> For Gemini (Google)
              </h3>
              <ol className="space-y-2 text-gray-300 list-decimal list-inside">
                <li>Go to <a href="https://gemini.google.com" target="_blank" className="text-blue-400 underline">gemini.google.com</a></li>
                <li>Open a new chat</li>
                <li><strong className="text-white">Paste your agent blueprint</strong></li>
                <li>Gemini will process and confirm</li>
                <li>You're ready to go!</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Pro Tips */}
        <Card className="bg-black/40 border-white/10 backdrop-blur-xl mb-8">
          <CardHeader>
            <CardTitle className="text-white text-2xl">💡 Pro Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="text-2xl">🎯</div>
                <div>
                  <h3 className="text-white font-semibold">Start with Playbooks</h3>
                  <p className="text-gray-400">They're the easiest way to get started - everything is pre-configured</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-2xl">🔄</div>
                <div>
                  <h3 className="text-white font-semibold">Try Different Combinations</h3>
                  <p className="text-gray-400">You can create as many agents as you want - experiment!</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-2xl">💾</div>
                <div>
                  <h3 className="text-white font-semibold">Save Your Blueprints</h3>
                  <p className="text-gray-400">Copy them to a note file so you can reuse them later</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-2xl">🚀</div>
                <div>
                  <h3 className="text-white font-semibold">No Coding Required!</h3>
                  <p className="text-gray-400">Everything is point-and-click. If you can use Facebook, you can use this!</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Need Help */}
        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white text-2xl">❓ Still Have Questions?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 mb-4">
              Remember: There's no wrong way to use ShowClawMart. The worst that can happen is you copy a blueprint that doesn't work perfectly - just try a different one!
            </p>
            <p className="text-white font-semibold">
              🎉 You've got this! Start with a Playbook and see the magic happen.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
