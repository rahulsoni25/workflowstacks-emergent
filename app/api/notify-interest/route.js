import { MongoClient } from 'mongodb'
import { rateLimit } from '../../../lib/rate-limit'
import { COMING_SOON } from '../../../lib/coming-soon'
import { startConfirmation, normalizeEmail, EMAIL_RE } from '../../../lib/email'

// The confirmation email goes out through fetch() in lib/email.js, which
// Next 14 would otherwise cache (docs/COSTS.md rule 4).
export const fetchCache = 'default-no-store'

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
  const email = normalizeEmail(body.email)
  const tool = (body.tool || '').toString().trim().slice(0, 60)
  if (!email || !EMAIL_RE.test(email)) return Response.json({ ok: false, error: 'Valid email required' }, { status: 400 })
  // Only accept interest for tools we actually list as coming-soon (no arbitrary keys)
  const listed = COMING_SOON.find((t) => t.slug === tool)
  if (!listed) return Response.json({ ok: false, error: 'Unknown tool' }, { status: 400 })

  const db = await connectDB()
  await db.collection('tool_interest').updateOne(
    { tool, email },
    { $setOnInsert: { tool, email, at: new Date() } },
    { upsert: true }
  )
  // Also put them on the list so they hear when it ships — through the same
  // confirmation as every other signup (source: 'fake-door', status:
  // 'pending' until the link in the email is clicked). An address that is
  // already active just gets the tool added to interested_in.
  const result = await startConfirmation(db.collection('subscribers'), {
    email,
    source: 'fake-door',
    addToSet: { interested_in: tool },
    tool: listed.title || tool,
  })
  return Response.json({ ok: true, pending: result.pending, confirmation_sent: result.confirmation_sent })
}
