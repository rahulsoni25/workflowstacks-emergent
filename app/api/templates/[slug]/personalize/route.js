import { MongoClient } from 'mongodb'
import { getTemplate, PERSONALIZABLE_NODE } from '../../../../../lib/templates'
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

// Every n8n expression in a prompt, e.g. {{ $json['Product Name'] }}.
// The personalized prompt must keep ALL of them verbatim or the workflow breaks.
function extractExpressions(text) {
  return (String(text).match(/\{\{[^}]*\}\}/g) || []).map((s) => s.trim())
}

async function rewritePrompt(originalPrompt, goal) {
  if (!process.env.GROQ_API_KEY) return null
  const system = `You customize the AI prompt inside an automation workflow for a specific user's business. You will receive the CURRENT prompt and the user's GOAL. Rewrite the prompt so its voice, examples, and emphasis fit the user's business/niche — while keeping the SAME task, the SAME output structure/format rules, and EVERY {{ ... }} template expression EXACTLY as-is, character for character, in sensible positions. Return ONLY the rewritten prompt text — no commentary, no markdown fences.`
  const user = `USER'S GOAL: "${goal}"\n\nCURRENT PROMPT:\n${originalPrompt}`
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: process.env.GROQ_REC_MODEL || 'llama-3.3-70b-versatile',
      max_tokens: 1500,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
  })
  if (!r.ok) throw new Error(`Groq ${r.status}`)
  const d = await r.json()
  return (d.choices?.[0]?.message?.content || '').trim()
}

// POST /api/templates/[slug]/personalize  { goal }
// Returns the workflow JSON with its AI-prompt node rewritten for the user's
// business. Falls back to the stock template on ANY doubt — a generic template
// that works beats a personalized one that broke an expression.
export async function POST(request, { params }) {
  const rl = rateLimit(request, 5, 60_000)
  if (rl) return rl

  const tpl = getTemplate(params.slug)
  if (!tpl) return Response.json({ error: 'Template not found' }, { status: 404 })

  let body = {}
  try { body = await request.json() } catch {}
  const goal = (body.goal || '').toString().trim().slice(0, 600)

  // Deep-copy so we never mutate the in-memory registry
  const workflow = JSON.parse(JSON.stringify(tpl.workflow))
  let personalized = false

  const nodeName = PERSONALIZABLE_NODE[tpl.slug]
  const node = nodeName && goal.length >= 10
    ? workflow.nodes.find((n) => n.name === nodeName)
    : null
  const originalPrompt = node?.parameters?.messages?.values?.[0]?.content

  if (node && originalPrompt) {
    try {
      const rewritten = await rewritePrompt(originalPrompt, goal)
      if (rewritten && rewritten.length > 100) {
        const before = extractExpressions(originalPrompt)
        const after = new Set(extractExpressions(rewritten))
        const allKept = before.every((e) => after.has(e))
        if (allKept) {
          node.parameters.messages.values[0].content = rewritten
          workflow.name = `${workflow.name} (personalized)`
          personalized = true
        }
      }
    } catch (e) {
      console.error('personalize failed, serving stock:', e.message)
    }
  }

  try {
    const database = await connectDB()
    await database.collection('template_downloads').updateOne(
      { slug: tpl.slug },
      {
        $inc: { count: 1, ...(personalized ? { personalized_count: 1 } : {}) },
        $set: { last_download_at: new Date() },
        $setOnInsert: { first_download_at: new Date() },
      },
      { upsert: true }
    )
  } catch (e) {
    console.error('template download count failed:', e.message)
  }

  return new Response(JSON.stringify(workflow, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${tpl.filename}"`,
      'X-Personalized': personalized ? 'true' : 'false',
    },
  })
}
