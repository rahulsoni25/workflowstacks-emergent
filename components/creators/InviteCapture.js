'use client'

import { useEffect } from 'react'

// First-touch referral capture. A creator's invite link is
// /creators?invite=<github-handle>; we remember who sent the visitor so a later
// claim or submission can credit them. Deliberately NOT `?ref=` — that param is
// already used across the site as a traffic-source tag (ref=share, ref=creator).
const KEY = 'ws_invite_v1'
const MAX_AGE = 30 * 24 * 60 * 60 * 1000

export function readInvite() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (v && v.h && Date.now() - v.t < MAX_AGE) return v.h
  } catch {}
  return ''
}

export default function InviteCapture() {
  useEffect(() => {
    try {
      const h = new URLSearchParams(window.location.search).get('invite') || ''
      if (!/^[a-z\d](?:[a-z\d-]{0,38})$/i.test(h)) return
      if (readInvite()) return // first touch wins
      localStorage.setItem(KEY, JSON.stringify({ h: h.toLowerCase(), t: Date.now() }))
    } catch {}
  }, [])
  return null
}
