import { timingSafeEqual } from 'crypto'
import { revalidatePath } from 'next/cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// On-demand ISR invalidation for jobs that write Mongo from a GitHub runner
// (scripts/skills-noise-audit.mjs --apply). revalidatePath() only exists inside
// the Next runtime, so a runner script has to ask the deployed site to do it.
//
// Admin-only, and limited to an explicit allowlist rather than any path: each
// path revalidated here costs one regeneration on its next visit, billed in
// ISR write units (docs/COSTS.md — /skills is ~10 units). An open "revalidate
// anything" endpoint would let one bad call regenerate the whole catalog.
//
// Why only /skills today:
//   - /skills is where unpublished rows were showing (its SSR fetch of
//     /api/skills?sort=trending is cached for 6h; revalidatePath('/skills')
//     also drops that fetch, via Next's implicit `_N_T_/skills` tag).
//   - /skills/page/[n] and the homepage refresh on their own 6h timer. The
//     homepage rail already filters with isAiRelevant(strict).
//   - A skill's own detail page does not read `published`, so unpublishing a
//     row does not change it; revalidating it would be a regeneration for
//     byte-identical output.
// Add a path here only with a reason in those terms.
const ALLOWED = new Set(['/skills'])

function requireAdmin(request) {
  const secret = process.env.ADMIN_SECRET
  if (!secret) return Response.json({ error: 'ADMIN_SECRET not configured' }, { status: 500 })
  // Header only — a ?secret= query param would land in request logs.
  const provided = request.headers.get('x-admin-secret') || ''
  if (provided.length !== secret.length || !timingSafeEqual(Buffer.from(provided), Buffer.from(secret))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

export async function POST(request) {
  const denied = requireAdmin(request)
  if (denied) return denied

  const body = await request.json().catch(() => null)
  const paths = Array.isArray(body?.paths) ? body.paths : null
  if (!paths || !paths.length) {
    return Response.json({ error: 'body must be {"paths": ["/skills"]}' }, { status: 400 })
  }
  const rejected = paths.filter((p) => typeof p !== 'string' || !ALLOWED.has(p))
  if (rejected.length) {
    return Response.json({ error: 'path not allowed', rejected, allowed: [...ALLOWED] }, { status: 400 })
  }

  const unique = [...new Set(paths)]
  for (const p of unique) revalidatePath(p)
  return Response.json({ revalidated: unique })
}
