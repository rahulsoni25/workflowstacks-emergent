'use client'

import { useState } from 'react'
import { Lock, RefreshCw, ExternalLink, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

// Search Console dashboard — Google's own numbers, gated by the admin secret.
// Every figure on this page comes straight from the Search Analytics API and
// carries the property + window it was measured over; nothing is derived or
// estimated here beyond the CTR/percentage formatting.
const CARD = 'bg-[#101314] border-[#262B2D]'
const LIME = 'bg-[#C6F24E] text-[#0A0C0D] hover:bg-[#A6D62E]'

const pct = (n) => (n == null ? '—' : `${(n * 100).toFixed(1)}%`)
const num = (n) => (n == null ? '—' : n.toLocaleString())
const pos = (n) => (n == null ? '—' : n.toFixed(1))

export default function SearchConsoleDashboard() {
  const [secret, setSecret] = useState('')
  const [days, setDays] = useState(28)
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function load(nextDays = days) {
    setBusy(true); setErr('')
    try {
      const res = await fetch(`/api/gsc?action=overview&days=${nextDays}`, { headers: { 'x-admin-secret': secret } })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          res.status === 401 ? 'Wrong secret'
            : json.error === 'not_configured' ? (json.message || 'Search Console is not connected')
            : json.error || 'Failed to load'
        )
      }
      setData(json); setDays(nextDays)
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  const t = data?.totals
  const meta = data?.meta

  return (
    <div className="min-h-screen bg-neptune text-white">
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <h1 className="text-3xl font-bold mb-2">Search Console</h1>
        <p className="text-slate-400 mb-8">
          Google&apos;s own numbers for the property, straight from the Search Analytics API.
          Data finalises on a ~3-day lag, so the window ends three days back.
        </p>

        {!data ? (
          <Card className={`${CARD} max-w-md`}>
            <CardContent className="py-6">
              <label className="flex items-center gap-2 text-sm text-slate-300 mb-2"><Lock className="w-4 h-4" />Admin secret</label>
              <div className="flex gap-2">
                <Input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()}
                  placeholder="ADMIN_SECRET" className="bg-slate-950/60 border-slate-700 text-white" />
                <Button onClick={() => load()} disabled={busy} className={LIME}>{busy ? '…' : 'Load'}</Button>
              </div>
              {err && <p className="text-sm text-amber-400 mt-2">{err}</p>}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="text-xs text-slate-500">
                {meta?.property} · {meta?.startDate} → {meta?.endDate} · dataState {meta?.data_state}
              </div>
              <div className="flex gap-2">
                {[7, 28, 90].map((d) => (
                  <Button key={d} onClick={() => load(d)} disabled={busy}
                    className={`text-sm ${d === days ? LIME : 'bg-white/5 border border-[#323A3C] text-white hover:bg-white/10'}`}>
                    {d}d
                  </Button>
                ))}
                <Button onClick={() => load()} disabled={busy} className="bg-white/5 border border-[#323A3C] text-white hover:bg-white/10 text-sm">
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Refresh
                </Button>
              </div>
            </div>

            {(data.errors || []).length > 0 && (
              <div className="mb-6 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
                {data.errors.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
              {[
                { label: 'Clicks', value: num(t?.clicks) },
                { label: 'Impressions', value: num(t?.impressions) },
                { label: 'CTR', value: pct(t?.ctr) },
                { label: 'Avg. position', value: pos(t?.position) },
              ].map((s) => (
                <Card key={s.label} className={`${CARD} border-[#C6F24E]/30`}>
                  <CardContent className="py-4">
                    <div className="text-2xl font-bold text-white">{s.value}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
              <Search className="w-3.5 h-3.5" />Top queries
            </h2>
            <Table
              rows={data.top_queries}
              empty="No query rows in this window."
              head={['Query', 'Clicks', 'Impr.', 'CTR', 'Pos.']}
              render={(r) => [r.query, num(r.clicks), num(r.impressions), pct(r.ctr), pos(r.position)]}
              keyOf={(r) => r.query}
            />

            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3 mt-10">Top pages</h2>
            <Table
              rows={data.top_pages}
              empty="No page rows in this window."
              head={['Page', 'Clicks', 'Impr.', 'CTR', 'Pos.']}
              render={(r) => [
                <a key="p" href={r.page} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-[#C6F24E]">
                  {(() => { try { return new URL(r.page).pathname } catch { return r.page } })()}
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>,
                num(r.clicks), num(r.impressions), pct(r.ctr), pos(r.position),
              ]}
              keyOf={(r) => r.page}
            />

            <p className="text-xs text-slate-600 mt-10">
              Average position is impression-weighted across the window, not a live SERP slot — a 4.2 does not mean the page sits at #4 right now.
              Queries below Google&apos;s privacy threshold are omitted by the API, so per-query clicks will not sum to the site total.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function Table({ rows, head, render, keyOf, empty }) {
  if (!rows?.length) return <p className="text-slate-500 text-sm">{empty}</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[560px]">
        <thead>
          <tr className="text-slate-500 text-xs uppercase tracking-wide">
            {head.map((h, i) => <th key={h} className={`py-2 ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={keyOf(r)} className="border-t border-[#262B2D]">
              {render(r).map((cell, i) => (
                <td key={i} className={`py-2 ${i === 0 ? 'text-left text-slate-200 pr-4' : 'text-right text-slate-400 tabular-nums'}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
