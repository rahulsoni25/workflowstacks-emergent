'use client'

import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, Sparkles, Users, DollarSign, Github, Tag, FileText,
  Upload, ShieldCheck, CheckCircle2, XCircle, MessageSquare, Rocket,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'

const STATS = [
  { icon: Sparkles, value: '1,500+', label: 'skills already indexed' },
  { icon: DollarSign, value: '85%', label: 'you keep, per sale' },
  { icon: Users, value: '2,000+', label: 'active users looking for tools' },
]

const GITHUB_STEPS = [
  { n: '1', title: 'Push your skill to a public GitHub repo', body: 'Any Claude Skill, MCP server, prompt pack, or AI agent works — code stays yours, you keep the repo.' },
  { n: '2', title: 'Tag it', body: 'Add a topic like "claude-skill", "mcp-server", or "ai-agent" so our syncer can find and classify it correctly.' },
  { n: '3', title: 'Write a real README', body: 'What it does, how to install it, how to use it. This becomes the raw material for your listing page.' },
  { n: '4', title: 'We auto-discover it', body: 'Our GitHub syncer picks it up, our safety screen checks it, and it enters review — no extra step from you.' },
]

const MANUAL_STEPS = [
  { n: '1', title: 'No public repo? No problem', body: "Use the upload form directly — a name, a clear description, and a category is all that's required." },
  { n: '2', title: 'Set a price or list it free', body: 'Free listings build reputation and discovery; priced listings earn you 85% per sale once approved.' },
  { n: '3', title: 'Submit', body: 'It goes straight into the same review + safety-screening queue as GitHub submissions.' },
]

const GOOD_LISTING_TIPS = [
  { icon: CheckCircle2, good: true, text: 'A specific, honest description — what it actually does, for whom' },
  { icon: CheckCircle2, good: true, text: 'A public repo or working link buyers can verify' },
  { icon: CheckCircle2, good: true, text: 'Clear usage instructions — buyers need to get value fast' },
  { icon: XCircle, good: false, text: 'Vague names like "AI Tool 3" or copy-pasted boilerplate' },
  { icon: XCircle, good: false, text: 'Inflated claims or fake install/rating numbers' },
  { icon: XCircle, good: false, text: 'Links to unrelated sites, shorteners, or bait-and-switch content' },
]

const FAQS = [
  { q: 'How much do I actually earn?', a: 'You keep 85% of every sale. WorkflowStacks takes a 15% platform fee to cover discovery, hosting, and payments — the same split shown on your earnings dashboard once approved.' },
  { q: 'Is it free to list?', a: 'Yes. Listing costs nothing, free or paid. You only ever give up the 15% fee on an actual sale — no fee, no charge if nothing sells.' },
  { q: 'How long does review take?', a: 'Typically a few days. We check for quality and fit, and every submission is automatically screened for spam, malicious content, and manipulation attempts before a human ever looks at it.' },
  { q: 'Do I need a GitHub repo?', a: 'No — the manual upload form works for anything. A public repo just helps with auto-discovery, credibility, and lets buyers verify what they are getting.' },
  { q: 'What content gets rejected?', a: 'Spam, malicious code, phishing links, and any attempt to manipulate our automated review process are automatically flagged and blocked before publishing. Genuine tools and honest descriptions sail through — see our security screening below.' },
  { q: 'Can I update my listing after submitting?', a: "Email us at rahul@workflowstacks.com and we'll update it for you. Self-serve editing is on the roadmap." },
  { q: 'I applied — what happens now?', a: "You'll get an email once we've reviewed it. Nothing to do in the meantime except make sure your repo (if you have one) is public with a clear README." },
]

export default function LearnCreatorsClient() {
  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/"><Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5"><ArrowLeft className="w-4 h-4 mr-2" />Home</Button></Link>
        </div>
      </header>

      {/* Hero */}
      <div className="container mx-auto px-4 pt-16 pb-14 max-w-4xl text-center">
        <Badge className="mb-4 bg-teal-500/15 text-teal-400 border-teal-500/30 hover:bg-teal-500/20">Creator program</Badge>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
          Built something useful? <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">Get it in front of people who'll pay for it.</span>
        </h1>
        <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-8">
          List your Claude Skill, MCP server, or AI agent on WorkflowStacks. We handle discovery, review, and payments — you keep 85% of every sale.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/submit">
            <Button size="lg" className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white px-8 font-semibold">
              Submit your skill <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-white/5 px-8">
              See how it works
            </Button>
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="container mx-auto px-4 max-w-4xl mb-16">
        <div className="grid grid-cols-3 gap-3">
          {STATS.map(({ icon: Icon, value, label }) => (
            <Card key={label} className="bg-slate-900/60 border-slate-700/50">
              <CardContent className="py-5 text-center">
                <Icon className="w-5 h-5 text-teal-400 mx-auto mb-1.5" />
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="text-xs text-slate-400">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-4xl space-y-14 pb-20">

        {/* How it works */}
        <div id="how-it-works" className="scroll-mt-20">
          <h2 className="text-2xl font-bold text-white mb-2 text-center">Two ways to submit</h2>
          <p className="text-slate-400 text-center mb-8">Pick whichever fits what you've already built.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardContent className="py-6">
                <div className="flex items-center gap-2 mb-5">
                  <Github className="w-5 h-5 text-teal-400" />
                  <h3 className="text-white font-semibold">From GitHub (recommended)</h3>
                </div>
                <div className="space-y-4">
                  {GITHUB_STEPS.map((s) => (
                    <div key={s.n} className="flex gap-3 items-start">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-500/15 text-teal-400 text-xs font-bold flex items-center justify-center mt-0.5">{s.n}</div>
                      <div>
                        <div className="text-white text-sm font-medium">{s.title}</div>
                        <div className="text-slate-400 text-xs mt-0.5">{s.body}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardContent className="py-6">
                <div className="flex items-center gap-2 mb-5">
                  <Upload className="w-5 h-5 text-teal-400" />
                  <h3 className="text-white font-semibold">Manual upload</h3>
                </div>
                <div className="space-y-4">
                  {MANUAL_STEPS.map((s) => (
                    <div key={s.n} className="flex gap-3 items-start">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-500/15 text-teal-400 text-xs font-bold flex items-center justify-center mt-0.5">{s.n}</div>
                      <div>
                        <div className="text-white text-sm font-medium">{s.title}</div>
                        <div className="text-slate-400 text-xs mt-0.5">{s.body}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* What makes a great listing */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 text-center">What gets approved fast</h2>
          <p className="text-slate-400 text-center mb-8">Reviewers see a lot of listings — these are the difference between a same-week approval and back-and-forth.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {GOOD_LISTING_TIPS.map(({ icon: Icon, good, text }, i) => (
              <div key={i} className={`flex gap-3 items-start rounded-lg border p-4 ${good ? 'bg-teal-500/5 border-teal-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${good ? 'text-teal-400' : 'text-red-400'}`} />
                <span className="text-slate-300 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <Card className="bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border-teal-500/30">
          <CardContent className="py-7">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-6 h-6 text-teal-400" />
              <h2 className="text-xl font-bold text-white">Every submission is screened</h2>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              Before anything reaches a human reviewer, we automatically scan every application and upload for spam, malicious code,
              phishing links, and attempts to manipulate our automated review pipeline. Legitimate submissions pass straight through —
              this exists to protect buyers (and keep your listing next to trustworthy ones), not to slow honest creators down.
            </p>
          </CardContent>
        </Card>

        {/* FAQ */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 text-center flex items-center justify-center gap-2">
            <MessageSquare className="w-5 h-5 text-teal-400" /> Frequently asked questions
          </h2>
          <Card className="bg-slate-900/60 border-slate-700/50 mt-6">
            <CardContent className="py-2">
              <Accordion type="single" collapsible className="w-full">
                {FAQS.map((f, i) => (
                  <AccordionItem key={i} value={`item-${i}`} className="border-slate-700/50">
                    <AccordionTrigger className="text-white hover:no-underline text-left px-2">{f.q}</AccordionTrigger>
                    <AccordionContent className="text-slate-400 text-sm px-2">{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>

        {/* Final CTA */}
        <div className="text-center pt-4">
          <Rocket className="w-8 h-8 text-teal-400 mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-white mb-2">Ready when you are</h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">Takes under 5 minutes. You'll hear back within a few days.</p>
          <Link href="/submit">
            <Button size="lg" className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white px-10 font-semibold">
              Submit your skill <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
