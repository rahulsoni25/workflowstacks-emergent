import { MongoClient } from 'mongodb'
import { randomUUID } from 'crypto'
import { SITE_URL as BASE } from '@/lib/site-url'
import { sendEmail, unsubscribeUrl, SENDABLE } from '@/lib/email'

// Next 14 caches every fetch() in a route handler by default ("auto cache"),
// including the Resend call made from lib/email.js. Each cache miss is a
// write to Vercel's ISR store (billed per 8 KB), and these calls almost never
// hit: the star-refresh job sends a per-run GitHub token (new cache key every
// run) and the LLM calls carry unique bodies. That was most of the Hobby-plan
// ISR-write overage (usage window Aug 25 -> Sep 24, 2026). Nothing here needs
// caching, so default fetch() to no-store; an explicit cache option still wins.
export const fetchCache = 'default-no-store'

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

// Admin/cron: email people who downloaded a template ≥2 days ago (and haven't
// been asked) a one-click "did it work?" — the only programmatic way to
// validate rung 1 (does it actually work for real humans) at scale.
// Unconfirmed and unsubscribed addresses are skipped (SENDABLE).
export async function GET(request) {
  const denied = requireAdmin(request); if (denied) return denied
  if (!process.env.RESEND_API_KEY) return Response.json({ ok: false, error: 'RESEND_API_KEY not set' }, { status: 500 })

  const db = await connectDB()
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  const targets = await db.collection('subscribers').find({
    source: 'template-download',
    dw_asked: { $ne: true },
    created_at: { $lte: twoDaysAgo },
    ...SENDABLE,
  }).limit(50).toArray()

  let sent = 0, failed = 0, firstError = null
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
      <p style="color:#555;font-size:12px;margin-top:24px">You’re receiving this because you downloaded a WorkflowStacks template and asked for more (source: template-download). <a href="${unsubscribeUrl(sub.email)}" style="color:#555">Unsubscribe</a></p>
    </div>`
    // sendEmail adds the List-Unsubscribe headers and returns { ok, error }.
    // dw_asked is only set on a successful send, so a failure is retried
    // on the next run instead of silently counted.
    const r = await sendEmail({ to: sub.email, from: 'WorkflowStacks <hello@workflowstacks.com>', subject: 'Did the template work for you?', html })
    if (r.ok) {
      await db.collection('subscribers').updateOne({ _id: sub._id }, { $set: { dw_asked: true, dw_token: token, dw_asked_at: new Date() } })
      sent += 1
    } else {
      failed += 1
      firstError = firstError || r.error
      console.error('did-it-work send failed for', sub.email, r.error)
    }
  }
  return Response.json({ ok: failed === 0, sent, failed, ...(firstError ? { first_error: firstError } : {}), candidates: targets.length })
}
