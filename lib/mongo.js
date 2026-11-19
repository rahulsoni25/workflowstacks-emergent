import { MongoClient } from 'mongodb'

// The one MongoClient for this server instance, shared by every route, page
// and lib module. Route modules must not construct their own: each extra
// client is another connection pool per serverless instance.
//
// The client is created on the first getDb() call, not when this module is
// imported, so `next build` can load route modules with MONGO_URL unset.
//
// - maxPoolSize: the driver default is 100 per client. A serverless instance
//   serves few requests at once, so 10 is enough and keeps the cluster's
//   connection count down when many instances are warm.
// - serverSelectionTimeoutMS / connectTimeoutMS (driver default 30s each): an
//   unreachable cluster fails in ~8s with an error instead of holding the
//   function open.
const CLIENT_OPTIONS = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 8000,
  connectTimeoutMS: 8000,
}

let client = null
let db = null

export async function getDb() {
  if (db) return db
  if (!process.env.MONGO_URL) throw new Error('MONGO_URL is not set')
  if (!client) client = new MongoClient(process.env.MONGO_URL, CLIENT_OPTIONS)
  // Concurrent callers share one in-flight connect, and a failed connect can
  // be retried on the next call (driver 6.x).
  await client.connect()
  db = client.db(process.env.DB_NAME || 'workflowstacks')
  return db
}
