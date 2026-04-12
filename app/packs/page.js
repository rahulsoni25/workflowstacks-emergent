'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Package, Users, Target, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function PacksPage() {
  const [packs, setPacks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPacks()
  }, [])

  const loadPacks = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/packs')
      const data = await res.json()
      setPacks(data.packs || [])
    } catch (e) {
      console.error('Error loading packs:', e)
    }
    setLoading(false)
  }

  const getAudienceColor = (audience) => {
    const colors = {
      'Founder': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      'Marketer': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
      'Developer': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      'Creator': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      'Agency': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      'Student': 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    }
    return colors[audience] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'
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

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl mb-4 shadow-lg shadow-teal-500/20">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">Starter Packs</h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Curated bundles of AI skills for common use cases. Pick a pack and start building instantly!
          </p>
        </motion.div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-14 h-14 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : packs.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-400 text-xl">No packs available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packs.map((pack, i) => (
              <motion.div key={pack.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-xl hover:border-teal-500/40 transition-all duration-300 h-full flex flex-col">
                  <CardHeader className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <Badge className={`${getAudienceColor(pack.audience)} border`}>
                        <Users className="w-3 h-3 mr-1" />
                        {pack.audience}
                      </Badge>
                      <Badge variant="outline" className="border-slate-600 text-slate-300">
                        {pack.skillIds?.length || 0} skills
                      </Badge>
                    </div>
                    <CardTitle className="text-white text-xl">{pack.name}</CardTitle>
                    <CardDescription className="text-slate-400">{pack.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Target className="w-4 h-4" />
                      <span>{pack.useCase}</span>
                    </div>
                    <Link href={`/packs/${pack.id}`} className="block">
                      <Button className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/20">
                        View Pack
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
