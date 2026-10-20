// Outgoing mail: the one Resend sender, the signed unsubscribe links and the
// double opt-in confirmation. Imported by the catch-all API route and the
// standalone route handlers (did-it-work, notify-interest, one-click
// unsubscribe), so every email the site sends carries the same headers and
// every unsubscribe link is signed the same way.
//
// Tokens: t = HMAC-SHA256(email, secret) as hex, cut to 32 chars. The secret
// is UNSUBSCRIBE_SECRET when set, otherwise ADMIN_SECRET (always set in
// production: requireAdmin fails closed without it), otherwise CRON_SECRET.
// Rotating whichever one is in use invalidates the tokens in every email
// already sent — the /unsubscribe page still honours untokenised links after
// an explicit click, so a rotation degrades one-click, not the unsubscribe.
//
// Every fetch() here runs inside a route handler that exports
// `fetchCache = 'default-no-store'` or `dynamic = 'force-dynamic'` (docs/COSTS.md
// rule 4) — keep that true for any new caller.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { SITE_URL } from './site-url'

export const RESEND_FROM = 'WorkflowStacks <newsletter@workflowstacks.com>'
// Mailbox for the mailto: half of List-Unsubscribe. The domain's MX is
// ImprovMX (see DNS_BASELINE in the API route); the alias must exist there.
const UNSUBSCRIBE_MAILBOX = 'unsubscribe@workflowstacks.com'
const TOKEN_RE = /^[a-f0-9]{32}$/

// Send filter shared by every list send: documents without a `status` field
// predate double opt-in and are treated as active.
export const SENDABLE = { status: { $nin: ['pending', 'unsubscribed'] } }
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function unsubscribeSecret() {
  return process.env.UNSUBSCRIBE_SECRET || process.env.ADMIN_SECRET || process.env.CRON_SECRET || ''
}

export function unsubscribeToken(email) {
  const secret = unsubscribeSecret()
  if (!secret) return ''
  return createHmac('sha256', secret).update(normalizeEmail(email)).digest('hex').slice(0, 32)
}

export function verifyUnsubscribeToken(email, token) {
  const expected = unsubscribeToken(email)
  const given = String(token || '')
  if (!expected || !TOKEN_RE.test(given) || given.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected))
}

// The link in the email footer. `mode: 'weekly'` is the "switch the daily
// send off" variant of the same page.
export function unsubscribeUrl(email, { mode = null } = {}) {
  const u = new URL('/unsubscribe', SITE_URL)
  u.searchParams.set('email', normalizeEmail(email))
  const t = unsubscribeToken(email)
  if (t) u.searchParams.set('t', t)
  if (mode) u.searchParams.set('mode', mode)
  return u.toString()
}

// RFC 8058 one-click endpoint (app/api/unsubscribe/one-click/route.js).
export function oneClickUnsubscribeUrl(email) {
  const u = new URL('/api/unsubscribe/one-click', SITE_URL)
  u.searchParams.set('email', normalizeEmail(email))
  u.searchParams.set('t', unsubscribeToken(email))
  return u.toString()
}

export function listUnsubscribeHeaders(email) {
  const mailto = `mailto:${UNSUBSCRIBE_MAILBOX}?subject=${encodeURIComponent('unsubscribe ' + normalizeEmail(email))}`
  return {
    'List-Unsubscribe': `<${mailto}>, <${oneClickUnsubscribeUrl(email)}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
}

// One recipient per call, so the List-Unsubscribe headers are personal. An
// array of addresses is sent as one call each; ok is true only if all went.
export async function sendEmail({ to, subject, html, text, from = RESEND_FROM, headers = null }) {
  if (!process.env.RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY not set' }
  if (Array.isArray(to)) {
    let error = null
    for (const one of to) {
      const r = await sendEmail({ to: one, subject, html, text, from, headers })
      if (!r.ok && !error) error = r.error
    }
    return error ? { ok: false, error } : { ok: true }
  }
  const recipient = normalizeEmail(to)
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from,
        to: recipient,
        subject,
        ...(html ? { html } : {}),
        ...(text ? { text } : {}),
        headers: { ...listUnsubscribeHeaders(recipient), ...(headers || {}) },
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!r.ok) return { ok: false, error: `resend ${r.status}` }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

// ---------------------------------------------------------------------------
// Double opt-in
// ---------------------------------------------------------------------------

export function confirmUrl(token) {
  return `${SITE_URL}/confirm?token=${token}`
}

function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// What the person is confirming, by the surface they signed up on.
function confirmationLead(source, tool) {
  switch (source) {
    case 'template-download':
      return 'You asked for new working n8n templates by email when you downloaded one from WorkflowStacks.'
    case 'fake-door':
      return `You asked to be told when ${tool ? `“${escapeHtml(tool)}”` : 'a WorkflowStacks tool'} ships.`
    case 'cli':
      return 'You asked for the Monday digest from the WorkflowStacks CLI.'
    case 'mcp':
      return 'You asked for the Monday digest through the WorkflowStacks MCP connector.'
    default:
      return 'You asked for the WorkflowStacks Monday digest: the five open-source AI skills gaining the most GitHub stars each week, plus the top overall and what’s new.'
  }
}

export function confirmationEmailHtml({ token, source = null, tool = null }) {
  const url = confirmUrl(token)
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Confirm your subscription</title></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e5e5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <tr><td style="text-align:center;padding-bottom:28px;"><span style="font-size:22px;font-weight:700;color:#fff;">WorkflowStacks</span></td></tr>
    <tr><td style="background:#1a1a1a;border-radius:12px;padding:28px;">
      <h1 style="color:#fff;font-size:22px;margin:0 0 12px;line-height:1.3;">One click to confirm</h1>
      <p style="color:#ccc;font-size:15px;line-height:1.6;margin:0 0 18px;">${confirmationLead(source, tool)} Confirm it was you and we’ll start sending:</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${url}" style="display:inline-block;background:#C6F24E;color:#0A0C0D;font-weight:600;text-decoration:none;padding:12px 26px;border-radius:8px;font-size:15px;">Confirm my subscription</a>
      </div>
      <p style="color:#737373;font-size:12px;line-height:1.6;margin:0;">Or paste this into your browser:<br><a href="${url}" style="color:#8a8a8a;word-break:break-all;">${url}</a></p>
    </td></tr>
    <tr><td style="text-align:center;padding-top:18px;font-size:12px;color:#555;line-height:1.7;">
      Didn’t ask for this? Ignore this email and nothing else will be sent.
    </td></tr>
  </table>
</body></html>`
}

export function sendConfirmationEmail({ email, token, source = null, tool = null }) {
  return sendEmail({
    to: email,
    subject: 'Confirm your WorkflowStacks subscription',
    html: confirmationEmailHtml({ token, source, tool }),
  })
}

// Put an address into (or back into) the pending state and send the
// confirmation. Shared by /api/subscribe and /api/notify-interest so the two
// signup paths agree on the rules:
//   - already active (or a legacy document with no status): apply `set` /
//     `addToSet`, send nothing;
//   - new: insert as pending with a fresh token;
//   - still pending: keep the token so the first email's link still works,
//     resend the confirmation;
//   - unsubscribed: fresh token, back to pending, never straight to active.
// `col` is the subscribers collection.
export async function startConfirmation(col, { email, source, set = {}, setOnInsert = {}, addToSet = null, tool = null }) {
  const now = new Date()
  const existing = await col.findOne({ email })
  const status = existing ? (existing.status || 'active') : null
  const extra = addToSet ? { $addToSet: addToSet } : {}

  if (status === 'active') {
    await col.updateOne({ email }, { $set: { ...set, last_seen_at: now }, ...extra })
    return { status: 'active', created: false, pending: false, confirmation_sent: false }
  }

  const token = status === 'pending' && TOKEN_RE.test(existing.confirm_token || '')
    ? existing.confirm_token
    : randomBytes(16).toString('hex')
  await col.updateOne(
    { email },
    {
      $setOnInsert: { email, created_at: now, source, ...setOnInsert },
      $set: {
        ...set,
        last_seen_at: now,
        status: 'pending',
        confirm_token: token,
        pending_at: now,
        ...(status === 'unsubscribed' ? { resubscribed_at: now, resubscribe_source: source } : {}),
      },
      ...extra,
    },
    { upsert: true }
  )

  let sent = false
  try {
    const r = await sendConfirmationEmail({ email, token, source: (existing && existing.source) || source, tool })
    sent = r.ok
    if (!r.ok) console.error('Confirmation email failed for', email, r.error)
  } catch (e) {
    console.error('Confirmation email failed for', email, e.message)
  }
  return { status: 'pending', created: !existing, pending: true, confirmation_sent: sent }
}
