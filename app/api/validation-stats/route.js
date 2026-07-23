import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGO_URL)
let db
async function connectDB() {
  if (!db) { await client.connect(); db = client.db(process.env.DB_NAME || 'workflowstacks') }
  return db
}
function requireAdmin(request) {
  const secret = process.env.ADMIN_SECRET
  if (!secret || request.headers.get('x-admin-secret') !== secret) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return null
}

// Admin: the validation funnel in real numbers — the "score", made objective.
// Reads the collections the funnel already writes to; nothing new to instrument
// except the did-it-work + fake-door signals (their own endpoints).
export async function GET(request) {
  const denied = requireAdmin(request); if (denied) return denied
  const db = await connectDB()

  const [dlAgg] = await db.collection('template_downloads').aggregate([
    { $group: { _id: null, downloads: { $sum: '$count' }, personalized: { $sum: { $ifNull: ['$personalized_count', 0] } } } },
  ]).toArray()

  const [
    subsTotal, subsFromDownload, dwYes, dwNo, dwAsked,
    dfyTotal, dfyNew, purchases, agents, searches, interest,
  ] = await Promise.all([
    db.collection('subscribers').countDocuments(),
    db.collection('subscribers').countDocuments({ source: 'template-download' }),
    db.collection('subscribers').countDocuments({ dw_response: 'worked' }),
    db.collection('subscribers').countDocuments({ dw_response: 'didnt' }),
    db.collection('subscribers').countDocuments({ dw_asked: true }),
    db.collection('dfy_requests').countDocuments(),
    db.collection('dfy_requests').countDocuments({ status: 'new' }),
    db.collection('bundle_purchases').countDocuments(),
    db.collection('agent_templates').countDocuments(),
    db.collection('search_queries').countDocuments(),
    db.collection('tool_interest').countDocuments().catch(() => 0),
  ])

  // Per-tool fake-door interest (demand signal for unbuilt tools)
  const interestByTool = await db.collection('tool_interest').aggregate([
    { $group: { _id: '$tool', count: { $sum: 1 } } }, { $sort: { count: -1 } },
  ]).toArray().catch(() => [])

  // Per-template downloads
  const byTemplate = await db.collection('template_downloads')
    .find({}, { projection: { _id: 0, slug: 1, count: 1 } }).sort({ count: -1 }).toArray()

  const downloads = dlAgg?.downloads || 0
  const dwAnswered = dwYes + dwNo
  const revenueScore = purchases > 0 ? 3 : dfyTotal > 0 ? 1 : 0

  return Response.json({
    funnel: {
      recommender_goals_logged: searches,
      template_downloads: downloads,
      personalized_downloads: dlAgg?.personalized || 0,
      emails_captured: subsFromDownload,
      did_it_work_asked: dwAsked,
      did_it_work_yes: dwYes,
      did_it_work_no: dwNo,
      did_it_work_rate: dwAnswered ? Math.round((dwYes / dwAnswered) * 100) : null,
      dfy_requests: dfyTotal,
      dfy_new: dfyNew,
      purchases,
      agents_built: agents,
      subscribers_total: subsTotal,
    },
    fake_door_interest: interestByTool.map((t) => ({ tool: t._id, signups: t.count })),
    per_template_downloads: byTemplate,
    // A crude, honest self-score so the number stops being subjective.
    validation_score_hint: {
      works: dwYes > 0 ? 'evidenced' : 'unproven',
      wanted: downloads >= 20 ? 'yes' : downloads > 0 ? 'trickle' : 'none',
      paid: purchases > 0 ? 'yes' : dfyTotal > 0 ? 'intent-only' : 'none',
      note: 'Score rises with: a real did-it-work "yes", downloads happening without pushing, and a first purchase.',
    },
  })
}
