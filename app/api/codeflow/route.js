import { getDb } from '@/lib/mongo'
import { parseGithubUrl, fetchRepoFacts, analyzeRepo, validateFlow, ghHeaders } from '@/lib/codeflow'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function requireAdmin(request) {
  const secret = process.env.ADMIN_SECRET
  const { searchParams } = new URL(request.url)
  const provided = request.headers.get('x-admin-secret') || searchParams.get('secret')
  if (!secret || provided !== secret) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return null
}

async function fetchReadme(owner, repo) {
  try {
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers: ghHeaders('application/vnd.github.raw+json'), cache: 'no-store' })
    if (!r.ok) return ''
    return (await r.text()).slice(0, 7000)
  } catch { return '' }
}

// Plain-English flow: input → 3-6 steps → output. Groq first, OpenRouter
// fallback. STRICT JSON. Every referenced file is validated against the real
// tree afterwards; unconfident answers are dropped entirely.
async function generateFlow({ name, category, readme, cf }) {
  const groq = process.env.GROQ_API_KEY
  const orKey = process.env.OPENROUTER_API_KEY
  if (!groq && !orKey) return { flow: null, provider: null }

  const folderMap = cf.folders.map((f) => `${f.path}/ (${f.files} files${f.purpose ? ', ' + f.purpose : ''})`).join('; ')
  const system = `You explain how an open-source AI tool works to a NON-TECHNICAL founder. Output STRICT JSON only.
Return: {"summary": string, "input": string, "output": string, "steps": [{"title": string, "detail": string, "file": string|null}], "confident": boolean}
Rules:
- summary: ONE sentence, plain English, no jargon, what happens from start to finish (max 25 words).
- input: what the user gives it (max 8 words). output: what they get back (max 8 words).
- steps: 3 to 6 steps in order. title max 5 words. detail max 18 words, plain English, no code identifiers unless unavoidable.
- file: the ONE path from the provided FILE LIST that best implements the step, or null. Never invent a path — copy it exactly from the list.
- confident: true only if the README clearly describes what the tool does. If it is vague or empty, set false.
Output ONLY the JSON object.`
  const fileList = [...cf.root_files, ...cf.entry_points, ...cf.reading_order.map((r) => r.path)].filter((v, i, a) => a.indexOf(v) === i).slice(0, 60)
  const user = `Tool: ${name}\nCategory: ${category || 'unknown'}\nSize: ${cf.size.label}, ${cf.size.loc_human} lines, ${cf.size.files} files\nLanguages: ${cf.languages.map((l) => `${l.name} ${l.pct}%`).join(', ') || 'n/a'}\nFolders: ${folderMap || 'none'}\nEntry points: ${cf.entry_points.join(', ') || 'none'}\nFILE LIST (only these may be used in "file"):\n${fileList.join('\n')}\n\nREADME (truncated):\n${readme || '(no README available)'}`

  async function call(url, model, auth) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth}`, 'X-Title': 'WorkflowStacks Codeflow' },
      body: JSON.stringify({ model, max_tokens: 700, temperature: 0.2, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
    })
    if (!r.ok) throw new Error(`${r.status}`)
    const d = await r.json()
    return d.choices?.[0]?.message?.content || ''
  }

  let raw = '', provider = null
  try {
    if (groq) { raw = await call('https://api.groq.com/openai/v1/chat/completions', process.env.GROQ_REC_MODEL || 'llama-3.3-70b-versatile', groq); provider = 'groq' }
    else { raw = await call('https://openrouter.ai/api/v1/chat/completions', 'anthropic/claude-haiku-4.5', orKey); provider = 'openrouter' }
  } catch {
    if (groq && orKey) {
      try { raw = await call('https://openrouter.ai/api/v1/chat/completions', 'anthropic/claude-haiku-4.5', orKey); provider = 'openrouter' } catch { return { flow: null, provider: null } }
    } else return { flow: null, provider: null }
  }
  let obj
  try { obj = JSON.parse(raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()) } catch { return { flow: null, provider } }
  const pathSet = new Set(fileList)
  return { flow: validateFlow(obj, pathSet), provider }
}

// Admin: compute + store `codeflow` on skill docs.
//   ?limit=20        batch size (max 40)
//   ?slug=<slug>     single skill (ignores limit/onlyMissing)
//   ?force=true      recompute even if present
//   ?llm=false       skip the plain-English flow (deterministic only)
//   ?maxAgeDays=30   refresh entries older than this (default 30)
//   ?dry=true        compute and return, do NOT write to the DB
export async function GET(request) {
  const denied = requireAdmin(request)
  if (denied) return denied
  const { searchParams } = new URL(request.url)
  const limit = Math.min(40, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
  const slug = searchParams.get('slug')
  const force = searchParams.get('force') === 'true'
  const useLLM = searchParams.get('llm') !== 'false'
  const dry = searchParams.get('dry') === 'true'
  const maxAgeDays = Math.max(1, parseInt(searchParams.get('maxAgeDays') || '30', 10))
  const staleBefore = new Date(Date.now() - maxAgeDays * 86400000)

  const db = await getDb()
  const col = db.collection('skills')
  let targets
  if (slug) {
    const one = await col.findOne({ $or: [{ slug }, { id: slug }] })
    targets = one ? [one] : []
  } else {
    const q = { github_url: { $regex: /github\.com/i }, published: { $ne: false } }
    if (!force) q.$or = [{ codeflow: { $exists: false } }, { codeflow: null }, { codeflow_at: { $lt: staleBefore } }]
    // Star-sorted so the pages that matter most (sitemap-gated ≥1000★) fill first.
    targets = await col.find(q).sort({ github_stars: -1 }).limit(limit).toArray()
  }

  const results = []
  let ok = 0, failed = 0, flows = 0, stoppedEarly = false
  const started = Date.now()
  const TIME_BUDGET_MS = 48_000 // stay under Vercel's 60s function ceiling
  for (const s of targets) {
    if (Date.now() - started > TIME_BUDGET_MS) { stoppedEarly = true; break }
    const parsed = parseGithubUrl(s.github_url)
    if (!parsed) { failed++; continue }
    try {
      const facts = await fetchRepoFacts(parsed.owner, parsed.repo, { cache: 'no-store' })
      if (!facts || facts.error || !facts.meta) {
        // Mark checked so a dead repo doesn't get retried every run.
        if (!dry) await col.updateOne({ _id: s._id }, { $set: { codeflow: null, codeflow_at: new Date(), codeflow_error: facts?.error || 'fetch failed' } })
        failed++
        results.push({ slug: s.slug || s.id, ok: false, error: facts?.error || 'fetch failed' })
        continue
      }
      const cf = analyzeRepo({ ...facts, category: s.category })
      let provider = null
      if (useLLM) {
        const readme = await fetchReadme(parsed.owner, parsed.repo)
        const gen = await generateFlow({ name: s.title_human || s.name, category: s.category, readme, cf })
        cf.flow = gen.flow
        provider = gen.provider
        if (gen.flow) flows++
      }
      if (!dry) await col.updateOne({ _id: s._id }, { $set: { codeflow: cf, codeflow_at: new Date(), codeflow_provider: provider }, $unset: { codeflow_error: '' } })
      ok++
      results.push({ slug: s.slug || s.id, ok: true, tier: cf.size.tier, loc: cf.size.loc_human, setup: cf.setup.level, provider, flow: cf.flow, ...(dry ? { codeflow: cf } : {}) })
    } catch (e) {
      failed++
      results.push({ slug: s.slug || s.id, ok: false, error: String(e?.message || e).slice(0, 120) })
    }
    await new Promise((r) => setTimeout(r, 250))
  }

  const total = await col.countDocuments({ codeflow: { $type: 'object' } })
  const withFlow = await col.countDocuments({ 'codeflow.flow': { $type: 'object' } })
  return Response.json({ ok: true, dry, processed: ok + failed, requested: targets.length, stopped_early: stoppedEarly, stored: dry ? 0 : ok, failed, flows_generated: flows, totals: { with_codeflow: total, with_flow: withFlow }, results })
}
