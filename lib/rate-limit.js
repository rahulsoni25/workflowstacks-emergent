// Shared in-memory rate limiter per IP. Resets per cold start, which on
// Vercel serverless is frequent — fine for abuse smoothing, not strict quota.
// Each route file gets its own map instance (separate lambda bundles), so
// limits are per-route, per-instance — exactly what we want for smoothing.
const _rl = new Map()

export function rateLimit(request, limit = 10, windowMs = 60_000) {
  const ip = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim()
  const now = Date.now()
  const slot = _rl.get(ip) || { count: 0, reset: now + windowMs }
  if (now > slot.reset) { slot.count = 0; slot.reset = now + windowMs }
  slot.count++
  _rl.set(ip, slot)
  if (slot.count > limit) return Response.json({ error: 'Too many requests' }, { status: 429 })
  return null
}
