'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Package, Users, Target, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

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
      'Founder': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      'Marketer': 'bg-pink-500/10 text-pink-500 border-pink-500/20',
      'Developer': 'bg-green-500/10 text-green-500 border-green-500/20',
      'Creator': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      'Agency': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      'Student': 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'
    }
    return colors[audience] || 'bg-gray-500/10 text-gray-500 border-gray-500/20'
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

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl mb-4">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Starter Packs</h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Curated bundles of AI skills for common use cases. Pick a pack and start building instantly!
          </p>
        </div>

        {/* Packs Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 mt-4">Loading packs...</p>
          </div>
        ) : packs.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-xl">No packs available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packs.map((pack) => (
              <Card key={pack.id} className="bg-black/40 border-white/10 backdrop-blur-xl hover:border-purple-500/50 transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between mb-3">
                    <Badge className={`${getAudienceColor(pack.audience)} border`}>
                      <Users className="w-3 h-3 mr-1" />
                      {pack.audience}
                    </Badge>
                    <Badge variant="outline" className="border-white/20 text-gray-300">
                      {pack.skillIds?.length || 0} skills
                    </Badge>
                  </div>
                  <CardTitle className="text-white text-xl">{pack.name}</CardTitle>
                  <CardDescription className="text-gray-400">
                    {pack.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Target className="w-4 h-4" />
                    <span>{pack.useCase}</span>
                  </div>
                  <Link href={`/packs/${pack.id}`} className="block">
                    <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                      View Pack
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
