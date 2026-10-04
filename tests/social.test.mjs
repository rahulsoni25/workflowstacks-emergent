// node --test tests/social.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as L from '../scripts/social-lib.mjs'

const NOW = new Date('2026-10-05T13:35:00Z') // a Monday
const daysAgo = (n) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000)

const skill = (over = {}) => ({
  id: 'id-' + (over.slug || 'x'), slug: 'x', name: 'x', github_url: 'https://github.com/acme/x',
  github_stars: 100, rewrite_score: 8, description_human: 'Turns meeting notes into tasks.', ...over,
})

test('OAuth 1.0a signature matches the worked example in the X docs', () => {
  const { signature } = L.oauth1Header({
    method: 'POST',
    url: 'https://api.twitter.com/1.1/statuses/update.json',
    consumerKey: 'xvz1evFS4wEEPTGEFPHBog',
    consumerSecret: 'kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw',
    token: '370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb',
    tokenSecret: 'LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE',
    nonce: 'kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg',
    timestamp: 1318622958,
    extraParams: { status: 'Hello Ladies + Gentlemen, a signed OAuth request!', include_entities: 'true' },
  })
  assert.equal(signature, 'hCtSmYh+iHYCEqBWrE7C7hYmtUk=')
})

test('shortlist: new beats trending beats the rest, and posted skills are skipped', () => {
  const list = L.shortlistSkills([
    skill({ slug: 'old', github_stars: 9000 }),
    skill({ slug: 'hot', velocity_7d: 300 }),
    skill({ slug: 'provisional', velocity_7d: 900, velocity_provisional: true }),
    skill({ slug: 'new', added_at: daysAgo(3) }),
    skill({ slug: 'stale-new', added_at: daysAgo(40) }),
    skill({ slug: 'done', added_at: daysAgo(1) }),
  ], { now: NOW, postedSkillIds: new Set(['id-done']) })
  assert.deepEqual(list.map((c) => [c.skill.slug, c.reason]), [
    ['new', 'new'], ['hot', 'trending'], ['old', 'catalog'], ['provisional', 'catalog'], ['stale-new', 'catalog'],
  ])
})

test('products: a new launch goes out at once, otherwise only on Wednesdays, least recent first', () => {
  const products = [{ id: 'a' }, { id: 'b' }, { id: 'c', enabled: false }]
  assert.equal(L.dueProduct(products, { now: NOW }), null)
  const wed = new Date('2026-10-07T13:35:00Z')
  const lastPosted = new Map([['a', daysAgo(10)]])
  assert.equal(L.dueProduct(products, { now: wed, lastPosted }).product.id, 'b')
  const launched = [...products, { id: 'd', added: '2026-10-04' }]
  const due = L.dueProduct(launched, { now: NOW })
  assert.deepEqual([due.product.id, due.reason], ['d', 'new-product'])
  assert.equal(L.dueProduct(launched, { now: NOW, lastPosted: new Map([['d', daysAgo(1)]]) }), null)
})

test('format follows the weekday unless overridden', () => {
  assert.equal(L.formatFor(NOW), 'reel') // Monday
  assert.equal(L.formatFor(new Date('2026-10-07T00:00:00Z')), 'post') // Wednesday
  assert.equal(L.formatFor(NOW, 'carousel'), 'carousel')
  assert.equal(L.formatFor(NOW, 'nonsense'), 'reel')
})

const facts = L.skillFacts(skill({ github_stars: 12345, velocity_7d: 410, slug: 'notes' }), 'trending')
const good = {
  hook: 'Your meeting ended an hour ago. The tasks are still in your head.',
  x: 'Notes in, tasks out. Built by acme, 12.3k stars, +410 this week.',
  linkedin: 'You leave the call with a page of notes.\n\nThis turns meeting notes into tasks.\n\nWhat do you do with yours?',
  instagram: 'Notes pile up.\n\nThis turns meeting notes into tasks.',
  slides: ['You leave with notes.', 'This turns them into tasks.', 'Built by acme.'],
  hashtags: ['AI', 'Productivity', 'OpenSource'],
}

test('validateCopy passes copy that only uses the facts', () => {
  assert.deepEqual(L.validateCopy(good, facts), [])
})

test('validateCopy catches invented numbers, links, handles, emoji, clichés and repeats', () => {
  const bad = (over) => L.validateCopy({ ...good, ...over }, facts)
  assert.match(bad({ x: 'Saves 3 hours a week.' }).join(), /number not in the facts: 3/)
  assert.match(bad({ linkedin: 'See https://example.com now' }).join(), /link or domain/)
  assert.match(bad({ instagram: 'Thanks @acme' }).join(), /@handle/)
  assert.match(bad({ x: '🔥🔥🔥 wow' }).join(), /emoji/)
  assert.match(bad({ hook: 'A game-changer for notes' }).join(), /cliché/)
  assert.match(bad({ slides: ['one'] }).join(), /slides must be/)
  assert.match(bad({ x: 'y'.repeat(200) }).join(), /hook \+ x/)
  assert.match(L.validateCopy(good, facts, { recentHooks: [good.hook] }).join(), /too close to a recent post/)
})

test('composed posts fit each platform at the copy limits', () => {
  const subject = { kind: 'skill', reason: 'trending', skill: skill({ slug: 'notes' }) }
  const long = { ...good, hook: 'h'.repeat(90), x: 'x'.repeat(L.X_TEXT_BUDGET - 90), linkedin: 'l'.repeat(L.LIMITS.linkedin), instagram: 'i'.repeat(L.LIMITS.instagram) }
  const posts = L.composePosts(long, subject)
  assert.deepEqual(L.platformProblems(posts), [])
  assert.match(posts.x, /https:\/\/workflowstacks\.com\/skills\/notes\?utm_source=x/)
  assert.match(posts.linkedin, /\{hashtag\|\\#\|AI\}/)
  assert.doesNotMatch(posts.linkedin, /utm_source/)
  assert.match(posts.instagram, /#OpenSource$/)
})

test('LinkedIn reserved characters are escaped', () => {
  assert.equal(L.linkedinEscape('a (b) #c @d_e'), 'a \\(b\\) \\#c \\@d\\_e')
})

test('story frames: cover, one per beat, call to action; text is XML-escaped', () => {
  const subject = { kind: 'skill', reason: 'new', skill: skill({ name: 'R&D <bot>' }) }
  const frames = L.storyFrames({ copy: good, subject, swipe: true })
  assert.equal(frames.length, good.slides.length + 2)
  assert.match(frames[0], /R&amp;D &lt;bot&gt;/)
  assert.match(frames[0], /Swipe/)
  assert.match(frames.at(-1), /workflowstacks\.com/)
})
