'use client'

// Blog CMS — the "WordPress" panel. Same admin-secret unlock pattern as
// /admin. List → edit (title/meta/answer/sections markdown) → publish /
// schedule / hold / archive, plus one-click pipeline runs.
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

const CARD = 'rounded-xl border border-[#262B2D] bg-[#101314]'
const BTN = 'rounded-lg bg-[#C6F24E] px-3 py-1.5 text-[12.5px] font-semibold text-[#0A0C0D] hover:bg-[#A6D62E] disabled:opacity-40'
const BTN2 = 'rounded-lg border border-[#323A3C] px-3 py-1.5 text-[12.5px] text-[#ECEFEA] hover:bg-white/5 disabled:opacity-40'
const INPUT = 'w-full rounded-lg border border-[#262B2D] bg-[#0A0C0D] px-3 py-2 text-[13.5px] text-[#ECEFEA] focus:border-[#C6F24E] focus:outline-none'

const STATUS_COLOR = {
  published: 'text-[#6FD79A]', judged: 'text-[#C6F24E]', styled: 'text-[#C6F24E]', held: 'text-[#F27C74]',
  drafted: 'text-[#F0B35C]', drafting: 'text-[#F0B35C]', edited: 'text-[#F0B35C]',
  briefed: 'text-[#8AB0F0]', archived: 'text-[#6E7772]',
}

export default function BlogAdmin() {
  const [secret, setSecret] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [posts, setPosts] = useState([])
  const [counts, setCounts] = useState({})
  const [sel, setSel] = useState(null) // full post being edited
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [filter, setFilter] = useState('')

  const hdr = useCallback((json) => ({ 'x-admin-secret': secret, ...(json ? { 'Content-Type': 'application/json' } : {}) }), [secret])
  const toast = (m) => { setMsg(String(m)); setTimeout(() => setMsg(''), 5000) }

  const load = useCallback(async (s = secret) => {
    const r = await fetch(`/api/blog/posts${filter ? `?status=${filter}` : ''}`, { headers: { 'x-admin-secret': s } })
    if (r.status === 401) return false
    const d = await r.json()
    setPosts(d.posts || []); setCounts(d.counts || {})
    return true
  }, [secret, filter])

  useEffect(() => {
    const saved = typeof window !== 'undefined' && localStorage.getItem('ws_admin_secret')
    if (saved) { setSecret(saved); load(saved).then((ok) => ok && setUnlocked(true)) }
  }, []) // eslint-disable-line

  useEffect(() => { if (unlocked) load() }, [filter, unlocked]) // eslint-disable-line

  const unlock = async () => {
    if (await load(secret)) { localStorage.setItem('ws_admin_secret', secret); setUnlocked(true) }
    else toast('Wrong secret')
  }

  const openPost = async (slug) => {
    const r = await fetch(`/api/blog/posts/${slug}`, { headers: hdr() })
    const d = await r.json()
    setSel(d.post)
  }

  const patch = async (slug, body, label) => {
    setBusy(label)
    try {
      const r = await fetch(`/api/blog/posts/${slug}`, { method: 'PATCH', headers: hdr(true), body: JSON.stringify(body) })
      const d = await r.json()
      toast(d.error || `${label} ok${d.seo_score ? ` · SEO ${d.seo_score}` : ''}`)
      await load()
      if (sel?.slug === slug) await openPost(slug)
    } finally { setBusy('') }
  }

  const pipeline = async (action) => {
    setBusy(action)
    try {
      const r = await fetch(`/api/blog/pipeline?action=${action}`, { method: 'POST', headers: hdr() })
      const d = await r.json()
      toast(JSON.stringify(d).slice(0, 180))
      await load()
    } finally { setBusy('') }
  }

  const saveEdits = async () => {
    if (!sel) return
    await patch(sel.slug, {
      title: sel.title, meta_title: sel.meta_title, meta_description: sel.meta_description,
      excerpt: sel.excerpt, answer: sel.answer, sections: sel.sections, tldr: sel.tldr,
      key_takeaways: sel.key_takeaways, faq: sel.faq,
    }, 'save')
  }

  if (!unlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0C0D] px-4">
        <div className={`${CARD} w-full max-w-sm p-6`}>
          <h1 className="text-lg font-semibold text-[#ECEFEA]">Blog admin</h1>
          <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && unlock()} placeholder="Admin secret" className={`${INPUT} mt-4`} />
          <button onClick={unlock} className={`${BTN} mt-3 w-full py-2`}>Unlock</button>
          {msg && <div className="mt-3 text-[12.5px] text-[#F27C74]">{msg}</div>}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0C0D] px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-[#ECEFEA]">Blog <span className="text-[#6E7772]">· {posts.length} posts</span></h1>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin" className={BTN2}>← Admin</Link>
            <button disabled={!!busy} onClick={() => pipeline('rank')} className={BTN2}>{busy === 'rank' ? '…' : 'Check rankings'}</button>
            <button disabled={!!busy} onClick={() => pipeline('scout')} className={BTN2}>{busy === 'scout' ? '…' : 'Scout topics'}</button>
            <button disabled={!!busy} onClick={() => pipeline('start')} className={BTN2}>{busy === 'start' ? '…' : 'Start next post'}</button>
            <button disabled={!!busy} onClick={() => pipeline('advance')} className={BTN}>{busy === 'advance' ? '…' : 'Advance pipeline'}</button>
          </div>
        </div>
        {msg && <div className="mt-3 rounded-lg border border-[#262B2D] bg-[#101314] px-3 py-2 font-mono text-[12px] text-[#C6F24E]">{msg}</div>}

        <div className="mt-4 flex flex-wrap gap-2 text-[12.5px]">
          <button onClick={() => setFilter('')} className={`${filter === '' ? BTN : BTN2}`}>All</button>
          {Object.entries(counts).map(([s, n]) => (
            <button key={s} onClick={() => setFilter(s)} className={`${filter === s ? BTN : BTN2}`}>{s} {n}</button>
          ))}
        </div>

        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className={`${CARD} divide-y divide-[#1c2123] overflow-hidden`}>
            {posts.map((p) => (
              <button key={p.slug} onClick={() => openPost(p.slug)} className={`block w-full px-4 py-3 text-left hover:bg-white/[0.03] ${sel?.slug === p.slug ? 'bg-white/[0.05]' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-medium text-[#ECEFEA]">{p.title}</div>
                    <div className="mt-0.5 text-[11.5px] text-[#6E7772]">
                      /{p.slug} · {p.word_count || 0}w · SEO {p.seo_report?.score ?? '—'} · style {p.style_report?.score ?? '—'} · judge {p.judge?.score ?? '—'} · rank {p.rank ? (p.rank.position ?? '>20') : '—'}
                      {p.published_at ? ` · ${new Date(p.published_at).toISOString().slice(0, 10)}` : ''}
                    </div>
                  </div>
                  <span className={`shrink-0 text-[11px] font-semibold uppercase ${STATUS_COLOR[p.status] || 'text-[#8A938D]'}`}>{p.status}</span>
                </div>
              </button>
            ))}
            {posts.length === 0 && <div className="px-4 py-8 text-center text-[13px] text-[#6E7772]">Nothing here.</div>}
          </div>

          {sel ? (
            <div className={`${CARD} p-5`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`text-[11px] font-semibold uppercase ${STATUS_COLOR[sel.status]}`}>{sel.status}</span>
                <div className="flex flex-wrap gap-2">
                  <a href={`/blog/${sel.slug}`} target="_blank" rel="noopener" className={BTN2}>Preview</a>
                  <button disabled={!!busy} onClick={saveEdits} className={BTN2}>Save</button>
                  {sel.status !== 'published' && <button disabled={!!busy} onClick={() => patch(sel.slug, { action: 'publish' }, 'publish')} className={BTN}>Publish now</button>}
                  {sel.status !== 'published' && (
                    <button disabled={!!busy} onClick={() => {
                      const d = prompt('Schedule for (YYYY-MM-DD, publishes 07:00 UTC):')
                      if (d) patch(sel.slug, { action: 'schedule', scheduled_for: `${d}T07:00:00Z` }, 'schedule')
                    }} className={BTN2}>Schedule…</button>
                  )}
                  {sel.status === 'published' && <button disabled={!!busy} onClick={() => patch(sel.slug, { action: 'unpublish' }, 'unpublish')} className={BTN2}>Unpublish</button>}
                </div>
              </div>

              <label className="mt-4 block text-[11px] font-semibold uppercase tracking-widest text-[#6E7772]">Title ({(sel.title || '').length}/60)</label>
              <input className={`${INPUT} mt-1`} value={sel.title || ''} onChange={(e) => setSel({ ...sel, title: e.target.value })} />
              <label className="mt-3 block text-[11px] font-semibold uppercase tracking-widest text-[#6E7772]">Meta description ({(sel.meta_description || '').length}/155)</label>
              <textarea rows={2} className={`${INPUT} mt-1`} value={sel.meta_description || ''} onChange={(e) => setSel({ ...sel, meta_description: e.target.value })} />
              <label className="mt-3 block text-[11px] font-semibold uppercase tracking-widest text-[#6E7772]">Answer block (40–60 words)</label>
              <textarea rows={3} className={`${INPUT} mt-1`} value={sel.answer || ''} onChange={(e) => setSel({ ...sel, answer: e.target.value })} />

              {sel.seo_report && (
                <div className="mt-4 rounded-lg border border-[#262B2D] bg-[#0A0C0D] p-3">
                  <div className="text-[12px] font-semibold text-[#ECEFEA]">
                    SEO {sel.seo_report.score}/100
                    {sel.style_report ? ` · Style ${sel.style_report.score}/100` : ''}
                    {sel.judge ? ` · Judge ${sel.judge.score}/10` : ''}
                    {sel.rank ? ` · Rank ${sel.rank.position ?? '>20'} (${sel.rank.engine})` : ''}
                  </div>
                  {sel.style_report?.findings?.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5 text-[11.5px] text-[#F27C74]">
                      {sel.style_report.findings.map((f, i) => (<li key={i}>✗ {f.id}: {f.detail}</li>))}
                    </ul>
                  )}
                  {sel.seo_report.failed?.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5 text-[11.5px] text-[#F0B35C]">
                      {sel.seo_report.failed.map((f) => (<li key={f.id}>✗ {f.id}: {f.detail}</li>))}
                    </ul>
                  )}
                </div>
              )}

              <label className="mt-4 block text-[11px] font-semibold uppercase tracking-widest text-[#6E7772]">Sections</label>
              <div className="mt-1 space-y-3">
                {(sel.sections || []).map((s, i) => (
                  <details key={i} className="rounded-lg border border-[#262B2D] bg-[#0A0C0D]">
                    <summary className="cursor-pointer px-3 py-2 text-[13px] font-medium text-[#ECEFEA]">{i + 1}. {s.h2}</summary>
                    <div className="p-3 pt-0">
                      <input className={`${INPUT} mb-2`} value={s.h2} onChange={(e) => { const secs = [...sel.sections]; secs[i] = { ...s, h2: e.target.value }; setSel({ ...sel, sections: secs }) }} />
                      <textarea rows={10} className={`${INPUT} font-mono text-[12px]`} value={s.md} onChange={(e) => { const secs = [...sel.sections]; secs[i] = { ...s, md: e.target.value }; setSel({ ...sel, sections: secs }) }} />
                    </div>
                  </details>
                ))}
              </div>

              <div className="mt-4 flex justify-between">
                <button disabled={!!busy} onClick={() => { if (confirm('Archive this post?')) patch(sel.slug, {}, 'archive').then(() => fetch(`/api/blog/posts/${sel.slug}`, { method: 'DELETE', headers: hdr() }).then(() => { setSel(null); load() })) }} className={`${BTN2} text-[#F27C74]`}>Archive</button>
                <button disabled={!!busy} onClick={saveEdits} className={BTN}>Save changes</button>
              </div>
            </div>
          ) : (
            <div className={`${CARD} flex items-center justify-center p-10 text-[13px] text-[#6E7772]`}>Select a post to edit.</div>
          )}
        </div>
      </div>
    </div>
  )
}
