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
import { SCOUT_SYSTEM, KEYWORD_SYSTEM, BRIEF_SYSTEM, WRITE_SYSTEM, EDIT_SYSTEM, JUDGE_SYSTEM, CLAIM_FIX_SYSTEM, HUMANIZE_SYSTEM, REVISE_SYSTEM } from '@/lib/blog/prompts'
import { styleCheck, overlapWithCorpus, OVERLAP_LIMIT } from '@/lib/blog/style-check'
import { serpSearch, rankFor } from '@/lib/blog/serp'
import { suggestLinks, linkUniverse } from '@/lib/blog/links'
import { getDb } from '@/lib/mongo'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Env-overridable, default 7. Decided 7 Sept 2026 after the per-section
// revision loop ran live on Groq's free tier: first drafts scored 6-7, the
// rewrite pass lowered a 7 to a 5, Groq JSON mode failed one call in three,
// and a single revised article exhausted the free daily token budget. The
// owner chose to ship at 7 on Groq rather than fund a stronger tier. Set
// BLOG_JUDGE_GATE=8 in Vercel to restore the original bar without a deploy.
const JUDGE_GATE = Number(process.env.BLOG_JUDGE_GATE) || 7
// Revision is off by default on Groq: the model's per-section rewrites made
// the article worse (7 -> 5) and the second pass hit the per-day token cap.
// Set BLOG_MAX_REVISIONS=2 alongside a funded OpenRouter key to turn it back
// on — the loop itself is intact and worked as designed.
const MAX_REVISIONS = Number.isFinite(Number(process.env.BLOG_MAX_REVISIONS)) ? Number(process.env.BLOG_MAX_REVISIONS) : 0

// Groq's free tier rejects large requests outright (413) — it can't fit a
// full 2,500-word article in one call. When a full-payload call fails that
// way, retry with each section trimmed to its first N words: claims and
// style live in prose, so a compact pass still catches what matters. Funded
// OpenRouter runs never need this path.
function compactSections(sections, words = 200) {
  return sections.map((s, i) => ({ index: i, h2: s.h2, md: (s.md || '').split(/\s+/).slice(0, words).join(' ') }))
}

async function callJsonCompact(opts, sectionsFull, buildUser) {
  try {
    return await callJson({ ...opts, user: buildUser(sectionsFull.map((s, i) => ({ index: i, h2: s.h2, md: s.md }))) })
  } catch (e) {
    if (!/413|too large|payload/i.test(e.message)) throw e
    return await callJson({ ...opts, maxTokens: Math.min(opts.maxTokens, 2000), user: buildUser(compactSections(sectionsFull)) })
  }
}

// For calls that RETURN rewritten section text, truncated input would come
// back as truncated replacements — so on 413 we split the sections in half
// (full text preserved) and merge the two results instead.
async function callJsonSplit(opts, sectionsFull, buildUser) {
  const indexed = sectionsFull.map((s, i) => ({ index: i, h2: s.h2, md: s.md }))
  try {
    return await callJson({ ...opts, user: buildUser(indexed) })
  } catch (e) {
    if (!/413|too large|payload/i.test(e.message)) throw e
    const mid = Math.ceil(indexed.length / 2)
    const halves = [indexed.slice(0, mid), indexed.slice(mid)]
    const merged = { data: { sections: [], changes: [] } }
    for (const half of halves) {
      const r = await callJson({ ...opts, user: buildUser(half) })
      merged.data.sections.push(...(r.data.sections || []))
      merged.data.changes.push(...(r.data.changes || []))
      for (const k of Object.keys(r.data)) if (!['sections', 'changes'].includes(k) && !(k in merged.data)) merged.data[k] = r.data[k]
    }
    return merged
  }
}

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
  const posts = await (await postsCollection()).find({}, { projection: { title: 1, 'seo.primary': 1, topic: 1, rank: 1 } }).limit(300).toArray()
  const searches = await db.collection('search_queries').find({}, { projection: { q: 1, query: 1, count: 1 } }).sort({ count: -1 }).limit(40).toArray().catch(() => [])
  const problems = await db.collection('problems').find({}, { projection: { title: 1, description: 1, votes: 1 } }).sort({ votes: -1 }).limit(20).toArray().catch(() => [])
  const rising = await db.collection('skills').find({ published: { $ne: false } }, { projection: { title_human: 1, title: 1, slug: 1, stars: 1, category: 1 } }).sort({ last_updated: -1 }).limit(40).toArray().catch(() => [])
  const assets = linkUniverse().filter((l) => ['template', 'bundle', 'mcp', 'outcome'].includes(l.kind))

  const user = JSON.stringify({
    existing_posts: posts.map((p) => ({ title: p.title, primary: p.seo?.primary, rank: p.rank?.position ?? null })),
    ranking_guidance: 'existing_posts rank = our current SERP position for that primary keyword (null = not top-20). Posts ranking 6-30 are refresh/expand candidates; keywords where we rank 1-5 are OFF LIMITS for new posts (cannibalization); clusters with repeated nulls after weeks deserve fewer new topics.',
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
  // One article at a time. The daily run calls start before advance, and
  // three failed days in a row (8-10 Sept) left three drafts in flight; the
  // advance loop then spread its 48 calls across all of them and none reached
  // the judge. Finish what exists before beginning another.
  const posts = await postsCollection()
  const inflight = await posts.find({ status: { $in: ['briefed', 'drafting', 'drafted', 'edited', 'humanizing', 'revising', 'styled', 'judged'] } }, { projection: { slug: 1, status: 1 } }).limit(5).toArray()
  if (inflight.length) return { skipped: 'in-flight post exists — advance it first', in_flight: inflight.map((p) => `${p.slug}:${p.status}`) }
  const queue = await topicQueueCollection()
  const topic = await queue.find({ status: 'open' }).sort({ score: -1 }).limit(1).next()
  if (!topic) return { error: 'topic_queue empty — run action=scout first' }

  // Keyword step: imported volume rows if present, plus a LIVE SERP snapshot
  // so the strategist sees who actually ranks today, and our current rank so
  // it never cannibalizes a page that already ranks top-5.
  const kwCol = await keywordsCollection()
  const kwRows = await kwCol.find({ $text: { $search: topic.topic } }).limit(20).toArray().catch(() => [])
  const serp = await serpSearch(topic.topic, { count: 10 })
  const ourRank = await rankFor(topic.topic)
  const { data: kw } = await callJson({
    system: KEYWORD_SYSTEM,
    user: JSON.stringify({
      topic: topic.topic, angle: topic.angle, cluster: topic.cluster,
      imported_volume_rows: kwRows.map((r) => ({ keyword: r.keyword, volume: r.volume, difficulty: r.difficulty, last_position: r.last_position })),
      serp_snapshot: { engine: serp.engine, results: serp.results.map((r) => ({ position: r.position, title: r.title, host: (() => { try { return new URL(r.url).hostname } catch { return '' } })(), snippet: r.snippet.slice(0, 160) })) },
      rank_data: { our_position_for_topic: ourRank.position, engine: ourRank.engine },
      today: new Date().toISOString().slice(0, 10),
    }),
    tier: 'cheap', maxTokens: 1400, tag: 'keywords',
  })
  // Snapshot the chosen primary's SERP too (differs from the raw topic query).
  const primarySerp = kw.primary && kw.primary !== topic.topic ? await serpSearch(kw.primary, { count: 10 }) : serp

  const links = suggestLinks({ persona: topic.persona, keywords: [kw.primary, ...(kw.secondary || [])], limit: 12 })
  const { data: brief } = await callJson({
    system: BRIEF_SYSTEM,
    user: JSON.stringify({
      topic: topic.topic, angle: topic.angle, persona: topic.persona, anchor_asset: topic.anchor_asset, keywords: kw,
      allowed_internal_links: links.map((l) => ({ path: l.path, label: l.label })),
      serp_snapshot: primarySerp.results.slice(0, 8).map((r) => ({ position: r.position, title: r.title, snippet: r.snippet.slice(0, 160) })),
      today: new Date().toISOString().slice(0, 10),
      freshness_note: 'The article must read as current: reference what tools/docs say NOW with month-year dating, and must NOT restate what the serp_snapshot pages already say — different angle, own data.',
    }),
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
        serp_snapshot: primarySerp.results.slice(0, 8).map((r) => ({ position: r.position, title: r.title, url: r.url, snippet: r.snippet.slice(0, 200) })),
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
  // Most recently touched first, so one article runs to the judge before
  // another is picked up. The old ascending sort round-robined every call.
  const post = await col.find({ status: { $in: ['briefed', 'drafting', 'drafted', 'edited', 'humanizing', 'revising', 'styled', 'judged'] } }).sort({ updated_at: -1 }).limit(1).next()
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
    let md = text.trim().replace(/^##\s.*\n/, '')
    // Free-tier models drift badly on length (a 350-word target came back as
    // 1,188 and as 51 words in the same run). One corrective retry when the
    // section is more than 2.2x or under 0.4x the target; the SEO edit does
    // not fix length, and the judge marks it down.
    const target = Number(sec.target_words) || 350
    const got = countWords(md)
    if (got > target * 2.2 || got < target * 0.4) {
      const { text: retry } = await callLLM({
        system: WRITE_SYSTEM,
        user: JSON.stringify({ brief: post.brief, h2: sec.h2, goal: sec.goal, must_include: sec.must_include, target_words: sec.target_words, previous_sections_tail: prevText, length_note: `Your previous attempt was ${got} words; the target is ${target} (+/-15%). Rewrite to that length.` }),
        tier: 'strong', maxTokens: 1800, temperature: 0.4, tag: `write-retry:${post.slug}:${idx}`,
      }).catch(() => ({ text: '' }))
      const md2 = (retry || '').trim().replace(/^##\s.*\n/, '')
      const got2 = countWords(md2)
      if (got2 && Math.abs(got2 - target) < Math.abs(got - target)) md = md2
    }
    await col.updateOne({ slug: post.slug }, { $set: { [`sections.${idx}.md`]: md, status: 'drafting', updated_at: now } })
    return { slug: post.slug, step: `wrote section ${idx + 1}/${post.sections.length}`, words: countWords(md), ...(got !== countWords(md) ? { length_retry: `${got} -> ${countWords(md)}` } : {}) }
  }

  // 2. Deterministic checks + one fix pass.
  if (post.status === 'drafted') {
    const body_md = assembleBody(post)
    const report = runSeoChecks({ ...post, body_md })
    let updated = { body_md, seo_report: report }
    if (report.score < SEO_PASS_MARK && report.failed.length) {
      const { data: fix } = await callJsonSplit(
        { system: EDIT_SYSTEM, tier: 'strong', maxTokens: 3000, tag: `edit:${post.slug}` },
        post.sections,
        (sections) => JSON.stringify({ post: { title: post.title, meta_description: post.meta_description, answer: post.answer, slug: post.slug, seo: post.seo, sections }, failed_checks: report.failed })
      ).catch(() => ({ data: null }))
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

  // 2b. Humanize: deterministic style linter + corpus-duplication check. If it
  // fails, queue the sections that carry a finding and rewrite them ONE PER
  // CALL (status 'humanizing'), then re-lint. Up to two passes; the second runs
  // on the judge tier so a different model family takes the line-editing turn.
  // Only a post that still fails after two passes is held — machine-flavored
  // writing never ships, but a free-tier writer gets a fair chance to fix it.
  //
  // Why per section: the old single whole-article rewrite (4k tokens out, one
  // JSON reply) 504'd on Vercel's 60s cap and, when it did return, cleared
  // ~nothing on free models. The first clean Gemma article (10 Sept) wrote
  // eight sections at 324-497 words and then died here at style 64/75.
  if (post.status === 'edited') {
    const body_md = post.body_md || assembleBody(post)
    const style = styleCheck({ ...post, body_md })
    const others = await col.find({ slug: { $ne: post.slug }, body_md: { $exists: true } }, { projection: { slug: 1, body_md: 1 } }).limit(100).toArray()
    const overlap = overlapWithCorpus({ ...post, body_md }, others)
    const clean = style.pass && overlap.max <= OVERLAP_LIMIT
    const pass = post.humanize_pass || 0
    if (clean || pass >= 2) {
      await col.updateOne({ slug: post.slug }, { $set: {
        body_md, word_count: countWords(body_md),
        style_report: { ...style, overlap, passes: pass, at: now },
        status: clean ? 'styled' : 'held',
        updated_at: now,
      } })
      return { slug: post.slug, step: 'humanize', style_score: style.score, overlap: +(overlap.max * 100).toFixed(1), passes: pass, status: clean ? 'styled' : 'held' }
    }
    // Which sections to touch: any that contains a flagged phrase; if the only
    // findings are article-level (rhythm, contractions, openers, bolding) or
    // duplication, every section.
    const phrases = (style.findings.find((f) => f.id === 'ai_phrases')?.detail || '').replace(/^stock AI phrases: /, '').split(' · ').filter(Boolean)
    const escapeRe = (h) => (h.includes('{0,20}') ? h : h.replace(/[.*+?^$()|[\]\\]/g, '\\$&'))
    const perSection = post.sections
      .map((sec, i) => (phrases.some((h) => { try { return new RegExp(escapeRe(h), 'i').test(sec.md || '') } catch { return false } }) ? i : -1))
      .filter((i) => i >= 0)
    const globalOnly = style.findings.every((f) => f.id !== 'ai_phrases') || overlap.max > OVERLAP_LIMIT
    const queue = globalOnly || !perSection.length ? post.sections.map((_, i) => i) : perSection
    await col.updateOne({ slug: post.slug }, { $set: {
      status: 'humanizing',
      humanize_pass: pass + 1,
      humanize_queue: queue,
      humanize_findings: style.findings,
      humanize_duplication: overlap.max > OVERLAP_LIMIT ? `${(overlap.max * 100).toFixed(1)}% 8-gram overlap with sibling post ${overlap.worst} — rewrite the overlapping passages in this article's own words` : null,
      updated_at: now,
    } })
    return { slug: post.slug, step: 'humanize', style_score: style.score, overlap: +(overlap.max * 100).toFixed(1), status: 'humanizing', pass: pass + 1, queued_sections: queue.length }
  }

  // 2c. Humanizing: rewrite one queued section per call, then return to
  // 'edited' for a fresh lint. Pass 1 on the writer's tier, pass 2 on the
  // judge tier (a different family), so the same model does not get two turns
  // at the same tells.
  if (post.status === 'humanizing') {
    const queue = Array.isArray(post.humanize_queue) ? post.humanize_queue : []
    if (!queue.length) {
      await col.updateOne({ slug: post.slug }, { $set: { body_md: assembleBody(post), status: 'edited', updated_at: now }, $unset: { humanize_queue: '', humanize_findings: '', humanize_duplication: '' } })
      return { slug: post.slug, step: 'humanize pass applied → re-lint', pass: post.humanize_pass }
    }
    const idx = queue[0]
    const sec = post.sections[idx]
    const tier = (post.humanize_pass || 1) >= 2 ? 'judge' : 'strong'
    try {
      const { data } = await callJson({
        system: HUMANIZE_SYSTEM, tier, maxTokens: 1600, temperature: 0.4,
        tag: `humanize:${post.slug}:${post.humanize_pass}:${idx}`,
        user: JSON.stringify({
          findings: post.humanize_findings || [],
          duplication: post.humanize_duplication || null,
          note: 'You are given ONE section of the article. Fix only the findings within it and return that section in full.',
          sections: [{ index: idx, h2: sec.h2, md: sec.md }],
        }),
      })
      const out = Array.isArray(data?.sections) ? data.sections[0] : null
      const md = typeof out?.md === 'string' ? out.md.trim().replace(/^##\s.*\n/, '') : ''
      if (countWords(md) < 60) throw new Error('humanizer returned no usable section')
      await col.updateOne({ slug: post.slug }, { $set: { [`sections.${idx}.md`]: md, humanize_queue: queue.slice(1), updated_at: now } })
      return { slug: post.slug, step: `humanized section ${idx + 1}/${post.sections.length}`, pass: post.humanize_pass, remaining: queue.length - 1 }
    } catch (e) {
      // Skip the section rather than stall the article; the re-lint decides.
      await col.updateOne({ slug: post.slug }, { $set: { humanize_queue: queue.slice(1), updated_at: now } })
      return { slug: post.slug, step: `humanize section ${idx + 1} skipped`, error: String(e.message || e).slice(0, 160), remaining: queue.length - 1 }
    }
  }

  // 2c. Revise: one flagged section per call, from the queue the judge left.
  // Same shape as drafting — one section per invocation is what fits both
  // Vercel's 60s cap and Groq's per-minute token budget; the workflow's sleep
  // between calls is the cooldown.
  if (post.status === 'revising') {
    const queue = Array.isArray(post.revise_queue) ? post.revise_queue : []
    if (!queue.length) {
      // Back to 'edited', not 'styled': the humanizer re-runs so a revision
      // cannot smuggle machine-writing tells back in.
      await col.updateOne({ slug: post.slug }, {
        $set: { body_md: assembleBody(post), status: 'edited', updated_at: now },
        $unset: { revise_queue: '', revise_note: '', revise_failures: '' },
      })
      return { slug: post.slug, step: 'all revisions applied → edited', revision: post.revisions }
    }
    const idx = queue[0]
    const sec = post.sections[idx]
    const note = post.revise_note || {}
    try {
      const { data } = await callJson({
        system: REVISE_SYSTEM, tier: 'strong', maxTokens: 1400, temperature: 0.5,
        tag: `revise:${post.slug}:${post.revisions}:${idx}`,
        user: JSON.stringify({
          section: { index: idx, h2: sec.h2, md: sec.md },
          section_brief: post.brief?.outline?.[idx] || null,
          firsthand_section: post.brief?.firsthand_section,
          table_spec: post.brief?.table_spec,
          rubric: note.rubric, rationale: note.rationale, score: note.score, gate: JUDGE_GATE,
          primary_keyword: post.seo?.primary, persona: post.persona,
          sources: (post.sources || []).slice(0, 8),
          neighbours: { prev_h2: post.sections[idx - 1]?.h2 || null, next_h2: post.sections[idx + 1]?.h2 || null },
        }),
      })
      const md = typeof data?.md === 'string' ? data.md.trim().replace(/^##\s.*\n/, '') : ''
      if (countWords(md) < 80) throw new Error('reviser returned no usable section')
      await col.updateOne({ slug: post.slug }, {
        $set: { [`sections.${idx}.md`]: md, revise_queue: queue.slice(1), updated_at: now },
        $push: { revise_log: { index: idx, revision: post.revisions, changes: data.changes || [], at: now } },
      })
      return { slug: post.slug, step: `revised section ${idx + 1}/${post.sections.length}`, remaining: queue.length - 1, words: countWords(md) }
    } catch (e) {
      // Never swallow. Leave the index queued so the next call retries after
      // the workflow's sleep; after two failures skip the section rather than
      // stall the whole article on one stubborn rewrite.
      const failures = { ...(post.revise_failures || {}) }
      failures[idx] = (failures[idx] || 0) + 1
      const skip = failures[idx] >= 2
      await col.updateOne({ slug: post.slug }, { $set: {
        revise_failures: failures,
        ...(skip ? { revise_queue: queue.slice(1) } : {}),
        updated_at: now,
      } })
      return {
        slug: post.slug,
        step: `revise section ${idx + 1} ${skip ? 'skipped' : 'retry pending'}`,
        error: String(e.message || e).slice(0, 200),
        remaining: skip ? queue.length - 1 : queue.length,
      }
    }
  }

  // 3. Judge (different model family), claim fixes, gate.
  if (post.status === 'styled') {
    const { data: judge } = await callJsonCompact(
      // 3500, not 2500: with the claims list now capped at 10 the verdict fits
      // comfortably, and a reply cut off by the budget is invalid JSON — the
      // 10 Sept run failed here three times in a row.
      { system: JUDGE_SYSTEM, tier: 'judge', maxTokens: 3500, tag: `judge:${post.slug}` },
      post.sections,
      (sections) => JSON.stringify({
        persona: post.persona, primary_keyword: post.seo?.primary,
        article: { title: post.title, answer: post.answer, sections },
        sources: post.sources,
        competing_serp_results: (post.serp_snapshot || []).slice(0, 5),
        originality_instruction: 'Score originality low if this article could be reconstructed from the competing_serp_results titles/snippets alone — it must contain observations those pages cannot have.',
      })
    )
    const bad = (judge.claims || []).filter((c) => c.status !== 'verified')
    let sections = post.sections
    if (bad.length) {
      const { data: fixed } = await callJsonSplit(
        { system: CLAIM_FIX_SYSTEM, tier: 'strong', maxTokens: 3500, tag: `claimfix:${post.slug}` },
        post.sections,
        (sections) => JSON.stringify({ claims: bad, sections })
      ).catch(() => ({ data: null }))
      if (fixed?.sections) {
        sections = [...post.sections]
        for (const s of fixed.sections) if (sections[s.index]) sections[s.index] = { ...sections[s.index], md: s.md }
      }
    }
    const body_md = assembleBody({ ...post, sections })
    const attempt = (post.revisions || 0)
    const history = [...(post.judge_history || []), { score: judge.score, rubric: judge.rubric, at: now }]

    // Below the gate, but with revisions left: queue the sections the editor
    // flagged and let advance() rewrite them one per call. The gate itself
    // never moves — nothing ships under 8.
    //
    // Why a queue and not one call: the first live run of the loop (7 Sept)
    // sent the whole article plus brief and sources straight after the judge
    // call and asked for 4,000 tokens back — over Groq's 8,000 tokens-per-
    // minute free tier on its own. The 429 retry hit the same wall, and the
    // catch turned it into "nothing to revise" and a held post. One section
    // per invocation fits the budget, fits Vercel's 60s function cap the same
    // way drafting does, and cannot misattribute a rewrite: callJsonSplit
    // re-stamps `index` from array position, which this path never uses.
    if (judge.score < JUDGE_GATE && attempt < MAX_REVISIONS) {
      const flagged = Array.isArray(judge.revise_sections)
        ? judge.revise_sections.filter((i) => Number.isInteger(i) && sections[i])
        : []
      const targets = flagged.length ? flagged : sections.map((_, i) => i)
      await col.updateOne({ slug: post.slug }, { $set: {
        sections,
        body_md,
        judge: { ...judge, at: now },
        judge_history: history,
        revisions: attempt + 1,
        revise_queue: targets,
        revise_note: { rubric: judge.rubric, rationale: judge.rationale, score: judge.score },
        revise_failures: {},
        status: 'revising',
        updated_at: now,
      } })
      return { slug: post.slug, step: 'judged', score: judge.score, status: 'revising', revision: attempt + 1, queued_sections: targets.length }
    }

    const status = judge.score >= JUDGE_GATE ? 'judged' : 'held'
    await col.updateOne({ slug: post.slug }, { $set: { sections, body_md, judge: { ...judge, at: now }, judge_history: history, status, updated_at: now } })
    return { slug: post.slug, step: 'judged', score: judge.score, status, revisions: attempt }
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

// Rank tracking: check where each published post's primary keyword ranks
// (Brave/DDG proxy; GSC stays the Google ground truth). Batched and rotated —
// the least-recently-checked posts first, ≤8 per run to stay polite. Results
// land on the post (rank + rank_history) and in the keywords collection,
// which the scout and keyword strategist both read.
async function rankCheck(limit = 8) {
  const col = await postsCollection()
  const posts = await col.find(
    { status: 'published', 'seo.primary': { $exists: true, $ne: '' } },
    { projection: { slug: 1, 'seo.primary': 1, rank: 1 } }
  ).sort({ 'rank.checked_at': 1 }).limit(limit).toArray()
  const kwCol = await keywordsCollection()
  const out = []
  for (const p of posts) {
    const r = await rankFor(p.seo.primary)
    await col.updateOne({ slug: p.slug }, {
      $set: { rank: { keyword: p.seo.primary, engine: r.engine, position: r.position, url: r.url, checked_at: r.checked_at, error: r.error || null } },
      $push: { rank_history: { $each: [{ engine: r.engine, position: r.position, at: r.checked_at }], $slice: -60 } },
    })
    await kwCol.updateOne(
      { keyword: p.seo.primary },
      { $set: { last_position: r.position, last_engine: r.engine, last_checked: r.checked_at, ranking_url: r.url, post_slug: p.slug }, $setOnInsert: { keyword: p.seo.primary, source: 'rank-check' } },
      { upsert: true }
    )
    out.push({ slug: p.slug, keyword: p.seo.primary, engine: r.engine, position: r.position ?? 'not in top 20' })
    await new Promise((res) => setTimeout(res, 1200)) // politeness gap between SERP hits
  }
  return { checked: out.length, results: out }
}

export async function POST(request) {
  const denied = requireAdmin(request)
  if (denied) return denied
  const url = new URL(request.url)
  const action = url.searchParams.get('action') || 'advance'
  try {
    if (action === 'scout') return Response.json(await scout())
    if (action === 'rank') return Response.json(await rankCheck(Math.min(parseInt(url.searchParams.get('limit') || '8', 10), 15)))
    if (action === 'start') return Response.json(await start())
    if (action === 'advance') return Response.json(await advance())
    // Park a draft. Used to clear poisoned drafts (e.g. sections written by a
    // model that has since been swapped out) so start() can begin a fresh
    // article instead of the daily run spending itself on a doomed one.
    // Put a held draft back in play at the lint step with a fresh pass count.
    if (action === 'resume') {
      const slug = url.searchParams.get('slug')
      if (!slug) return Response.json({ error: 'slug required' }, { status: 400 })
      const col = await postsCollection()
      const r = await col.updateOne({ slug, status: 'held' }, { $set: { status: 'edited', humanize_pass: 0, updated_at: new Date() }, $unset: { held_reason: '' } })
      return Response.json({ slug, resumed: r.modifiedCount === 1 })
    }
    if (action === 'hold') {
      const slug = url.searchParams.get('slug')
      if (!slug) return Response.json({ error: 'slug required' }, { status: 400 })
      const col = await postsCollection()
      const r = await col.updateOne({ slug, status: { $ne: 'published' } }, { $set: { status: 'held', held_reason: url.searchParams.get('reason') || 'manual hold', updated_at: new Date() } })
      return Response.json({ slug, held: r.modifiedCount === 1 })
    }
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
