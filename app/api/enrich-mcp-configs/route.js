import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGO_URL)
let db
async function connectDB() {
  if (!db) {
    await client.connect()
    db = client.db(process.env.DB_NAME || 'workflowstacks')
  }
  return db
}

function requireAdmin(request) {
  const secret = process.env.ADMIN_SECRET
  const provided = request.headers.get('x-admin-secret')
  if (!secret || provided !== secret) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return null
}

function ghHeaders() {
  const h = { Accept: 'application/vnd.github.raw+json', 'User-Agent': 'WorkflowStacks' }
  if (process.env.GITHUB_TOKEN) h.Authorization = `token ${process.env.GITHUB_TOKEN}`
  return h
}

async function fetchReadme(githubUrl) {
  const m = String(githubUrl || '').match(/github\.com\/([^/]+)\/([^/#?]+)/i)
  if (!m) return null
  const owner = m[1]
  const repo = m[2].replace(/\.git$/, '')
  try {
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers: ghHeaders() })
    if (!r.ok) return null
    const text = await r.text()
    return text.slice(0, 6000)
  } catch { return null }
}

// Ask the LLM to extract a REAL Claude Desktop config from the README, or null.
// The prompt is strict: no invention. We then validate the shape and command.
async function extractConfig(name, readme) {
  const key = process.env.GROQ_API_KEY
  const orKey = process.env.OPENROUTER_API_KEY
  const system = `You extract the Claude Desktop MCP config for a server from its README. Output STRICT JSON only.
Return: {"command": string, "args": string[], "env": object|null, "confident": boolean}
Rules:
- command must be the actual runner literally shown in the README: one of "npx","uvx","node","python","python3","docker","bunx". If the README does not clearly show an MCP stdio run command, set "confident": false.
- args: the exact arguments (e.g. ["-y","@scope/package"]). Never invent a package name — copy it from the README.
- env: an object of REQUIRED env var names mapped to placeholder strings, or null if none.
- confident: true ONLY if you found an explicit run command with a real package/module name in the README. If unsure, false.
Output ONLY the JSON object.`
  const user = `Server name: ${name}\n\nREADME (truncated):\n${readme}`
  async function call(url, model, auth) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth}` },
      body: JSON.stringify({ model, max_tokens: 500, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
    })
    if (!r.ok) throw new Error(`${r.status}`)
    const d = await r.json()
    return d.choices?.[0]?.message?.content || ''
  }
  let raw = ''
  try {
    if (key) raw = await call('https://api.groq.com/openai/v1/chat/completions', process.env.GROQ_REC_MODEL || 'llama-3.3-70b-versatile', key)
    else if (orKey) raw = await call('https://openrouter.ai/api/v1/chat/completions', 'anthropic/claude-haiku-4.5', orKey)
    else return null
  } catch (e) {
    if (orKey && key) { try { raw = await call('https://openrouter.ai/api/v1/chat/completions', 'anthropic/claude-haiku-4.5', orKey) } catch { return null } }
    else return null
  }
  let obj
  try { obj = JSON.parse(raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()) } catch { return null }
  // Validation — never store a config we can't trust
  const RUNNERS = ['npx', 'uvx', 'node', 'python', 'python3', 'docker', 'bunx']
  if (!obj || obj.confident !== true) return null
  if (!RUNNERS.includes(obj.command)) return null
  if (!Array.isArray(obj.args) || obj.args.length === 0) return null
  if (!obj.args.every((a) => typeof a === 'string')) return null
  const env = obj.env && typeof obj.env === 'object' && !Array.isArray(obj.env) ? obj.env : null
  return { command: obj.command, args: obj.args, env, needs_key: !!(env && Object.keys(env).length) }
}

// Admin: extract real Claude Desktop configs for catalog MCP servers.
// Only stores a config it can validate; marks others checked so we don't retry
// endlessly. Populates `mcp_config` on the skill doc. Grows the /mcp section.
export async function GET(request) {
  const denied = requireAdmin(request)
  if (denied) return denied
  const { searchParams } = new URL(request.url)
  const limit = Math.min(20, parseInt(searchParams.get('limit') || '8', 10))

  const database = await connectDB()
  const targets = await database.collection('skills')
    .find({ category: 'mcp-server', published: { $ne: false }, mcp_config_checked: { $ne: true } })
    .sort({ github_stars: -1 })
    .limit(limit)
    .toArray()

  let extracted = 0, skipped = 0
  for (const s of targets) {
    const readme = await fetchReadme(s.github_url)
    let cfg = null
    if (readme) cfg = await extractConfig(s.name, readme)
    await database.collection('skills').updateOne(
      { _id: s._id },
      { $set: { mcp_config: cfg, mcp_config_checked: true, mcp_config_at: new Date() } }
    )
    if (cfg) extracted++; else skipped++
    await new Promise((r) => setTimeout(r, 400))
  }
  const totalWithConfig = await database.collection('skills').countDocuments({ mcp_config: { $ne: null, $exists: true } })
  return Response.json({ ok: true, processed: targets.length, extracted, skipped, totalWithConfig })
}
