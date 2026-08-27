// The blog agent pipeline. One HTTP call = one small step, so every call fits
// the Vercel timeout and the GitHub Action just loops `action=advance` until
// it reports done. State machine on posts.status:
//   queued → briefed → drafting (per-section) → drafted → edited → judged
//   → published (scheduled into the next free daily slot) | held
//
// Actions:
//   scout        — refresh topic_queue from live demand signals (cheap LLM)
//   start        — take best open topic → create a queued post (keywords+brief)
//   advance      — move the oldest in-flight post exactly one step
//   publish-due  — no-op safety: reports what is scheduled/published today
import { postsCollection, topicQueueCollection, keywordsCollection, slugify, countWords, DEFAULT_AUTHOR } from '@/lib/blog/store'
import { assembleBody } from '@/lib/blog/markdown'
import { runSeoChecks, SEO_PASS_MARK } from '@/lib/blog/seo-check'
import { callLLM, callJson, providersAvailable } from '@/lib/blog/llm'
import { SCOUT_SYSTEM, KEYWORD_SYSTEM, BRIEF_SYSTEM, WRITE_SYSTEM, EDIT_SYSTEM, JUDGE_SYSTEM, CLAIM_FIX_SYSTEM } from '@/lib/blog/prompts'
import { suggestLinks, linkUniverse } from '@/lib/blog/links'
import { getDb } from '@/lib/mongo'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const JUDGE_GATE = 8

function requireAdmin(request) {
  const secret = process.env.ADMIN_SECRET
  const provided = request.headers.get('x-admin-secret')
  if (!secret || provided !== secret) {
    return Response.json({ error: 'Unauthorized — admin secret required' }, { status: 401 })
  }
  return null
}

// Next free 07:00 UTC slot with no other published/scheduled post that day —
// the 1-post-per-day cap lives here.
async function nextFreeSlot(col) {
  const d = new Date()
  d.setUTCHours(7, 0, 0, 0)
  if (d <= new Date()) d.setUTCDate(d.getUTCDate() + 0) // today's 7:00 already past → publish now is fine
  for (let i = 0; i < 60; i++) {
    const dayStart = new Date(d); dayStart.setUTCHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart); dayEnd.setUTCDate(dayEnd.getUTCDate() + 1)
    const clash = await col.countDocuments({ status: 'published', published_at: { $gte: dayStart, $lt: dayEnd } })
    if (!clash) return new Date(d)
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return new Date(d)
}

async function scout() {
  const db = await getDb()
  const posts = await (await postsCollection()).find({}, { projection: { title: 1, 'seo.primary': 1, topic: 1 } }).limit(300).toArray()
  const searches = await db.collection('search_queries').find({}, { projection: { q: 1, query: 1, count: 1 } }).sort({ count: -1 }).limit(40).toArray().catch(() => [])
  const problems = await db.collection('problems').find({}, { projection: { title: 1, description: 1, votes: 1 } }).sort({ votes: -1 }).limit(20).toArray().catch(() => [])
  const rising = await db.collection('skills').find({ published: { $ne: false } }, { projection: { title_human: 1, title: 1, slug: 1, stars: 1, category: 1 } }).sort({ last_updated: -1 }).limit(40).toArray().catch(() => [])
  const assets = linkUniverse().filter((l) => ['template', 'bundle', 'mcp', 'outcome'].includes(l.kind))

  const user = JSON.stringify({
    existing_posts: posts.map((p) => ({ title: p.title, primary: p.seo?.primary })),
    site_searches: searches.map((s) => s.q || s.query).filter(Boolean).slice(0, 40),
    problems: problems.map((p) => p.title).slice(0, 20),
    recently_updated_repos: rising.map((r) => r.title_human || r.title).slice(0, 40),
    assets: assets.map((a) => ({ kind: a.kind, path: a.path, label: a.label })),
  })
  const { data } = await callJson({ system: SCOUT_SYSTEM, user, tier: 'cheap', maxTokens: 2500, tag: 'scout' })
  const queue = await topicQueueCollection()
  let added = 0
  for (const t of data.topics || []) {
    if (!t.topic) continue
    const r = await queue.updateOne(
      { topic: t.topic },
      { $setOnInsert: { ...t, status: 'open', created_at: new Date() } },
      { upsert: true }
    )
    if (r.upsertedCount) added++
  }
  return { added, total: await queue.countDocuments({ status: 'open' }) }
}

async function start() {
  const queue = await topicQueueCollection()
  const topic = await queue.find({ status: 'open' }).sort({ score: -1 }).limit(1).next()
  if (!topic) return { error: 'topic_queue empty — run action=scout first' }

  // Keyword step: imported volume rows if present, else the LLM's judgement.
  const kwCol = await keywordsCollection()
  const kwRows = await kwCol.find({ $text: { $search: topic.topic } }).limit(20).toArray().catch(() => [])
  const { data: kw } = await callJson({
    system: KEYWORD_SYSTEM,
    user: JSON.stringify({ topic: topic.topic, angle: topic.angle, cluster: topic.cluster, imported_volume_rows: kwRows.map((r) => ({ keyword: r.keyword, volume: r.volume, difficulty: r.difficulty })) }),
    tier: 'cheap', maxTokens: 1200, tag: 'keywords',
  })

  const links = suggestLinks({ persona: topic.persona, keywords: [kw.primary, ...(kw.secondary || [])], limit: 12 })
  const { data: brief } = await callJson({
    system: BRIEF_SYSTEM,
    user: JSON.stringify({ topic: topic.topic, angle: topic.angle, persona: topic.persona, anchor_asset: topic.anchor_asset, keywords: kw, allowed_internal_links: links.map((l) => ({ path: l.path, label: l.label })) }),
    tier: 'strong', maxTokens: 3000, tag: 'brief',
  })

  const col = await postsCollection()
  const slug = slugify(brief.slug || brief.title_options?.[0] || topic.topic)
  const now = new Date()
  await col.updateOne(
    { slug },
    {
      $set: {
        slug,
        title: brief.title_options?.[0] || topic.topic,
        meta_title: brief.meta_title || brief.title_options?.[0],
        meta_description: brief.meta_description || '',
        answer: brief.answer || '',
        tldr: brief.tldr || [],
        excerpt: brief.meta_description || '',
        persona: topic.persona || 'founder',
        topic: topic.cluster || 'automate',
        seo: { primary: kw.primary, secondary: kw.secondary || [], questions: kw.questions || [], intent: kw.intent, format: kw.format, volume: kw.volume ?? null, volume_band: kw.volume_band, volume_source: kw.volume_source || 'estimate', difficulty: kw.difficulty },
        anchor_asset: topic.anchor_asset || null,
        brief,
        sections: (brief.outline || []).map((o) => ({ h2: o.h2, md: '', goal: o.goal, must_include: o.must_include, target_words: o.target_words || 380 })),
        faq: brief.faq || [],
        key_takeaways: brief.key_takeaways || [],
        sources: brief.external_sources || [],
        status: 'briefed',
        author: DEFAULT_AUTHOR,
        created_by: 'agent',
        updated_at: now,
      },
      $setOnInsert: { created_at: now, history: [] },
    },
    { upsert: true }
  )
  await queue.updateOne({ topic: topic.topic }, { $set: { status: 'used', used_post_slug: slug } })
  return { started: slug, primary: kw.primary }
}

async function advance() {
  const col = await postsCollection()
  const post = await col.find({ status: { $in: ['briefed', 'drafting', 'drafted', 'edited', 'judged'] } }).sort({ updated_at: 1 }).limit(1).next()
  if (!post) return { idle: true, note: 'no in-flight post — action=start begins one' }
  const now = new Date()

  // 1. Write the next empty section (one per call — timeout safety).
  if (post.status === 'briefed' || post.status === 'drafting') {
    const idx = (post.sections || []).findIndex((s) => !s.md)
    if (idx === -1) {
      await col.updateOne({ slug: post.slug }, { $set: { status: 'drafted', updated_at: now } })
      return { slug: post.slug, step: 'all sections written → drafted' }
    }
    const sec = post.sections[idx]
    const prevText = post.sections.slice(0, idx).map((s) => `## ${s.h2}\n${s.md}`).join('\n\n').slice(-6000)
    const { text } = await callLLM({
      system: WRITE_SYSTEM,
      user: JSON.stringify({ brief: post.brief, h2: sec.h2, goal: sec.goal, must_include: sec.must_include, target_words: sec.target_words, previous_sections_tail: prevText }),
      tier: 'strong', maxTokens: 1800, temperature: 0.5, tag: `write:${post.slug}:${idx}`,
    })
    const md = text.trim().replace(/^##\s.*\n/, '')
    await col.updateOne({ slug: post.slug }, { $set: { [`sections.${idx}.md`]: md, status: 'drafting', updated_at: now } })
    return { slug: post.slug, step: `wrote section ${idx + 1}/${post.sections.length}`, words: countWords(md) }
  }

  // 2. Deterministic checks + one fix pass.
  if (post.status === 'drafted') {
    const body_md = assembleBody(post)
    const report = runSeoChecks({ ...post, body_md })
    let updated = { body_md, seo_report: report }
    if (report.score < SEO_PASS_MARK && report.failed.length) {
      const { data: fix } = await callJson({
        system: EDIT_SYSTEM,
        user: JSON.stringify({ post: { title: post.title, meta_description: post.meta_description, answer: post.answer, slug: post.slug, seo: post.seo, sections: post.sections.map((s, i) => ({ index: i, h2: s.h2, md: s.md })) }, failed_checks: report.failed }),
        tier: 'strong', maxTokens: 3000, tag: `edit:${post.slug}`,
      }).catch(() => ({ data: null }))
      if (fix) {
        const sections = [...post.sections]
        for (const s of fix.sections || []) if (sections[s.index]) sections[s.index] = { ...sections[s.index], md: s.md }
        const merged = { ...post, ...fix, sections }
        const body2 = assembleBody(merged)
        updated = {
          ...(fix.title ? { title: fix.title } : {}),
          ...(fix.meta_description ? { meta_description: fix.meta_description } : {}),
          ...(fix.answer ? { answer: fix.answer } : {}),
          sections,
          body_md: body2,
          seo_report: runSeoChecks({ ...merged, body_md: body2 }),
        }
      }
    }
    updated.word_count = countWords(updated.body_md)
    updated.reading_min = Math.max(1, Math.round(updated.word_count / 220))
    await col.updateOne({ slug: post.slug }, { $set: { ...updated, status: 'edited', updated_at: now } })
    return { slug: post.slug, step: 'seo edit', score: updated.seo_report.score }
  }

  // 3. Judge (different model family), claim fixes, gate.
  if (post.status === 'edited') {
    const { data: judge } = await callJson({
      system: JUDGE_SYSTEM,
      user: JSON.stringify({ persona: post.persona, primary_keyword: post.seo?.primary, article: { title: post.title, answer: post.answer, sections: post.sections.map((s, i) => ({ index: i, h2: s.h2, md: s.md })) }, sources: post.sources }),
      tier: 'judge', maxTokens: 2500, tag: `judge:${post.slug}`,
    })
    const bad = (judge.claims || []).filter((c) => c.status !== 'verified')
    let sections = post.sections
    if (bad.length) {
      const { data: fixed } = await callJson({
        system: CLAIM_FIX_SYSTEM,
        user: JSON.stringify({ claims: bad, sections: post.sections.map((s, i) => ({ index: i, h2: s.h2, md: s.md })) }),
        tier: 'strong', maxTokens: 3500, tag: `claimfix:${post.slug}`,
      }).catch(() => ({ data: null }))
      if (fixed?.sections) {
        sections = [...post.sections]
        for (const s of fixed.sections) if (sections[s.index]) sections[s.index] = { ...sections[s.index], md: s.md }
      }
    }
    const body_md = assembleBody({ ...post, sections })
    const status = judge.score >= JUDGE_GATE ? 'judged' : 'held'
    await col.updateOne({ slug: post.slug }, { $set: { sections, body_md, judge: { ...judge, at: now }, status, updated_at: now } })
    return { slug: post.slug, step: 'judged', score: judge.score, status }
  }

  // 4. Schedule into the next free daily slot. Kill switch honoured.
  if (post.status === 'judged') {
    if (process.env.BLOG_AUTOPUBLISH === 'false') {
      return { slug: post.slug, step: 'autopublish disabled — post waiting in judged for admin' }
    }
    const when = await nextFreeSlot(col)
    await col.updateOne({ slug: post.slug }, {
      $set: { status: 'published', published_at: when, scheduled_for: when, updated_at: now },
      $push: { history: { at: now, status: 'published', by: 'pipeline', note: `scheduled for ${when.toISOString()}` } },
    })
    return { slug: post.slug, step: 'scheduled', publishes_at: when.toISOString() }
  }

  return { slug: post.slug, note: `no handler for status ${post.status}` }
}

export async function POST(request) {
  const denied = requireAdmin(request)
  if (denied) return denied
  const url = new URL(request.url)
  const action = url.searchParams.get('action') || 'advance'
  try {
    if (action === 'scout') return Response.json(await scout())
    if (action === 'start') return Response.json(await start())
    if (action === 'advance') return Response.json(await advance())
    if (action === 'status') {
      const col = await postsCollection()
      const counts = await col.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]).toArray()
      return Response.json({ providers: providersAvailable(), counts: Object.fromEntries(counts.map((c) => [c._id, c.n])) })
    }
    return Response.json({ error: `unknown action ${action}` }, { status: 400 })
  } catch (e) {
    return Response.json({ error: e.message, action }, { status: 500 })
  }
}
