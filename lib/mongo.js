import { MongoClient } from 'mongodb'

let client = null
let db = null

// One client per function instance, reused across invocations (Fluid compute
// keeps the instance warm). Explicit timeouts so an unreachable Atlas fails
// fast instead of pinning a function at its max duration — and, at build
// time, hanging static generation. A small pool: pages, the API and the MCP
// connector now all read Mongo directly, and each Vercel function type holds
// its own pool, so keep the per-instance share of Atlas's connection cap low.
export async function getDb() {
  if (db) return db
  if (!process.env.MONGO_URL) throw new Error('MONGO_URL is not set')
  if (!client) {
    // MONGO_TIMEOUT_MS: lets a local `next build` with no reachable Mongo
    // fail over to the API fallbacks quickly instead of waiting 8s per read.
    const timeout = parseInt(process.env.MONGO_TIMEOUT_MS || '8000', 10) || 8000
    client = new MongoClient(process.env.MONGO_URL, {
      serverSelectionTimeoutMS: timeout,
      connectTimeoutMS: timeout,
      maxPoolSize: 10,
    })
  }
  await client.connect()
  db = client.db(process.env.DB_NAME || 'workflowstacks')
  return db
}
