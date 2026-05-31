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

// Provider resolution: OpenRouter preferred (one key, many models, free tiers),
// then native Anthropic, else free heuristic.
function resolveProvider() {
  if (process.env.OPENROUTER_API_KEY) {
    return {
      name: 'openrouter',
      model: process.env.REWRITE_MODEL || 'anthropic/claude-3.5-haiku'
    };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      name: 'anthropic',
      model: process.env.REWRITE_MODEL || 'claude-3-5-haiku-latest'
    };
  }
  return { name: 'heuristic', model: null };
}

const PROVIDER = resolveProvider();

// Format star count for honest social proof (no invented numbers)
function formatStars(stars) {
  if (!stars) return '';
  if (stars >= 1000) return `${(stars / 1000).toFixed(stars >= 10000 ? 0 : 1)}k+ GitHub stars`;
  return `${stars} GitHub stars`;
}

// Call the chosen LLM provider with a system + user prompt, return raw text.
// modelOverride lets the compare mode test a specific model via OpenRouter.
async function callLLM(system, user, modelOverride, maxTokens = 300) {
  if (PROVIDER.name === 'openrouter' || (modelOverride && process.env.OPENROUTER_API_KEY)) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'X-Title': 'WorkflowStacks'
      },
      body: JSON.stringify({
        model: modelOverride || PROVIDER.model,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    });
    if (!res.ok) {
      throw new Error(`OpenRouter ${res.status}: ${(await res.text()).substring(0, 200)}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  // Native Anthropic
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: PROVIDER.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }]
    })
  });
  if (!res.ok) {
    throw new Error(`Anthropic ${res.status}: ${(await res.text()).substring(0, 200)}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

// ---- LLM-powered rewrite (OpenRouter or Anthropic) ----------------------
async function rewriteWithLLM(skill, modelOverride) {
  const stars = skill.github_stars || 0;
  const topics = (skill.github_topics || []).join(', ');

  const system =
    'You are a senior marketplace copywriter. You write short, punchy, click-worthy ' +
    'listing copy for a marketplace of free GitHub tools/skills aimed at startup founders ' +
    'across every niche. Be compelling but STRICTLY truthful: never invent statistics, ' +
    'percentages, user counts, or claims not supported by the input. You may use the real ' +
    'GitHub star count provided. Lead with the concrete value/outcome for a founder. ' +
    'Respond with ONLY a JSON object, no prose, no code fences.';

  // README (when a GitHub token is configured) gives far richer context
  const readme = (skill.readme_preview || '').slice(0, 500);
  const user =
    `Rewrite this listing.\n\n` +
    `Name: ${skill.name}\n` +
    `Category: ${skill.category}\n` +
    `Current description: ${skill.description_original || skill.description || 'n/a'}\n` +
    (readme ? `README excerpt: ${readme}\n` : '') +
    `GitHub stars: ${stars}\n` +
    `Language: ${skill.language || 'n/a'}\n` +
    `Topics: ${topics || 'n/a'}\n\n` +
    `Return JSON: {"title": "...", "description": "..."}\n` +
    `Rules:\n` +
    `- title: a benefit-driven headline, max ~65 chars, no clickbait lies. Keep the real tool name in it.\n` +
    `- description: 1-2 sentences, max ~160 chars, say what a founder gets and who it's for.\n` +
    `- Only mention the star count if it is >= 1000, phrased as "${formatStars(stars) || 'N/A'}".\n` +
    `- No emojis. No invented metrics.`;

  const parsed = parseJsonObject(await callLLM(system, user, modelOverride));
  if (!parsed.title || !parsed.description) {
    throw new Error('LLM returned incomplete JSON');
  }
  return { title: parsed.title.trim(), description: parsed.description.trim() };
}

// Tolerant JSON extraction (handles code fences + stray prose from open models)
function parseJsonObject(text) {
  let t = (text || '').replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const m = t.match(/\{[\s\S]*\}/);
  return JSON.parse(m ? m[0] : t);
}

// ---- LLM-as-judge: score a proposed rewrite 1-10 ------------------------
async function judgeCopy(skill, result, judgeModel) {
  const system =
    'You are a strict marketplace copy critic. Score listing copy from 1-10 for how well it ' +
    'drives clicks from startup founders WHILE staying truthful. Penalize: invented stats, ' +
    'clickbait, vagueness, missing the real tool name, or exceeding limits (title ~65 chars, ' +
    'description ~160 chars). Reward: concrete benefit, clear target audience, a specific hook, ' +
    'and honesty. Respond with ONLY JSON.';
  const user =
    `Tool: ${skill.name}\n` +
    `Real description: ${skill.description_original || skill.description || 'n/a'}\n` +
    `GitHub stars: ${skill.github_stars || 0}\n\n` +
    `Proposed title: ${result.title}\n` +
    `Proposed description: ${result.description}\n\n` +
    `Return JSON: {"score": <integer 1-10>, "reason": "<one short sentence>"}`;

  const parsed = parseJsonObject(await callLLM(system, user, judgeModel));
  let score = parseInt(parsed.score, 10);
  if (isNaN(score)) score = 0;
  return { score: Math.max(0, Math.min(10, score)), reason: parsed.reason || '' };
}

// ---- Enrichment: generate the actual on-page deliverable ----------------
// A practical "how to use this" guide so a skill page completes the user's goal.
async function enrichSkillGuide(skill) {
  const system =
    'You write concise, practical "how to use this" guides for AI tools and skills, ' +
    'aimed at non-technical startup founders. Be specific, concrete, and actionable — ' +
    'no fluff, no invented claims. Respond with ONLY a JSON object.';
  const readme = (skill.readme_preview || '').slice(0, 600);
  const user =
    `Tool: ${skill.name}\n` +
    `What it is: ${skill.description_human || skill.description || 'n/a'}\n` +
    `Category: ${skill.category}\nLanguage: ${skill.language || 'n/a'}\n` +
    (readme ? `README: ${readme}\n` : '') +
    `${skill.github_url ? 'GitHub: ' + skill.github_url + '\n' : ''}\n` +
    `Return JSON: {\n` +
    `  "whatItDoes": "one clear sentence a founder understands",\n` +
    `  "whenToUse": ["3 short bullet situations where this is the right tool"],\n` +
    `  "quickStart": ["3-4 concrete steps to get value from it"],\n` +
    `  "examplePrompt": "one ready-to-paste prompt or command showing real usage"\n` +
    `}`;
  const parsed = parseJsonObject(await callLLM(system, user, undefined, 700));
  return {
    whatItDoes: String(parsed.whatItDoes || '').trim(),
    whenToUse: Array.isArray(parsed.whenToUse) ? parsed.whenToUse.slice(0, 4) : [],
    quickStart: Array.isArray(parsed.quickStart) ? parsed.quickStart.slice(0, 5) : [],
    examplePrompt: String(parsed.examplePrompt || '').trim(),
  };
}

// Turn a playbook (goal + skills) into the actual executable, numbered plan.
async function enrichPlaybook(playbook, skills) {
  const skillList = skills.map((s) => s.title_human || s.name).join(', ');
  const system =
    'You turn a founder goal into a concrete, numbered playbook they can execute today. ' +
    'Each step is specific and references which skill/tool to use. No fluff. ONLY JSON.';
  const user =
    `Playbook: ${playbook.title}\n` +
    `Problem it solves: ${playbook.problem || 'n/a'}\n` +
    `Goal: ${playbook.description || 'n/a'}\n` +
    `Available skills: ${skillList || 'general AI tools'}\n\n` +
    `Return JSON: {\n` +
    `  "timeEstimate": "e.g. 48 hours / 1 week",\n` +
    `  "outcome": "one sentence on what the founder will have at the end",\n` +
    `  "steps": [{ "title": "short step title", "detail": "what to do, concretely", "skill": "which skill/tool" }]\n` +
    `}  // 4-7 steps`;
  const parsed = parseJsonObject(await callLLM(system, user, undefined, 1500));
  return {
    timeEstimate: String(parsed.timeEstimate || '').trim(),
    outcome: String(parsed.outcome || '').trim(),
    steps: Array.isArray(parsed.steps) ? parsed.steps.slice(0, 8) : [],
  };
}

// Turn a persona (role + skills) into a real "AI employee" spec.
async function enrichPersona(persona, skills) {
  const skillList = skills.map((s) => s.title_human || s.name).join(', ');
  const system =
    'You define an "AI employee" persona for a founder — what it does, what it handles, ' +
    'and a short operating brief. Concrete and practical. ONLY JSON.';
  const user =
    `Persona: ${persona.name}\n` +
    `Best for: ${persona.audience || 'founders'}\n` +
    `Summary: ${persona.description || 'n/a'}\n` +
    `Skills it has: ${skillList || 'general AI tools'}\n\n` +
    `Return JSON: {\n` +
    `  "whatItDoes": "1-2 sentences: what this AI employee handles for you",\n` +
    `  "handles": ["4-6 concrete tasks/responsibilities it takes off your plate"],\n` +
    `  "brief": "a 2-3 sentence operating brief written as the agent's role/personality"\n` +
    `}`;
  const parsed = parseJsonObject(await callLLM(system, user, undefined, 900));
  return {
    whatItDoes: String(parsed.whatItDoes || '').trim(),
    handles: Array.isArray(parsed.handles) ? parsed.handles.slice(0, 6) : [],
    brief: String(parsed.brief || '').trim(),
  };
}

// ---- Free heuristic fallback (no API key needed) ------------------------
function rewriteHeuristic(skill) {
  const name = skill.name
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  const desc = skill.description_original || skill.description || '';
  const stars = formatStars(skill.github_stars || 0);

  const hooks = {
    'mcp-server': 'Connect your AI to real tools',
    'claude-skill': 'Supercharge Claude',
    'ai-agent': 'Build agents that do the work',
    marketing: 'Grow without a marketing team',
    sales: 'Book more meetings on autopilot',
    'saas-starter': 'Ship your SaaS in days, not months',
    automation: 'Automate the busywork',
    analytics: 'Turn data into decisions',
    support: 'Cut support tickets with AI',
    design: 'Design faster, no designer needed',
    prompt: 'Get better AI results instantly',
    'founder-resource': 'A founder shortcut worth bookmarking'
  };
  const hook = hooks[skill.category] || 'A free tool worth your time';
  const cleanDesc = desc.split('.')[0].substring(0, 120);

  return {
    title: `${name} — ${hook}`,
    description: `${cleanDesc}${cleanDesc ? '. ' : ''}${stars ? stars + '.' : ''}`.trim()
  };
}

// Simple concurrency pool
async function pool(items, size, worker) {
  const results = [];
  let i = 0;
  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
  return results;
}

// Admin guard — this endpoint spends real money (LLM calls), so it must be locked.
function requireAdmin(request) {
  const secret = process.env.ADMIN_SECRET;
  const provided =
    request.headers.get('x-admin-secret') ||
    new URL(request.url).searchParams.get('secret');
  // Fail CLOSED: LLM-spend endpoints must never be public, even if the env is missing.
  if (!secret || provided !== secret) {
    return Response.json({ error: 'Unauthorized — admin secret required' }, { status: 401 });
  }
  return null;
}

async function handle(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const onlyNew = searchParams.get('onlyNew') === 'true';
  const limit = parseInt(searchParams.get('limit') || '0', 10);

  const database = await connectDB();

  // Enrichment: generate the actual deliverable content for pages.
  // ?mode=enrich-skills (batched via skip/limit) | ?mode=enrich-playbooks
  const mode = searchParams.get('mode');
  if (mode === 'enrich-skills') {
    if (PROVIDER.name === 'heuristic') {
      return Response.json({ error: 'Enrichment needs an LLM key (OpenRouter/Anthropic)' }, { status: 400 });
    }
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const onlyMissing = searchParams.get('pending') === 'true';
    const q = onlyMissing ? { use_guide: { $exists: false } } : {};
    let cur = database.collection('skills').find(q).sort({ _id: 1 });
    if (skip > 0) cur = cur.skip(skip);
    if (limit > 0) cur = cur.limit(limit);
    const skills = await cur.toArray();
    let done = 0;
    const errs = [];
    await pool(skills, 4, async (skill) => {
      try {
        const guide = await enrichSkillGuide(skill);
        await database.collection('skills').updateOne({ id: skill.id }, { $set: { use_guide: guide } });
        done++;
      } catch (e) {
        if (errs.length < 5) errs.push(`${skill.name}: ${e.message}`);
      }
    });
    return Response.json({ mode, processed: skills.length, enriched: done, sampleErrors: errs });
  }

  if (mode === 'enrich-playbooks') {
    if (PROVIDER.name === 'heuristic') {
      return Response.json({ error: 'Enrichment needs an LLM key' }, { status: 400 });
    }
    const playbooks = await database.collection('playbooks').find({}).toArray();
    let done = 0;
    const errs = [];
    for (const pb of playbooks) {
      try {
        const skills = await database.collection('skills').find({ id: { $in: pb.skillIds || [] } }).toArray();
        const enriched = await enrichPlaybook(pb, skills);
        await database.collection('playbooks').updateOne({ id: pb.id }, { $set: enriched });
        done++;
      } catch (e) {
        if (errs.length < 5) errs.push(`${pb.title}: ${e.message}`);
      }
    }
    return Response.json({ mode, processed: playbooks.length, enriched: done, sampleErrors: errs });
  }

  if (mode === 'enrich-personas') {
    if (PROVIDER.name === 'heuristic') {
      return Response.json({ error: 'Enrichment needs an LLM key' }, { status: 400 });
    }
    const personas = await database.collection('personas').find({}).toArray();
    let done = 0;
    const errs = [];
    for (const pa of personas) {
      try {
        const skills = await database.collection('skills').find({ id: { $in: pa.skillIds || [] } }).toArray();
        const enriched = await enrichPersona(pa, skills);
        await database.collection('personas').updateOne({ id: pa.id }, { $set: enriched });
        done++;
      } catch (e) {
        if (errs.length < 5) errs.push(`${pa.name}: ${e.message}`);
      }
    }
    return Response.json({ mode, processed: personas.length, enriched: done, sampleErrors: errs });
  }

  // Compare mode: run the same skills through 2+ models, return both, write nothing.
  // e.g. /api/agent-rewrite?compare=anthropic/claude-3.5-haiku,google/gemini-2.0-flash-exp:free&limit=3
  const compare = searchParams.get('compare');
  if (compare) {
    if (!process.env.OPENROUTER_API_KEY) {
      return Response.json(
        { error: 'Compare mode needs OPENROUTER_API_KEY set in .env.local' },
        { status: 400 }
      );
    }
    const models = compare.split(',').map((m) => m.trim()).filter(Boolean);
    const n = limit > 0 ? limit : 3;
    const sample = await database.collection('skills').find({}).limit(n).toArray();

    const comparison = [];
    for (const skill of sample) {
      const row = { original: skill.name_original || skill.name, models: {} };
      for (const model of models) {
        try {
          const r = await rewriteWithLLM(skill, model);
          row.models[model] = r;
        } catch (e) {
          row.models[model] = { error: e.message };
        }
      }
      comparison.push(row);
    }
    return Response.json({ mode: 'compare', models, count: sample.length, comparison });
  }

  // Best mode: escalate up a model ladder, judge each output, keep the best,
  // stop when score >= target. e.g. /api/agent-rewrite?best=true&target=9&limit=5
  if (searchParams.get('best') === 'true') {
    if (!process.env.OPENROUTER_API_KEY && !process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        { error: 'Best mode needs OPENROUTER_API_KEY (or ANTHROPIC_API_KEY) in .env.local' },
        { status: 400 }
      );
    }
    const ladder = (
      searchParams.get('ladder') ||
      'google/gemma-4-31b-it:free,google/gemini-2.0-flash-exp:free,anthropic/claude-3.5-haiku,anthropic/claude-sonnet-4'
    )
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
    const judgeModel = searchParams.get('judge') || 'anthropic/claude-3.5-haiku';
    const target = Math.min(10, parseInt(searchParams.get('target') || '9', 10));

    const q = onlyNew ? { title_human: { $exists: false } } : {};
    let cur = database.collection('skills').find(q);
    if (limit > 0) cur = cur.limit(limit);
    const skills = await cur.toArray();

    let updated = 0;
    const scoreboard = [];
    // Small pool — free models are rate-limited
    await pool(skills, 2, async (skill) => {
      let chosen = null;
      const trail = [];
      for (const model of ladder) {
        let result;
        try {
          result = await rewriteWithLLM(skill, model);
        } catch (e) {
          trail.push({ model, error: e.message.substring(0, 80) });
          continue;
        }
        let judged;
        try {
          judged = await judgeCopy(skill, result, judgeModel);
        } catch (e) {
          judged = { score: 0, reason: 'judge failed' };
        }
        trail.push({ model, score: judged.score });
        if (!chosen || judged.score > chosen.score) {
          chosen = { result, score: judged.score, model, reason: judged.reason };
        }
        if (judged.score >= target) break;
      }
      if (!chosen) chosen = { result: rewriteHeuristic(skill), score: 0, model: 'heuristic', reason: 'all models failed' };

      await database.collection('skills').updateOne(
        { id: skill.id },
        {
          $set: {
            title_human: chosen.result.title,
            description_human: chosen.result.description,
            name_original: skill.name_original || skill.name,
            description_original: skill.description_original || skill.description,
            rewritten_by: chosen.model,
            rewrite_score: chosen.score,
            rewrite_trail: trail,
            rewritten_at: new Date()
          }
        }
      );
      updated++;
      scoreboard.push({
        skill: skill.name_original || skill.name,
        winner: chosen.model,
        score: chosen.score,
        title: chosen.result.title
      });
    });

    const avg = scoreboard.length
      ? (scoreboard.reduce((s, r) => s + r.score, 0) / scoreboard.length).toFixed(1)
      : 0;
    return Response.json({
      mode: 'best',
      ladder,
      judge: judgeModel,
      target,
      updated,
      averageScore: Number(avg),
      scoreboard: scoreboard.sort((a, b) => b.score - a.score)
    });
  }

  // pending=true selects only skills not yet rewritten by the current LLM provider,
  // so production runs can batch through all rows within the 60s function limit.
  let query;
  if (searchParams.get('pending') === 'true') {
    query = { rewritten_by: { $ne: PROVIDER.name } };
  } else {
    query = onlyNew ? { title_human: { $exists: false } } : {};
  }
  // Stable order so skip/limit pagination is consistent across force re-runs
  let cursor = database.collection('skills').find(query).sort({ _id: 1 });
  const skip = parseInt(searchParams.get('skip') || '0', 10);
  if (skip > 0) cursor = cursor.skip(skip);
  if (limit > 0) cursor = cursor.limit(limit);
  const skills = await cursor.toArray();

  const useLLM = PROVIDER.name !== 'heuristic';
  // Quality gate: judge each rewrite and only publish if it scores >= gateMin.
  const gate = searchParams.get('gate') !== 'false' && useLLM;
  const gateMin = Math.min(10, parseInt(searchParams.get('gateMin') || '8', 10));
  const judgeModel = searchParams.get('judge') || PROVIDER.model;
  let updated = 0;
  let llmOk = 0;
  let fellBack = 0;
  let publishedCount = 0;
  const errors = [];

  await pool(skills, useLLM ? 4 : 20, async (skill) => {
    let result;
    let by = 'heuristic';
    if (useLLM) {
      try {
        result = await rewriteWithLLM(skill);
        by = PROVIDER.name;
        llmOk++;
      } catch (e) {
        result = rewriteHeuristic(skill);
        fellBack++;
        if (errors.length < 5) errors.push(`${skill.name}: ${e.message}`);
      }
    } else {
      result = rewriteHeuristic(skill);
    }

    // Quality gate — judge the rewrite; publish only if it clears the bar.
    let score = null;
    let published = true; // default-publish when gate is off
    if (gate && by !== 'heuristic') {
      try {
        const verdict = await judgeCopy(skill, result, judgeModel);
        score = verdict.score;
        published = score >= gateMin;
      } catch (e) {
        published = true; // don't hide good work if the judge errors
      }
    } else if (by === 'heuristic') {
      published = false; // weak fallback copy stays hidden for retry
    }
    if (published) publishedCount++;

    await database.collection('skills').updateOne(
      { id: skill.id },
      {
        $set: {
          title_human: result.title,
          description_human: result.description,
          name_original: skill.name_original || skill.name,
          description_original: skill.description_original || skill.description,
          rewritten_by: by,
          rewritten_at: new Date(),
          rewrite_score: score,
          rewrite_status: published ? 'done' : 'pending',
          published
        }
      }
    );
    updated++;
  });

  return Response.json({
    success: true,
    engine: useLLM ? `${PROVIDER.name} (${PROVIDER.model})` : 'heuristic (no LLM key set)',
    total: skills.length,
    updated,
    published: publishedCount,
    gate: gate ? `on (>= ${gateMin})` : 'off',
    llmRewrites: llmOk,
    heuristicFallbacks: useLLM ? fellBack : updated,
    sampleErrors: errors,
    tip: useLLM
      ? undefined
      : 'Add OPENROUTER_API_KEY (or ANTHROPIC_API_KEY) to .env.local for AI-quality, unique copy.'
  });
}

export async function GET(request) {
  try {
    return await handle(request);
  } catch (error) {
    console.error('agent-rewrite error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export const POST = GET;
export const maxDuration = 300;
