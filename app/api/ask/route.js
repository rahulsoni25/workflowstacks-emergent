// /api/ask — the Perplexity/Claude-style "ask a question, get real tools"
// endpoint behind the new question-based landing page.
//
// Production (MONGO_URL set): ranks against the live `skills` collection,
// same field weights as /api/search-skills.
// Local dev (no MONGO_URL, or Mongo unreachable): falls back to the bundled
// snapshot in lib/data/ask-snapshot.json — real catalog data captured via the
// WorkflowStacks MCP connector, not invented. The response always says which
// source it used so nothing pretends to be live prod data when it isn't.

import { rankSkills, tokenize, askLocal, synthesizeAnswer } from '@/lib/ask-engine'
import { matchTemplate, templateMeta } from '@/lib/templates'
import { rateLimit } from '@/lib/rate-limit'

async function tryMongoPool(question) {
  if (!process.env.MONGO_URL) return null
  try {
    const { MongoClient } = await import('mongodb')
    const client = new MongoClient(process.env.MONGO_URL, { serverSelectionTimeoutMS: 1500 })
    await client.connect()
    const db = client.db(process.env.DB_NAME || 'workflowstacks')
    const tokens = tokenize(question)
    if (tokens.length === 0) { await client.close(); return { tokens: [], pool: [] } }
    const fieldRegexes = (field) => tokens.map((t) => ({ [field]: { $regex: t, $options: 'i' } }))
    const ors = [
      ...fieldRegexes('explainer.use_case_example'),
      ...fieldRegexes('explainer.what_you_can_make'),
      ...fieldRegexes('explainer.how_it_helps'),
      ...fieldRegexes('explainer.what_it_is'),
      ...fieldRegexes('title_human'),
      ...fieldRegexes('name'),
      ...fieldRegexes('description_human'),
      ...fieldRegexes('description'),
      ...fieldRegexes('category'),
      ...fieldRegexes('github_topics'),
    ]
    const projection = {
      id: 1, slug: 1, name: 1, title_human: 1, description: 1, description_human: 1,
      category: 1, creator: 1, language: 1, github_stars: 1, github_url: 1,
      github_topics: 1, explainer: 1, hidden: 1,
    }
    const pool = await db.collection('skills')
      .find({ $or: ors, hidden: { $ne: true }, published: { $ne: false } }, { projection })
      .limit(200)
      .toArray()
    await client.close()
    return { tokens, pool }
  } catch {
    // Mongo not reachable (e.g. no local mongod running) — fall through to snapshot.
    return null
  }
}

export async function POST(request) {
  const rl = rateLimit(request, 20, 60_000)
  if (rl) return rl

  let body = {}
  try { body = await request.json() } catch {}
  const question = (body.question || body.query || body.goal || '').toString().trim()
  const limit = Math.min(Math.max(parseInt(body.limit || 8, 10), 1), 20)

  if (!question) {
    return Response.json({ question: '', results: [], total: 0, message: 'Ask a question first.' }, { status: 200 })
  }
  if (question.length > 400) {
    return Response.json({ error: 'question too long (max 400 chars)' }, { status: 400 })
  }

  const mongoAttempt = await tryMongoPool(question)

  let results, source
  const matchedTemplate = matchTemplate(question)

  if (mongoAttempt && mongoAttempt.pool.length > 0) {
    const ranked = rankSkills(mongoAttempt.pool, question, limit)
    results = ranked.results
    source = 'mongodb'
  } else {
    const local = askLocal(question, limit)
    results = local.results
    source = 'local-snapshot'
  }

  const answer = synthesizeAnswer({ question, results, matched_template: matchedTemplate ? templateMeta(matchedTemplate) : null })

  return Response.json({
    question,
    answer,
    matched_template: matchedTemplate ? templateMeta(matchedTemplate) : null,
    total: results.length,
    results,
    source,
    disclaimer: source === 'local-snapshot'
      ? 'Local dev mode: no MongoDB connection, so this answer is ranked against a bundled real-catalog snapshot (222 skills), not the full live database.'
      : null,
  })
}

// GET: health check + example questions the UI can prefill (Perplexity-style suggestions).
export async function GET() {
  return Response.json({
    ok: true,
    sample_questions: [
      'How do I transcribe and summarize meetings automatically?',
      'What tool can scrape a competitor website for pricing?',
      'How do I run AI agents locally without paying for API calls?',
      'What can automate posting to social media?',
      'How do I turn a PDF into structured data?',
      'What tool gives Claude persistent memory across sessions?',
      'How do I manage Meta and Google ads with AI?',
      'What can build a chatbot for my own docs?',
    ],
  })
}
