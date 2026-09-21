import { timingSafeEqual } from 'crypto'
import { revalidatePath } from 'next/cache'
import { rateLimit } from '@/lib/rate-limit'
import { listCreators, getCreator, verifyClaim, referralReport, foundingSlotsLeft, normHandle, backfillCreatorTypes } from '@/lib/creators'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Header only (no ?secret= — query strings end up in logs), constant-time compare.
function requireAdmin(request) {
  const secret = process.env.ADMIN_SECRET || ''
  const provided = request.headers.get('x-admin-secret') || ''
  const a = Buffer.from(provided), b = Buffer.from(secret)
  const ok = secret.length > 0 && a.length === b.length && timingSafeEqual(a, b)
  if (!ok) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return null
}

const CDN = { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400' }

// GET /api/creator-directory            → the whole directory (CDN-cached)
// GET /api/creator-directory?handle=x   → one creator + their listed skills
// GET /api/creator-directory?report=referrals  (admin) → who referred whom
// GET /api/creator-directory?backfill=types&limit=40  (admin) → fill User/Organization
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  try {
    if (searchParams.get('report') === 'referrals') {
      const denied = requireAdmin(request)
      if (denied) return denied
      return Response.json({ referrals: await referralReport() }, { headers: { 'Cache-Control': 'no-store' } })
    }
    if (searchParams.get('backfill') === 'types') {
      const denied = requireAdmin(request)
      if (denied) return denied
      return Response.json(await backfillCreatorTypes(searchParams.get('limit')), { headers: { 'Cache-Control': 'no-store' } })
    }
    const handle = searchParams.get('handle')
    if (handle !== null) {
      if (!normHandle(handle)) return Response.json({ error: 'Invalid handle' }, { status: 400 })
      const creator = await getCreator(handle)
      if (!creator) return Response.json({ error: 'Not found' }, { status: 404 })
      const founding_left = creator.verified ? null : await foundingSlotsLeft()
      // ?isr=1 = the profile page's own regeneration fetch; never CDN-cache that
      // or a 7-day page would bake in a stale JSON copy.
      return Response.json({ creator, founding_left }, { headers: searchParams.has('isr') ? { 'Cache-Control': 'no-store' } : CDN })
    }
    return Response.json(await listCreators(), { headers: searchParams.has('isr') ? { 'Cache-Control': 'no-store' } : CDN })
  } catch (e) {
    console.error('creator-directory GET', e)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/creator-directory  { handle, ref? } → check the README, mark verified
export async function POST(request) {
  const rl = rateLimit(request, 5, 60_000)
  if (rl) return rl
  try {
    const body = await request.json().catch(() => ({}))
    const handle = normHandle(body.handle)
    if (!handle) return Response.json({ success: false, error: 'Enter a valid GitHub username.' }, { status: 400 })
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
