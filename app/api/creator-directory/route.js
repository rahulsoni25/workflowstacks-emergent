import { timingSafeEqual } from 'crypto'
import { revalidatePath } from 'next/cache'
import { rateLimit } from '@/lib/rate-limit'
import { listCreators, verifyClaim, referralReport, normHandle } from '@/lib/creators'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

// Header only (no ?secret= — query strings end up in logs), constant-time compare.
function requireAdmin(request) {
  const secret = process.env.ADMIN_SECRET || ''
  const provided = request.headers.get('x-admin-secret') || ''
  const a = Buffer.from(provided), b = Buffer.from(secret)
  const ok = secret.length > 0 && a.length === b.length && timingSafeEqual(a, b)
  if (!ok) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return null
}

// The list changes once a day (daily ingest) or when someone claims. Six hours
// at the CDN means the function behind this runs a handful of times a day no
// matter how many people search; a week of stale-while-revalidate keeps it
// instant. A fresh claim shows on the page itself at once (revalidatePath) and
// in this JSON within six hours.
const CDN = { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=604800' }

// GET /api/creator-directory                   → the whole directory, compact JSON
// GET /api/creator-directory?report=referrals  (admin) → who referred whom
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  try {
    if (searchParams.get('report') === 'referrals') {
      const denied = requireAdmin(request)
      if (denied) return denied
      return Response.json({ referrals: await referralReport() }, { headers: { 'Cache-Control': 'no-store' } })
    }
    // Any other query string is a different CDN cache key for the same data —
    // send it to the one cacheable URL instead of running the aggregation again.
    if ([...searchParams.keys()].length) {
      return new Response(null, { status: 308, headers: { Location: '/api/creator-directory', 'Cache-Control': 'public, s-maxage=86400' } })
    }
    const rl = rateLimit(request, 20, 60_000)
    if (rl) return rl
    return Response.json(await listCreators({ compact: true }), { headers: CDN })
  } catch (e) {
    console.error('creator-directory GET', e)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}

// One README check per handle per 30s per instance: stops a button-masher (or
// a script) from spending the GitHub budget and function time.
const _cooldown = new Map()

// POST /api/creator-directory  { handle, ref? } → check the README, mark verified
export async function POST(request) {
  const rl = rateLimit(request, 5, 60_000)
  if (rl) return rl
  try {
    const body = await request.json().catch(() => ({}))
    const handle = normHandle(body.handle)
    if (!handle) return Response.json({ success: false, error: 'Enter a valid GitHub username.' }, { status: 400 })
    const now = Date.now()
    if ((_cooldown.get(handle) || 0) > now) {
      return Response.json({ success: false, error: 'Just checked — give GitHub half a minute, then try again.' }, { status: 429 })
    }
    if (_cooldown.size > 500) _cooldown.clear()
    _cooldown.set(handle, now + 30_000)

    const result = await verifyClaim(handle, body.ref)
    if (!result.ok) return Response.json({ success: false, error: result.error }, { status: result.status || 400 })
    try {
      revalidatePath(`/creators/${result.handle.toLowerCase()}`)
      revalidatePath(`/creators/${result.handle}`)
      revalidatePath('/creators')
    } catch {
      // Never fail a claim because cache invalidation threw.
    }
    return Response.json({ success: true, handle: result.handle, already: !!result.already, founding: !!result.founding })
  } catch (e) {
    console.error('creator-directory POST', e)
    return Response.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
