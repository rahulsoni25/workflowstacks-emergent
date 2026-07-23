import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGO_URL)
let db
async function connectDB() {
  if (!db) { await client.connect(); db = client.db(process.env.DB_NAME || 'workflowstacks') }
  return db
}

// Public: one-click did-it-work response (token-gated to a real recipient).
// Renders a tiny thank-you page. This is the data point that proves the
// product works for real humans.
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const token = (searchParams.get('token') || '').trim()
  const answer = searchParams.get('a') === 'worked' ? 'worked' : searchParams.get('a') === 'didnt' ? 'didnt' : null
  if (!token || !answer) return html('Thanks — but this link looks incomplete.', 400)

  const db = await connectDB()
  const res = await db.collection('subscribers').findOneAndUpdate(
    { dw_token: token },
    { $set: { dw_response: answer, dw_responded_at: new Date() } },
  )
  if (!res) return html('This feedback link has expired.', 404)

  return answer === 'worked'
    ? html('Brilliant — thank you! 🎉<br><br>That’s exactly what we needed to hear.')
    : html('Thanks for the honesty. 🙏<br><br>Reply to the email and tell us what broke — we’ll fix it or set it up for you.')
}

function html(msg, status = 200) {
  return new Response(
    `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
     <title>Thanks</title>
     <body style="margin:0;background:#0A0C0D;color:#ECEFEA;font-family:system-ui;display:grid;place-items:center;min-height:100vh">
       <div style="max-width:440px;text-align:center;padding:32px">
         <div style="font-size:22px;font-weight:700;color:#C6F24E;margin-bottom:12px">WorkflowStacks</div>
         <p style="font-size:17px;line-height:1.6">${msg}</p>
         <a href="https://workflowstacks.com/templates" style="color:#8B928D;font-size:14px">← Back to templates</a>
       </div>
     </body>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}
