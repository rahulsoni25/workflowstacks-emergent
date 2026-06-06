'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Lock, RefreshCw, Copy, Key, Mail, Search, Eye, Edit, Send, Check, X,
  LayoutDashboard, Package, Users, Shield, ExternalLink, Download, ChevronDown, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────────────────────── */

const CARD = 'bg-[#101314] border-[#262B2D]'
const LIME = 'bg-[#C6F24E] text-[#0A0C0D] hover:bg-[#A6D62E]'
const SECONDARY = 'border border-[#323A3C] text-[#ECEFEA] hover:bg-white/5 bg-transparent'

function relTime(iso) {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  const diff = Date.now() - t
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

function truncate(str, n = 60) {
  if (!str) return ''
  return str.length > n ? str.slice(0, n) + '…' : str
}

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-white/5 ${className}`} />
}

/* ─────────────────────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────────────────────── */

export default function AdminPage() {
  const [secret, setSecret] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [err, setErr] = useState('')
  const [toast, setToast] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [busy, setBusy] = useState('')

  // shared
  const [apiKeyModal, setApiKeyModal] = useState(null)

  const hdr = useCallback(() => ({ 'x-admin-secret': secret }), [secret])
  const jhdr = useCallback(() => ({ 'x-admin-secret': secret, 'Content-Type': 'application/json' }), [secret])
  const showToast = (msg) => { setToast(String(msg || '')); setTimeout(() => setToast(''), 4000) }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('ws_admin_secret') || sessionStorage.getItem('ws_admin')
    if (saved) {
      setSecret(saved)
      // Probe by calling overview
      fetch('/api/admin-overview', { headers: { 'x-admin-secret': saved } })
        .then((r) => { if (r.status !== 401) setUnlocked(true) })
        .catch(() => {})
    }
  }, [])

  const unlock = async () => {
    setErr('')
    try {
      const r = await fetch('/api/admin-overview', { headers: { 'x-admin-secret': secret } })
      if (r.status === 401) { setErr('Wrong secret'); return }
      localStorage.setItem('ws_admin_secret', secret)
      sessionStorage.setItem('ws_admin', secret)
      setUnlocked(true)
    } catch (e) {
      setErr('Network error')
    }
  }

  const lock = () => {
    localStorage.removeItem('ws_admin_secret')
    sessionStorage.removeItem('ws_admin')
    setUnlocked(false)
    setSecret('')
  }

  /* ── Locked screen ────────────────────────────────────────────────── */
  if (!unlocked) {
    return (
      <div className="min-h-screen bg-[#0A0C0D] flex items-center justify-center px-4">
        <Card className={`${CARD} w-full max-w-sm`}>
          <CardContent className="py-8 text-center">
            <Lock className="w-10 h-10 text-[#C6F24E] mx-auto mb-4" />
            <p className="text-xs uppercase tracking-widest text-[#7A8487] mb-1">// BACKEND</p>
            <h1 className="text-xl font-bold text-white mb-1">Admin Control</h1>
            <p className="text-[#7A8487] text-sm mb-6">Enter your admin secret to continue.</p>
            <Input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && unlock()}
              placeholder="ADMIN_SECRET"
              className="bg-[#0A0C0D] border-[#262B2D] text-white mb-3"
            />
            {err && <p className="text-red-400 text-sm mb-3">{err}</p>}
            <Button onClick={unlock} className={`w-full ${LIME}`}>Unlock</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  /* ── Main shell ───────────────────────────────────────────────────── */
  const TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'skills', label: 'Skills', icon: Package },
    { id: 'creators', label: 'Creators', icon: Users },
    { id: 'newsletter', label: 'Newsletter', icon: Mail },
    { id: 'audit', label: 'Audit & Security', icon: Shield },
  ]

  return (
    <div className="min-h-screen bg-[#0A0C0D]">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[100] bg-[#101314] border border-[#C6F24E]/40 text-[#C6F24E] text-sm px-4 py-2 rounded-lg shadow-2xl max-w-md">
          {toast}
        </div>
      )}

      {/* API key modal (shared) */}
      {apiKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
          <div className={`${CARD} rounded-xl p-6 max-w-md w-full border`}>
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-5 h-5 text-[#C6F24E]" />
              <h2 className="text-white font-semibold">API key for {apiKeyModal.name}</h2>
            </div>
            <p className="text-[#7A8487] text-xs mb-2">Share this key with the creator. It won&apos;t be shown again.</p>
            <div className="bg-[#0A0C0D] border border-[#262B2D] rounded-lg px-3 py-2 font-mono text-sm text-[#C6F24E] break-all mb-4">{apiKeyModal.key}</div>
            <div className="flex gap-2 justify-end">
              <Button onClick={() => { navigator.clipboard.writeText(apiKeyModal.key); showToast('Copied!') }} size="sm" className={SECONDARY}><Copy className="w-3.5 h-3.5 mr-1" />Copy</Button>
              <Button onClick={() => setApiKeyModal(null)} size="sm" className={LIME}>Done</Button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky header */}
      <header className="border-b border-[#262B2D] bg-[#0A0C0D]/90 backdrop-blur-xl sticky top-0 z-30">
        <div className="container mx-auto px-4 pt-5 pb-3 max-w-7xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#7A8487] mb-0.5">// BACKEND</p>
              <h1 className="text-white font-bold text-xl leading-none">Admin Control</h1>
            </div>
            <Button onClick={lock} size="sm" className={SECONDARY}><Lock className="w-3.5 h-3.5 mr-1.5" />Lock</Button>
          </div>
          <nav className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => {
              const Icon = t.icon
              const active = activeTab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    active ? 'bg-[#C6F24E]/15 text-[#C6F24E]' : 'text-[#7A8487] hover:text-[#ECEFEA] hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />{t.label}
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {activeTab === 'overview'   && <OverviewTab   hdr={hdr} showToast={showToast} busy={busy} setBusy={setBusy} />}
        {activeTab === 'skills'     && <SkillsTab     hdr={hdr} jhdr={jhdr} showToast={showToast} />}
        {activeTab === 'creators'   && <CreatorsTab   hdr={hdr} jhdr={jhdr} showToast={showToast} setApiKeyModal={setApiKeyModal} busy={busy} setBusy={setBusy} />}
        {activeTab === 'newsletter' && <NewsletterTab hdr={hdr} showToast={showToast} busy={busy} setBusy={setBusy} />}
        {activeTab === 'audit'      && <AuditTab      hdr={hdr} showToast={showToast} />}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   1. Overview
   ───────────────────────────────────────────────────────────────────────────── */

function OverviewTab({ hdr, showToast, busy, setBusy }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin-overview', { headers: hdr() })
      const data = await r.json()
      setStats(data)
    } catch { showToast('Failed to load overview') }
    finally { setLoading(false) }
  }, [hdr, showToast])

  useEffect(() => { load() }, [load])

  const action = async (label, url) => {
    setBusy(label)
    try {
      const r = await fetch(url, { headers: hdr() })
      const data = await r.json().catch(() => ({}))
      showToast(data.message || data.result || (r.ok ? `${label} ok` : `${label} failed`))
      if (r.ok) load()
    } catch { showToast(`${label} failed`) }
    finally { setBusy('') }
  }

  const CARDS = [
    { key: 'skills_total',      label: 'Skills (total)',     value: stats?.skills_total ?? stats?.skills?.total },
    { key: 'skills_published',  label: 'Skills (published)', value: stats?.skills_published ?? stats?.skills?.published },
    { key: 'agents_built',      label: 'Agents Built',       value: stats?.agents_built },
    { key: 'subscribers',       label: 'Subscribers',        value: stats?.subscribers },
    { key: 'members',           label: 'Members',            value: stats?.members },
    { key: 'problems',          label: 'Problems',           value: stats?.problems },
    { key: 'deals',             label: 'Deals',              value: stats?.deals },
    { key: 'creator_leads',     label: 'Creator Leads',      value: stats?.creator_leads },
    { key: 'pending_apps',      label: 'Pending Applications', value: stats?.pending_applications ?? stats?.pending_apps },
    { key: 'sends_today',       label: 'Sends Today',        value: stats?.sends_today },
  ]

  const ACTIONS = [
    { label: 'Run ingest',         url: '/api/ingest',          key: 'ingest' },
    { label: 'Refresh stars',      url: '/api/refresh-stars',   key: 'stars' },
    { label: 'Find creators',      url: '/api/find-creators',   key: 'find' },
    { label: 'Reclassify',         url: '/api/reclassify',      key: 'reclassify' },
    { label: 'Send newsletter now', url: '/api/newsletter/send', key: 'send' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {CARDS.map((c) => (
          <Card key={c.key} className={CARD}>
            <CardContent className="p-4">
              <div className="text-[11px] uppercase tracking-wider text-[#7A8487] mb-1">{c.label}</div>
              {loading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="text-2xl font-bold text-white">{c.value ?? '—'}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className={CARD}>
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-[#C6F24E]" />Quick actions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {ACTIONS.map((a) => (
            <Button
              key={a.key}
              onClick={() => action(a.key, a.url)}
              disabled={busy === a.key}
              className={SECONDARY}
              size="sm"
            >
              {busy === a.key ? 'Running…' : a.label}
            </Button>
          ))}
          <Button onClick={load} size="sm" className={SECONDARY}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Refresh
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   2. Skills
   ───────────────────────────────────────────────────────────────────────────── */

function SkillsTab({ hdr, jhdr, showToast }) {
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [showUnpub, setShowUnpub] = useState(true)
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState(null) // skill object being edited
  const [savingId, setSavingId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/skills?all=true', { headers: hdr() })
      const data = await r.json()
      const list = Array.isArray(data) ? data : (data.skills || data.items || [])
      setSkills(list)
    } catch { showToast('Failed to load skills') }
    finally { setLoading(false) }
  }, [hdr, showToast])

  useEffect(() => { load() }, [load])

  const categories = useMemo(() => {
    const s = new Set()
    skills.forEach((sk) => sk.category && s.add(sk.category))
    return Array.from(s).sort()
  }, [skills])

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase()
    return skills.filter((s) => {
      if (!showUnpub && !s.published) return false
      if (cat && s.category !== cat) return false
      if (ql) {
        const hay = `${s.title_human || s.name || ''} ${s.description_human || s.description || ''}`.toLowerCase()
        if (!hay.includes(ql)) return false
      }
      return true
    })
  }, [skills, q, cat, showUnpub])

  const PAGE_SIZE = 100
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  useEffect(() => { setPage(0) }, [q, cat, showUnpub])

  const updateSkill = async (id, set) => {
    setSavingId(id)
    try {
      const r = await fetch('/api/skill-update', {
        method: 'POST',
        headers: jhdr(),
        body: JSON.stringify({ id, set }),
      })
      if (!r.ok) throw new Error('save failed')
      showToast('Saved')
      setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, ...set } : s)))
    } catch { showToast('Save failed') }
    finally { setSavingId('') }
  }

  const togglePublished = (s) => updateSkill(s.id, { published: !s.published })

  const submitEdit = async (e) => {
    e.preventDefault()
    const form = new FormData(e.target)
    const set = {
      title_human: form.get('title_human'),
      description_human: form.get('description_human'),
      category: form.get('category'),
      published: form.get('published') === 'on',
      is_premium: form.get('is_premium') === 'on',
      price: form.get('price') ? Number(form.get('price')) : null,
    }
    await updateSkill(editing.id, set)
    setEditing(null)
  }

  return (
    <div className="space-y-4">
      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
          <form onSubmit={submitEdit} className={`${CARD} rounded-xl p-6 max-w-lg w-full border max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold flex items-center gap-2"><Edit className="w-4 h-4 text-[#C6F24E]" />Edit skill</h2>
              <button type="button" onClick={() => setEditing(null)} className="text-[#7A8487] hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <Field label="Title">
                <Input name="title_human" defaultValue={editing.title_human || editing.name || ''} className="bg-[#0A0C0D] border-[#262B2D] text-white" />
              </Field>
              <Field label="Description">
                <textarea name="description_human" rows={4} defaultValue={editing.description_human || editing.description || ''} className="w-full bg-[#0A0C0D] border border-[#262B2D] text-white rounded-md px-3 py-2 text-sm" />
              </Field>
              <Field label="Category">
                <Input name="category" defaultValue={editing.category || ''} className="bg-[#0A0C0D] border-[#262B2D] text-white" />
              </Field>
              <Field label="Price (USD)">
                <Input name="price" type="number" step="0.01" defaultValue={editing.price ?? ''} className="bg-[#0A0C0D] border-[#262B2D] text-white" />
              </Field>
              <div className="flex gap-6 pt-2">
                <label className="flex items-center gap-2 text-sm text-[#ECEFEA]">
                  <input type="checkbox" name="published" defaultChecked={!!editing.published} className="accent-[#C6F24E]" /> Published
                </label>
                <label className="flex items-center gap-2 text-sm text-[#ECEFEA]">
                  <input type="checkbox" name="is_premium" defaultChecked={!!editing.is_premium} className="accent-[#C6F24E]" /> Premium
                </label>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <Button type="button" onClick={() => setEditing(null)} size="sm" className={SECONDARY}>Cancel</Button>
              <Button type="submit" disabled={savingId === editing.id} size="sm" className={LIME}>
                {savingId === editing.id ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </div>
      )}

      <Card className={CARD}>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7A8487]" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or description…" className="bg-[#0A0C0D] border-[#262B2D] text-white pl-9" />
          </div>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="bg-[#0A0C0D] border border-[#262B2D] text-white text-sm rounded-md px-3 py-2">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-[#ECEFEA]">
            <input type="checkbox" checked={showUnpub} onChange={(e) => setShowUnpub(e.target.checked)} className="accent-[#C6F24E]" /> Show unpublished
          </label>
          <Button onClick={load} size="sm" className={SECONDARY}><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Refresh</Button>
        </CardContent>
      </Card>

      <Card className={CARD}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white text-base">Skills ({filtered.length})</CardTitle>
          <div className="text-xs text-[#7A8487]">Page {page + 1} / {pageCount}</div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : pageItems.length === 0 ? (
            <p className="text-[#7A8487] text-sm">No skills match.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#7A8487] border-b border-[#262B2D]">
                    <th className="text-left font-medium pb-2 pr-3">Name</th>
                    <th className="text-left font-medium pb-2 pr-3">Category</th>
                    <th className="text-left font-medium pb-2 pr-3">Stars</th>
                    <th className="text-left font-medium pb-2 pr-3">Status</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262B2D]">
                  {pageItems.map((s) => (
                    <tr key={s.id} className="text-[#ECEFEA] hover:bg-white/5">
                      <td className="py-2 pr-3 font-medium text-white max-w-xs truncate" title={s.title_human || s.name}>{s.title_human || s.name || '—'}</td>
                      <td className="py-2 pr-3"><Badge className="bg-[#0A0C0D] border-[#262B2D] border text-[#ECEFEA]">{s.category || '—'}</Badge></td>
                      <td className="py-2 pr-3 text-[#7A8487]">{s.github_stars ?? s.stars ?? '—'}</td>
                      <td className="py-2 pr-3">
                        <button onClick={() => togglePublished(s)} disabled={savingId === s.id} className={`text-xs px-2 py-0.5 rounded-full border ${s.published ? 'bg-[#C6F24E]/15 text-[#C6F24E] border-[#C6F24E]/30' : 'bg-white/5 text-[#7A8487] border-[#323A3C]'}`}>
                          {s.published ? 'published' : 'draft'}
                        </button>
                      </td>
                      <td className="py-2 text-right">
                        <div className="flex justify-end gap-1.5">
                          <a href={`/skills/${s.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs text-[#C6F24E] hover:underline px-2 py-1">
                            <Eye className="w-3.5 h-3.5 mr-1" />View
                          </a>
                          <button onClick={() => setEditing(s)} className="inline-flex items-center text-xs text-[#ECEFEA] hover:bg-white/5 px-2 py-1 rounded border border-[#323A3C]">
                            <Edit className="w-3.5 h-3.5 mr-1" />Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pageCount > 1 && (
            <div className="flex justify-between items-center mt-4">
              <Button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} size="sm" className={SECONDARY}>Prev</Button>
              <div className="text-xs text-[#7A8487]">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}</div>
              <Button onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1} size="sm" className={SECONDARY}>Next</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-[#7A8487] mb-1 block">{label}</span>
      {children}
    </label>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   3. Creators (Applications + Leads)
   ───────────────────────────────────────────────────────────────────────────── */

function CreatorsTab({ hdr, jhdr, showToast, setApiKeyModal, busy, setBusy }) {
  const [apps, setApps] = useState([])
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all | no-email | discovered | emailed | replied
  const [sortBy, setSortBy] = useState('stars') // stars | recent
  const [outreach, setOutreach] = useState(null) // lead being emailed
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [aRes, lRes] = await Promise.all([
        fetch('/api/creator-applications', { headers: hdr() }),
        fetch('/api/creator-leads', { headers: hdr() }),
      ])
      const aData = await aRes.json()
      const lData = await lRes.json()
      setApps(aData.applications || aData || [])
      setLeads(lData.leads || lData || [])
    } catch { showToast('Failed to load creators') }
    finally { setLoading(false) }
  }, [hdr, showToast])

  useEffect(() => { load() }, [load])

  const approveCreator = async (app) => {
    setBusy(`creator-${app.id}`)
    try {
      const res = await fetch('/api/creator-applications/approve', {
        method: 'POST', headers: jhdr(), body: JSON.stringify({ id: app.id }),
      })
      const data = await res.json()
      if (data.api_key) setApiKeyModal({ name: app.name || app.email, key: data.api_key })
      else showToast(data.error || 'Approved')
      load()
    } finally { setBusy('') }
  }

  const updateLeadStatus = async (lead, status) => {
    try {
      const r = await fetch('/api/creator-leads/update', {
        method: 'POST', headers: jhdr(),
        body: JSON.stringify({ id: lead.id || lead.creator_username, status }),
      })
      if (!r.ok) throw new Error()
      setLeads((prev) => prev.map((l) => (l === lead ? { ...l, status } : l)))
      showToast(`Marked ${status}`)
    } catch { showToast('Update failed') }
  }

  const filteredLeads = useMemo(() => {
    let arr = [...leads]
    if (filter === 'no-email') arr = arr.filter((l) => !l.email)
    else if (filter !== 'all') arr = arr.filter((l) => (l.status || 'discovered') === filter)
    arr.sort((a, b) => {
      if (sortBy === 'stars') return (b.stars ?? 0) - (a.stars ?? 0)
      const at = new Date(a.last_touched_at || a.updated_at || a.created_at || 0).getTime()
      const bt = new Date(b.last_touched_at || b.updated_at || b.created_at || 0).getTime()
      return bt - at
    })
    return arr
  }, [leads, filter, sortBy])

  const openOutreach = (lead) => {
    const subject = `Your repo ${lead.skill_name} is on WorkflowStacks — claim 85% revenue`
    const html = `Hi ${lead.creator_username},

I'm reaching out because your repo ${lead.skill_name} (${lead.stars ?? 0}★) is one of the highest-quality AI tools in the WorkflowStacks marketplace — a free, no-code catalog of open-source AI skills with 250+ founders, agencies, and creators discovering tools every day.

We surface your repo to a curated audience that's actively building agents and looking for proven tools. Founders are picking your tool by name when they visit our site.

I'd love to invite you to **claim your listing** and become a verified creator on WorkflowStacks. As a creator you get:

• 85% of any paid agent that uses your skill
• A verified badge + dedicated creator profile
• Featured placement in our weekly newsletter (4.9K+ founders)
• Early access to our API for automated publishing

There's no fee, no exclusivity, no catch — your repo stays 100% open-source on GitHub. We just want to recognize the people building the tools that founders actually use.

Want to claim? Apply here in 2 minutes: https://workflowstacks.com/submit

Or reply with any questions.

Cheers,
Rahul
WorkflowStacks`
    setOutreach({ lead, subject, html })
  }

  const sendOutreach = async () => {
    if (!outreach) return
    setSending(true)
    try {
      const r = await fetch('/api/creator-outreach/send', {
        method: 'POST', headers: jhdr(),
        body: JSON.stringify({
          lead_id: outreach.lead.creator_username,
          subject: outreach.subject,
          html: outreach.html,
        }),
      })
      if (!r.ok) throw new Error()
      showToast(`Sent to ${outreach.lead.email}`)
      setOutreach(null)
      load()
    } catch { showToast('Send failed') }
    finally { setSending(false) }
  }

  const STATUS_OPTIONS = ['discovered', 'emailed', 'replied', 'declined', 'converted']
  const statusClass = (st) => {
    switch (st) {
      case 'emailed':   return 'bg-blue-500/15 text-blue-300 border-blue-500/30'
      case 'replied':   return 'bg-purple-500/15 text-purple-300 border-purple-500/30'
      case 'declined':  return 'bg-red-500/15 text-red-300 border-red-500/30'
      case 'converted': return 'bg-[#C6F24E]/15 text-[#C6F24E] border-[#C6F24E]/30'
      default:          return 'bg-white/5 text-[#7A8487] border-[#323A3C]'
    }
  }

  return (
    <div className="space-y-6">
      {/* Outreach modal */}
      {outreach && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
          <div className={`${CARD} rounded-xl p-6 max-w-2xl w-full border max-h-[92vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold flex items-center gap-2"><Send className="w-4 h-4 text-[#C6F24E]" />Send outreach</h2>
              <button onClick={() => setOutreach(null)} className="text-[#7A8487] hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="text-[#7A8487]"><span className="text-[#ECEFEA]">To:</span> {outreach.lead.email}</div>
              <div className="text-[#7A8487]"><span className="text-[#ECEFEA]">Re:</span> {outreach.lead.skill_name}</div>
              <Field label="Subject">
                <Input value={outreach.subject} onChange={(e) => setOutreach({ ...outreach, subject: e.target.value })} className="bg-[#0A0C0D] border-[#262B2D] text-white" />
              </Field>
              <Field label="Body">
                <textarea value={outreach.html} onChange={(e) => setOutreach({ ...outreach, html: e.target.value })} rows={16} className="w-full bg-[#0A0C0D] border border-[#262B2D] text-white rounded-md px-3 py-2 text-sm font-mono" />
              </Field>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <Button onClick={() => setOutreach(null)} size="sm" className={SECONDARY}>Cancel</Button>
              <Button onClick={sendOutreach} disabled={sending} size="sm" className={LIME}>
                <Send className="w-3.5 h-3.5 mr-1.5" />{sending ? 'Sending…' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* A. Applications */}
      <Card className={CARD}>
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-[#C6F24E]" />Creator Applications ({apps.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : apps.length === 0 ? (
            <p className="text-[#7A8487] text-sm">No applications yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#7A8487] border-b border-[#262B2D]">
                    <th className="text-left font-medium pb-2 pr-3">Name</th>
                    <th className="text-left font-medium pb-2 pr-3">Email</th>
                    <th className="text-left font-medium pb-2 pr-3">GitHub</th>
                    <th className="text-left font-medium pb-2 pr-3">What they want to list</th>
                    <th className="text-left font-medium pb-2 pr-3">Status</th>
                    <th className="text-left font-medium pb-2 pr-3">Applied</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262B2D]">
                  {apps.map((a) => {
                    const listing = a.listing_description || a.what_to_list || a.description || '—'
                    const status = a.status || 'pending'
                    return (
                      <tr key={a.id} className="text-[#ECEFEA] hover:bg-white/5">
                        <td className="py-2 pr-3 font-medium text-white">{a.name || '—'}</td>
                        <td className="py-2 pr-3 text-[#7A8487]">{a.email || '—'}</td>
                        <td className="py-2 pr-3">
                          {a.github ? <a href={`https://github.com/${a.github.replace(/^@/, '')}`} target="_blank" rel="noreferrer" className="text-[#C6F24E] hover:underline">{a.github}</a> : '—'}
                        </td>
                        <td className="py-2 pr-3 text-[#7A8487] max-w-xs" title={listing}>{truncate(listing, 80)}</td>
                        <td className="py-2 pr-3">
                          <Badge className={
                            status === 'approved' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 border' :
                            status === 'rejected' ? 'bg-red-500/15 text-red-400 border-red-500/30 border' :
                            'bg-amber-500/15 text-amber-400 border-amber-500/30 border'
                          }>{status}</Badge>
                        </td>
                        <td className="py-2 pr-3 text-[#7A8487]">{a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}</td>
                        <td className="py-2">
                          {status === 'pending' && (
                            <Button onClick={() => approveCreator(a)} disabled={busy === `creator-${a.id}`} size="sm" className={LIME}>
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

      {/* B. Leads */}
      <Card className={CARD}>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Search className="w-4 h-4 text-[#C6F24E]" />Creator Leads ({filteredLeads.length})
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'All' },
              { id: 'no-email', label: 'No email' },
              { id: 'discovered', label: 'Discovered' },
              { id: 'emailed', label: 'Emailed' },
              { id: 'replied', label: 'Replied' },
            ].map((f) => (
              <button key={f.id} onClick={() => setFilter(f.id)} className={`text-xs px-2.5 py-1 rounded-md border ${filter === f.id ? 'bg-[#C6F24E]/15 text-[#C6F24E] border-[#C6F24E]/30' : 'text-[#7A8487] border-[#323A3C] hover:text-[#ECEFEA]'}`}>
                {f.label}
              </button>
            ))}
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-[#0A0C0D] border border-[#262B2D] text-white text-xs rounded-md px-2 py-1">
              <option value="stars">Sort: stars</option>
              <option value="recent">Sort: recent</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : filteredLeads.length === 0 ? (
            <p className="text-[#7A8487] text-sm">No leads.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#7A8487] border-b border-[#262B2D]">
                    <th className="text-left font-medium pb-2 pr-3">Username</th>
                    <th className="text-left font-medium pb-2 pr-3">Email</th>
                    <th className="text-left font-medium pb-2 pr-3">Skill</th>
                    <th className="text-left font-medium pb-2 pr-3">Stars</th>
                    <th className="text-left font-medium pb-2 pr-3">Status</th>
                    <th className="text-left font-medium pb-2 pr-3">Last touched</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262B2D]">
                  {filteredLeads.map((l, idx) => {
                    const status = l.status || 'discovered'
                    return (
                      <tr key={l.id || l.creator_username || idx} className="text-[#ECEFEA] hover:bg-white/5">
                        <td className="py-2 pr-3 font-medium text-white">@{l.creator_username || '—'}</td>
                        <td className="py-2 pr-3 text-[#7A8487]">{l.email || <span className="italic opacity-60">no email</span>}</td>
                        <td className="py-2 pr-3 max-w-xs truncate" title={l.skill_name}>{l.skill_name || '—'}</td>
                        <td className="py-2 pr-3 text-[#7A8487]">{l.stars ?? '—'}</td>
                        <td className="py-2 pr-3">
                          <div className="flex flex-wrap gap-1">
                            {STATUS_OPTIONS.map((opt) => (
                              <button key={opt} onClick={() => updateLeadStatus(l, opt)} className={`text-[10px] px-1.5 py-0.5 rounded border ${status === opt ? statusClass(opt) : 'border-[#262B2D] text-[#7A8487]/60 hover:text-[#ECEFEA]'}`}>
                                {opt}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="py-2 pr-3 text-[#7A8487]">{relTime(l.last_touched_at || l.updated_at || l.created_at)}</td>
                        <td className="py-2">
                          {l.email && (
                            <Button onClick={() => openOutreach(l)} size="sm" className={LIME}>
                              <Send className="w-3.5 h-3.5 mr-1" />Send outreach
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
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   4. Newsletter
   ───────────────────────────────────────────────────────────────────────────── */

function NewsletterTab({ hdr, showToast, busy, setBusy }) {
  const [preview, setPreview] = useState(null)
  const [sends, setSends] = useState([])
  const [subscribers, setSubscribers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSubs, setShowSubs] = useState(false)
  const [subsPage, setSubsPage] = useState(0)
  const [testEmail, setTestEmail] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, sRes, subRes] = await Promise.all([
        fetch('/api/newsletter/preview', { headers: hdr() }),
        fetch('/api/newsletter/sends', { headers: hdr() }),
        fetch('/api/subscribers', { headers: hdr() }),
      ])
      setPreview(await pRes.json().catch(() => null))
      const sData = await sRes.json().catch(() => ({}))
      setSends(sData.sends || sData || [])
      const subData = await subRes.json().catch(() => ({}))
      setSubscribers(subData.subscribers || subData.emails || subData || [])
    } catch { showToast('Failed to load newsletter') }
    finally { setLoading(false) }
  }, [hdr, showToast])

  useEffect(() => { load() }, [load])

  const sendAll = async () => {
    setBusy('send-all')
    try {
      const r = await fetch('/api/newsletter/send', { headers: hdr() })
      const data = await r.json().catch(() => ({}))
      showToast(data.message || `Sent to ${data.sent ?? '?'} subscriber(s)`)
      load()
    } catch { showToast('Send failed') }
    finally { setBusy('') }
  }

  const exportSubsCsv = () => {
    const emails = subscribers.map((s) => typeof s === 'string' ? s : (s.email || '')).filter(Boolean)
    const csv = 'email\n' + emails.join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const pick = preview?.pick || preview?.chosen || preview
  const alts = preview?.alternates || preview?.candidates || []
  const subCount = subscribers.length

  const PAGE = 50
  const subsPageCount = Math.max(1, Math.ceil(subscribers.length / PAGE))
  const subsPageItems = subscribers.slice(subsPage * PAGE, (subsPage + 1) * PAGE)

  return (
    <div className="space-y-6">
      <Card className={CARD}>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#C6F24E]" />Today&apos;s pick
          </CardTitle>
          <Badge className="bg-[#C6F24E]/15 text-[#C6F24E] border-[#C6F24E]/30 border">Send to {subCount} subscribers</Badge>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-24" />
          ) : !pick ? (
            <p className="text-[#7A8487] text-sm">No pick available.</p>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="text-white font-semibold text-lg">{pick.title_human || pick.name}</div>
                <div className="text-xs text-[#7A8487] mt-0.5">{pick.category || '—'} · {pick.github_stars ?? pick.stars ?? 0}★</div>
                <p className="text-sm text-[#ECEFEA] mt-2">{pick.description_human || pick.description || '—'}</p>
              </div>
              {alts.length > 0 && (
                <div className="pt-2 border-t border-[#262B2D]">
                  <div className="text-xs uppercase tracking-wider text-[#7A8487] mb-2">Alternates</div>
                  <ul className="text-sm space-y-1">
                    {alts.slice(0, 4).map((a, i) => (
                      <li key={i} className="text-[#ECEFEA]">• {a.title_human || a.name} <span className="text-[#7A8487]">— {a.github_stars ?? a.stars ?? 0}★</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-4">
            <Button onClick={sendAll} disabled={busy === 'send-all'} className={LIME} size="sm">
              <Send className="w-3.5 h-3.5 mr-1.5" />{busy === 'send-all' ? 'Sending…' : 'Send to all subscribers'}
            </Button>
            <div className="flex items-center gap-2">
              <Input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@example.com" className="bg-[#0A0C0D] border-[#262B2D] text-white h-9 w-56" />
              {/* test send TBD */}
              <Button disabled size="sm" className={`${SECONDARY} opacity-50`} title="test send TBD">Send test to me</Button>
            </div>
            <Button onClick={load} size="sm" className={SECONDARY}><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Refresh</Button>
          </div>
        </CardContent>
      </Card>

      <Card className={CARD}>
        <CardHeader><CardTitle className="text-white text-base">Send history</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-20" />
          ) : sends.length === 0 ? (
            <p className="text-[#7A8487] text-sm">No sends yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#7A8487] border-b border-[#262B2D]">
                    <th className="text-left font-medium pb-2 pr-3">Skill</th>
                    <th className="text-left font-medium pb-2 pr-3">Sent at</th>
                    <th className="text-left font-medium pb-2 pr-3">Recipients</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262B2D]">
                  {sends.map((s, i) => (
                    <tr key={s.id || i} className="text-[#ECEFEA]">
                      <td className="py-2 pr-3">{s.skill_name || s.title_human || s.skill_id || '—'}</td>
                      <td className="py-2 pr-3 text-[#7A8487]">{s.sent_at ? new Date(s.sent_at).toLocaleString() : '—'}</td>
                      <td className="py-2 pr-3">{s.recipient_count ?? s.recipients ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={CARD}>
        <CardHeader className="flex flex-row items-center justify-between">
          <button onClick={() => setShowSubs((v) => !v)} className="flex items-center gap-2 text-white font-semibold text-base">
            {showSubs ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            Subscribers ({subscribers.length})
          </button>
          {showSubs && (
            <Button onClick={exportSubsCsv} size="sm" className={SECONDARY}><Download className="w-3.5 h-3.5 mr-1.5" />Export CSV</Button>
          )}
        </CardHeader>
        {showSubs && (
          <CardContent>
            {subscribers.length === 0 ? (
              <p className="text-[#7A8487] text-sm">No subscribers.</p>
            ) : (
              <>
                <ul className="text-sm space-y-1">
                  {subsPageItems.map((s, i) => {
                    const email = typeof s === 'string' ? s : (s.email || '—')
                    return <li key={i} className="text-[#ECEFEA] font-mono text-xs">{email}</li>
                  })}
                </ul>
                {subsPageCount > 1 && (
                  <div className="flex justify-between items-center mt-4">
                    <Button onClick={() => setSubsPage((p) => Math.max(0, p - 1))} disabled={subsPage === 0} size="sm" className={SECONDARY}>Prev</Button>
                    <div className="text-xs text-[#7A8487]">Page {subsPage + 1} / {subsPageCount}</div>
                    <Button onClick={() => setSubsPage((p) => Math.min(subsPageCount - 1, p + 1))} disabled={subsPage >= subsPageCount - 1} size="sm" className={SECONDARY}>Next</Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   5. Audit & Security
   ───────────────────────────────────────────────────────────────────────────── */

function AuditTab({ hdr, showToast }) {
  const [log, setLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/audit-log', { headers: hdr() })
      const data = await r.json()
      setLog((data.log || data.entries || data || []).slice(0, 100))
    } catch { showToast('Failed to load audit log') }
    finally { setLoading(false) }
  }, [hdr, showToast])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase()
    if (!ql) return log
    return log.filter((e) => {
      const blob = `${e.path || e.action || ''} ${e.ip || ''} ${e.user_agent || e.ua || ''}`.toLowerCase()
      return blob.includes(ql)
    })
  }, [log, q])

  const POSTURE = [
    { ok: true,  label: 'Admin endpoints gated by x-admin-secret header' },
    { ok: true,  label: 'Rate limiting on public POST endpoints (10 req/min/IP)' },
    { ok: true,  label: 'Input length validation' },
    { ok: true,  label: 'HSTS preload' },
    { ok: true,  label: 'Permissions-Policy header' },
    { ok: true,  label: 'X-Powered-By suppressed' },
    { ok: false, label: 'Rotate ADMIN_SECRET in Vercel dashboard if you\'ve ever shared it', link: 'https://vercel.com/dashboard' },
  ]

  return (
    <div className="space-y-6">
      <Card className={CARD}>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#C6F24E]" />Audit log (last 100)
          </CardTitle>
          <div className="flex items-center gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" className="bg-[#0A0C0D] border-[#262B2D] text-white h-9 w-56" />
            <Button onClick={load} size="sm" className={SECONDARY}><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Refresh</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
          ) : filtered.length === 0 ? (
            <p className="text-[#7A8487] text-sm">No audit entries.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#7A8487] border-b border-[#262B2D]">
                    <th className="text-left font-medium pb-2 pr-3">Action</th>
                    <th className="text-left font-medium pb-2 pr-3">IP</th>
                    <th className="text-left font-medium pb-2 pr-3">User-agent</th>
                    <th className="text-left font-medium pb-2 pr-3">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262B2D]">
                  {filtered.map((e, i) => (
                    <tr key={e.id || i} className="text-[#ECEFEA]">
                      <td className="py-1.5 pr-3 font-mono text-xs text-white">{e.path || e.action || '—'}</td>
                      <td className="py-1.5 pr-3 text-[#7A8487] font-mono text-xs">{e.ip || '—'}</td>
                      <td className="py-1.5 pr-3 text-[#7A8487] text-xs" title={e.user_agent || e.ua}>{truncate(e.user_agent || e.ua, 60)}</td>
                      <td className="py-1.5 pr-3 text-[#7A8487]">{relTime(e.created_at || e.at || e.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={CARD}>
        <CardHeader><CardTitle className="text-white text-base flex items-center gap-2"><Shield className="w-4 h-4 text-[#C6F24E]" />Security Posture</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {POSTURE.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                {p.ok ? <Check className="w-4 h-4 text-[#C6F24E] shrink-0 mt-0.5" /> : <span className="text-amber-400 shrink-0">⚠️</span>}
                <span className={p.ok ? 'text-[#ECEFEA]' : 'text-amber-200'}>
                  {p.label}
                  {p.link && <> <a href={p.link} target="_blank" rel="noreferrer" className="inline-flex items-center text-[#C6F24E] hover:underline ml-1">open <ExternalLink className="w-3 h-3 ml-0.5" /></a></>}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
