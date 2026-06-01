import Link from 'next/link'
import { ArrowLeft, Linkedin, MapPin, Star, Globe, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks-emergent.vercel.app'

export const metadata = {
  title: 'Featured Members — Global AI Builder Network | WorkflowStacks',
  description: 'A global network of AI builders — developers, AI micro-SaaS founders, influencers, indie hackers and more. Join free via LinkedIn and get featured.',
  alternates: { canonical: '/members' },
}

export const revalidate = 120

// Member categories — the pools that make up the network
export const MEMBER_CATEGORIES = [
  'AI Micro-SaaS Founder', 'Developer', 'AI Influencer', 'Indie Hacker',
  'Agency / Studio', 'No-Code Builder', 'Investor / Angel', 'Community Builder',
]

const CAT_COLOR = {
  'AI Micro-SaaS Founder': 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  Developer: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  'AI Influencer': 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
  'Indie Hacker': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'Agency / Studio': 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  'No-Code Builder': 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  'Investor / Angel': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'Community Builder': 'bg-rose-500/15 text-rose-300 border-rose-500/30',
}

async function getMembers() {
  try {
    const res = await fetch(`${BASE}/api/members`, { next: { revalidate: 120 } })
    if (!res.ok) return []
    const d = await res.json()
    return d.members || []
  } catch {
    return []
  }
}

function MemberCard({ m }) {
  return (
    <Card className="bg-slate-900/60 border-slate-700/50 hover:border-teal-500/40 transition-all h-full">
      <CardContent className="py-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500/30 to-cyan-500/30 flex items-center justify-center text-white font-bold shrink-0">
              {(m.name || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-white font-semibold truncate">{m.name}</div>
              {m.country && <div className="text-slate-500 text-xs flex items-center gap-1"><MapPin className="w-3 h-3" />{m.country}</div>}
            </div>
          </div>
          {m.featured && <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />}
        </div>
        <Badge className={`${CAT_COLOR[m.category] || 'bg-slate-700/50 text-slate-300 border-slate-600'} border text-xs mb-2`}>{m.category}</Badge>
        {m.headline && <p className="text-slate-300 text-sm line-clamp-2 mb-1">{m.headline}</p>}
        {m.builds && <p className="text-slate-500 text-xs line-clamp-1 mb-3">Builds: {m.builds}</p>}
        <a href={m.linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-sky-400 hover:text-sky-300">
          <Linkedin className="w-4 h-4" />Connect on LinkedIn
        </a>
      </CardContent>
    </Card>
  )
}

export default async function MembersPage() {
  const members = await getMembers()
  const countries = new Set(members.map((m) => m.country).filter(Boolean))

  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/"><Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5"><ArrowLeft className="w-4 h-4 mr-2" />Home</Button></Link>
          <Link href="/join"><Button className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white"><UserPlus className="w-4 h-4 mr-2" />Become a member</Button></Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-full px-4 py-1.5 mb-4">
            <Globe className="w-4 h-4 text-teal-400" />
            <span className="text-teal-300 text-sm font-medium">{members.length} members{countries.size > 0 ? ` · ${countries.size} countries` : ''}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">The AI Builder Network</h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-6">
            A global community of <strong className="text-teal-300">AI micro-SaaS founders, developers, influencers, indie hackers</strong> and more — building with AI in public. Free to join via LinkedIn.
          </p>
          <Link href="/join"><Button size="lg" className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white"><UserPlus className="w-4 h-4 mr-2" />Get featured — join free</Button></Link>
        </div>

        {members.length === 0 ? (
          <Card className="bg-slate-900/60 border-slate-700/50 max-w-lg mx-auto">
            <CardContent className="py-16 text-center">
              <Globe className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-300 text-lg mb-2">Be the first member of the network.</p>
              <Link href="/join"><Button className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white">Claim your spot</Button></Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-12">
            {MEMBER_CATEGORIES.map((cat) => {
              const inCat = members.filter((m) => m.category === cat)
              if (inCat.length === 0) return null
              return (
                <section key={cat}>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-2xl font-bold text-white">{cat}s <span className="text-slate-500 text-lg font-normal">· {inCat.length}</span></h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {inCat.slice(0, 12).map((m) => <MemberCard key={m.id} m={m} />)}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
