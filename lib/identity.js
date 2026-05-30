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
