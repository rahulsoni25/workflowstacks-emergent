'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Star, Download, Github, Sparkles, Zap, Code2, Brain, ArrowRight, Shield, Clock, TrendingUp, Users, ChevronRight, ChevronDown, Check, Mail, Play, Target, Layers, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { motion } from 'framer-motion'
import WsMark from '@/components/WsMark'

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

function useFavorites() {
  const [favs, setFavs] = useState([])
  useEffect(() => {
    try { setFavs(JSON.parse(localStorage.getItem('ws_favs') || '[]')) } catch {}
  }, [])
  const toggle = (id) => {
    setFavs(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
      try { localStorage.setItem('ws_favs', JSON.stringify(next)) } catch {}
      return next
    })
  }
  return { favs, toggle }
}

const HomeClient = ({ initialSkills = [], initialStats = null, initialNewSkills = [] }) => {
  const [skills, setSkills] = useState(initialSkills)
  const [loading, setLoading] = useState(false)
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState(initialStats)
  const [email, setEmail] = useState('')
  const [emailSubmitted, setEmailSubmitted] = useState(false)
  const filtersReady = useRef(false)
  const { favs, toggle } = useFavorites()

  // Re-fetch when filters change. Skip the very first run when the server already
  // seeded the grid (so crawlers + first paint get real content, no refetch flash).
  useEffect(() => {
    if (!filtersReady.current) {
      filtersReady.current = true
      if (initialSkills.length) return
    }
    loadSkills()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, search])

  const loadSkills = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (category !== 'all') params.append('category', category)
      if (search) params.append('search', search)
      const res = await fetch(`/api/skills?${params}`)
      const data = await res.json()
      setSkills(data.skills || [])
    } catch (e) {
      console.error('Error loading skills:', e)
      setSkills([])
    }
    setLoading(false)
  }

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      })
      if (res.ok) {
        setEmailSubmitted(true)
        setEmail('')
      } else {
        alert('Please enter a valid email address.')
      }
    } catch (err) {
      alert('Something went wrong — please try again.')
    }
  }

  const getCategoryColor = (cat) => {
    const colors = {
      'claude-skill': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
      'gemini-extension': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'mcp-server': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      'prompt': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      'anthropic-claude': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
      'ai-prompt': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      'ai-agent': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      'ai-tool': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
    }
    return colors[cat] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  }

  const getCategoryIcon = (cat) => {
    if (cat === 'claude-skill' || cat === 'anthropic-claude') return <Brain className="w-4 h-4" />
    if (cat === 'gemini-extension') return <Sparkles className="w-4 h-4" />
    if (cat === 'mcp-server') return <Code2 className="w-4 h-4" />
    return <Zap className="w-4 h-4" />
  }

  // Honest floor for "X+" claims: round DOWN to the nearest 10 so the "+" is always
  // true (we always have at least this many), never rounding up past the real count.
  const skillsFloor = Math.floor((Number(stats?.totalSkills) || 100) / 10) * 10

  return (
    <div className="min-h-screen bg-neptune">
      {/* Sticky Header */}
      <header className="border-b border-[#262B2D] bg-[#0A0C0D]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#C6F24E' }}>
                <WsMark className="w-6 h-6" style={{ color: '#0A0C0D' }} />
              </div>
              <span className="wm text-xl text-slate-100">workflow<span className="s" style={{ color: '#C6F24E' }}>stacks</span></span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {/* Primary destinations only — secondary links live under "More" so the
                  bar stays focused on the core Build-an-Agent action. */}
              <Link href="/discover">
                <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/5 text-sm">Discover</Button>
              </Link>
              <Link href="/problems">
                <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/5 text-sm">Problems</Button>
              </Link>
              <Link href="/deals">
                <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/5 text-sm">Deals</Button>
              </Link>

              {/* More ▾ — hover/focus dropdown for secondary destinations */}
              <div className="relative group">
                <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/5 text-sm">
                  More <ChevronDown className="w-3.5 h-3.5 ml-1 group-hover:rotate-180 transition-transform" />
                </Button>
                <div className="absolute right-0 top-full pt-2 hidden group-hover:block z-50">
                  <div className="min-w-[190px] rounded-xl border border-[#262B2D] bg-[#101314] backdrop-blur-xl p-1.5 shadow-2xl shadow-black/40">
                    {[
                      { href: '/playbooks', label: 'Playbooks', note: 'Solve one problem' },
                      { href: '/personas', label: 'Personas', note: 'Role-in-a-box' },
                      { href: '/packs', label: 'Starter Packs', note: 'Skill bundles' },
                      { href: '/community', label: 'Community gallery', note: 'Agents others built' },
                      { href: '/members', label: 'Members', note: 'The network' },
                      { href: '/my-agents', label: 'My Agents', note: 'Your saved builds' },
                      { href: '/help', label: 'How it works' },
                    ].map((l) => (
                      <Link key={l.href} href={l.href} className="block rounded-lg px-3 py-2 hover:bg-white/5 transition-colors">
                        <span className="block text-sm text-slate-200">{l.label}</span>
                        {l.note && <span className="block text-[11px] text-slate-500">{l.note}</span>}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              <div className="w-px h-6 bg-slate-700 mx-2"></div>
              <Link href="/builder">
                <Button size="sm" className="bg-[#C6F24E] hover:bg-[#A6D62E] text-[#0A0C0D] font-semibold shadow-lg shadow-lime-500/20">
                  <Zap className="w-3.5 h-3.5 mr-1.5" />
                  Build Agent
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-28 px-4">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#C6F24E]/5 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#C6F24E]/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#C6F24E]/5 rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center max-w-5xl mx-auto"
          >
            {/* Trust Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-[#101314] border border-[#262B2D] rounded-full px-4 py-1.5 mb-6"
            >
              <span className="w-2 h-2 rounded-full animate-pulse" style={{background:'#C6F24E', boxShadow:'0 0 0 4px rgba(198,242,78,0.18)'}}></span>
              <span className="text-slate-200 font-mono text-xs tracking-wider uppercase">Live marketplace — {skillsFloor}+ AI skills indexed</span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-white mb-4 leading-[0.92] tracking-tight">
              <span className="wm">workflow<span className="s" style={{ color: '#C6F24E' }}>stacks</span></span>
            </h1>
            <p className="text-2xl md:text-3xl font-semibold text-white mb-6 tracking-tight">
              Stack the skills.{' '}<span style={{ color: '#C6F24E' }}>Ship the agent.</span>
            </p>
            <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-3xl mx-auto leading-relaxed">
              Built for founders and marketing agencies who want to install open-source AI skills, agents, and personas that handle <strong className="text-white">paid ads, performance reporting, SEO, outreach, market research, and ecommerce ops</strong> — without writing code.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link href="/builder">
                <Button size="lg" className="bg-[#C6F24E] hover:bg-[#A6D62E] text-[#0A0C0D] px-8 py-6 text-lg shadow-2xl shadow-lime-500/20 rounded-xl font-semibold">
                  <Zap className="w-5 h-5 mr-2" />
                  Build Your AI Agent — Free
                </Button>
              </Link>
              <Link href="/playbooks">
                <Button size="lg" variant="outline" className="border-[#323A3C] text-[#ECEFEA] hover:bg-white/5 px-8 py-6 text-lg rounded-xl">
                  <Play className="w-5 h-5 mr-2" />
                  Browse Playbooks
                </Button>
              </Link>
            </div>

            <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto mb-12">
              Everything's <strong className="text-[#C6F24E]">100% free</strong> — real, trending open-source tools, AI-packaged into ready-to-use skills, playbooks, and agents.
              Others charge $5–49 per config. Don't <em>buy</em> a static setup — <strong className="text-white">build exactly the agent you need</strong>, in one click.
            </p>

            {/* Trust Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap justify-center gap-8 md:gap-12"
            >
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-rose-400">{stats?.agentsBuilt || 0}</div>
                <div className="text-sm text-slate-400 mt-1">agents built</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white">{skillsFloor}+</div>
                <div className="text-[#8B928D] font-mono text-xs tracking-wider uppercase mt-1">real AI skills indexed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-[#C6F24E]">Live</div>
                <div className="text-[#8B928D] font-mono text-xs tracking-wider uppercase mt-1">GitHub stars &amp; forks</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-[#C6F24E]">Daily</div>
                <div className="text-[#8B928D] font-mono text-xs tracking-wider uppercase mt-1">refreshed from GitHub</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-[#C6F24E]">Free</div>
                <div className="text-[#8B928D] font-mono text-xs tracking-wider uppercase mt-1">no paywall, ever</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* The wedge — answer "isn't this just GitHub with extra steps?" out loud */}
      <section className="py-20 px-4 border-t border-[#262B2D]">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <p className="eyebrow mb-4 justify-center">// THE WEDGE</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              "Isn't this just GitHub with <span className="text-gradient-neptune">extra steps?</span>"
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              The opposite — we <strong className="text-white">remove</strong> the steps. The tools are free and open-source on GitHub. The hours of digging, judging, and prompt-wiring are what we delete.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Star, t: 'We read & score 180+ repos', d: 'Only trending, high-star tools — across ads, analytics, research, SEO, outreach, and ecommerce — that clear an 8/10 quality gate, with live GitHub stats. You skip hours of wading through dead repos.' },
              { icon: Code2, t: 'Every tool gets a usage guide', d: 'An AI-written install command, quick-start steps, and the one real gotcha — so you\'re productive in minutes, not after reading a README.' },
              { icon: Zap, t: 'One click = a working agent', d: 'The Builder merges the skills you pick into a single paste-ready blueprint for Claude, ChatGPT, or Gemini. That\'s the thing GitHub can\'t do for you.' },
            ].map((c, i) => {
              const Icon = c.icon
              return (
                <div key={i} className="bg-[#101314] border border-[#262B2D] rounded-2xl p-6">
                  <div className="w-11 h-11 rounded-xl bg-[#0A0C0D] border border-[#C6F24E]/30 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-[#C6F24E]" />
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">{c.t}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{c.d}</p>
                </div>
              )
            })}
          </div>
          <div className="text-center mt-8">
            <Link href="/builder">
              <Button size="lg" className="bg-[#C6F24E] hover:bg-[#A6D62E] text-[#0A0C0D] font-semibold shadow-lg shadow-lime-500/20">
                <Zap className="w-4 h-4 mr-2" />Build an agent from real tools — free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 3-Step How It Works */}
      <section className="py-20 px-4 border-t border-[#262B2D]">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-14"
          >
            <motion.p variants={fadeInUp} className="eyebrow mb-4 justify-center">// HOW IT WORKS</motion.p>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-bold text-white mb-4">
              From Idea to AI Agent in <span className="text-gradient-neptune">3 Simple Steps</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-slate-400 text-lg max-w-2xl mx-auto">
              No coding, no setup, no API keys. Just pick, combine, and paste.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Pick Your Outcome', desc: 'Choose a playbook, persona, or browse skills by what you want to achieve — "rank in AI search", "automate reviews", etc.', icon: Target, color: 'teal' },
              { step: '02', title: 'Combine into an Agent', desc: 'Our Agent Builder merges your selected skills into one powerful prompt blueprint. Customize the goal in plain English.', icon: Layers, color: 'cyan' },
              { step: '03', title: 'Paste & Deploy', desc: 'Copy your agent blueprint and paste it into ChatGPT, Claude, or Gemini. Your custom AI agent is live instantly.', icon: Bot, color: 'emerald' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <Card className="bg-[#101314] border border-[#262B2D] hover:border-[#C6F24E]/30 transition-all duration-300 h-full group">
                  <CardHeader>
                    <div className="flex items-center gap-4 mb-3">
                      <div className={`w-12 h-12 rounded-xl bg-${item.color}-500/10 border border-${item.color}-500/20 flex items-center justify-center group-hover:bg-${item.color}-500/20 transition-colors`}>
                        <item.icon className={`w-6 h-6 text-${item.color}-400`} />
                      </div>
                      <span className="text-5xl font-black text-slate-800">{item.step}</span>
                    </div>
                    <CardTitle className="text-white text-xl">{item.title}</CardTitle>
                    <CardDescription className="text-slate-400 text-base leading-relaxed">
                      {item.desc}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Who It's For — Shopper-Ready CTA Cards */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-14"
          >
            <motion.p variants={fadeInUp} className="eyebrow mb-4 justify-center">// BUILT FOR</motion.p>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-bold text-white mb-4">
              Built for <span className="text-gradient-neptune">Your Role</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-slate-400 text-lg">
              Pre-configured AI agent bundles for every team
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                emoji: '🚀', title: 'Founders', subtitle: 'Launch & Validate Faster',
                desc: 'Stop duct-taping prompts. Build the exact AI agent that validates your offer and gets your first users — free, no code.',
                cta: 'See Founder Agents', href: '/personas', gradient: 'from-teal-500/20 to-cyan-500/20', border: 'border-teal-500/30', hoverBorder: 'hover:border-teal-400',
                benefits: ['Idea validation + market research', 'Auto-generate landing pages', 'AI-powered outreach + ads']
              },
              {
                emoji: '📈', title: 'Agencies', subtitle: 'Scale Client Results 10x',
                desc: 'Spin up client-ready agents for Meta + Google ads automation, performance reporting, SEO/AEO/GEO, and weekly client dashboards — without hiring. One blueprint, paste into any model, bill the outcome.',
                cta: 'See Agency Agents', href: '/personas', gradient: 'from-cyan-500/20 to-blue-500/20', border: 'border-cyan-500/30', hoverBorder: 'hover:border-cyan-400',
                benefits: ['Meta + Google ads automation', 'Performance dashboards + attribution', 'AI Overview + GEO content']
              },
              {
                emoji: '🛍️', title: 'Ecommerce', subtitle: 'Automate Store Operations',
                desc: 'Put store ops on autopilot — reviews, product copy, inventory — with agents built from proven open-source tools, not random prompts.',
                cta: 'See Ecommerce Agents', href: '/personas', gradient: 'from-emerald-500/20 to-teal-500/20', border: 'border-emerald-500/30', hoverBorder: 'hover:border-emerald-400',
                benefits: ['Auto-respond to reviews', 'Smart inventory sync', 'AI product descriptions']
              },
            ].map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
              >
                <Link href={card.href}>
                  <Card className="bg-[#101314] border border-[#262B2D] hover:border-[#C6F24E]/40 transition-all duration-300 cursor-pointer group h-full">
                    <CardHeader>
                      <div className="text-4xl mb-2">{card.emoji}</div>
                      <CardTitle className="text-white text-2xl">{card.title}</CardTitle>
                      <p className="text-[#C6F24E] text-sm font-medium">{card.subtitle}</p>
                      <CardDescription className="text-slate-300 text-base mt-2">
                        {card.desc}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <ul className="space-y-2">
                        {card.benefits.map((b, j) => (
                          <li key={j} className="flex items-center gap-2 text-sm text-slate-300">
                            <Check className="w-4 h-4 text-[#C6F24E] flex-shrink-0" />
                            {b}
                          </li>
                        ))}
                      </ul>
                      <Button className="w-full bg-white/5 hover:bg-white/10 text-white border border-[#323A3C] group-hover:border-[#C6F24E]/50 mt-4">
                        {card.cta}
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* New This Week strip */}
      {initialNewSkills.length > 0 && (
        <section className="py-16 px-4 border-t border-[#262B2D]">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white">New this week</h2>
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                  Updated daily from GitHub
                </span>
              </div>
              <Link href="/skills" className="text-sm text-[#C6F24E] hover:text-[#A6D62E] transition-colors whitespace-nowrap">
                Browse all 182+ skills →
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-slate-700">
              {initialNewSkills.slice(0, 8).map((skill) => (
                <Link key={skill.id} href={`/skills/${skill.id}`} className="flex-shrink-0 w-64 bg-[#101314] border border-[#262B2D] rounded-xl p-4 hover:border-[#C6F24E]/40 transition-all duration-200 group">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={`${getCategoryColor(skill.category)} border text-xs`}>
                      {skill.category}
                    </Badge>
                    {skill.github_stars > 0 && (
                      <span className="flex items-center gap-1 text-xs text-amber-400">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {skill.github_stars.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="text-white text-sm font-semibold leading-snug mb-3 line-clamp-2 group-hover:text-[#C6F24E] transition-colors">
                    {skill.title_human || skill.name}
                  </p>
                  <span className="text-xs text-[#C6F24E]">View →</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Honest, verifiable trust — no fake reviews */}
      <section className="py-20 px-4 border-t border-[#262B2D]">
        <div className="container mx-auto max-w-5xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Real tools. <span className="text-gradient-neptune">Real numbers.</span> No fluff.
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-12">
            Every listing is a genuine, trending open-source project — with live GitHub stats, an AI-written usage guide, and a quality score. We don't run fake reviews or inflated metrics.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { v: `${skillsFloor}+`, l: 'Real OSS tools indexed' },
              { v: 'Live', l: 'GitHub stars & forks' },
              { v: '≥8/10', l: 'Quality-gated listings' },
              { v: '100%', l: 'Free — no paywall' },
            ].map((s, i) => (
              <div key={i} className="bg-[#101314] border border-[#262B2D] rounded-xl p-6">
                <div className="text-3xl font-bold text-gradient-neptune mb-1">{s.v}</div>
                <div className="text-slate-400 text-sm">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section — Monetization Ready */}
      <section id="pricing" className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-14"
          >
            <motion.p variants={fadeInUp} className="eyebrow mb-4 justify-center">// PRICING</motion.p>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-bold text-white mb-4">
              The tools are free. You pay for <span className="text-gradient-neptune">time, trust & savings</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-slate-400 text-lg max-w-2xl mx-auto">
              The open-source skills are <strong className="text-[#C6F24E]">always free</strong> — you can read every line.
              We earn from group-buy savings, done-for-you setups, and creator tools. Never from the free catalog.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: 'Free', price: '$0', period: '/forever', desc: 'Everything you need to ship',
                features: [`Browse ${skillsFloor}+ real skills — read the source`, 'Build & remix unlimited agents', 'Post problems, join the network', 'Sell your agents — keep 85%'],
                cta: 'Get Started Free', primary: false, badge: null,
              },
              {
                name: 'Pro', price: '$19', period: '/month', desc: 'For serious creators & power users',
                features: ['0% selling fees (keep 100%)', 'Private & unlisted agents', 'Sales analytics + custom branding', 'Early access to group-buy deals', 'API access'],
                cta: 'Join the waitlist', primary: true, badge: 'Planned', waitlist: true,
              },
              {
                name: 'Enterprise', price: 'Custom', period: '', desc: 'For agencies & teams',
                features: ['White-label agents', 'Team seats & SSO', 'Done-for-you agent setup', 'Custom skill ingestion', 'Dedicated support'],
                cta: 'Talk to us', primary: false, badge: null, waitlist: true,
              },
            ].map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
              >
                <Card className={`relative h-full ${plan.primary ? 'bg-[#0A0C0D] border border-[#C6F24E]/40 glow-teal' : 'bg-[#101314] border border-[#262B2D]'} backdrop-blur-xl`}>
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-[#C6F24E] text-[#0A0C0D] border-0 px-4 py-1 shadow-lg shadow-lime-500/20">
                        {plan.badge}
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pt-8">
                    <CardTitle className="text-white text-lg">{plan.name}</CardTitle>
                    <div className="mt-3">
                      <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                      <span className="text-slate-400 text-sm">{plan.period}</span>
                    </div>
                    <CardDescription className="text-slate-400 mt-2">{plan.desc}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ul className="space-y-3">
                      {plan.features.map((f, j) => (
                        <li key={j} className="flex items-center gap-2.5 text-sm text-slate-300">
                          <Check className="w-4 h-4 text-[#C6F24E] flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    {plan.waitlist ? (
                      <a href="#newsletter" className="block mt-6">
                        <Button className={`w-full ${plan.primary ? 'bg-[#C6F24E] hover:bg-[#A6D62E] text-[#0A0C0D] font-semibold shadow-lg shadow-lime-500/20' : 'bg-white/5 hover:bg-white/10 text-white border border-[#323A3C]'}`} size="lg">
                          {plan.cta}
                        </Button>
                      </a>
                    ) : (
                      <Link href="/builder" className="block mt-6">
                        <Button className={`w-full ${plan.primary ? 'bg-[#C6F24E] hover:bg-[#A6D62E] text-[#0A0C0D] font-semibold shadow-lg shadow-lime-500/20' : 'bg-white/5 hover:bg-white/10 text-white border border-[#323A3C]'}`} size="lg">
                          {plan.cta}
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Browse Skills Section */}
      <section className="py-20 px-4 border-t border-[#262B2D]">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Browse the <span className="text-gradient-neptune">Skill Library</span>
            </h2>
            <p className="text-slate-400 text-lg">Search by outcome, not category. What do you want your AI to do?</p>
          </div>

          {/* Search and Filter */}
          <div className="bg-[#101314] border border-[#262B2D] rounded-2xl p-5 mb-8">
            <div className="flex flex-col md:flex-row gap-4 mb-5">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Search: 'automate reviews', 'rank in AI search', 'qualify leads'..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-[#0A0C0D] border-[#262B2D] text-white placeholder:text-slate-500 focus:border-[#C6F24E]/50 focus:ring-[#C6F24E]/20"
                />
              </div>
              {favs.length > 0 && (
                <span className="text-xs text-[#C6F24E] bg-[#C6F24E]/10 border border-[#C6F24E]/30 rounded-full px-2 py-0.5 self-center">
                  {favs.length} saved
                </span>
              )}
            </div>
            <Tabs value={category} onValueChange={setCategory} className="w-full max-w-full overflow-x-auto">
              <TabsList className="bg-slate-800/50 border border-slate-700/50 flex-nowrap w-max max-w-none">
                <TabsTrigger value="all" className="data-[state=active]:bg-[#C6F24E] data-[state=active]:text-[#0A0C0D]">All</TabsTrigger>
                <TabsTrigger value="ai-agent" className="data-[state=active]:bg-[#C6F24E] data-[state=active]:text-[#0A0C0D]">AI Agents</TabsTrigger>
                <TabsTrigger value="mcp-server" className="data-[state=active]:bg-[#C6F24E] data-[state=active]:text-[#0A0C0D]">MCP</TabsTrigger>
                <TabsTrigger value="claude-skill" className="data-[state=active]:bg-[#C6F24E] data-[state=active]:text-[#0A0C0D]">Claude</TabsTrigger>
                <TabsTrigger value="prompt" className="data-[state=active]:bg-[#C6F24E] data-[state=active]:text-[#0A0C0D]">Prompts</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Skills Grid */}
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block w-14 h-14 border-4 border-[#C6F24E] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-400 mt-4">Loading skills...</p>
            </div>
          ) : skills.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-400 text-xl mb-4">No skills match this filter yet — check back soon.</p>
              <Link href="/skills">
                <Button className="bg-[#C6F24E] hover:bg-[#A6D62E] text-[#0A0C0D] font-semibold">Browse all skills</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {skills.map((skill) => (
                <div key={skill.id}>
                  <Card className="bg-[#101314] border border-[#262B2D] hover:border-[#C6F24E]/40 transition-all duration-300 group h-full flex flex-col">
                    <CardHeader className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <Badge className={`${getCategoryColor(skill.category)} border text-xs`}>
                          <span className="flex items-center gap-1">
                            {getCategoryIcon(skill.category)}
                            {skill.category}
                          </span>
                        </Badge>
                        <div className="flex items-center gap-1">
                          {skill.is_premium && (
                            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 border-0 text-white">
                              ${skill.price}
                            </Badge>
                          )}
                          <button onClick={() => toggle(skill.id)} className={`ml-auto flex-shrink-0 ${favs.includes(skill.id) ? 'text-rose-400' : 'text-slate-600 hover:text-slate-400'}`}>
                            ♥
                          </button>
                        </div>
                      </div>
                      <CardTitle className="text-white text-lg group-hover:text-[#C6F24E] transition-colors">{skill.title_human || skill.name}</CardTitle>
                      <CardDescription className="text-slate-400 line-clamp-2">
                        {skill.description_human || skill.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        {skill.github_stars > 0 && (
                          <span className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            {skill.github_stars.toLocaleString()}
                          </span>
                        )}
                        {skill.github_forks > 0 && (
                          <span className="flex items-center gap-1">
                            <Github className="w-3.5 h-3.5" />
                            {skill.github_forks.toLocaleString()} forks
                          </span>
                        )}
                        {skill.language && (
                          <span className="text-slate-500">{skill.language}</span>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Link href={`/skills/${skill.id}`} className="w-full">
                        <Button className="w-full bg-[#0A0C0D] hover:bg-[#C6F24E]/10 text-[#ECEFEA] hover:text-[#C6F24E] border border-[#262B2D] hover:border-[#C6F24E]/40 transition-all" variant="outline">
                          View Details
                          <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                </div>
              ))}
            </div>
          )}

          {/* The grid is a featured subset — the full catalog lives at /skills */}
          {skills.length > 0 && (stats?.totalSkills || 0) > skills.length && (
            <div className="text-center mt-10">
              <Link href="/skills">
                <Button size="lg" variant="outline" className="border-[#C6F24E]/40 text-[#C6F24E] hover:bg-[#C6F24E]/10">
                  Browse all {stats.totalSkills} skills
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section — AEO Rich Snippets */}
      <section className="py-20 px-4 border-t border-[#262B2D]">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-14">
            <p className="eyebrow mb-4 justify-center">// QUESTIONS</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Frequently Asked <span className="text-gradient-neptune">Questions</span>
            </h2>
          </div>
          <div className="space-y-4">
            {[
              { q: 'Isn\'t this just GitHub with extra steps?', a: 'The opposite — we remove the steps. We read 180+ repos, score them at 8/10+, write each tool\'s usage guide (install command, quick-start, real gotcha), and let you merge the ones you pick into one paste-ready agent. You skip hours of evaluating repos and wiring prompts. The tools stay free and open-source; we delete the work around them.' },
              { q: 'If it\'s free, what\'s the catch?', a: 'No catch. The catalog is free forever and every skill\'s source is readable line-by-line before you use it. We earn from group-buy savings on paid AI tools, done-for-you agent setups, and creator tools — never by locking the free catalog behind a paywall.' },
              { q: 'Will it actually work in my AI tool?', a: 'Yes. The Builder outputs a system prompt / custom instruction that runs as-is in ChatGPT, Claude, or Gemini — paste it in and go. No API keys, no install, no code.' },
              { q: 'Do I need to know how to code?', a: 'No. WorkflowStacks is built for non-technical founders and marketers. You browse by outcome, pick the skills you want, and the Agent Builder generates a ready-to-paste blueprint for you.' },
              { q: 'How are skills chosen?', a: 'They\'re ingested from GitHub by trending and star count, then quality-gated — only listings that score 8/10 or higher are published. Every card shows live GitHub stars and forks, refreshed daily, so you judge real third-party signal, not invented benchmarks.' },
              { q: 'What are Playbooks and Personas?', a: 'Playbooks are step-by-step guides that combine AI skills to solve one specific problem (like "Validate a New Offer in 48 Hours"). Personas are pre-configured AI agent roles for specific audiences (Founders, Agencies, Ecommerce). Both open in the Builder in one click.' },
            ].map((faq, i) => (
              <details key={i} className="group bg-[#101314] border border-[#262B2D] rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between p-5 cursor-pointer text-white font-semibold hover:bg-white/5 transition-colors">
                  {faq.q}
                  <ChevronRight className="w-5 h-5 text-slate-400 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-5 pb-5 text-slate-300 leading-relaxed">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Email Capture / Newsletter */}
      <section id="newsletter" className="py-20 px-4 scroll-mt-20">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card className="bg-[#101314] border border-[#C6F24E]/30 backdrop-blur-xl">
              <CardContent className="py-10 px-8 text-center">
                <p className="eyebrow mb-4 justify-center">// DAILY</p>
                <div className="w-14 h-14 mx-auto mb-5 bg-[#C6F24E]/15 rounded-2xl flex items-center justify-center">
                  <Mail className="w-7 h-7 text-[#C6F24E]" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
                  Get New Skills Every Week
                </h3>
                <p className="text-slate-300 mb-6 max-w-lg mx-auto">
                  Get weekly curated AI skills, agent blueprints, and automation playbooks — straight to your inbox.
                </p>
                {emailSubmitted ? (
                  <div className="flex items-center justify-center gap-2 text-[#C6F24E] font-semibold">
                    <Check className="w-5 h-5" />
                    You're in! Check your inbox for a welcome email.
                  </div>
                ) : (
                  <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto">
                    <Input
                      type="email"
                      placeholder="Enter your email..."
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-[#0A0C0D] border-[#262B2D] text-white placeholder:text-slate-500 focus:border-[#C6F24E]/50"
                    />
                    <Button type="submit" className="bg-[#C6F24E] hover:bg-[#A6D62E] text-[#0A0C0D] font-semibold whitespace-nowrap px-6 shadow-lg shadow-lime-500/20">
                      Subscribe Free
                    </Button>
                  </form>
                )}
                <p className="text-xs text-slate-500 mt-3">No spam, ever. Unsubscribe anytime.</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 px-4 border-t border-[#262B2D]">
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-wrap items-center justify-center gap-8 text-[#5A615D]">
            <div className="flex items-center gap-2 text-[#ECEFEA]">
              <Github className="w-5 h-5" />
              <span className="font-mono text-xs tracking-wider uppercase">100% open-source tools</span>
            </div>
            <div className="flex items-center gap-2 text-[#ECEFEA]">
              <Star className="w-5 h-5" />
              <span className="font-mono text-xs tracking-wider uppercase">Live GitHub stars & forks</span>
            </div>
            <div className="flex items-center gap-2 text-[#ECEFEA]">
              <Check className="w-5 h-5" />
              <span className="font-mono text-xs tracking-wider uppercase">Quality-gated (≥8/10)</span>
            </div>
            <div className="flex items-center gap-2 text-[#ECEFEA]">
              <TrendingUp className="w-5 h-5" />
              <span className="font-mono text-xs tracking-wider uppercase">Refreshed daily</span>
            </div>
            <div className="flex items-center gap-2 text-[#ECEFEA]">
              <Check className="w-5 h-5" />
              <span className="font-mono text-xs tracking-wider uppercase">No fake reviews or metrics</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomeClient
