'use client'

import { useState, useEffect, useCallback } from 'react'
import { Lock, RefreshCw, CheckCircle2, Copy, TrendingUp, Users, Wrench, Megaphone, UserCheck, Key, Mail, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function AdminPage() {
  const [secret, setSecret] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [err, setErr] = useState('')
  const [demand, setDemand] = useState(null)
  const [pending, setPending] = useState([])
  const [busy, setBusy] = useState('')
  const [copied, setCopied] = useState('')
  const [creatorApps, setCreatorApps] = useState([])
  const [apiKeyModal, setApiKeyModal] = useState(null) // { name, key }
  const [toast, setToast] = useState('')
  const [activeTab, setActiveTab] = useState('deals')

  const hdr = useCallback(() => ({ 'x-admin-secret': secret }), [secret])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000) }

  const loadAll = useCallback(async (s) => {
    const h = { 'x-admin-secret': s }
    const [dRes, pRes, caRes] = await Promise.all([
      fetch('/api/demand', { headers: h }),
      fetch('/api/approve-deals', { headers: h }),
      fetch('/api/creator-applications', { headers: h }),
    ])
    if (dRes.status === 401) { setErr('Wrong secret'); return false }
    setDemand(await dRes.json())
    setPending((await pRes.json()).pending || [])
    const caData = await caRes.json()
    setCreatorApps(caData.applications || caData || [])
    return true
  }, [])

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem('ws_admin') : ''
    if (saved) { setSecret(saved); loadAll(saved).then((ok) => ok && setUnlocked(true)) }
  }, [loadAll])

  const unlock = async () => {
    setErr('')
    const ok = await loadAll(secret)
    if (ok) { sessionStorage.setItem('ws_admin', secret); setUnlocked(true) }
  }

  const action = async (label, url) => {
    setBusy(label)
    try { await fetch(url, { headers: hdr() }); await loadAll(secret) } finally { setBusy('') }
  }

  const approveDeal = (id) => action('approve', `/api/approve-deals?id=${id}`)
  const copyEmails = (emails, key) => { navigator.clipboard.writeText(emails.join(', ')); setCopied(key); setTimeout(() => setCopied(''), 1500) }

  const approveCreator = async (app) => {
    setBusy(`creator-${app.id}`)
    try {
      const res = await fetch('/api/creator-applications/approve', {
        method: 'POST',
        headers: { 'x-admin-secret': secret, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: app.id }),
      })
      const data = await res.json()
      if (data.api_key) {
        setApiKeyModal({ name: app.name || app.email, key: data.api_key })
      } else {
        showToast(data.error || 'Approved (no key returned)')
      }
      await loadAll(secret)
    } finally { setBusy('') }
  }

  const findCreators = async () => {
    setBusy('find-creators')
    try {
      const res = await fetch('/api/find-creators', { headers: hdr() })
      const data = await res.json()
      const count = data.count ?? data.found ?? (Array.isArray(data) ? data.length : null)
      showToast(count !== null ? `Found ${count} creator(s)` : 'Done — check server logs')
    } finally { setBusy('') }
  }

  const sendNewsletter = async () => {
    setBusy('newsletter')
    try {
      const res = await fetch('/api/newsletter/send', { headers: hdr() })
      const data = await res.json()
      showToast(data.message || data.result || `Sent to ${data.sent ?? '?'} subscriber(s)`)
    } finally { setBusy('') }
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-neptune flex items-center justify-center px-4">
        <Card className="bg-slate-900/60 border-slate-700/50 w-full max-w-sm">
          <CardContent className="py-8 text-center">
            <Lock className="w-10 h-10 text-teal-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-1">Admin</h1>
            <p className="text-slate-400 text-sm mb-6">Enter your admin secret to continue.</p>
            <Input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && unlock()} placeholder="ADMIN_SECRET" className="bg-slate-800/50 border-slate-700 text-white mb-3" />
            {err && <p className="text-red-400 text-sm mb-3">{err}</p>}
            <Button onClick={unlock} className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white">Unlock</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const deals = demand?.deals || []
  const topRequests = demand?.topRequests || []

  return (
    <div className="min-h-screen bg-neptune">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-800 border border-teal-500/40 text-teal-300 text-sm px-4 py-2 rounded-lg shadow-xl">
          {toast}
        </div>
      )}

      {/* API key modal */}
      {apiKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-5 h-5 text-teal-400" />
              <h2 className="text-white font-semibold">API key for {apiKeyModal.name}</h2>
            </div>
            <p className="text-slate-400 text-xs mb-2">Share this key with the creator. It won't be shown again.</p>
            <div className="bg-slate-800 rounded-lg px-3 py-2 font-mono text-sm text-teal-300 break-all mb-4">{apiKeyModal.key}</div>
            <div className="flex gap-2 justify-end">
              <Button onClick={() => { navigator.clipboard.writeText(apiKeyModal.key); showToast('Copied!') }} variant="outline" size="sm" className="border-slate-600 text-slate-300"><Copy className="w-3.5 h-3.5 mr-1" />Copy</Button>
              <Button onClick={() => setApiKeyModal(null)} size="sm" className="bg-teal-600 text-white">Done</Button>
            </div>
          </div>
        </div>
      )}

      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-white font-bold">Admin</h1>
            <nav className="flex gap-1">
              {[
                { id: 'deals', label: 'Deals' },
                { id: 'creators', label: 'Creator Applications' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === t.id ? 'bg-teal-500/20 text-teal-300' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => loadAll(secret)} variant="ghost" size="sm" className="text-slate-300"><RefreshCw className="w-4 h-4 mr-1.5" />Refresh</Button>
            <Button onClick={() => { sessionStorage.removeItem('ws_admin'); setUnlocked(false) }} variant="ghost" size="sm" className="text-slate-400">Lock</Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">

        {/* ── DEALS TAB ── */}
        {activeTab === 'deals' && <>
          {/* Top requested tools — who to pitch next */}
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader><CardTitle className="text-white flex items-center gap-2"><TrendingUp className="w-5 h-5 text-teal-400" />Most-wanted tools — pitch these vendors next</CardTitle></CardHeader>
            <CardContent>
              {topRequests.length === 0 ? <p className="text-slate-500 text-sm">No requests yet.</p> : (
                <div className="flex flex-wrap gap-2">
                  {topRequests.map((r) => (
                    <Badge key={r.tool} className="bg-teal-500/10 text-teal-300 border-teal-500/30 border text-sm py-1">{r.tool} · {r.votes}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending deal submissions */}
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader><CardTitle className="text-white flex items-center gap-2"><Megaphone className="w-5 h-5 text-amber-400" />Pending submissions ({pending.length})</CardTitle></CardHeader>
            <CardContent>
              {pending.length === 0 ? <p className="text-slate-500 text-sm">Nothing to review.</p> : (
                <div className="space-y-3">
                  {pending.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
                      <div className="min-w-0">
                        <div className="text-white font-medium">{p.tool} <span className="text-slate-500 text-xs">· {p.company || '—'} · {p.dealType} · {p.savingsPct || 0}% off</span></div>
                        <div className="text-slate-400 text-xs truncate">{p.contactEmail} {p.link ? `· ${p.link}` : ''}</div>
                      </div>
                      <Button onClick={() => approveDeal(p.id)} disabled={busy === 'approve'} size="sm" className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white shrink-0">Approve</Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reservations per deal — your launch + leverage list */}
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader><CardTitle className="text-white flex items-center gap-2"><Users className="w-5 h-5 text-teal-400" />Deal reservations (your leverage)</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {deals.map((d) => (
                  <div key={d.id} className="flex items-center justify-between bg-slate-800/30 rounded-lg p-3">
                    <div>
                      <span className="text-white text-sm font-medium">{d.tool}</span>
                      <Badge className="ml-2 bg-slate-700/50 text-slate-300 border-slate-600 text-xs">{d.status}</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-300 text-sm"><strong className="text-teal-300">{d.reservations}</strong> reserved</span>
                      {d.reservations > 0 && (
                        <Button onClick={() => copyEmails(d.reservationEmails, d.id)} variant="outline" size="sm" className="border-slate-600 text-slate-300">
                          {copied === d.id ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Copied</> : <><Copy className="w-3.5 h-3.5 mr-1" />Emails</>}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Maintenance */}
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader><CardTitle className="text-white flex items-center gap-2"><Wrench className="w-5 h-5 text-slate-400" />Maintenance</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button onClick={() => action('approve-all', '/api/approve-deals?id=all')} disabled={busy === 'approve-all'} variant="outline" className="border-slate-600 text-slate-200">Approve all deals</Button>
              <Button onClick={() => action('reclassify', '/api/reclassify')} disabled={busy === 'reclassify'} variant="outline" className="border-slate-600 text-slate-200">{busy === 'reclassify' ? 'Running…' : 'Reclassify skills'}</Button>
              <Button onClick={() => action('dedupe', '/api/dedupe')} disabled={busy === 'dedupe'} variant="outline" className="border-slate-600 text-slate-200">{busy === 'dedupe' ? 'Running…' : 'Dedupe'}</Button>
              <Button onClick={sendNewsletter} disabled={busy === 'newsletter'} variant="outline" className="border-slate-600 text-slate-200 flex items-center gap-1.5">
                <Mail className="w-4 h-4" />{busy === 'newsletter' ? 'Sending…' : 'Send Newsletter Now'}
              </Button>
            </CardContent>
          </Card>
        </>}

        {/* ── CREATOR APPLICATIONS TAB ── */}
        {activeTab === 'creators' && <>
          {/* Utility actions */}
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader><CardTitle className="text-white flex items-center gap-2"><UserCheck className="w-5 h-5 text-teal-400" />Creator tools</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button onClick={findCreators} disabled={busy === 'find-creators'} variant="outline" className="border-slate-600 text-slate-200 flex items-center gap-1.5">
                <Search className="w-4 h-4" />{busy === 'find-creators' ? 'Searching…' : 'Find Creators'}
              </Button>
              <Button onClick={sendNewsletter} disabled={busy === 'newsletter'} variant="outline" className="border-slate-600 text-slate-200 flex items-center gap-1.5">
                <Mail className="w-4 h-4" />{busy === 'newsletter' ? 'Sending…' : 'Send Newsletter Now'}
              </Button>
            </CardContent>
          </Card>

          {/* Applications list */}
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-cyan-400" />
                Creator Applications ({creatorApps.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {creatorApps.length === 0 ? (
                <p className="text-slate-500 text-sm">No applications yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-700/50">
                        <th className="text-left font-medium pb-2 pr-4">Name</th>
                        <th className="text-left font-medium pb-2 pr-4">Email</th>
                        <th className="text-left font-medium pb-2 pr-4">GitHub</th>
                        <th className="text-left font-medium pb-2 pr-4">What they want to list</th>
                        <th className="text-left font-medium pb-2 pr-4">Status</th>
                        <th className="text-left font-medium pb-2 pr-4">Applied</th>
                        <th className="pb-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                      {creatorApps.map((a) => {
                        const listing = a.listing_description || a.what_to_list || a.description || '—'
                        const truncated = listing.length > 80 ? listing.slice(0, 80) + '…' : listing
                        const status = a.status || 'pending'
                        const appliedDate = a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'
                        const isPending = status === 'pending'
                        return (
                          <tr key={a.id} className="text-slate-300 hover:bg-slate-800/30 transition-colors">
                            <td className="py-2.5 pr-4 font-medium text-white">{a.name || '—'}</td>
                            <td className="py-2.5 pr-4 text-slate-400">{a.email || '—'}</td>
                            <td className="py-2.5 pr-4">
                              {a.github ? (
                                <a href={`https://github.com/${a.github.replace(/^@/, '')}`} target="_blank" rel="noreferrer" className="text-teal-400 hover:underline">
                                  {a.github}
                                </a>
                              ) : '—'}
                            </td>
                            <td className="py-2.5 pr-4 text-slate-400 max-w-xs" title={listing}>{truncated}</td>
                            <td className="py-2.5 pr-4">
                              <Badge className={
                                status === 'approved' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 border' :
                                status === 'rejected' ? 'bg-red-500/15 text-red-400 border-red-500/30 border' :
                                'bg-amber-500/15 text-amber-400 border-amber-500/30 border'
                              }>{status}</Badge>
                            </td>
                            <td className="py-2.5 pr-4 text-slate-500">{appliedDate}</td>
                            <td className="py-2.5">
                              {isPending && (
                                <Button
                                  onClick={() => approveCreator(a)}
                                  disabled={busy === `creator-${a.id}`}
                                  size="sm"
                                  className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white whitespace-nowrap"
                                >
                                  {busy === `creator-${a.id}` ? 'Approving…' : 'Approve'}
                                </Button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>}

      </div>
    </div>
  )
}
