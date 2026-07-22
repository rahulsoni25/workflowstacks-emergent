import { MongoClient } from 'mongodb'
import { getBundle } from '../../../../../lib/bundles'
import { rateLimit } from '../../../../../lib/rate-limit'

const client = new MongoClient(process.env.MONGO_URL)
let db

async function connectDB() {
  if (!db) {
    await client.connect()
    db = client.db(process.env.DB_NAME || 'workflowstacks')
  }
  return db
}

// GET /api/bundles/[slug]/download?token=...&file=...
// Serves a purchased premium workflow. Access is gated by the per-purchase
// token minted in the Stripe webhook — no token, no file.
export async function GET(request, { params }) {
  const rl = rateLimit(request, 30, 60_000)
  if (rl) return rl

  const bundle = getBundle(params.slug)
  if (!bundle) return Response.json({ error: 'Bundle not found' }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const token = (searchParams.get('token') || '').trim()
  const fileKey = (searchParams.get('file') || '').trim()
  if (!token) return Response.json({ error: 'Missing access token' }, { status: 401 })

  const database = await connectDB()
  const purchase = await database.collection('bundle_purchases').findOne({ token, bundleId: bundle.slug })
  if (!purchase) return Response.json({ error: 'Invalid or expired access token' }, { status: 403 })

  // Default to the first file when none specified (single-file bundles)
  const file = fileKey
    ? bundle.files.find((f) => f.key === fileKey)
    : bundle.files[0]
  if (!file) return Response.json({ error: 'File not found in bundle' }, { status: 404 })

  return new Response(JSON.stringify(file.workflow, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
