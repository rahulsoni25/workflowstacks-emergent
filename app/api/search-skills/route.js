// Use-case search — "find me a skill for [job to be done]".
// Powered by the explainer fields we generated (use_case_example,
// what_you_can_make, how_it_helps) joined with native skill fields.
//
// Uses MongoDB $text search with English stemming so "transcribe", "transcribed",
// "transcription" all hit. Score-ranked. Returns matched-snippet so the UI can
// show WHY each result is relevant.

import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGO_URL)
let db
let indexEnsured = false

async function connectDB() {
  if (!db) {
    await client.connect()
    db = client.db(process.env.DB_NAME || 'workflowstacks')
  }
  return db
}

// Ensure the text index exists. Runs once per cold start. Idempotent.
async function ensureTextIndex(database) {
  if (indexEnsured) return
  try {
    // Weights: explainer fields outrank raw GitHub description because they're
    // already plain-English job-to-be-done content. use_case_example wins.
    await database.collection('skills').createIndex(
      {
        'explainer.use_case_example': 'text',
        'explainer.what_you_can_make': 'text',
        'explainer.how_it_helps': 'text',
        'explainer.what_it_is': 'text',
        title_human: 'text',
        name: 'text',
        description_human: 'text',
        description: 'text',
        category: 'text',
        github_topics: 'text',
      },
      {
        name: 'skill_usecase_text_idx',
        weights: {
          'explainer.use_case_example': 20,
          'explainer.what_you_can_make': 16,
          'explainer.how_it_helps': 10,
          'explainer.what_it_is': 8,
          title_human: 14,
          name: 12,
          description_human: 6,
          description: 4,
          category: 6,
          github_topics: 5,
        },
        default_language: 'english',
      }
    )
    indexEnsured = true
  } catch (e) {
    // If index already exists with same name but different shape, drop and recreate
    if (/already exists/i.test(e.message) || /IndexOptionsConflict/i.test(e.message)) {
      try { await database.collection('skills').dropIndex('skill_usecase_text_idx') } catch {}
      // Don't retry inline — next request will rebuild
    }
    console.log('ensureTextIndex:', e.message)
  }
}

// Pick the best matched snippet to show the user WHY this hit. We look for the
// query terms inside the explainer fields and return a short excerpt around them.
function buildSnippet(skill, query) {
  const q = (query || '').toLowerCase().trim()
  if (!q || !skill.explainer) return null
  const candidates = [
    { field: 'use_case_example', text: skill.explainer.use_case_example },
    { field: 'what_you_can_make', text: skill.explainer.what_you_can_make },
    { field: 'how_it_helps', text: skill.explainer.how_it_helps },
    { field: 'what_it_is', text: skill.explainer.what_it_is },
  ]
  const tokens = q.split(/\s+/).filter(t => t.length >= 3)
  for (const c of candidates) {
    if (!c.text) continue
    const lower = c.text.toLowerCase()
    for (const t of tokens) {
      const i = lower.indexOf(t)
      if (i >= 0) {
        const start = Math.max(0, i - 60)
        const end = Math.min(c.text.length, i + 140)
        return { field: c.field, snippet: (start > 0 ? '…' : '') + c.text.slice(start, end) + (end < c.text.length ? '…' : '') }
      }
    }
  }
  // Fallback: first 160 chars of use_case_example or what_you_can_make
  const fallback = skill.explainer.use_case_example || skill.explainer.what_you_can_make
  return fallback ? { field: 'use_case_example', snippet: fallback.slice(0, 160) + (fallback.length > 160 ? '…' : '') } : null
}

export async function POST(request) {
  let body = {}
  try { body = await request.json() } catch {}
  const query = (body.query || '').toString().trim()
  const limit = Math.min(Math.max(parseInt(body.limit || 12, 10), 1), 30)

  if (!query) {
    return Response.json({ query: '', results: [], total: 0, message: 'Empty query' })
  }

  const database = await connectDB()
  await ensureTextIndex(database)

  // $text search uses the configured weights to rank. Only return non-hidden skills.
  // Exclude heavy fields to keep payload small (readme_preview is big).
  const projection = {
    id: 1, slug: 1, name: 1, title_human: 1, description: 1, description_human: 1,
    category: 1, creator: 1, owner: 1, language: 1, github_stars: 1, github_url: 1,
    github_topics: 1, explainer: 1, score: { $meta: 'textScore' },
  }
  let results = []
  try {
    results = await database.collection('skills')
      .find(
        { $text: { $search: query }, hidden: { $ne: true } },
        { projection }
      )
      .sort({ score: { $meta: 'textScore' }, github_stars: -1 })
      .limit(limit)
      .toArray()
  } catch (e) {
    return Response.json({ query, results: [], error: e.message }, { status: 500 })
  }

  // Attach matched snippet for UI display
  for (const r of results) {
    r.matched = buildSnippet(r, query)
  }

  return Response.json({ query, total: results.length, results })
}

// GET: tiny health check + sample queries the UI can prefill
export async function GET() {
  return Response.json({
    ok: true,
    sample_queries: [
      'transcribe meetings',
      'build a chatbot for my docs',
      'send personalized cold emails',
      'generate images from text',
      'automate social media posting',
      'analyze a spreadsheet with AI',
      'turn a PDF into structured data',
      'run AI agents locally without API costs',
    ],
  })
}
