'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Download, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Plain download is a simple GET. When the visitor arrived with a goal
// (?goal=… from the builder/recommender), offer the personalized version:
// the workflow's AI prompt gets rewritten for their business before download.
export default function DownloadButtons({ slug, filename }) {
  const searchParams = useSearchParams()
  const goal = (searchParams.get('goal') || '').trim()
  const [state, setState] = useState('idle') // idle | working | error

  async function downloadPersonalized() {
    setState('working')
    try {
      const res = await fetch(`/api/templates/${slug}/personalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal }),
      })
      if (!res.ok) throw new Error('personalize failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setState('idle')
    } catch {
      setState('error')
    }
  }

  return (
    <div className="text-center space-y-3">
      {goal.length >= 10 ? (
        <>
          <Button
            size="lg"
            onClick={downloadPersonalized}
            disabled={state === 'working'}
            className="bg-[#C6F24E] hover:bg-[#A6D62E] text-[#0A0C0D] font-semibold shadow-lg shadow-lime-500/20 px-8"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {state === 'working' ? 'Personalizing…' : 'Download — personalized for your goal'}
          </Button>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            We tune the workflow's AI instructions to: “{goal.slice(0, 90)}{goal.length > 90 ? '…' : ''}”
          </p>
          <a href={`/api/templates/${slug}`} download className="block text-xs text-slate-400 hover:text-slate-300 underline underline-offset-2">
            or download the standard version
          </a>
          {state === 'error' && (
            <p className="text-xs text-amber-400">Personalization hiccuped — the standard version link above always works.</p>
          )}
        </>
      ) : (
        <a href={`/api/templates/${slug}`} download>
          <Button size="lg" className="bg-[#C6F24E] hover:bg-[#A6D62E] text-[#0A0C0D] font-semibold shadow-lg shadow-lime-500/20 px-8">
            <Download className="w-4 h-4 mr-2" />Download the workflow (free)
          </Button>
        </a>
      )}
    </div>
  )
}
