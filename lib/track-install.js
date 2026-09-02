'use client'

// Fire-and-forget install telemetry. keepalive lets the request survive the
// page navigating away (deep links, downloads). Never throws, never blocks.
export function trackInstall(skillId, channel) {
  if (!skillId || !channel) return
  try {
    fetch('/api/track-install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skillId, channel }),
      keepalive: true,
    }).catch(() => {})
  } catch {}
}
