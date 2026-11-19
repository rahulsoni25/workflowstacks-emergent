import { getDb } from '@/lib/mongo'
import { getKit } from '../../../../../lib/kits'
import { rateLimit } from '../../../../../lib/rate-limit'

// POST /api/kits/[slug]/click — best-effort click counter per asset, fired
// by the client right before it opens the outbound source link. Tells us
// which picks actually get used, same activation-metric pattern as
// template_downloads. Never blocks or errors visibly to the user.
export async function POST(request, { params }) {
  const rl = rateLimit(request, 60, 60_000, 'kits-click')
  if (rl) return rl

  const kit = getKit(params.slug)
  if (!kit) return Response.json({ error: 'Kit not found' }, { status: 404 })

  let asset = ''
  try {
    const body = await request.json()
    asset = String(body?.asset || '').slice(0, 120)
  } catch {}

  try {
    const database = await getDb()
    await database.collection('kit_asset_clicks').updateOne(
      { kit: kit.slug, asset },
      { $inc: { count: 1 }, $set: { last_click_at: new Date() }, $setOnInsert: { first_click_at: new Date() } },
      { upsert: true }
    )
  } catch (e) {
    console.error('kit click count failed:', e.message)
  }

  return new Response(null, { status: 204 })
}
