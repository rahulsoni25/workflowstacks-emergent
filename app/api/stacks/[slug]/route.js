// GET /api/stacks/[slug] — fetch one stack + its hydrated skills

import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGO_URL)
let db

async function connectDB() {
  if (!db) {
    await client.connect()
    db = client.db(process.env.DB_NAME || 'workflowstacks')
  }
  return db
}

export async function GET(_request, { params }) {
  const slug = params?.slug
  if (!slug) return Response.json({ error: 'slug required' }, { status: 400 })
  const database = await connectDB()
  const stack = await database.collection('stacks').findOne({ slug })
  if (!stack) return Response.json({ error: 'not found' }, { status: 404 })
  // Bump view count (best-effort, fire-and-forget)
  database.collection('stacks').updateOne({ slug }, { $inc: { viewCount: 1 } }).catch(() => {})
  // Hydrate skills
  const skills = await database.collection('skills')
    .find({ id: { $in: stack.skillIds || [] } })
    .project({
      id: 1, slug: 1, name: 1, title_human: 1, description: 1, description_human: 1,
      category: 1, github_stars: 1, github_url: 1, language: 1, explainer: 1,
    })
    .toArray()
  // Preserve the order from skillIds
  const order = new Map((stack.skillIds || []).map((id, i) => [id, i]))
  skills.sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99))
  return Response.json({ stack, skills })
}
