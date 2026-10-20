import { createHmac, timingSafeEqual } from 'crypto'

// Server-side access control for paid agent blueprints.
//
// A paid agent's `agentBlueprint` is the product. The public API, the /a/:id
// page and the .zip route all go through here so the full text only ever
// leaves the server with a valid unlock token. The page keeps everything a
// crawler needs (name, goal, skills, a short preview) — only the blueprint is
// withheld.
//
// The unlock token is stateless: HMAC-SHA256 over the agent id + the Stripe
// Checkout session id, keyed by a server secret. It is minted only by
// /api/stripe/verify after Stripe confirmed that session is paid and for that
// agent, so a token that verifies is proof of a completed purchase. Like a
// bundle's download link it is a bearer credential the buyer keeps.

export const BLUEPRINT_PREVIEW_CHARS = 300

const SESSION_RE = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/
const MAC_RE = /^[0-9a-f]{64}$/

function unlockSecret() {
  // Dedicated key preferred; ADMIN_SECRET (already set in every environment)
  // is the fallback so the lock works without a new variable. No secret at
  // all fails CLOSED: nothing can be minted or verified, paid agents stay
  // locked — never fall back to a built-in key.
  return process.env.AGENT_UNLOCK_SECRET || process.env.ADMIN_SECRET || ''
}

export function isLockedAgent(agent) {
  return !!(agent && agent.isPaid && Number(agent.price) > 0)
}

// The public shape of an agent: a locked agent loses `agentBlueprint` and
// gains a short `blueprintPreview` for the blurred teaser. Free agents pass
// through untouched.
export function redactAgent(agent) {
  if (!agent || !isLockedAgent(agent)) return agent
  const { agentBlueprint, ...rest } = agent
  return {
    ...rest,
    blueprintPreview: String(agentBlueprint || '').slice(0, BLUEPRINT_PREVIEW_CHARS),
    blueprintLocked: true,
  }
}

// Fields that must never reach a public response. `userId` is the device id
// that /api/my-agents keys on — exposing it on a public agent would let
// anyone list that device's private agents.
export function stripPrivateFields(agent) {
  if (!agent) return agent
  const { userId, ...rest } = agent
  return rest
}

function mac(agentId, sessionId) {
  const key = unlockSecret()
  if (!key) return null
  return createHmac('sha256', key).update(`agent-unlock:${agentId}:${sessionId}`).digest('hex')
}

// Deterministic per (agent, checkout session): the same purchase always maps
// to the same token, so verify and the webhook can both hand it out without
// coordinating. Returns null when no secret is configured.
export function unlockToken(agentId, sessionId) {
  if (!agentId || !SESSION_RE.test(String(sessionId || ''))) return null
  const m = mac(String(agentId), sessionId)
  return m ? `${sessionId}.${m}` : null
}

export function verifyUnlockToken(agentId, token) {
  if (!agentId || typeof token !== 'string' || token.length > 300) return false
  const i = token.lastIndexOf('.')
  if (i < 1) return false
  const sessionId = token.slice(0, i)
  const provided = token.slice(i + 1)
  if (!SESSION_RE.test(sessionId) || !MAC_RE.test(provided)) return false
  const expected = mac(String(agentId), sessionId)
  if (!expected) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

// ?unlock=<token> on the request URL, or '' when absent.
export function readUnlockToken(request) {
  try {
    return (new URL(request.url).searchParams.get('unlock') || '').trim()
  } catch {
    return ''
  }
}
