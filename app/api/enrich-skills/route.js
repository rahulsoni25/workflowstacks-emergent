// LLM-driven skill explainer enrichment.
// For each skill: generate plain-English content that explains what it is,
// what you can build with it, who it's for, a real use case, difficulty,
// cost, and companion skills. Stored as skill.explainer.

import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGO_URL);
let db;

async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db(process.env.DB_NAME || 'workflowstacks');
  }
  return db;
}

function requireAdmin(request) {
  const secret = process.env.ADMIN_SECRET;
  const provided = request.headers.get('x-admin-secret');
  if (!secret || provided !== secret) {
    return Response.json({ error: 'Unauthorized — admin secret required' }, { status: 401 });
  }
  return null;
}

// Pick the LLM provider. Defaults: Groq for low cost. Caller can override per-request
// via { provider: 'openrouter'|'anthropic'|'groq', model: '...' } to escape rate limits.
function defaultProvider() {
  if (process.env.GROQ_API_KEY) {
    return { name: 'groq', model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant' };
  }
  if (process.env.OPENROUTER_API_KEY) {
    return { name: 'openrouter', model: process.env.REWRITE_MODEL || 'anthropic/claude-3.5-haiku' };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return { name: 'anthropic', model: process.env.REWRITE_MODEL || 'claude-3-5-haiku-latest' };
  }
  return { name: 'none', model: null };
}

function resolveProvider(override) {
  if (override?.provider === 'openrouter' && process.env.OPENROUTER_API_KEY) {
    return { name: 'openrouter', model: override.model || 'anthropic/claude-3.5-haiku' };
  }
  if (override?.provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
    return { name: 'anthropic', model: override.model || 'claude-3-5-haiku-latest' };
  }
  if (override?.provider === 'groq' && process.env.GROQ_API_KEY) {
    return { name: 'groq', model: override.model || 'llama-3.1-8b-instant' };
  }
  return defaultProvider();
}

// JSON-mode chat completion against the given provider.
async function callLLMJson(provider, system, user, maxTokens = 900) {
  if (provider.name === 'groq') {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: provider.model, max_tokens: maxTokens,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      }),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).substring(0, 200)}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }
  if (provider.name === 'openrouter') {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'X-Title': 'WorkflowStacks' },
      body: JSON.stringify({
        model: provider.model, max_tokens: maxTokens,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      }),
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).substring(0, 200)}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }
  if (provider.name === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: provider.model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).substring(0, 200)}`);
    const data = await res.json();
    return data.content?.[0]?.text || '';
  }
  throw new Error('No LLM provider configured. Set GROQ_API_KEY, OPENROUTER_API_KEY, or ANTHROPIC_API_KEY.');
}

const SYSTEM_PROMPT = `You are a senior product educator writing a one-screen explainer for a marketplace of AI tools.

Your audience is mixed — half are novices seeing AI tools for the first time, half are senior engineers/founders evaluating options. Every line you write must work for BOTH.

Hard rules:
- Plain English. No jargon unless followed by a 4-word explanation in parens.
- NEVER invent features, statistics, user counts, or claims. Only use what's in the input.
- If the input is thin, prefer "what the category typically does" over making things up.
- No marketing fluff. No words like "revolutionary", "game-changing", "powerful", "seamless", "cutting-edge".
- Concrete > abstract. "Lets you pull product data from Amazon" beats "data extraction capabilities".
- Use case examples must be a story a real person could do this week. Include the steps.
- All output is JSON only. No markdown fences, no commentary.`;

function buildUserPrompt(skill) {
  const name = skill.title_human || skill.name || 'Unnamed';
  const desc = (skill.description_human || skill.description || '').slice(0, 700);
  const category = skill.category || 'unknown';
  const creator = skill.creator || skill.owner || '';
  const topics = (skill.github_topics || []).slice(0, 8).join(', ');
  const language = skill.language || '';
  const stars = skill.github_stars || 0;
  const readme = (skill.readme_preview || '').slice(0, 1200);

  return `Explain this skill so anyone can understand it.

NAME: ${name}
CATEGORY: ${category}
CREATOR: ${creator}
LANGUAGE: ${language}
GITHUB_STARS: ${stars}
TOPICS: ${topics}
DESCRIPTION: ${desc}
README_PREVIEW: ${readme}

Return ONLY this JSON shape:
{
  "what_it_is": "1 sentence. Plain English. What a smart 14-year-old would understand. Lead with the verb the user would do.",
  "what_you_can_make": "1 sentence with a CONCRETE example of what someone builds/produces with it. e.g., 'Automations like: when a new Stripe customer signs up, add them to Notion and send a welcome email via Resend.'",
  "how_it_helps": "1-2 sentences addressing the silent question 'why would I use this vs not using it?' Specific to this skill.",
  "why_its_here": "1 sentence — why a marketplace of AI tools would include this. (Free + open-source? Saves cost vs paid alt? Best-in-class for X?)",
  "use_case_example": "2-3 sentences telling a SPECIFIC story. Start with a persona ('A founder…' / 'A marketer…' / 'A solo developer…'). Walk through 2-3 concrete steps. End with the outcome.",
  "for_novice": "1 sentence — when a beginner should pick this up.",
  "for_pro": "1 sentence — when a senior engineer/professional would reach for this.",
  "difficulty": "beginner | intermediate | advanced",
  "time_to_setup": "Realistic estimate. Choose one: '5 minutes' | '30 minutes' | '1-2 hours' | 'Half a day' | '1-2 days'",
  "cost_to_run": "Choose one of these patterns: 'Free' | 'Free (self-hosted)' | 'Free + LLM API costs' | 'Free tier + paid plans' | 'Paid (~$X/mo)' | 'Pay per use'",
  "works_well_with": ["2-4 short companion suggestions", "e.g., 'Claude API'", "'Stripe webhook'", "'Notion database'"],
  "best_with_tools": ["1-4 specific AI tools/IDEs this skill is designed for or works best inside. Choose ONLY from this list: 'Claude Desktop', 'Claude Code', 'Claude API', 'Cursor', 'Codex CLI', 'GPT (ChatGPT)', 'Gemini', 'Gemini Code Assist', 'Antigravity', 'GitHub Copilot', 'Continue', 'Aider', 'Windsurf', 'Self-hosted', 'Any AI Client'. Pick what the skill is genuinely designed for — e.g., a claude-skill should usually list 'Claude Desktop' or 'Claude Code'; an MCP server usually works in 'Claude Desktop', 'Cursor', 'Codex CLI', 'Continue'; an n8n-style automation usually lists 'Self-hosted', 'Any AI Client'; a prompt template usually lists 'GPT (ChatGPT)', 'Claude Desktop', 'Gemini'. If genuinely tool-agnostic, use 'Any AI Client'."],
  "common_confusions": "1 sentence clearing up the most common confusion a first-time reader has about this skill."
}`;
}

function parseExplainer(raw, skillName) {
  if (!raw) throw new Error('empty LLM response');
  // Strip code fences if any
  const trimmed = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const obj = JSON.parse(trimmed);
  // Required fields
  const required = ['what_it_is', 'what_you_can_make', 'how_it_helps', 'use_case_example'];
  for (const f of required) {
    if (!obj[f] || typeof obj[f] !== 'string' || obj[f].length < 10) {
      throw new Error(`bad field "${f}" for ${skillName}`);
    }
  }
  // Optional fields with safe defaults
  obj.why_its_here = obj.why_its_here || '';
  obj.for_novice = obj.for_novice || '';
  obj.for_pro = obj.for_pro || '';
  obj.difficulty = ['beginner', 'intermediate', 'advanced'].includes(obj.difficulty) ? obj.difficulty : 'intermediate';
  obj.time_to_setup = obj.time_to_setup || 'Varies';
  obj.cost_to_run = obj.cost_to_run || 'Varies';
  obj.works_well_with = Array.isArray(obj.works_well_with) ? obj.works_well_with.slice(0, 4) : [];
  // Filter to known tool labels to keep the surface predictable in UI
  const ALLOWED_TOOLS = new Set([
    'Claude Desktop', 'Claude Code', 'Claude API', 'Cursor', 'Codex CLI',
    'GPT (ChatGPT)', 'Gemini', 'Gemini Code Assist', 'Antigravity',
    'GitHub Copilot', 'Continue', 'Aider', 'Windsurf', 'Self-hosted', 'Any AI Client'
  ])
  obj.best_with_tools = Array.isArray(obj.best_with_tools)
    ? obj.best_with_tools.filter(t => ALLOWED_TOOLS.has(t)).slice(0, 4)
    : []
  obj.common_confusions = obj.common_confusions || '';
  return obj;
}

export async function POST(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  let body = {};
  try { body = await request.json(); } catch {}
  const limit = Math.min(Math.max(parseInt(body.limit || 20, 10), 1), 100);
  const force = !!body.force;
  const dryRun = !!body.dryRun;
  const idsFilter = Array.isArray(body.ids) && body.ids.length > 0 ? body.ids : null;
  // Per-request provider override — lets the caller route around Groq TPM caps
  // by sending { provider: "openrouter", model: "anthropic/claude-3.5-haiku" }
  const provider = resolveProvider({ provider: body.provider, model: body.model });

  if (provider.name === 'none') {
    return Response.json({ error: 'No LLM provider configured (set GROQ_API_KEY, OPENROUTER_API_KEY, or ANTHROPIC_API_KEY)' }, { status: 500 });
  }

  const database = await connectDB();
  const skills = database.collection('skills');

  // Find skills to enrich: by id list, or all without explainer (unless force).
  // Special selector: needsBestWithTools=true picks already-enriched skills that
  // lack the best_with_tools field (added later) so the second-pass re-runs them.
  let query
  if (idsFilter) {
    query = { $or: [{ id: { $in: idsFilter } }, { slug: { $in: idsFilter } }] }
  } else if (body.needsBestWithTools) {
    query = {
      explainer: { $exists: true, $ne: null },
      $or: [
        { 'explainer.best_with_tools': { $exists: false } },
        { 'explainer.best_with_tools': { $size: 0 } },
      ],
    }
  } else if (force) {
    query = {}
  } else {
    query = { $or: [{ explainer: { $exists: false } }, { explainer: null }] }
  }
  const candidates = await skills.find(query).limit(limit).toArray();

  const out = { provider: provider.name, model: provider.model, attempted: candidates.length, enriched: 0, errors: [], samples: [] };

  for (let i = 0; i < candidates.length; i++) {
    const skill = candidates[i];
    try {
      const userPrompt = buildUserPrompt(skill);
      const raw = await callLLMJson(provider, SYSTEM_PROMPT, userPrompt, 700);
      const explainer = parseExplainer(raw, skill.name);
      explainer.generated_at = new Date();
      explainer.model = provider.model;

      if (dryRun) {
        out.samples.push({ id: skill.id, name: skill.title_human || skill.name, explainer });
      } else {
        await skills.updateOne({ id: skill.id }, { $set: { explainer } });
        if (out.samples.length < 3) out.samples.push({ id: skill.id, name: skill.title_human || skill.name, explainer });
      }
      out.enriched++;
    } catch (e) {
      out.errors.push({ id: skill.id, name: skill.name, message: e.message });
    }
  }

  return Response.json(out);
}

// GET — read-only summary of enrichment coverage (admin).
export async function GET(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const database = await connectDB();
  const skills = database.collection('skills');
  const [total, enriched, withBestTools] = await Promise.all([
    skills.countDocuments(),
    skills.countDocuments({ explainer: { $exists: true, $ne: null } }),
    skills.countDocuments({ 'explainer.best_with_tools.0': { $exists: true } }),
  ]);
  const provider = defaultProvider();
  return Response.json({
    total, enriched, pending: total - enriched,
    withBestTools, needsBestTools: enriched - withBestTools,
    defaultProvider: provider.name, defaultModel: provider.model,
  });
}
