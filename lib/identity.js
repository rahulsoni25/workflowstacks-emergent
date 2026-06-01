'use client'

// Lightweight, passwordless device identity.
// A stable anonymous ID is stored in localStorage so a visitor's saved
// agents persist across visits — no login, no password, no PII required.
export function getUserId() {
  if (typeof window === 'undefined') return null
  let id = localStorage.getItem('ws_uid')
  if (!id) {
    id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'u-' + Date.now() + '-' + Math.random().toString(36).slice(2)
    localStorage.setItem('ws_uid', id)
  }
  return id
}

// Optional public creator handle (for community attribution). No account needed.
export function getHandle() {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('ws_handle') || ''
}

export function setHandle(name) {
  if (typeof window === 'undefined') return
  const clean = String(name || '').trim().replace(/^@/, '').slice(0, 30)
  localStorage.setItem('ws_handle', clean)
  return clean
}
