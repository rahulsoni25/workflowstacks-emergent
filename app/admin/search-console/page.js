'use client'

import { useState } from 'react'
import { Lock, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

// Search Console, in the admin. Same secret as /admin/validation.
// Reads /api/gsc, which talks to Google with a read-only credential.

const WINDOWS = [7, 28, 90]

function pct(n) {
  if (n == null) return null
  return `${n > 0 ? '+' : ''}${n}%`
}

function Tile({ label, value, change, suffix = '' }) {
  const up = change != null && change > 0
  const down = change != null && change < 0
  return (
    <Card className="bg-[#101314] border border-[#262B2D]">
      <CardContent className="py-4">
        <div className="text-2xl font-bold text-white">{value}{suffix}</div>
        <div className="text-xs text-text-muted mt-0.5">{label}</div>
        {change != null && (
          <div className={`text-xs mt-1.5 flex items-center gap-1 ${up ? 'text-[#C6F24E]' : down ? 'text-amber-400' : 'text-text-muted'}`}>
            {up ? <ArrowUp className="w-3 h-3" /> : down ? <ArrowDown className="w-3 h-3" /> : null}
            {pct(change)} <span className="text-text-muted">vs previous period</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RowTable({ title, data }) {
  if (!data?.rows?.length) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-3">{title}</h2>
        <p className="text-sm text-text-muted">No rows in this window.</p>
      </div>
    )
  }
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      <div className="overflow-x-auto rounded-lg border border-[#262B2D]">
        <table className="w-full text-sm">
          <thead className="bg-[#101314] text-text-muted">
            <tr>
              <th className="text-left font-medium px-3 py-2">{data.dimension}</th>
              <th className="text-right font-medium px-3 py-2">Clicks</th>
              <th className="text-right font-medium px-3 py-2">Impr.</th>
              <th className="text-right font-medium px-3 py-2">CTR</th>
              <th className="text-right font-medium px-3 py-2">Pos.</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.key} className="border-t border-[#1B1F20]">
                <td className="px-3 py-2 text-text-secondary max-w-[420px] truncate" title={r.key}>{r.key}</td>
                <td className="px-3 py-2 text-right text-white">{r.clicks}</td>
                <td className="px-3 py-2 text-right text-text-secondary">{r.impressions}</td>
                <td className="px-3 py-2 text-right text-text-secondary">{r.ctr}%</td>
                <td className="px-3 py-2 text-right text-text-secondary">{r.position}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function SearchConsoleDashboard() {
  const [secret, setSecret] = useState('')
  const [days, setDays] = useState(28)
  const [status, setStatus] = useState(null)
  const [data, setData] = useState(null)
  const [queries, setQueries] = useState(null)
  const [pages, setPages] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function call(action, extra = '') {
    const res = await fetch(`/api/gsc?action=${action}&days=${days}${extra}`, { headers: { 'x-admin-secret': secret } })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(res.status === 401 ? 'Wrong secret' : (json.hint || json.message || json.error || `Failed (${res.status})`))
    }
    return json
  }

  async function load(nextDays = days) {
    setBusy(true); setErr('')
    try {
      const st = await call('status')
      setStatus(st)
      const [o, q, p] = await Promise.all([call('overview'), call('queries', '&limit=25'), call('pages', '&limit=25')])
      setData(o); setQueries(q); setPages(p)
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  function changeWindow(d) {
    setDays(d)
    if (data) setTimeout(() => load(d), 0)
  }

  const t = data?.totals

  return (
    <div className="min-h-screen bg-neptune text-white">
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <h1 className="text-3xl font-bold mb-2">Search Console</h1>
        <p className="text-text-muted mb-8">
          Organic search, read straight from Google. Windows end {data?.lag_days ?? 2} days back — Search Console finalises data on a lag, so a window ending today always looks like a dip.
        </p>

        {!data ? (
          <Card className="bg-[#101314] border-[#262B2D] max-w-md">
            <CardContent className="py-6">
              <label className="flex items-center gap-2 text-sm text-text-secondary mb-2"><Lock className="w-4 h-4" />Admin secret</label>
              <div className="flex gap-2">
                <Input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()}
                  placeholder="ADMIN_SECRET" className="bg-slate-950/60 border-slate-700 text-white" />
                <Button onClick={() => load()} disabled={busy} className="bg-[#C6F24E] text-[#0A0C0D] hover:bg-[#A6D62E]">{busy ? '…' : 'Load'}</Button>
              </div>
              {err && <p className="text-sm text-amber-400 mt-3 leading-relaxed">{err}</p>}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="text-xs text-text-muted">
                {status?.site_url} · {status?.auth_mode} · {data.window?.startDate} → {data.window?.endDate}
              </div>
              <div className="flex items-center gap-2">
                {WINDOWS.map((d) => (
                  <Button key={d} onClick={() => changeWindow(d)} disabled={busy}
                    className={`text-sm ${d === days ? 'bg-[#C6F24E] text-[#0A0C0D] hover:bg-[#A6D62E]' : 'bg-white/5 border border-[#323A3C] text-white hover:bg-white/10'}`}>
                    {d}d
                  </Button>
                ))}
                <Button onClick={() => load()} disabled={busy} className="bg-white/5 border border-[#323A3C] text-white hover:bg-white/10 text-sm">
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Refresh
                </Button>
              </div>
            </div>

            {err && <p className="text-sm text-amber-400 mb-4">{err}</p>}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              <Tile label="Clicks" value={t.clicks} change={data.change_pct?.clicks} />
              <Tile label="Impressions" value={t.impressions} change={data.change_pct?.impressions} />
              <Tile label="CTR" value={t.ctr} suffix="%" change={data.change_pct?.ctr} />
              <Tile label="Avg. position" value={t.position} change={data.change_pct?.position} />
            </div>

            {data.daily?.length > 0 && (
              <div className="h-64 mb-10 rounded-lg border border-[#262B2D] bg-[#101314] p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.daily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262B2D" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickMargin={6} />
                    <YAxis stroke="#64748b" fontSize={11} width={40} />
                    <Tooltip contentStyle={{ background: '#0A0C0D', border: '1px solid #262B2D', borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="impressions" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
                    <Area type="monotone" dataKey="clicks" stroke="#C6F24E" fill="#C6F24E" fillOpacity={0.25} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="space-y-10">
              <RowTable title="Top queries" data={queries} />
              <RowTable title="Top pages" data={pages} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
