// LLM access for the blog pipeline. Two tiers:
//   strong — long-form writing, briefs, judging. OpenRouter (Sonnet-class by
//            default), falling back to Groq only if OpenRouter is absent.
//   cheap  — classification, keyword clustering, small JSON. Groq first.
// The judge deliberately uses a DIFFERENT model family than the writer when
// one is available (BLOG_JUDGE_MODEL), so it isn't grading its own style.
//
// Every call is logged to audit_logs {kind:'blog_llm', tokens, model} so the
// admin can see spend.
import { getDb } from '@/lib/mongo'

const OPENROUTER = 'https://openrouter.ai/api/v1/chat/completions'
const GROQ = 'https://api.groq.com/openai/v1/chat/completions'

// Groq retires model slugs without warning (llama-3.3-70b-versatile died
// mid-2026 and 500'd the whole pipeline). GROQ_MODEL env wins; otherwise try
// the candidates in order, remembering the first one that works this runtime.
const GROQ_CANDIDATES = ['openai/gpt-oss-120b', 'llama-3.1-8b-instant', 'meta-llama/llama-4-scout-17b-16e-instruct']
let groqWorking = null
// Once OpenRouter proves unusable this runtime, route new calls straight to
// Groq instead of paying a failed round-trip per call.
let openrouterDown = false
const GROQ_DEFAULT = () => process.env.GROQ_MODEL || groqWorking || GROQ_CANDIDATES[0]
export function noteGroqModelDead(model) {
  const i = GROQ_CANDIDATES.indexOf(model)
  groqWorking = GROQ_CANDIDATES[i + 1] || null
  return groqWorking
}

export function providersAvailable() {
  return {
    openrouter: !!process.env.OPENROUTER_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
  }
}

function pick(tier, override) {
  const p = providersAvailable()
  if (openrouterDown) p.openrouter = false
  if (override && override.includes('/') && p.openrouter) return { name: 'openrouter', model: override }
  if (tier === 'strong') {
    if (p.openrouter) return { name: 'openrouter', model: process.env.BLOG_WRITER_MODEL || 'anthropic/claude-sonnet-4' }
    if (p.anthropic) return { name: 'anthropic', model: process.env.BLOG_WRITER_MODEL || 'claude-sonnet-4-20250514' }
    if (p.groq) return { name: 'groq', model: GROQ_DEFAULT() }
  }
  if (tier === 'judge') {
    if (p.openrouter) return { name: 'openrouter', model: process.env.BLOG_JUDGE_MODEL || 'openai/gpt-4.1-mini' }
    if (p.groq) return { name: 'groq', model: GROQ_DEFAULT() }
    if (p.anthropic) return { name: 'anthropic', model: 'claude-sonnet-4-20250514' }
  }
  // cheap
  if (p.groq) return { name: 'groq', model: GROQ_DEFAULT() }
  if (p.openrouter) return { name: 'openrouter', model: process.env.BLOG_CHEAP_MODEL || 'anthropic/claude-3.5-haiku' }
  if (p.anthropic) return { name: 'anthropic', model: 'claude-3-5-haiku-latest' }
  return null
}

export async function callLLM({ system, user, tier = 'cheap', model, maxTokens = 1200, temperature = 0.4, json = false, tag = 'blog' }) {
  const prov = pick(tier, model)
  if (!prov) throw new Error('No LLM provider configured (set OPENROUTER_API_KEY or GROQ_API_KEY)')
  const started = Date.now()
  let text = ''
  let usage = null

  if (prov.name === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: prov.model, max_tokens: maxTokens, temperature, system, messages: [{ role: 'user', content: user }] }),
    })
    if (!res.ok) throw new Error(`anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`)
    const data = await res.json()
    text = (data.content || []).map((c) => c.text || '').join('')
    usage = data.usage
  } else {
    const url = prov.name === 'openrouter' ? OPENROUTER : GROQ
    const key = prov.name === 'openrouter' ? process.env.OPENROUTER_API_KEY : process.env.GROQ_API_KEY
    const body = {
      model: prov.model,
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }
    if (json) body.response_format = { type: 'json_object' }
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }
    if (prov.name === 'openrouter') { headers['HTTP-Referer'] = 'https://workflowstacks.com'; headers['X-Title'] = 'WorkflowStacks blog' }
    let res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
    if (!res.ok && prov.name === 'groq' && res.status === 404) {
      // Model slug retired — walk the candidate list once and retry.
      const next = noteGroqModelDead(prov.model)
      if (next) {
        body.model = next
        prov.model = next
        res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
      }
    }
    // OpenRouter key present but unusable (402 no credits, 401/403 bad key):
    // degrade to Groq rather than killing the pipeline. Quality drops a tier;
    // an article still ships, and funding OpenRouter upgrades the next run
    // with zero code change.
    if (!res.ok && prov.name === 'openrouter' && [401, 402, 403].includes(res.status) && process.env.GROQ_API_KEY) {
      openrouterDown = true
      prov.name = 'groq'
      prov.model = GROQ_DEFAULT()
      body.model = prov.model
      const gHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` }
      res = await fetch(GROQ, { method: 'POST', headers: gHeaders, body: JSON.stringify(body) })
      if (!res.ok && res.status === 404) {
        const next = noteGroqModelDead(prov.model)
        if (next) {
          body.model = next
          prov.model = next
          res = await fetch(GROQ, { method: 'POST', headers: gHeaders, body: JSON.stringify(body) })
        }
      }
    }
    if (!res.ok) throw new Error(`${prov.name} ${res.status}: ${(await res.text()).slice(0, 200)}`)
    const data = await res.json()
    text = data.choices?.[0]?.message?.content || ''
    usage = data.usage
  }

  try {
    const db = await getDb()
    await db.collection('audit_logs').insertOne({
      kind: 'blog_llm', tag, provider: prov.name, model: prov.model, tier,
      prompt_tokens: usage?.prompt_tokens ?? usage?.input_tokens ?? null,
      completion_tokens: usage?.completion_tokens ?? usage?.output_tokens ?? null,
      ms: Date.now() - started, at: new Date(),
    })
  } catch (e) { /* logging must never break the pipeline */ }

  return { text, provider: prov.name, model: prov.model, usage }
}

// Pull the first JSON object/array out of an LLM reply (tolerates fences and
// stray prose). Throws if nothing parses — callers decide whether to retry.
export function parseJson(text) {
  if (!text) throw new Error('empty LLM reply')
  const cleaned = text.replace(/```(?:json)?/gi, '').trim()
  try { return JSON.parse(cleaned) } catch {}
  const start = Math.min(...['{', '['].map((c) => cleaned.indexOf(c)).filter((i) => i >= 0))
  const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'))
  if (!Number.isFinite(start) || end <= start) throw new Error('no JSON in LLM reply')
  return JSON.parse(cleaned.slice(start, end + 1))
}

export async function callJson(opts, retries = 1) {
  let lastErr
  for (let i = 0; i <= retries; i++) {
    const r = await callLLM({ ...opts, json: true })
    try { return { data: parseJson(r.text), meta: r } } catch (e) { lastErr = e }
  }
  throw lastErr
}
