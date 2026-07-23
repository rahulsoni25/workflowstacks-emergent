import { MongoClient } from 'mongodb'
import { randomUUID } from 'crypto'

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

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://workflowstacks.com'

// Admin/cron: email people who downloaded a template ≥2 days ago (and haven't
// been asked) a one-click "did it work?" — the only programmatic way to
// validate rung 1 (does it actually work for real humans) at scale.
export async function GET(request) {
  const denied = requireAdmin(request); if (denied) return denied
  if (!process.env.RESEND_API_KEY) return Response.json({ ok: false, error: 'RESEND_API_KEY not set' }, { status: 500 })

  const db = await connectDB()
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  const targets = await db.collection('subscribers').find({
    source: 'template-download',
    dw_asked: { $ne: true },
    created_at: { $lte: twoDaysAgo },
  }).limit(50).toArray()

  let sent = 0
  for (const sub of targets) {
    const token = randomUUID()
    const tpl = (sub.templates_downloaded && sub.templates_downloaded[0]) || 'the template'
    const yes = `${BASE}/api/did-it-work/respond?token=${token}&a=worked`
    const no = `${BASE}/api/did-it-work/respond?token=${token}&a=didnt`
    const html = `<div style="font-family:system-ui;max-width:520px;margin:0 auto;padding:24px;background:#0A0C0D;color:#ECEFEA">
      <h2 style="color:#C6F24E;font-size:18px">Quick one — did it actually work?</h2>
      <p style="color:#c9d1cd">You grabbed <strong>${tpl}</strong> a couple of days ago. Did you get it running?</p>
      <p style="margin:24px 0">
        <a href="${yes}" style="display:inline-block;background:#C6F24E;color:#0A0C0D;font-weight:600;text-decoration:none;padding:10px 20px;border-radius:8px;margin-right:8px">👍 It worked</a>
        <a href="${no}" style="display:inline-block;background:#1a1a1a;color:#ECEFEA;text-decoration:none;padding:10px 20px;border-radius:8px;border:1px solid #333">👎 Not yet</a>
      </p>
      <p style="color:#8B928D;font-size:13px">One click, that's it. If it didn't work, just reply and tell me what broke — I read every one.</p>
    </div>`
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'WorkflowStacks <hello@workflowstacks.com>', to: sub.email, subject: 'Did the template work for you?', html }),
      })
      await db.collection('subscribers').updateOne({ _id: sub._id }, { $set: { dw_asked: true, dw_token: token, dw_asked_at: new Date() } })
      sent += 1
    } catch (e) { console.error('did-it-work send failed:', e.message) }
  }
  return Response.json({ ok: true, sent, candidates: targets.length })
}
