'use client'

import { useState } from 'react'
import { ArrowLeft, Star, Github, Code2, User, Calendar, Package, Zap, Copy, CheckCircle2, Lightbulb, ListChecks, PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { motion } from 'framer-motion'

function getCategoryColor(cat) {
  const colors = {
    'claude-skill': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    'gemini-extension': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'mcp-server': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    prompt: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'ai-agent': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  }
  return colors[cat] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'
}

export default function SkillDetailClient({ skill }) {
  const [copied, setCopied] = useState(false)
  const guide = skill.use_guide || null
  const score = typeof skill.rewrite_score === 'number' ? skill.rewrite_score : null

  const copyPrompt = async () => {
    if (guide?.examplePrompt) {
      await navigator.clipboard.writeText(guide.examplePrompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/skills">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Skills
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 space-y-6">
            <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-xl">
              <CardHeader>
                <div className="flex items-start justify-between mb-4">
                  <Badge className={`${getCategoryColor(skill.category)} border`}>{skill.category}</Badge>
                  {skill.is_premium && (
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 border-0 text-white text-lg px-4 py-1">${skill.price}</Badge>
                  )}
                </div>
                <CardTitle className="text-4xl text-white mb-2">{skill.title_human || skill.name}</CardTitle>
                <CardDescription className="text-xl text-slate-300">{skill.description_human || skill.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Trust strip — verifiable signals (vs competitors' self-attestation) */}
                <div className="flex flex-wrap items-center gap-3">
                  {skill.github_stars > 0 && (
                    <span className="flex items-center gap-1.5 text-sm bg-slate-800/60 border border-slate-700/50 rounded-full px-3 py-1 text-slate-200">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />{skill.github_stars.toLocaleString()} stars
                    </span>
                  )}
                  {skill.github_forks > 0 && (
                    <span className="flex items-center gap-1.5 text-sm bg-slate-800/60 border border-slate-700/50 rounded-full px-3 py-1 text-slate-200">
                      <Github className="w-4 h-4" />{skill.github_forks.toLocaleString()} forks
                    </span>
                  )}
                  {skill.language && (
                    <span className="flex items-center gap-1.5 text-sm bg-slate-800/60 border border-slate-700/50 rounded-full px-3 py-1 text-slate-300">
                      <Code2 className="w-4 h-4" />{skill.language}
                    </span>
                  )}
                  {score !== null && (
                    <span className="flex items-center gap-1.5 text-sm bg-teal-500/10 border border-teal-500/30 rounded-full px-3 py-1 text-teal-300">
                      <CheckCircle2 className="w-4 h-4" />Quality {score}/10
                    </span>
                  )}
                  {skill.last_updated && (
                    <span className="flex items-center gap-1.5 text-sm bg-slate-800/60 border border-slate-700/50 rounded-full px-3 py-1 text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />Updated {new Date(skill.last_updated).toLocaleDateString()}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-sm text-emerald-300">100% free · open source</span>
                </div>

                <Separator className="bg-slate-700/50" />

                {/* How to use it — the on-page deliverable (Smithery/Claw Mart-grade) */}
                {guide ? (
                  <div className="space-y-6">
                    {guide.whatItDoes && (
                      <div className="bg-slate-800/40 rounded-lg p-4 border border-slate-700/50">
                        <div className="flex items-center gap-2 text-teal-300 font-semibold mb-1"><Lightbulb className="w-4 h-4" />What it does</div>
                        <p className="text-slate-200">{guide.whatItDoes}</p>
                      </div>
                    )}
                    {guide.whenToUse?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 text-white font-semibold mb-2"><ListChecks className="w-4 h-4 text-teal-400" />When to use it</div>
                        <ul className="space-y-1.5">
                          {guide.whenToUse.map((w, i) => (
                            <li key={i} className="flex items-start gap-2 text-slate-300"><span className="text-teal-400 mt-1">•</span>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {guide.quickStart?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 text-white font-semibold mb-3"><PlayCircle className="w-4 h-4 text-teal-400" />Quick start</div>
                        <ol className="space-y-2">
                          {guide.quickStart.map((s, i) => (
                            <li key={i} className="flex items-start gap-3 text-slate-300">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-500/15 text-teal-300 text-sm flex items-center justify-center font-semibold">{i + 1}</span>
                              <span className="pt-0.5">{s}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {guide.examplePrompt && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-semibold">Ready-to-paste prompt</span>
                          <Button onClick={copyPrompt} variant="outline" size="sm" className="border-teal-500/30 text-teal-300 hover:bg-teal-500/10">
                            {copied ? <><CheckCircle2 className="w-4 h-4 mr-1.5" />Copied</> : <><Copy className="w-4 h-4 mr-1.5" />Copy</>}
                          </Button>
                        </div>
                        <div className="bg-slate-950/60 rounded-lg p-4 border border-slate-800">
                          <pre className="text-slate-300 whitespace-pre-wrap font-mono text-sm">{guide.examplePrompt}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-4">About this skill</h3>
                    {skill.readme_preview ? (
                      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                        <pre className="text-slate-300 whitespace-pre-wrap font-mono text-sm">{skill.readme_preview}</pre>
                      </div>
                    ) : (
                      <p className="text-slate-400">{skill.description_human || skill.description || 'No additional information available.'}</p>
                    )}
                  </div>
                )}
                {skill.github_topics?.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Topics</h3>
                    <div className="flex flex-wrap gap-2">
                      {skill.github_topics.map((topic, idx) => (
                        <Badge key={idx} variant="outline" className="border-slate-600 text-slate-300">{topic}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-6">
            <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-xl">
              <CardHeader><CardTitle className="text-white">Quick Actions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {skill.is_premium ? (
                  <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white" size="lg">Purchase for ${skill.price}</Button>
                ) : (
                  <Button onClick={() => skill.github_url && window.open(skill.github_url, '_blank')} className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/20" size="lg">
                    <Github className="w-4 h-4 mr-2" />Get it Free on GitHub
                  </Button>
                )}
                <Link href={`/builder?skill=${skill.id}`} className="block">
                  <Button variant="outline" className="w-full border-teal-500/30 text-teal-300 hover:bg-teal-500/10">
                    <Zap className="w-4 h-4 mr-2" />Use in Agent Builder
                  </Button>
                </Link>
                {skill.github_url && (
                  <Button variant="outline" className="w-full border-slate-600 text-slate-200 hover:bg-white/5" onClick={() => window.open(skill.github_url, '_blank')}>
                    <Github className="w-4 h-4 mr-2" />View on GitHub
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-xl">
              <CardHeader><CardTitle className="text-white">Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3"><User className="w-5 h-5 text-slate-400 mt-0.5" /><div><div className="text-sm text-slate-500">Creator</div><div className="text-white font-medium">{skill.creator}</div></div></div>
                {skill.language && <div className="flex items-start gap-3"><Code2 className="w-5 h-5 text-slate-400 mt-0.5" /><div><div className="text-sm text-slate-500">Language</div><div className="text-white font-medium">{skill.language}</div></div></div>}
                <div className="flex items-start gap-3"><Package className="w-5 h-5 text-slate-400 mt-0.5" /><div><div className="text-sm text-slate-500">Category</div><div className="text-white font-medium">{skill.category}</div></div></div>
                {skill.created_at && <div className="flex items-start gap-3"><Calendar className="w-5 h-5 text-slate-400 mt-0.5" /><div><div className="text-sm text-slate-500">Published</div><div className="text-white font-medium">{new Date(skill.created_at).toLocaleDateString()}</div></div></div>}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
