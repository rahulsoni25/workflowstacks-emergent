'use client'

import { useState } from 'react'
import { Lock, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

// Validation dashboard — the funnel in real numbers, gated by the admin secret.
// Turns the subjective "2/10" into an objective, moving metric.
export default function ValidationDashboard() {
  const [secret, setSecret] = useState('')
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    setBusy(true); setErr('')
    try {
      const res = await fetch('/api/validation-stats', { headers: { 'x-admin-secret': secret } })
      if (!res.ok) throw new Error(res.status === 401 ? 'Wrong secret' : 'Failed to load')
      setData(await res.json())
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  const f = data?.funnel || {}
  const rungs = [
    { label: 'Recommender goals logged', value: f.recommender_goals_logged },
    { label: 'Template downloads', value: f.template_downloads, key: true },
    { label: '↳ personalized', value: f.personalized_downloads, sub: true },
    { label: 'Emails captured at download', value: f.emails_captured },
    { label: 'Did-it-work asked', value: f.did_it_work_asked },
    { label: 'Did-it-work: YES 👍', value: f.did_it_work_yes, good: true },
    { label: 'Did-it-work: no 👎', value: f.did_it_work_no },
    { label: 'Did-it-work rate', value: f.did_it_work_rate == null ? '—' : `${f.did_it_work_rate}%`, key: true },
    { label: 'DFY requests (intent)', value: f.dfy_requests },
    { label: 'Purchases 💰', value: f.purchases, good: true, key: true },
  ]

  return (
    <div className="min-h-screen bg-neptune text-white">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Validation dashboard</h1>
        <p className="text-slate-400 mb-8">The funnel in real numbers. The score rises with a real “it worked”, downloads that happen on their own, and a first sale.</p>

        {!data ? (
          <Card className="bg-[#101314] border-[#262B2D] max-w-md">
            <CardContent className="py-6">
              <label className="flex items-center gap-2 text-sm text-slate-300 mb-2"><Lock className="w-4 h-4" />Admin secret</label>
              <div className="flex gap-2">
                <Input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()}
                  placeholder="ADMIN_SECRET" className="bg-slate-950/60 border-slate-700 text-white" />
                <Button onClick={load} disabled={busy} className="bg-[#C6F24E] text-[#0A0C0D] hover:bg-[#A6D62E]">{busy ? '…' : 'Load'}</Button>
              </div>
              {err && <p className="text-sm text-amber-400 mt-2">{err}</p>}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex justify-end mb-4">
              <Button onClick={load} disabled={busy} className="bg-white/5 border border-[#323A3C] text-white hover:bg-white/10 text-sm">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Refresh
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-10">
              {rungs.map((r) => (
                <Card key={r.label} className={`bg-[#101314] border ${r.key ? 'border-[#C6F24E]/30' : 'border-[#262B2D]'} ${r.sub ? 'opacity-70' : ''}`}>
                  <CardContent className="py-4">
                    <div className={`text-2xl font-bold ${r.good && r.value > 0 ? 'text-[#C6F24E]' : 'text-white'}`}>{r.value ?? 0}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{r.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Fake-door demand (unbuilt tools)</h2>
            <div className="space-y-1 mb-10">
              {(data.fake_door_interest || []).length === 0 && <p className="text-slate-500 text-sm">No signups yet.</p>}
              {(data.fake_door_interest || []).map((t) => (
                <div key={t.tool} className="flex justify-between text-sm border-b border-[#262B2D] py-2">
                  <span className="text-slate-300">{t.tool}</span><span className="text-[#C6F24E] font-semibold">{t.signups} votes</span>
                </div>
              ))}
            </div>

            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Downloads by template</h2>
            <div className="space-y-1">
              {(data.per_template_downloads || []).length === 0 && <p className="text-slate-500 text-sm">No downloads yet — the net is set; go get the first users.</p>}
              {(data.per_template_downloads || []).map((t) => (
                <div key={t.slug} className="flex justify-between text-sm border-b border-[#262B2D] py-2">
                  <span className="text-slate-300">{t.slug}</span><span className="text-slate-400">{t.count}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
