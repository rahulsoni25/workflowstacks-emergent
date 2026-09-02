// Storage + crypto for the MCP connector's OAuth 2.1 server.
//
// Mongo-backed in production. When MONGO_URL is absent (local dev, some
// previews) it degrades to per-instance in-memory maps — fine for a single
// dev server, and the full flow stays testable without a database.
//
// Security invariants:
// - Authorization codes and tokens are stored as SHA-256 hashes, never raw.
// - Codes and refresh tokens are single-use: consumed (deleted) on first read.
// - Everything carries an expiry checked at read time.

import { getDb } from '@/lib/mongo'
import { createHash, randomBytes, randomUUID } from 'crypto'

const TTL = {
  code: 10 * 60 * 1000, // 10 minutes
  access: 60 * 60 * 1000, // 1 hour
  refresh: 30 * 24 * 60 * 60 * 1000, // 30 days
}

export function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
export function sha256b64url(input) {
  return b64url(createHash('sha256').update(input).digest())
}
export function newSecret(bytes = 32) {
  return b64url(randomBytes(bytes))
}
export { randomUUID }

// ---------------------------------------------------------------------------

const mem = { oauth_clients: new Map(), oauth_grants: new Map() }
const useMongo = () => Boolean(process.env.MONGO_URL)

async function col(name) {
  const db = await getDb()
  return db.collection(name)
}

// -- clients (dynamic registration) -----------------------------------------

export async function saveClient(client) {
  if (!useMongo()) {
    mem.oauth_clients.set(client.client_id, client)
    return
  }
  await (await col('oauth_clients')).insertOne(client)
}

export async function getClient(clientId) {
  if (!clientId) return null
  if (!useMongo()) return mem.oauth_clients.get(clientId) || null
  return (await col('oauth_clients')).findOne({ client_id: clientId })
}

// -- grants: authorization codes, access tokens, refresh tokens -------------
// One collection, discriminated by type; addressed by hash of the secret.

async function saveGrant(type, secret, data, ttlMs) {
  const doc = { hash: sha256b64url(secret), type, ...data, expires_at: new Date(Date.now() + ttlMs) }
  if (!useMongo()) {
    mem.oauth_grants.set(`${type}:${doc.hash}`, doc)
    return
  }
  await (await col('oauth_grants')).insertOne(doc)
}

async function readGrant(type, secret, { consume = false } = {}) {
  const hash = sha256b64url(String(secret || ''))
  let doc
  if (!useMongo()) {
    const key = `${type}:${hash}`
    doc = mem.oauth_grants.get(key) || null
    if (doc && consume) mem.oauth_grants.delete(key)
  } else {
    const c = await col('oauth_grants')
    doc = consume ? await c.findOneAndDelete({ type, hash }) : await c.findOne({ type, hash })
    // driver v6 findOneAndDelete returns the doc directly (or null)
  }
  if (!doc) return null
  if (new Date(doc.expires_at) < new Date()) return null
  return doc
}

export const saveCode = (code, data) => saveGrant('code', code, data, TTL.code)
export const consumeCode = (code) => readGrant('code', code, { consume: true })

export const saveAccessToken = (token, data) => saveGrant('access', token, data, TTL.access)
export const getAccessToken = (token) => readGrant('access', token)

export const saveRefreshToken = (token, data) => saveGrant('refresh', token, data, TTL.refresh)
export const consumeRefreshToken = (token) => readGrant('refresh', token, { consume: true })

export const ACCESS_TTL_SECONDS = TTL.access / 1000
