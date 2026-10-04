'use client'

import { TAGS_ON } from '@/components/Analytics'
import { OPEN_EVENT } from '@/components/ConsentBanner'

// Reopens the consent prompt so a choice can be changed at any time. Renders
// nothing while no measurement tag is configured — there is nothing to choose.
export default function CookieSettingsButton() {
  if (!TAGS_ON) return null
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      className="mt-3 rounded-md border border-[#323A3C] px-4 py-2 text-sm font-semibold text-white hover:bg-white/5"
    >
      Change cookie choice
    </button>
  )
}
