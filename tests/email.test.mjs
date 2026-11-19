// Unit tests for lib/email.js: Resend error capture, address masking and
// marking refused subscribers invalid. Run with:
//
//   node --test tests/email.test.mjs
//
// Needs Node 22.15+ (module.registerHooks). fetch is replaced with a stub
// before anything is sent and RESEND_API_KEY is a dummy, so no request ever
// leaves the machine and no email is sent.
import { test, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'

// lib/ imports siblings without an extension ('./site-url'), which Next's
// bundler resolves and plain Node does not.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context)
    } catch (e) {
      if (e?.code === 'ERR_MODULE_NOT_FOUND' && /^\.\.?\//.test(specifier) && !/\.[cm]?js$/.test(specifier)) {
        return nextResolve(`${specifier}.js`, context)
      }
      throw e
    }
  },
})

const realFetch = globalThis.fetch
const calls = []
let reply = () => new Response('{}', { status: 200 })

globalThis.fetch = async (url, init) => {
  if (String(url) !== 'https://api.resend.com/emails') throw new Error(`unexpected fetch ${url}`)
  calls.push(JSON.parse(init.body))
  return reply(JSON.parse(init.body))
}
process.env.RESEND_API_KEY = 're_test_dummy_not_a_key'

const {
  sendEmail, maskEmail, maskEmailsIn, isValidationRejection, markInvalidRecipients, SENDABLE,
} = await import('../lib/email.js')

after(() => { globalThis.fetch = realFetch })
beforeEach(() => { calls.length = 0; reply = () => new Response('{}', { status: 200 }) })

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

test('maskEmail keeps the first character and the domain', () => {
  assert.equal(maskEmail('alice@example.com'), 'a***@example.com')
  assert.equal(maskEmail('  Bob.Smith@Mail.Example.org '), 'B***@Mail.Example.org')
  assert.equal(maskEmail('@example.com'), '***@example.com')
  assert.equal(maskEmail('no-at-sign'), '***')
  assert.equal(maskEmail(null), '***')
})

test('maskEmailsIn masks every address in free text', () => {
  assert.equal(
    maskEmailsIn('Invalid `to` field: `carol@example.com`, also <dave@x.io>.'),
    'Invalid `to` field: `c***@example.com`, also <d***@x.io>.'
  )
  assert.equal(maskEmailsIn('no address here'), 'no address here')
})

test('a 422 keeps Resend name and message, with the address masked', async () => {
  reply = () => json(422, {
    statusCode: 422,
    name: 'validation_error',
    message: 'Invalid `to` field. Got erin@example.com.',
  })
  const r = await sendEmail({ to: 'erin@example.com', subject: 's', html: '<p>x</p>' })
  assert.equal(calls.length, 1)
  assert.equal(r.ok, false)
  assert.equal(r.status, 422)
  assert.equal(r.code, 'validation_error')
  assert.equal(r.error, 'resend 422 validation_error: Invalid `to` field. Got e***@example.com.')
  assert.ok(!r.error.includes('erin@'))
  assert.equal(isValidationRejection(r), true)
})

test('other Resend errors are kept but are not validation rejections', async () => {
  reply = () => json(429, { name: 'rate_limit_exceeded', message: 'Too many requests.' })
  const r = await sendEmail({ to: 'frank@example.com', subject: 's', html: 'x' })
  assert.equal(r.error, 'resend 429 rate_limit_exceeded: Too many requests.')
  assert.equal(isValidationRejection(r), false)

  reply = () => json(422, { name: 'invalid_from_address', message: 'Invalid `from` field.' })
  assert.equal(isValidationRejection(await sendEmail({ to: 'g@example.com', subject: 's', html: 'x' })), false)
})

test('a body that is not JSON is kept as short text', async () => {
  reply = () => new Response('upstream   gateway\nerror', { status: 502 })
  const r = await sendEmail({ to: 'h@example.com', subject: 's', html: 'x' })
  assert.equal(r.error, 'resend 502: upstream gateway error')
  assert.equal(r.code, null)

  reply = () => new Response('', { status: 500 })
  assert.equal((await sendEmail({ to: 'h@example.com', subject: 's', html: 'x' })).error, 'resend 500')

  reply = () => new Response('x'.repeat(2000), { status: 500 })
  assert.ok((await sendEmail({ to: 'h@example.com', subject: 's', html: 'x' })).error.length < 320)
})

test('a network error is returned with addresses masked', async () => {
  reply = () => { throw new Error('connect failed for ivan@example.com') }
  const r = await sendEmail({ to: 'ivan@example.com', subject: 's', html: 'x' })
  assert.deepEqual(r, { ok: false, error: 'connect failed for i***@example.com' })
})

test('success is still { ok: true }', async () => {
  const r = await sendEmail({ to: 'Judy@Example.com', subject: 's', html: 'x' })
  assert.deepEqual(r, { ok: true })
  assert.equal(calls[0].to, 'judy@example.com')
})

test('an array returns the first failure with its status and code', async () => {
  reply = (body) => body.to === 'bad@example.com'
    ? json(422, { name: 'validation_error', message: 'Invalid `to` field.' })
    : json(200, { id: '1' })
  const r = await sendEmail({ to: ['ok@example.com', 'bad@example.com'], subject: 's', html: 'x' })
  assert.equal(calls.length, 2)
  assert.equal(isValidationRejection(r), true)
})

test('markInvalidRecipients sets status invalid, only on sendable documents', async () => {
  const updates = []
  const col = {
    async updateOne(filter, update) {
      updates.push({ filter, update })
      // Pretend the second one unsubscribed while the send was running.
      return { modifiedCount: filter._id === 2 ? 0 : 1 }
    },
  }
  const now = new Date('2026-11-19T08:00:00Z')
  const marked = await markInvalidRecipients(col, [
    { _id: 1, email: 'kim@example.com', error: 'resend 422 validation_error: Invalid `to` field.' },
    { _id: 2, email: 'lee@example.com', error: 'resend 422 validation_error: Invalid `to` field.' },
  ], { now })
  assert.equal(marked, 1)
  assert.deepEqual(updates[0].filter, { _id: 1, ...SENDABLE })
  assert.deepEqual(updates[0].update, {
    $set: { status: 'invalid', invalid_reason: 'resend 422 validation_error: Invalid `to` field.', invalid_at: now },
  })
})

test('SENDABLE excludes invalid addresses', () => {
  assert.ok(SENDABLE.status.$nin.includes('invalid'))
  assert.ok(SENDABLE.status.$nin.includes('pending'))
  assert.ok(SENDABLE.status.$nin.includes('unsubscribed'))
})
