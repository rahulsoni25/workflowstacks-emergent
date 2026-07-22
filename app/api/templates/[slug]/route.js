import { MongoClient } from 'mongodb'
import { getTemplate } from '../../../../lib/templates'
import { rateLimit } from '../../../../lib/rate-limit'

const client = new MongoClient(process.env.MONGO_URL)
let db

async function connectDB() {
  if (!db) {
    await client.connect()
    db = client.db(process.env.DB_NAME || 'workflowstacks')
  }
  return db
}

// GET /api/templates/[slug] — download a working deliverable.
// Downloads are the Phase-1 activation metric, so every one is counted.
export async function GET(request, { params }) {
  const rl = rateLimit(request, 30, 60_000)
  if (rl) return rl

  const tpl = getTemplate(params.slug)
  if (!tpl) return Response.json({ error: 'Template not found' }, { status: 404 })

  // Best-effort download counter — never blocks the download itself
  try {
    const database = await connectDB()
    await database.collection('template_downloads').updateOne(
      { slug: tpl.slug },
      { $inc: { count: 1 }, $set: { last_download_at: new Date() }, $setOnInsert: { first_download_at: new Date() } },
      { upsert: true }
    )
  } catch (e) {
    console.error('template download count failed:', e.message)
  }

  return new Response(JSON.stringify(tpl.workflow, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${tpl.filename}"`,
      'Cache-Control': 'public, max-age=300',
    },
  })
}
