// Shared in-memory rate limiter per IP. Resets per cold start, which on
// Vercel serverless is frequent — fine for abuse smoothing, not strict quota.
// Vercel can bundle many routes into ONE lambda sharing this module instance,
// so slots are keyed by scope + IP — otherwise endpoints with different
// limits would silently consume each other's budgets.
const _rl = new Map()

export function rateLimit(request, limit = 10, windowMs = 60_000, scope = null) {
  const ip = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim()
  let s = scope
  if (!s) {
    try { s = new URL(request.url).pathname } catch { s = 'global' }
  }
  const key = `${s}:${ip}`
  const now = Date.now()
  const slot = _rl.get(key) || { count: 0, reset: now + windowMs }
  if (now > slot.reset) { slot.count = 0; slot.reset = now + windowMs }
  slot.count++
  _rl.set(key, slot)
  if (slot.count > limit) return Response.json({ error: 'Too many requests' }, { status: 429 })
  return null
}
