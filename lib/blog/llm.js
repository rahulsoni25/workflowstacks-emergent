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

export function providersAvailable() {
  return {
    openrouter: !!process.env.OPENROUTER_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
  }
}

function pick(tier, override) {
  const p = providersAvailable()
  if (override && override.includes('/') && p.openrouter) return { name: 'openrouter', model: override }
  if (tier === 'strong') {
    if (p.openrouter) return { name: 'openrouter', model: process.env.BLOG_WRITER_MODEL || 'anthropic/claude-sonnet-4' }
    if (p.anthropic) return { name: 'anthropic', model: process.env.BLOG_WRITER_MODEL || 'claude-sonnet-4-20250514' }
    if (p.groq) return { name: 'groq', model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile' }
  }
  if (tier === 'judge') {
    if (p.openrouter) return { name: 'openrouter', model: process.env.BLOG_JUDGE_MODEL || 'openai/gpt-4.1-mini' }
    if (p.groq) return { name: 'groq', model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile' }
    if (p.anthropic) return { name: 'anthropic', model: 'claude-sonnet-4-20250514' }
  }
  // cheap
  if (p.groq) return { name: 'groq', model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile' }
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
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
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
