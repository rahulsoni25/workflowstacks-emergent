// One story a day on X, LinkedIn and Instagram, about a new or rising repo in
// the catalog or (Wednesdays, and whenever one launches) a WorkflowStacks
// product. Run by .github/workflows/social-daily.yml.
//
// The team (scripts/social-agents.mjs) works in order and every stage must
// pass before anything is published:
//   Scout → Fact-checker (live GitHub + website check, then the model)
//   → Writer ⇄ Editor ⇄ Hygiene (rules, claim audit, platform limits)
//   → publishers (scripts/social-publish.mjs)
// A stage that cannot be satisfied means no post that day, and the run fails
// so the Actions tab shows it.
//
// Runs in the GitHub runner against Mongo, like scripts/refresh-stars.mjs, so
// none of it is billed to Vercel (docs/COSTS.md rule 6). The website itself is
// read once a day, to confirm the page being linked loads.
//
//   MONGO_URL=... GROQ_API_KEY=... node scripts/social-daily.mjs --dry-run
//
// Flags: --dry-run (run the team, render the media, publish and record
// nothing), --format=post|carousel|reel, --product (force a product spotlight),
// --only=x,linkedin,instagram, --out=<dir for rendered media>.

import { MongoClient } from 'mongodb'
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { isInstallable } from '../lib/newsletter-pick.js'
import { isAiRelevant, guideRichness } from '../lib/skill-relevance.js'
import { TOOLS_ONLY } from '../lib/catalog-gates.js'
import * as L from './social-lib.mjs'
import * as A from './social-agents.mjs'
import * as P from './social-publish.mjs'

const MONGO_URL = process.env.MONGO_URL
// See scripts/refresh-stars.mjs: 'workflowstacks' is a legacy test database.
const DB_NAME = process.env.DB_NAME || 'workflowstacks-emergent'
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)=(.*)$/)
  return m ? [m[1], m[2]] : [a.replace(/^--/, ''), 'true']
}))
const DRY = args['dry-run'] === 'true'
const OUT = args.out || 'social-out'
const PLATFORMS = ['x', 'linkedin', 'instagram'].filter((p) => !args.only || args.only.split(',').includes(p))
// Writer drafts per topic before the team gives up on it.
const MAX_ROUNDS = 4
const MIN_GUIDE_CHARS = 200
const DAY = 24 * 60 * 60 * 1000

const SKILL_FIELDS = {
  _id: 0, id: 1, slug: 1, name: 1, title_human: 1, description: 1, description_human: 1, category: 1,
  github_topics: 1, github_stars: 1, github_url: 1, use_guide: 1, rewrite_score: 1,
  velocity_7d: 1, velocity_provisional: 1, added_at: 1, content_type: 1,
}

const trail = []
function sign(agent, ok, detail) {
  trail.push({ agent, ok, detail, at: new Date() })
  const text = typeof detail === 'string' ? detail : JSON.stringify(detail)
  console.log(`[${agent}] ${ok ? 'PASS' : 'FAIL'} ${text.slice(0, 600)}`)
}

// ------------------------------------------------------------- the team

async function loadCandidates(db, posts, now) {
  const products = JSON.parse(readFileSync(new URL('./social-products.json', import.meta.url), 'utf8')).products
  const posted = posts.filter((p) => p.posted)
  const lastPosted = new Map()
  for (const p of posted.filter((d) => d.subject?.kind === 'product')) {
    const at = new Date(p.date)
    if (!lastPosted.has(p.subject.ref) || lastPosted.get(p.subject.ref) < at) lastPosted.set(p.subject.ref, at)
  }
  const product = L.dueProduct(products, { now, lastPosted, force: args.product === 'true' })
  if (product) return [product]

  const since = L.utcDate(new Date(now.getTime() - L.NO_REPEAT_DAYS * DAY))
  const postedSkillIds = new Set(posted.filter((p) => p.subject?.kind === 'skill' && p.date >= since).map((p) => p.subject.ref))
  const skills = await db.collection('skills')
    .find({ published: { $ne: false }, ...TOOLS_ONLY, github_url: { $exists: true, $ne: null } }, { projection: SKILL_FIELDS })
    .toArray()
  // The same gates the newsletter's skill of the day passes.
  const eligible = skills.filter((s) => isInstallable(s) && isAiRelevant(s) && guideRichness(s.use_guide) >= MIN_GUIDE_CHARS
    && (s.description_human || s.description))
  return L.shortlistSkills(eligible, { now, postedSkillIds })
}

const factsFor = (c, live) => (c.kind === 'skill' ? L.skillFacts(c.skill, c.reason, live) : L.productFacts(c.product, c.reason))

async function writeAndReview(subject, facts, brief, format, recentHooks) {
  let draft = null
  let feedback = []
  let editorDraft = null
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    if (editorDraft) { draft = editorDraft; editorDraft = null; sign('Writer', true, `round ${round}: taking the Editor's revision`) } else {
      draft = await A.write(facts, brief, { format, feedback, previous: draft })
      sign('Writer', true, `round ${round}: ${draft.hook}`)
    }

    const rules = L.validateCopy(draft, facts, { recentHooks })
    if (rules.length) { sign('Hygiene (rules)', false, rules); feedback = rules; continue }

    const ed = await A.edit(facts, brief, draft, { format })
    sign('Editor', ed.approved, { scores: ed.scores, notes: ed.notes, revised: Boolean(ed.revised) })
    if (!ed.approved) {
      if (ed.revised) editorDraft = ed.revised
      feedback = ed.notes
      continue
    }

    const hy = await A.hygiene(facts, draft)
    sign('Hygiene (claims)', hy.passed, hy.passed ? `${hy.claims.length} claims, all supported` : hy.problems)
    if (!hy.passed) { feedback = hy.problems; continue }

    const platform = L.platformProblems(L.composePosts(draft, subject))
    sign('Hygiene (platforms)', platform.length === 0, platform.length ? platform : 'X, LinkedIn and Instagram limits met')
    if (platform.length) { feedback = platform; continue }

    return { copy: draft, approvals: { editor: ed.scores, claims: hy.claims, rounds: round } }
  }
  return null
}

async function runTeam(db, posts, now, format) {
  const recentHooks = posts.filter((p) => p.date >= L.utcDate(new Date(now.getTime() - 30 * DAY)) && p.copy?.hook).map((p) => p.copy.hook)
  const candidates = await loadCandidates(db, posts, now)
  if (!candidates.length) { sign('Scout', false, 'nothing eligible in the catalog or the product list'); return null }
  for (const c of candidates) c.facts = factsFor(c, {})

  const { picks } = await A.scout(candidates, { recentHooks, format })
  sign('Scout', picks.length > 0, picks.length ? picks.map((p) => `${candidates[p.index].facts.name}: ${p.angle}`) : 'no usable pick')

  for (const pick of picks) {
    const subject = candidates[pick.index]
    const gh = subject.kind === 'skill' ? L.repoOwner(subject.skill.github_url) : null
    const pageUrl = L.subjectUrl(subject)
    const check = await P.checkLive({ ...gh, pageUrl })
    sign('Fact-checker (live)', check.ok, check.ok ? `${gh ? `github.com/${gh.owner}/${gh.repo} is live and not archived; ` : ''}${pageUrl} loads` : check.problems)
    if (!check.ok) continue
    if (typeof check.live.stars === 'number') subject.liveStars = check.live.stars
    const facts = factsFor(subject, check.live)

    const fc = await A.factCheck(facts, pick)
    sign('Fact-checker', fc.approved, fc.approved ? fc.brief : fc.problems)
    if (!fc.approved) continue

    const result = await writeAndReview(subject, facts, fc.brief, format, recentHooks)
    if (result) return { subject, facts, brief: fc.brief, format, ...result }
    sign('Team', false, `no draft for ${facts.name} passed every check in ${MAX_ROUNDS} rounds; trying the next pick`)
  }
  return null
}

// ---------------------------------------------------------------- media

async function renderMedia(plan) {
  const sharp = (await import('sharp')).default
  mkdirSync(OUT, { recursive: true })
  const jpg = (svg) => sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer()
  const { copy, subject, format } = plan
  const slug = String(L.subjectRef(subject)).replace(/[^a-z0-9-]/gi, '-').slice(0, 60)
  const stem = `${plan.date}-${slug}`

  const feed = []
  for (const [i, svg] of L.storyFrames({ copy, subject, swipe: format === 'carousel' }).entries()) {
    feed.push({ name: `${stem}-${i + 1}.jpg`, buf: await jpg(svg) })
  }
  const media = { feed: format === 'post' ? feed.slice(0, 1) : feed }

  if (format === 'reel') {
    const vertical = []
    for (const [i, svg] of L.storyFrames({ copy, subject, w: 1080, h: 1920 }).entries()) {
      const name = `${stem}-v${i + 1}.jpg`
      const buf = await jpg(svg)
      writeFileSync(join(OUT, name), buf)
      vertical.push(name)
    }
    // Cover holds longest; then one beat every three seconds. The silent audio
    // track is there because Reels are expected to carry one.
    const list = vertical.map((n, i) => `file '${n}'\nduration ${i === 0 ? 3.5 : 3}`).join('\n') + `\nfile '${vertical.at(-1)}'\n`
    writeFileSync(join(OUT, 'frames.txt'), list)
    const video = `${stem}.mp4`
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'frames.txt',
      '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
      '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22',
      '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', video], { cwd: OUT })
    media.video = { name: video, buf: readFileSync(join(OUT, video)) }
    media.cover = { name: vertical[0], buf: readFileSync(join(OUT, vertical[0])) }
  }
  for (const f of media.feed) writeFileSync(join(OUT, f.name), f.buf)
  return media
}

// -------------------------------------------------------------- publish

async function publish(plan, media, composed, previous = {}) {
  const results = { ...previous }
  const alt = `${plan.copy.hook} — ${L.subjectName(plan.subject)}`
  let hosted = null
  for (const platform of PLATFORMS) {
    if (results[platform]?.ok) { console.log(`[${platform}] already posted today: ${results[platform].url}`); continue }
    if (!P.configured[platform]()) { results[platform] = { ok: false, skipped: 'no credentials set' }; continue }
    try {
      let r
      if (platform === 'x') r = await P.postX(composed.x)
      if (platform === 'linkedin') r = await P.postLinkedIn({ text: composed.linkedin, images: media.feed.map((f) => f.buf), altText: alt })
      if (platform === 'instagram') {
        const files = plan.format === 'reel' ? [media.video, media.cover] : media.feed
        hosted = hosted || await P.hostFiles(files, { message: `social: ${plan.date} ${L.subjectName(plan.subject)}` })
        r = await P.postInstagram({
          format: plan.format, caption: composed.instagram,
          imageUrls: media.feed.map((f) => hosted.urls[f.name]),
          videoUrl: media.video && hosted.urls[media.video.name], coverUrl: media.cover && hosted.urls[media.cover.name],
        })
      }
      results[platform] = { ok: true, ...r, at: new Date() }
      console.log(`[${platform}] posted ${r.url || r.id}`)
    } catch (e) {
      results[platform] = { ok: false, error: String(e.message || e), at: new Date() }
      console.error(`[${platform}] FAILED ${e.message}`)
    }
  }
  return results
}

// -------------------------------------------------------------- summary

function summarize(plan, composed, results) {
  const out = [`## Daily social · ${L.utcDate(new Date())}${DRY ? ' · dry run' : ''}`]
  if (plan) {
    out.push(`**${L.subjectName(plan.subject)}** (${plan.subject.reason}) · format: **${plan.format}** · ${L.subjectUrl(plan.subject)}`)
  } else out.push('**No post today**: no topic got through every agent. The sign-off trail below says where it stopped.')
  out.push('', '### Agent sign-off', '| Agent | Verdict | Detail |', '|---|---|---|')
  for (const t of trail) {
    const d = (typeof t.detail === 'string' ? t.detail : JSON.stringify(t.detail)).replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 400)
    out.push(`| ${t.agent} | ${t.ok ? '✅' : '❌'} | ${d} |`)
  }
  if (results) {
    out.push('', '### Publishing', '| Platform | Result |', '|---|---|')
    for (const p of PLATFORMS) {
      const r = results[p] || {}
      out.push(`| ${p} | ${r.ok ? `✅ ${r.url || r.id}` : r.skipped ? `⏭️ ${r.skipped}` : `❌ ${String(r.error || 'not attempted').replace(/\|/g, '\\|')}`} |`)
    }
  }
  if (composed) {
    out.push('', '### X', '```', composed.x, '```', '### LinkedIn', '```', composed.linkedinPreview, '```', '### Instagram', '```', composed.instagram, '```',
      '### Slides', ...plan.copy.slides.map((s, i) => `${i + 2}. ${s}`))
  }
  const md = out.join('\n')
  console.log(`\n${md}`)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`)
}

// ------------------------------------------------------------------ main

async function main() {
  if (!MONGO_URL) throw new Error('MONGO_URL is not set')
  const now = new Date()
  const today = L.utcDate(now)
  const client = new MongoClient(MONGO_URL)
  await client.connect()
  let exitCode = 0
  try {
    const db = client.db(DB_NAME)
    const col = db.collection('social_posts')
    const existing = await col.findOne({ date: today })

    let plan
    if (existing?.approved && !DRY) {
      // A re-run on the same day retries the platforms that have not posted
      // yet, with the copy the team already approved.
      plan = { ...existing, date: today }
      sign('Team', true, `reusing today's approved post: ${existing.copy.hook}`)
    } else {
      if (!A.llmConfigured()) throw new Error('The agents need GROQ_API_KEY or OPENROUTER_API_KEY')
      const posts = await col.find({ date: { $gte: L.utcDate(new Date(now.getTime() - L.NO_REPEAT_DAYS * DAY)) } },
        { projection: { date: 1, posted: 1, subject: 1, 'copy.hook': 1 } }).toArray()
      const team = await runTeam(db, posts.filter((p) => p.date !== today), now, L.formatFor(now, args.format))
      plan = team && { ...team, date: today }
    }

    if (!plan) {
      summarize(null, null, null)
      if (!DRY) await col.updateOne({ date: today }, { $set: { approved: false, posted: false, trail, updated_at: new Date() }, $setOnInsert: { created_at: new Date() } }, { upsert: true })
      return 1
    }

    const composed = L.composePosts(plan.copy, plan.subject)
    let media
    try {
      media = await renderMedia(plan)
    } catch (e) {
      sign('Hygiene (media)', false, `rendering failed: ${e.message}`)
      if (plan.format === 'post') throw e
      // A Reel or carousel that will not render still has a single image.
      plan.format = 'post'
      media = await renderMedia(plan)
    }
    sign('Hygiene (media)', true, `${media.feed.length} image(s)${media.video ? ' + Reel video' : ''} rendered to ${OUT}/`)

    if (DRY) { summarize(plan, composed, null); return 0 }

    const results = await publish(plan, media, composed, existing?.approved ? existing.platforms : {})
    const posted = Object.values(results).some((r) => r.ok)
    // The skill snapshot is kept small: enough to rebuild the posts on a re-run.
    const { use_guide, ...skill } = plan.subject.skill || {}
    await col.updateOne({ date: today }, {
      $set: {
        approved: true, posted, format: plan.format,
        subject: { kind: plan.subject.kind, reason: plan.subject.reason, ref: L.subjectRef(plan.subject), skill: plan.subject.skill ? skill : undefined, product: plan.subject.product, liveStars: plan.subject.liveStars },
        facts: plan.facts, brief: plan.brief, copy: plan.copy, approvals: plan.approvals,
        platforms: results, trail: [...(existing?.trail || []), ...trail], updated_at: new Date(),
      },
      $setOnInsert: { created_at: new Date() },
    }, { upsert: true })
    summarize(plan, composed, results)
    if (PLATFORMS.some((p) => results[p] && !results[p].ok && !results[p].skipped)) exitCode = 1
  } finally {
    await client.close()
  }
  return exitCode
}

main().then((code) => process.exit(code)).catch((e) => {
  console.error(String(e?.stack || e))
  process.exit(1)
})
