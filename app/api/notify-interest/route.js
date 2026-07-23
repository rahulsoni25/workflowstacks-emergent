import { MongoClient } from 'mongodb'
import { rateLimit } from '../../../lib/rate-limit'
import { COMING_SOON } from '../../../lib/coming-soon'

const client = new MongoClient(process.env.MONGO_URL)
let db
async function connectDB() {
  if (!db) { await client.connect(); db = client.db(process.env.DB_NAME || 'workflowstacks') }
  return db
}

// Public fake-door capture: "notify me when <unbuilt tool> ships." Each signup
// is a demand signal for a tool that doesn't exist yet — validation BEFORE
// building, the one thing that works at zero traffic.
export async function POST(request) {
  const rl = rateLimit(request, 10, 60_000); if (rl) return rl
  const body = await request.json().catch(() => ({}))
  const email = (body.email || '').toString().trim().toLowerCase()
  const tool = (body.tool || '').toString().trim().slice(0, 60)
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return Response.json({ ok: false, error: 'Valid email required' }, { status: 400 })
  // Only accept interest for tools we actually list as coming-soon (no arbitrary keys)
  if (!COMING_SOON.some((t) => t.slug === tool)) return Response.json({ ok: false, error: 'Unknown tool' }, { status: 400 })

  const db = await connectDB()
  await db.collection('tool_interest').updateOne(
    { tool, email },
    { $setOnInsert: { tool, email, at: new Date() } },
    { upsert: true }
  )
  // Also add them to the list so they hear when it ships
  await db.collection('subscribers').updateOne(
    { email },
    { $setOnInsert: { email, created_at: new Date(), source: 'fake-door' }, $addToSet: { interested_in: tool } },
    { upsert: true }
  )
  return Response.json({ ok: true })
}
