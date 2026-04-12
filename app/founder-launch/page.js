'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Rocket, ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export default function FounderLaunchPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    offer: '',
    market: '',
    timeline: '48 hours'
  })

  const handleLaunch = () => {
    // Pre-configured founder launch agent
    const goal = `Help me validate and launch my offer: "${formData.offer}" in the ${formData.market} market within ${formData.timeline}. I need market research, competitor analysis, customer discovery, and a go-to-market plan.`
    
    // Redirect to builder with pre-configured founder skills
    router.push(`/builder?vertical=founder-launch&goal=${encodeURIComponent(goal)}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
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
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4">
            <Rocket className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Founder Launch Assistant
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Validate your offer and get your first 10 customers in 48 hours with AI-powered market research, competitor analysis, and outreach
          </p>
        </div>

        {/* What You Get */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30 backdrop-blur-xl mb-8">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Your AI Co-Founder Includes:</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-white font-semibold">Market Research Agent</h3>
                  <p className="text-gray-400 text-sm">Analyze your market, find gaps, identify opportunities</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-white font-semibold">Competitor Intelligence</h3>
                  <p className="text-gray-400 text-sm">Track what competitors are doing, find their weaknesses</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-white font-semibold">Customer Discovery</h3>
                  <p className="text-gray-400 text-sm">Create surveys, interview scripts, validation frameworks</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-white font-semibold">WhatsApp Lead Qualifier</h3>
                  <p className="text-gray-400 text-sm">Auto-qualify and route your first leads</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        <Card className="bg-black/40 border-white/10 backdrop-blur-xl mb-8">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Tell Us About Your Offer</CardTitle>
            <CardDescription className="text-gray-400">
              We'll create a custom AI agent to help you validate and launch
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="offer" className="text-white">
                What's your offer? <span className="text-red-400">*</span>
              </Label>
              <Textarea
                id="offer"
                value={formData.offer}
                onChange={(e) => setFormData({ ...formData, offer: e.target.value })}
                placeholder="Example: AI-powered email marketing tool for D2C ecommerce brands that automatically writes product launch emails based on customer data..."
                className="min-h-[100px] bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="market" className="text-white">
                What's your target market? <span className="text-red-400">*</span>
              </Label>
              <Input
                id="market"
                value={formData.market}
                onChange={(e) => setFormData({ ...formData, market: e.target.value })}
                placeholder="Example: D2C Shopify stores doing $10k-$100k/month"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeline" className="text-white">
                Your timeline
              </Label>
              <Input
                id="timeline"
                value={formData.timeline}
                onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                placeholder="48 hours, 1 week, etc."
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>

            <Button
              onClick={handleLaunch}
              disabled={!formData.offer || !formData.market}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              size="lg"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Generate My Launch Agent
            </Button>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white text-2xl">How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">1</div>
                <div>
                  <h3 className="text-white font-semibold mb-1">We create your custom AI agent</h3>
                  <p className="text-gray-400">Based on your offer and market, we configure the perfect skill combination</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">2</div>
                <div>
                  <h3 className="text-white font-semibold mb-1">You get a ready-to-use blueprint</h3>
                  <p className="text-gray-400">Copy the agent prompt and paste into ChatGPT or Claude</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">3</div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Start validating immediately</h3>
                  <p className="text-gray-400">Get market research, customer surveys, and outreach templates in minutes</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
