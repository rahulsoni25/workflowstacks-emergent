// One-time backfill: re-write the title/description of already-published
// skills whose copy matches the old templated pattern ("Get X with Y, for
// founders...") that PR #64 stopped generating for NEW skills but never
// retroactively fixed. Confirmed scope 2026-09-28: 1,175 of 2,582 published
// skills match. Google Search Console's Page indexing report shows 549 pages
// "Crawled - currently not indexed" and 504 "Discovered - currently not
// indexed" -- the templated pattern, repeated across 1,000+ pages, is the
// leading hypothesis for why an entire 674-URL sitemap sits at 0 indexed.
//
// Runs as a standalone script (not the Vercel-hosted /api/agent-rewrite
// route) for the same reason scripts/refresh-stars.mjs does: 1,175 skills at
// ~2 LLM calls each (write + judge) is hours of work, and none of it needs
// Vercel's compute -- it only reads/writes Mongo and calls Groq/OpenRouter.
//
// Safety: this NEVER sets published:false on a skill that is already
// published. A low judge score just means the new copy isn't used and the
// old (templated but live) copy stays -- a backfill must never take an
// already-indexed-or-crawled page offline over a copy-quality judgment call.
// It also never calls revalidateSkill() (Next-runtime-only, unavailable
// here) -- the next deploy's fresh ISR cache picks up the change on its own
// (Vercel's ISR cache is deployment-scoped, so this costs nothing extra).
//
//   MONGO_URL=... DB_NAME=... GROQ_API_KEY=... \
//     node scripts/rewrite-backfill.mjs --limit=1175 --batch=6 --sleep=62

import { MongoClient } from 'mongodb'

const MONGO_URL = process.env.MONGO_URL
const DB_NAME = process.env.DB_NAME || 'workflowstacks'
const GROQ_API_KEY = process.env.GROQ_API_KEY
// llama-3.3-70b-versatile 404'd -- moved to Groq's Enterprise-only tier (same
// stale default this repo's app/api/agent-rewrite/route.js still has).
// Confirmed live against this account's real /openai/v1/models list
// (2026-09-29): canopylabs/orpheus-* and whisper-* are audio models,
// llama-prompt-guard-2-* are classifiers, allam-2-7b is Arabic-specialized --
// openai/gpt-oss-120b is the strongest general-purpose chat model actually
// available.
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
// google/gemma-2-9b-it:free returned 404 "No endpoints found" in the first
// real test run (2026-09-29) -- deprecated/removed from OpenRouter's catalog
// since this script was written. gemma-4-31b-it:free is the writer model the
// blog pipeline already uses in production (lib/blog/llm.js) and was
// confirmed live against OpenRouter's /api/v1/models the same day.
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemma-4-31b-it:free'
// Same provider priority as resolveProvider() in app/api/agent-rewrite/route.js.
const PROVIDER = GROQ_API_KEY ? 'groq' : OPENROUTER_API_KEY ? 'openrouter' : null

if (!MONGO_URL) { console.error('MONGO_URL is not set'); process.exit(1) }
if (!PROVIDER) { console.error('Neither GROQ_API_KEY nor OPENROUTER_API_KEY is set'); process.exit(1) }

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/)
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), 'true']
  })
)
const LIMIT = parseInt(args.limit || '1175', 10)
const BATCH = Math.max(1, parseInt(args.batch || '6', 10))
const SLEEP_MS = Math.max(0, parseInt(args.sleep || '62', 10)) * 1000
const GATE_MIN = Math.min(10, parseInt(args.gateMin || '8', 10))
const DRY_RUN = args['dry-run'] === 'true'

// Same family of openers sampled in the live catalog 2026-09-28.
const TEMPLATE_RE = /^(Get|Build|Streamline|Own|Unlock|Manage|Produce|Turn|Run|Measure|Create|Track|Add|Save)\s+\S.*?\bwith\b/i

function opener(text) {
  return (text || '').trim().split(/\s+/).slice(0, 3).join(' ').toLowerCase().replace(/[^a-z0-9 ]/g, '')
}

function formatStars(stars) {
  if (!stars) return ''
  if (stars >= 1000) return `${(stars / 1000).toFixed(stars >= 10000 ? 0 : 1)}k+ GitHub stars`
  return `${stars} GitHub stars`
}

function openrouterHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'X-Title': 'WorkflowStacks' }
}
function groqHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` }
}
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Same retry/fallback shape as lib/blog/llm.js, which this repo already
// proved out on this exact model family. First real test run (2026-09-29,
// 3-skill batch): 3/3 failed with "google/gemma-4-31b-it:free is temporarily
// rate-limited upstream" -- OpenRouter's shared free pool being throttled,
// not this account's quota. A 20s wait + one retry usually clears it; if
// GROQ_API_KEY is also set, fall back to Groq for that call rather than fail.
async function callGroq(system, user, maxTokens = 300) {
  const isGroq = PROVIDER === 'groq'
  let provName = PROVIDER
  const body = {
    model: isGroq ? GROQ_MODEL : OPENROUTER_MODEL,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  }
  let res = await fetch(isGroq ? GROQ_URL : OPENROUTER_URL, {
    method: 'POST',
    headers: isGroq ? groqHeaders() : openrouterHeaders(),
    body: JSON.stringify(body),
  })

  if (res.status === 429 && !isGroq) {
    await new Promise((r) => setTimeout(r, 20_000))
    res = await fetch(OPENROUTER_URL, { method: 'POST', headers: openrouterHeaders(), body: JSON.stringify(body) })
  }
  if (!res.ok && !isGroq && [401, 402, 403, 429].includes(res.status) && GROQ_API_KEY) {
    provName = 'groq'
    body.model = GROQ_MODEL
    res = await fetch(GROQ_URL, { method: 'POST', headers: groqHeaders(), body: JSON.stringify(body) })
  }
  if (res.status === 429 && provName === 'groq') {
    const bodyText = await res.text()
    const m = bodyText.match(/try again in ([0-9.]+)s/) || [null, res.headers.get('retry-after')]
    const waitS = Math.ceil(parseFloat(m[1] || '15'))
    if (waitS <= 30) {
      await new Promise((r) => setTimeout(r, (waitS + 1) * 1000))
      res = await fetch(GROQ_URL, { method: 'POST', headers: groqHeaders(), body: JSON.stringify(body) })
    } else {
      throw new Error(`groq 429: ${bodyText.slice(0, 200)}`)
    }
  }

  if (!res.ok) throw new Error(`${provName} ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

function parseJsonObject(text) {
  let t = (text || '').replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  const m = t.match(/\{[\s\S]*\}/)
  return JSON.parse(m ? m[0] : t)
}

// Same prompt as app/api/agent-rewrite/route.js rewriteWithLLM -- kept in
// sync by hand, no shared import (this script has zero dependency on the
// Next app's module graph, same reasoning as refresh-stars.mjs).
async function rewriteOne(skill, bannedOpeners) {
  const stars = skill.github_stars || 0
  const topics = (skill.github_topics || []).join(', ')
  const system =
    'You are a senior marketplace copywriter. You write short, punchy, click-worthy ' +
    'listing copy for a marketplace of free GitHub tools/skills aimed at startup founders ' +
    'across every niche. Be compelling but STRICTLY truthful: never invent statistics, ' +
    'percentages, user counts, or claims not supported by the input. You may use the real ' +
    'GitHub star count provided. Lead with the concrete value/outcome for a founder. ' +
    'Vary your sentence structure every time -- this copy runs across hundreds of listings ' +
    'and repeating the same opening pattern (e.g. always "Get X with Y" or "Build X with Y") ' +
    'makes the whole catalog look machine-generated to search engines. Open with the tool name, ' +
    'the outcome, an action verb, a question, or a comparison -- mix it up. ' +
    'Respond with ONLY a JSON object, no prose, no code fences.'
  const readme = (skill.readme_preview || '').slice(0, 500)
  const banned = bannedOpeners.slice(0, 15)
  const user =
    `Rewrite this listing.\n\n` +
    `Name: ${skill.name}\n` +
    `Category: ${skill.category}\n` +
    `Current description: ${skill.description_original || skill.description || 'n/a'}\n` +
    (readme ? `README excerpt: ${readme}\n` : '') +
    `GitHub stars: ${stars}\n` +
    `Language: ${skill.language || 'n/a'}\n` +
    `Topics: ${topics || 'n/a'}\n\n` +
    (banned.length
      ? `Do NOT start the description with any of these phrasings already used elsewhere in the catalog: ${banned.map((o) => `"${o}..."`).join(', ')}.\n\n`
      : '') +
    `Return JSON: {"title": "...", "description": "..."}\n` +
    `Rules:\n` +
    `- title: a benefit-driven headline, max ~65 chars, no clickbait lies. Keep the real tool name in it.\n` +
    `- description: 1-2 sentences, max ~160 chars, say what a founder gets and who it's for.\n` +
    `- Only mention the star count if it is >= 1000, phrased as "${formatStars(stars) || 'N/A'}".\n` +
    `- No emojis. No invented metrics.`

  let parsed = parseJsonObject(await callGroq(system, user))
  if (!parsed.title || !parsed.description) throw new Error('LLM returned incomplete JSON')
  if (banned.includes(opener(parsed.description))) {
    const retryUser = user + `\n\nYour previous attempt started with a banned phrasing. Use a genuinely different sentence structure this time.`
    try {
      const retry = parseJsonObject(await callGroq(system, retryUser))
      if (retry.title && retry.description) parsed = retry
    } catch { /* keep the first attempt */ }
  }
  return { title: parsed.title.trim(), description: parsed.description.trim() }
}

async function judge(skill, result) {
  const system =
    'You are a strict marketplace copy critic. Score listing copy from 1-10 for how well it ' +
    'drives clicks from startup founders WHILE staying truthful. Penalize: invented stats, ' +
    'clickbait, vagueness, missing the real tool name, or exceeding limits (title ~65 chars, ' +
    'description ~160 chars). Reward: concrete benefit, clear target audience, a specific hook, ' +
    'and honesty. Respond with ONLY JSON.'
  const user =
    `Tool: ${skill.name}\n` +
    `Real description: ${skill.description_original || skill.description || 'n/a'}\n` +
    `GitHub stars: ${skill.github_stars || 0}\n\n` +
    `Proposed title: ${result.title}\n` +
    `Proposed description: ${result.description}\n\n` +
    `Return JSON: {"score": <integer 1-10>, "reason": "<one short sentence>"}`
  const parsed = parseJsonObject(await callGroq(system, user, 100))
  let score = parseInt(parsed.score, 10)
  if (isNaN(score)) score = 0
  return Math.max(0, Math.min(10, score))
}

async function main() {
  const client = new MongoClient(MONGO_URL)
  await client.connect()
  const col = client.db(DB_NAME).collection('skills')

  const bannedOpeners = [
    ...new Set(
      (await col.find({ description_human: { $exists: true } }, { projection: { description_human: 1 } })
        .sort({ _id: -1 }).limit(60).toArray())
        .map((r) => opener(r.description_human)).filter(Boolean)
    ),
  ]

  const candidates = await col
    .find({ published: { $ne: false }, description_human: { $regex: TEMPLATE_RE } })
    .limit(LIMIT)
    .toArray()

  console.log(JSON.stringify({ candidates: candidates.length, limit: LIMIT, dryRun: DRY_RUN }))

  let rewritten = 0, improved = 0, unchanged = 0, failed = 0
  for (let i = 0; i < candidates.length; i += BATCH) {
    const batch = candidates.slice(i, i + BATCH)
    await Promise.all(batch.map(async (skill) => {
      try {
        const result = await rewriteOne(skill, bannedOpeners)
        const score = await judge(skill, result).catch(() => null)
        const stillTemplated = TEMPLATE_RE.test(result.description)
        // Only write over the templated copy if the new copy actually
        // cleared the same quality bar the live pipeline uses AND isn't
        // just another template. Never touch `published`.
        if (!DRY_RUN && score !== null && score >= GATE_MIN && !stillTemplated) {
          await col.updateOne(
            { id: skill.id },
            { $set: {
                title_human: result.title,
                description_human: result.description,
                rewritten_by: 'groq-backfill',
                rewritten_at: new Date(),
                rewrite_score: score,
              } }
          )
          improved++
        } else {
          unchanged++
        }
        rewritten++
        console.log(JSON.stringify({ slug: skill.slug || skill.id, score, stillTemplated, written: !DRY_RUN && score >= GATE_MIN && !stillTemplated }))
      } catch (e) {
        failed++
        console.log(JSON.stringify({ slug: skill.slug || skill.id, error: String(e.message || e).slice(0, 150) }))
      }
    }))
    if (i + BATCH < candidates.length) await new Promise((r) => setTimeout(r, SLEEP_MS))
  }

  console.log(JSON.stringify({ summary: true, candidates: candidates.length, rewritten, improved, unchanged, failed }))
  await client.close()
}

main().catch((e) => {
  console.error(String(e && e.stack || e))
  process.exit(1)
})
