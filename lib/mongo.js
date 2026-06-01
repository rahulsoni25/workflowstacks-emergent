import { MongoClient } from 'mongodb'

let client = null
let db = null

export async function getDb() {
  if (db) return db
  if (!client) client = new MongoClient(process.env.MONGO_URL)
  await client.connect()
  db = client.db(process.env.DB_NAME || 'workflowstacks')
  return db
}
