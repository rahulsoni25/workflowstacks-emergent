'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Trash2, BookMarked } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LibraryClient({ initialItems = [] }) {
  const [items, setItems] = useState(initialItems)

  const remove = async (skillId) => {
    setItems((list) => list.filter((i) => i.skill_id !== skillId))
    fetch('/api/library', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skillId }),
    }).catch(() => {})
  }

  if (!items.length) {
    return (
      <div className="border border-slate-700/50 rounded-xl bg-slate-900/50 p-10 text-center">
        <BookMarked className="w-8 h-8 text-teal-400 mx-auto mb-3" />
        <p className="text-slate-300 font-medium mb-1">Nothing saved yet</p>
        <p className="text-slate-500 text-sm mb-5">Hit "Save to My Library" on any skill, or ask Claude to install one via the connector.</p>
        <Link href="/skills">
          <Button className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white">Browse skills</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.skill_id} className="flex items-center justify-between gap-3 border border-slate-700/50 rounded-lg bg-slate-900/50 px-4 py-3">
          <Link href={`/skills/${item.slug}`} className="min-w-0">
            <div className="text-white font-medium hover:text-teal-300 transition-colors truncate">{item.name}</div>
            <div className="text-xs text-slate-500">{item.category || 'skill'} · saved {item.added_at ? new Date(item.added_at).toLocaleDateString('en-US') : ''}</div>
          </Link>
          <button onClick={() => remove(item.skill_id)} aria-label={`Remove ${item.name}`} className="text-slate-500 hover:text-rose-400 transition-colors flex-shrink-0">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
