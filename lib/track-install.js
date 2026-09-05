'use client'

import { getUtm, trackEvent } from '@/lib/analytics'

// Fire-and-forget install telemetry. keepalive lets the request survive the
// page navigating away (deep links, downloads). Never throws, never blocks.
// Sends the session's first-touch attribution alongside, so install_events
// can answer "which campaign produced this install", and mirrors the event
// onto the dataLayer so ad platforms can optimise on it.
export function trackInstall(skillId, channel) {
  if (!skillId || !channel) return
  try {
    const attribution = getUtm()
    trackEvent('install', { skill_id: skillId, channel, ...(attribution || {}) })
    fetch('/api/track-install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skillId, channel, attribution, page: window.location.pathname }),
      keepalive: true,
    }).catch(() => {})
  } catch {}
}
