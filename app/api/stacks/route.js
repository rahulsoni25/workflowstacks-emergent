// Public-shareable stack pages.
// A "stack" is the recommendation engine's output — a goal + a set of skills
// that solve it — saved as a permanent, shareable, forkable artifact.
//
// POST /api/stacks    → save a stack (returns { slug })
// GET  /api/stacks    → list public stacks (paginated, for the gallery)

import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'

const client = new MongoClient(process.env.MONGO_URL)
let db

async function connectDB() {
  if (!db) {
    await client.connect()
    db = client.db(process.env.DB_NAME || 'workflowstacks')
    try {
      await db.collection('stacks').createIndex({ slug: 1 }, { unique: true })
      await db.collection('stacks').createIndex({ createdAt: -1 })
      await db.collection('stacks').createIndex({ public: 1, forkCount: -1 })
    } catch {}
  }
  return db
}

function slugify(s) {
  return String(s || 'stack').toLowerCase()
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'stack'
}

async function uniqueSlug(database, base) {
  let s = base
  for (let i = 0; i < 100; i++) {
    const existing = await database.collection('stacks').findOne({ slug: s })
    if (!existing) return s
    s = `${base}-${i + 2}`
  }
  return `${base}-${Date.now()}`
}

export async function POST(request) {
  let body = {}
  try { body = await request.json() } catch {}
  const goal = (body.goal || '').toString().trim()
  const skillIds = Array.isArray(body.skillIds) ? body.skillIds.filter(Boolean) : []
  const name = (body.name || goal || 'Untitled Stack').toString().trim().slice(0, 120)
  const creatorHandle = (body.creatorHandle || 'anonymous').toString().trim().slice(0, 40) || 'anonymous'
  const isPublic = body.public !== false  // default to public
  const forkedFrom = (body.forkedFrom || '').toString().trim() || null
  const recContext = (body.context || '').toString().slice(0, 600)
  const recSummary = (body.summary || '').toString().slice(0, 1200)
  const confidence = ['high', 'medium', 'low'].includes(body.confidence) ? body.confidence : 'medium'

  if (!goal || skillIds.length === 0) {
    return Response.json({ error: 'goal and at least 1 skillId required' }, { status: 400 })
  }

  const database = await connectDB()
  const baseSlug = slugify(name).slice(0, 50) || 'stack'
  const slug = await uniqueSlug(database, baseSlug)
  const id = uuidv4()

  const stack = {
    id, slug, name, goal, skillIds, creatorHandle, public: isPublic,
    context: recContext, summary: recSummary, confidence,
    forkedFrom, forkCount: 0, viewCount: 0,
    createdAt: new Date(),
  }
  await database.collection('stacks').insertOne(stack)

  // If forked from another stack, bump that stack's forkCount
  if (forkedFrom) {
    try {
      await database.collection('stacks').updateOne(
        { slug: forkedFrom },
        { $inc: { forkCount: 1 } }
      )
    } catch {}
  }

  return Response.json({ slug, id, url: `/s/${slug}` })
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '24', 10), 1), 100)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)
  const sort = searchParams.get('sort') || 'recent'
  const database = await connectDB()
  const sortSpec = sort === 'popular' ? { forkCount: -1, viewCount: -1, createdAt: -1 } : { createdAt: -1 }
  const stacks = await database.collection('stacks')
    .find({ public: true })
    .project({ id: 1, slug: 1, name: 1, goal: 1, skillIds: 1, creatorHandle: 1, summary: 1, forkCount: 1, viewCount: 1, createdAt: 1 })
    .sort(sortSpec).skip(offset).limit(limit).toArray()
  return Response.json({ stacks, count: stacks.length })
}
