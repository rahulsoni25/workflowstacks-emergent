import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

const client = new MongoClient(process.env.MONGO_URL);
let db;

async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db(process.env.DB_NAME || 'workflowstacks');
    // Enforce uniqueness at the DB level so duplicate repos are impossible
    try {
      await db.collection('skills').createIndex(
        { github_url: 1 },
        { unique: true, sparse: true }
      );
    } catch (e) {
      console.log('Index note:', e.message);
    }
  }
  return db;
}

// Admin guard for mutating/expensive endpoints. Accepts the secret via the
// x-admin-secret header or ?secret=. Fail-open only if ADMIN_SECRET is unset.
function requireAdmin(request) {
  const secret = process.env.ADMIN_SECRET;
  // Header-only — query params leak into access logs / browser history / Referer.
  const provided = request.headers.get('x-admin-secret');
  // Fail CLOSED: if the secret isn't configured, deny (don't expose expensive ops).
  if (!secret || provided !== secret) {
    return Response.json({ error: 'Unauthorized — admin secret required' }, { status: 401 });
  }
  return null;
}

const ADMIN_PATHS = ['/ingest', '/reclassify', '/dedupe', '/seed-packs', '/cleanup', '/seed-deals', '/seed-affiliate-deals', '/approve-deals', '/refresh-stars', '/creator-applications', '/creator-applications/approve', '/newsletter/send', '/find-creators', '/creator-leads', '/publish-category', '/add-skill', '/audit-log', '/admin-overview', '/skill-update', '/subscribers', '/newsletter/preview', '/newsletter/sends', '/creator-outreach/send', '/creator-leads/update', '/search-trends', '/auto-discover-from-searches', '/backfill-slugs', '/dfy-requests', '/dfy-request/update', '/dfy-stats', '/deals/all', '/deal-update', '/security/dns-check', '/security/audit-summary', '/security/run-now'];

// Audit log — capture every admin action for security visibility.
// Append-only collection: audit_logs { id, path, method, ip, ua, at }
async function logAdmin(request, db, action) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const ua = (request.headers.get('user-agent') || '').slice(0, 200)
    await db.collection('audit_logs').insertOne({
      id: uuidv4(),
      action,
      ip: ip.split(',')[0].trim(),
      ua,
      at: new Date(),
    })
  } catch {} // never throw — logging is best-effort
}

// Simple in-memory rate limiter per IP. Resets per cold start, which on
// Vercel serverless is frequent — that's fine for abuse smoothing, not for
// strict quota. 10 req / 60s window per IP.
const _rl = new Map()
function rateLimit(request, limit = 10, windowMs = 60_000) {
  const ip = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim()
  const now = Date.now()
  const key = ip
  const slot = _rl.get(key) || { count: 0, reset: now + windowMs }
  if (now > slot.reset) { slot.count = 0; slot.reset = now + windowMs }
  slot.count++
  _rl.set(key, slot)
  if (slot.count > limit) return Response.json({ error: 'Too many requests' }, { status: 429 })
  return null
}

// ─────────────────────────────────────────────────────────────────
// Security monitoring layer — DNS drift + admin auth anomaly
// ─────────────────────────────────────────────────────────────────

// Frozen baseline of what the email/domain DNS SHOULD look like.
// Drift from this set is treated as a security signal (DNS hijack, accidental
// deletion, attacker tampering). Update intentionally when records change.
const DNS_BASELINE = {
  domain: 'workflowstacks.com',
  mx: [
    { priority: 10, value: 'mx1.improvmx.com' },
    { priority: 20, value: 'mx2.improvmx.com' },
  ],
  spfMustInclude: ['spf.improvmx.com', '_spf.resend.com'],
  dmarcMustStartWith: 'v=DMARC1',
  alias: 'cname.vercel-dns-017.com',
}

// DNS-over-HTTPS lookup (Vercel functions can't shell out to nslookup).
async function dohResolve(name, type) {
  const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`, {
    headers: { Accept: 'application/dns-json' },
    next: { revalidate: 0 },
  })
  if (!r.ok) throw new Error(`DoH ${type} ${name} → ${r.status}`)
  const j = await r.json()
  return Array.isArray(j.Answer) ? j.Answer.map((a) => a.data) : []
}

// Returns { ok, drift: [...] } — drift items describe what changed vs baseline.
async function checkDnsBaseline() {
  const drift = []
  const d = DNS_BASELINE.domain
  try {
    // MX
    const mxRaw = await dohResolve(d, 'MX')
    const liveMx = mxRaw.map((s) => {
      const m = s.match(/^(\d+)\s+(.+?)\.?$/)
      return m ? { priority: parseInt(m[1], 10), value: m[2].toLowerCase() } : null
    }).filter(Boolean).sort((a, b) => a.priority - b.priority)
    const want = DNS_BASELINE.mx.slice().sort((a, b) => a.priority - b.priority)
    if (liveMx.length !== want.length) drift.push({ type: 'MX', issue: 'count_mismatch', expected: want.length, actual: liveMx.length, live: liveMx })
    else for (let i = 0; i < want.length; i++) {
      if (liveMx[i].priority !== want[i].priority || liveMx[i].value !== want[i].value) {
        drift.push({ type: 'MX', issue: 'record_mismatch', expected: want[i], actual: liveMx[i] })
      }
    }

    // SPF (TXT @ — quoted strings from DoH)
    const txtRoot = (await dohResolve(d, 'TXT')).map((s) => s.replace(/^"|"$/g, ''))
    const spf = txtRoot.find((t) => t.startsWith('v=spf1'))
    if (!spf) drift.push({ type: 'SPF', issue: 'missing', expected: DNS_BASELINE.spfMustInclude })
    else for (const must of DNS_BASELINE.spfMustInclude) {
      if (!spf.includes(must)) drift.push({ type: 'SPF', issue: 'missing_include', expected: must, actual: spf })
    }

    // DMARC (TXT _dmarc)
    const dmarcTxt = (await dohResolve(`_dmarc.${d}`, 'TXT')).map((s) => s.replace(/^"|"$/g, ''))
    const dmarc = dmarcTxt.find((t) => t.startsWith(DNS_BASELINE.dmarcMustStartWith))
    if (!dmarc) drift.push({ type: 'DMARC', issue: 'missing', expected: DNS_BASELINE.dmarcMustStartWith })

    return { ok: drift.length === 0, drift, checkedAt: new Date().toISOString(), live: { mx: liveMx, spf, dmarc: dmarc || null } }
  } catch (e) {
    return { ok: false, drift: [{ type: 'LOOKUP', issue: 'doh_failed', message: e.message }], checkedAt: new Date().toISOString() }
  }
}

// Aggregate audit_logs for anomaly signals.
async function auditAnomalyCheck(db) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const logs = await db.collection('audit_logs').find({ at: { $gte: since } }).toArray()
  const totalEvents = logs.length
  const uniqueIps = new Set(logs.map((l) => l.ip || 'unknown')).size
  const denied = logs.filter((l) => l.action && l.action.startsWith('DENIED')).length
  const byIp = {}
  for (const l of logs) byIp[l.ip] = (byIp[l.ip] || 0) + 1
  const topIp = Object.entries(byIp).sort((a, b) => b[1] - a[1])[0] || ['none', 0]

  // Anomaly thresholds — tune as we learn normal patterns.
  const flags = []
  if (denied >= 5) flags.push({ severity: 'high', signal: 'auth_brute_force', detail: `${denied} denied admin attempts in 24h` })
  if (topIp[1] >= 200) flags.push({ severity: 'medium', signal: 'ip_volume_spike', detail: `${topIp[0]} made ${topIp[1]} admin requests in 24h` })
  if (uniqueIps >= 10) flags.push({ severity: 'low', signal: 'unusual_ip_diversity', detail: `${uniqueIps} distinct IPs hit admin in 24h (usually 1-2)` })

  return { ok: flags.length === 0, totalEvents, uniqueIps, denied, topIp: { ip: topIp[0], count: topIp[1] }, flags, windowStart: since.toISOString() }
}

// Log a denied admin attempt so brute force shows up in audit_logs.
async function logAdminDenied(request, db, action) {
  try {
    const ip = (request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown').split(',')[0].trim()
    const ua = (request.headers.get('user-agent') || '').slice(0, 200)
    await db.collection('audit_logs').insertOne({ id: uuidv4(), action: `DENIED ${action}`, ip, ua, at: new Date() })
  } catch {}
}

// Send a security alert via Resend. Fails silently — never throws.
async function sendSecurityAlert(subject, body) {
  if (!process.env.RESEND_API_KEY) return { sent: false, reason: 'no_resend_key' }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'WorkflowStacks Security <hello@workflowstacks.com>',
        to: ['rahul@workflowstacks.com'],
        subject: `[SECURITY] ${subject}`,
        text: body,
      }),
    })
    return { sent: r.ok, status: r.status }
  } catch (e) {
    return { sent: false, reason: e.message }
  }
}

// Slug generation — Pattern C (name-first, owner-name on collision).
// Lowercase, hyphens, no diacritics/emoji, max 60 chars on a word boundary.
function slugify(raw) {
  if (!raw) return ''
  let s = String(raw).toLowerCase()
    // Strip emoji and pictographs
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    // Replace non-alphanumeric with hyphens (keep dots+digits in things like llama.cpp -> llama-cpp)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (s.length <= 60) return s
  // Truncate at a hyphen boundary so we never end mid-word
  const cut = s.slice(0, 60)
  const last = cut.lastIndexOf('-')
  return last > 30 ? cut.slice(0, last) : cut
}

// Pick a unique slug for a skill, deferring to the DB to check collisions.
// Order: name → owner-name → owner-name-2 → owner-name-3 …
async function uniqueSlug(database, name, owner, currentId = null) {
  const base = slugify(name)
  if (!base) return slugify(owner + '-' + (currentId || 'skill')) || ('skill-' + Date.now())
  // Try base first
  const baseHit = await database.collection('skills').findOne({ slug: base, id: { $ne: currentId } })
  if (!baseHit) return base
  // Try owner-base
  const ownerSlug = owner ? slugify(owner + '-' + name) : null
  if (ownerSlug) {
    const ownerHit = await database.collection('skills').findOne({ slug: ownerSlug, id: { $ne: currentId } })
    if (!ownerHit) return ownerSlug
    // Try owner-base-2, -3, …
    for (let i = 2; i < 50; i++) {
      const candidate = ownerSlug + '-' + i
      const hit = await database.collection('skills').findOne({ slug: candidate, id: { $ne: currentId } })
      if (!hit) return candidate
    }
  }
  // Last resort fallback
  return base + '-' + Date.now().toString(36).slice(-4)
}

function tooLong(obj, limits = { email: 254, default: 2000 }) {
  for (const [k, v] of Object.entries(obj || {})) {
    if (typeof v !== 'string') continue
    const max = limits[k] || limits.default
    if (v.length > max) return `${k} too long (max ${max})`
  }
  return null
}

// Build GitHub API headers (token optional — works on free unauthenticated tier)
function ghHeaders(accept = 'application/vnd.github+json') {
  const headers = {
    'Accept': accept,
    'User-Agent': 'WorkflowStacks'
  };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

// Enhanced GitHub scraper - trending, maintained, founder-relevant repos
// opts: { limit, sort ('updated'|'stars'), sinceDays } — defaults pull the NEWEST content.
async function scrapeGitHub(topicQueries, opts = {}) {
  const { limit = 8, sort = 'updated', sinceDays = 120 } = typeof opts === 'number' ? { limit: opts } : opts;
  const skills = [];
  const seenRepos = new Set(); // Avoid duplicates
  const hasToken = !!process.env.GITHUB_TOKEN;
  // Only fetch READMEs when authenticated — keeps us under the 60 req/hr free limit
  const fetchReadmes = hasToken;

  // Dynamic recency window relative to NOW so it never goes stale
  const cutoff = new Date(Date.now() - sinceDays * 86400000).toISOString().slice(0, 10);
  const ghSort = sort === 'stars' ? 'stars' : 'updated'; // 'updated' = freshest first

  for (const queryConfig of topicQueries) {
    try {
      const { query, category, minStars = 50 } = queryConfig;

      // "pushed" within a rolling window = recently active/trending repos
      const dateFilter = `pushed:>=${cutoff}`;
      const searchQuery = `${query} ${dateFilter} stars:>${minStars}`;

      const response = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=${ghSort}&order=desc&per_page=${limit}`,
        { headers: ghHeaders() }
      );

      if (!response.ok) {
        console.log(`GitHub API error for ${query}: ${response.status}`);
        // Back off harder on rate-limit so remaining queries can still succeed
        if (response.status === 403) await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      const data = await response.json();

      for (const repo of data.items || []) {
        // Skip duplicates and archived repos
        if (seenRepos.has(repo.full_name) || repo.archived) continue;
        seenRepos.add(repo.full_name);

        // Fetch README only when we have a token; otherwise fall back to description
        let readmePreview = repo.description || '';
        if (fetchReadmes) {
          try {
            const readmeResponse = await fetch(
              `https://api.github.com/repos/${repo.full_name}/readme`,
              { headers: ghHeaders('application/vnd.github.raw+json') }
            );
            if (readmeResponse.ok) {
              const readmeText = await readmeResponse.text();
              readmePreview = readmeText.substring(0, 600);
            }
          } catch (e) {
            console.log('Error fetching README:', e.message);
          }
        }

        // Calculate popularity score (0-100)
        const daysSinceUpdate = (Date.now() - new Date(repo.updated_at)) / (1000 * 60 * 60 * 24);
        const recencyBonus = daysSinceUpdate < 7 ? 20 : daysSinceUpdate < 30 ? 10 : 0;
        const starScore = Math.min(50, (repo.stargazers_count / 1000) * 10);
        const forkScore = Math.min(20, (repo.forks_count / 100) * 10);
        const popularityScore = starScore + forkScore + recencyBonus;
        
        // Quality rating
        const rating = Math.min(5, (repo.stargazers_count / 1000) + 3.5 + (recencyBonus / 10));
        
        const skill = {
          id: uuidv4(),
          name: repo.name,
          description: repo.description || 'No description available',
          category: category,
          price: 0,
          rating: parseFloat(rating.toFixed(1)),
          installs: Math.floor(repo.stargazers_count * 2.5 + repo.forks_count * 10),
          source_url: repo.html_url,
          github_url: repo.html_url,
          github_stars: repo.stargazers_count,
          github_forks: repo.forks_count,
          github_topics: repo.topics || [],
          popularity_score: parseFloat(popularityScore.toFixed(2)),
          creator: repo.owner.login,
          creator_avatar: repo.owner.avatar_url,
          is_premium: false,
          readme_preview: readmePreview,
          language: repo.language,
          last_updated: new Date(repo.updated_at),
          created_at: new Date(repo.created_at),
          updated_at: new Date(repo.updated_at),
          added_at: new Date() // when this skill entered the marketplace (powers "New")
        };

        skills.push(skill);
      }
      
      // Delay between queries to respect the search rate limit (10/min unauthenticated)
      await new Promise(resolve => setTimeout(resolve, process.env.GITHUB_TOKEN ? 300 : 1500));

    } catch (error) {
      console.error(`Error scraping query ${queryConfig.query}:`, error.message);
    }
  }

  return skills;
}

// Sample AgentPowers.ai data
const agentPowersSkills = [
  {
    id: uuidv4(),
    name: 'Code Reviewer Pro',
    description: 'AI-powered code review assistant that analyzes your code for bugs, security issues, and best practices',
    category: 'claude-skill',
    price: 12,
    rating: 4.8,
    installs: 4200,
    source_url: 'https://agentpowers.ai/skills/code-reviewer',
    github_url: 'https://github.com/agentpowers/code-reviewer',
    github_stars: 856,
    creator: 'AgentPowers',
    is_premium: true,
    readme_preview: '# Code Reviewer Pro\n\nAutomated code review with AI...',
    created_at: new Date('2024-01-15')
  },
  {
    id: uuidv4(),
    name: 'Security Scanner',
    description: 'Comprehensive security analysis for your applications, detecting vulnerabilities and suggesting fixes',
    category: 'claude-skill',
    price: 19,
    rating: 4.9,
    installs: 3100,
    source_url: 'https://agentpowers.ai/skills/security-scanner',
    github_url: 'https://github.com/agentpowers/security-scanner',
    github_stars: 1240,
    creator: 'AgentPowers',
    is_premium: true,
    readme_preview: '# Security Scanner\n\nFind security vulnerabilities...',
    created_at: new Date('2024-02-01')
  },
  {
    id: uuidv4(),
    name: 'Prompt Optimizer',
    description: 'Optimize your AI prompts for better results across all models',
    category: 'prompt',
    price: 0,
    rating: 4.6,
    installs: 8900,
    source_url: 'https://agentpowers.ai/skills/prompt-optimizer',
    github_url: 'https://github.com/agentpowers/prompt-optimizer',
    github_stars: 2340,
    creator: 'AgentPowers',
    is_premium: false,
    readme_preview: '# Prompt Optimizer\n\nImprove your prompts...',
    created_at: new Date('2024-01-20')
  },
  {
    id: uuidv4(),
    name: 'Data Analyzer',
    description: 'Advanced data analysis and visualization tool for complex datasets',
    category: 'gemini-extension',
    price: 15,
    rating: 4.7,
    installs: 2800,
    source_url: 'https://agentpowers.ai/skills/data-analyzer',
    github_url: 'https://github.com/agentpowers/data-analyzer',
    github_stars: 678,
    creator: 'AgentPowers',
    is_premium: true,
    readme_preview: '# Data Analyzer\n\nAnalyze complex data...',
    created_at: new Date('2024-02-10')
  },
  {
    id: uuidv4(),
    name: 'API Builder',
    description: 'Automatically generate REST APIs from your database schema',
    category: 'mcp-server',
    price: 0,
    rating: 4.5,
    installs: 5600,
    source_url: 'https://agentpowers.ai/skills/api-builder',
    github_url: 'https://github.com/agentpowers/api-builder',
    github_stars: 1890,
    creator: 'AgentPowers',
    is_premium: false,
    readme_preview: '# API Builder\n\nGenerate APIs automatically...',
    created_at: new Date('2024-01-25')
  },
  {
    id: uuidv4(),
    name: 'Document Generator',
    description: 'Create professional documentation from your codebase automatically',
    category: 'claude-skill',
    price: 8,
    rating: 4.4,
    installs: 3400,
    source_url: 'https://agentpowers.ai/skills/doc-generator',
    github_url: 'https://github.com/agentpowers/doc-generator',
    github_stars: 945,
    creator: 'AgentPowers',
    is_premium: true,
    readme_preview: '# Document Generator\n\nAuto-generate documentation...',
    created_at: new Date('2024-02-05')
  }
];

// Fallback prettifier for skills whose AI-rewritten title_human hasn't landed yet.
// Cleans hyphens/underscores, fixes obvious all-caps acronyms, title-cases — so
// "GitHubDaily" stays as-is, "applied-ml" → "Applied ML", "google-ads-mcp" →
// "Google Ads MCP". Never overrides an existing title_human.
const COMMON_ACRONYMS = new Set(['mcp', 'ai', 'llm', 'cli', 'sdk', 'api', 'ui', 'ux', 'ml', 'cv', 'nlp', 'rag', 'os', 'db', 'qa', 'seo', 'aeo', 'geo', 'crm', 'cms', 'pdf', 'aws', 'gcp', 'http', 'json', 'yaml', 'sql']);
function prettyName(raw) {
  if (!raw) return '';
  // Preserve known good styling (camelCase, mixed case with internal caps, dotted names like llama.cpp).
  if (/[a-z][A-Z]/.test(raw) || /\./.test(raw)) return raw;
  return raw
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .map((w) => {
      const lw = w.toLowerCase();
      if (COMMON_ACRONYMS.has(lw)) return lw.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ')
    .trim();
}
function prettyDesc(raw) {
  if (!raw) return '';
  // Strip leading emoji + whitespace; capitalize first letter; trim CJK-only filler.
  let s = raw.replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\s]+/u, '').trim();
  if (!s) return raw;
  s = s.charAt(0).toUpperCase() + s.slice(1);
  return s.length > 200 ? s.slice(0, 197) + '…' : s;
}
// Apply to a skills array — adds title_human/description_human ONLY if missing.
function applyFallback(skills) {
  return (skills || []).map((s) => ({
    ...s,
    title_human: s.title_human || prettyName(s.name),
    description_human: s.description_human || prettyDesc(s.description),
  }));
}

export async function GET(request) {
  const { pathname } = new URL(request.url);
  const path = pathname.replace('/api', '') || '/';

  try {
    // Gate admin/expensive endpoints. Log denied attempts to audit_logs so
    // brute-force patterns surface in the daily security check.
    if (ADMIN_PATHS.includes(path)) {
      const denied = requireAdmin(request);
      if (denied) { try { const db = await connectDB(); await logAdminDenied(request, db, `GET ${path}`) } catch {} ; return denied; }
    }

    const database = await connectDB();
    if (ADMIN_PATHS.includes(path)) await logAdmin(request, database, `GET ${path}`);

    // Root endpoint
    if (path === '/' || path === '') {
      return Response.json({ message: 'WorkflowStacks API v1.0' });
    }
    
    // Get all skills
    // Smart search — logs query, falls back to GitHub auto-discovery when local
    // results are thin, then silently ingests matches so the next search finds them.
    if (path === '/search') {
      const { searchParams } = new URL(request.url);
      const q = (searchParams.get('q') || '').trim();
      if (!q) return Response.json({ skills: [], query: '' });
      if (q.length > 200) return Response.json({ error: 'query too long' }, { status: 400 });

      // 1. Log the query (anonymous — just text + timestamp) for trending analytics
      try {
        await database.collection('search_queries').insertOne({
          id: uuidv4(),
          q: q.toLowerCase(),
          at: new Date(),
        });
      } catch {}

      // 2. Local search first (fast)
      const local = await database.collection('skills').find({
        published: { $ne: false },
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { title_human: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { description_human: { $regex: q, $options: 'i' } },
          { github_topics: { $in: [q.toLowerCase()] } },
        ],
      })
        .sort({ github_stars: -1 })
        .limit(20)
        .toArray();

      // 3. If we have plenty of local results, return immediately.
      if (local.length >= 6) {
        return Response.json({ skills: applyFallback(local), query: q, discovered: 0 });
      }

      // 4. Few or no local results → search GitHub directly (with auth token if set)
      // and silently ingest the top matches so the next searcher finds them.
      // Use GitHub's relevance-ranked search (no sort=stars — that surfaces
      // mega awesome-lists instead of real tools). Tight: name OR description
      // only (not readme), 20+ stars (real but niche tools surface), and we
      // exclude awesome-* lists which are reference lists, not usable tools.
      let discovered = 0;
      let ghIngested = []; // track repos we just added, so we return them even if regex doesn't match
      try {
        const ghQuery = encodeURIComponent(q + ' in:name,description stars:>20 NOT awesome');
        const ghRes = await fetch(`https://api.github.com/search/repositories?q=${ghQuery}&per_page=10`, {
          headers: ghHeaders(),
        });
        if (ghRes.ok) {
          const ghData = await ghRes.json();
          const repos = (ghData.items || [])
            // Defense in depth — exclude obvious curated lists by name.
            .filter((r) => !/^awesome[-_]/i.test(r.name) && !/^free[-_]for[-_]dev/i.test(r.name) && !/^public[-_]apis$/i.test(r.name))
            .slice(0, 8);
          // Skip ones already in catalog
          const existingUrls = new Set(local.map(s => s.github_url));
          for (const repo of repos) {
            if (existingUrls.has(repo.html_url)) continue;
            const id = uuidv4();
            const slug = await uniqueSlug(database, repo.name, repo.owner?.login);
            const doc = {
              id,
              slug,
              name: repo.name,
              description: repo.description || '',
              category: 'ai-agent', // default; reclassify cron will fix
              price: 0,
              rating: Math.min(5, (repo.stargazers_count / 1000) + 3.5),
              installs: Math.floor(repo.stargazers_count * 2.5),
              source_url: repo.html_url,
              github_url: repo.html_url,
              github_stars: repo.stargazers_count,
              github_forks: repo.forks_count,
              github_topics: repo.topics || [],
              popularity_score: repo.stargazers_count + repo.forks_count * 5,
              creator: repo.owner?.login,
              creator_avatar: repo.owner?.avatar_url,
              is_premium: false,
              readme_preview: repo.description || '',
              language: repo.language,
              last_updated: repo.pushed_at,
              created_at: repo.created_at,
              updated_at: new Date(),
              added_at: new Date(),
              published: true, // auto-discovered = user signaled intent
              rewrite_status: 'pending', // daily cron will rewrite title/desc
              auto_discovered: true,
              discovered_for_query: q,
              stars_refreshed_at: new Date(),
            };
            await database.collection('skills').updateOne(
              { github_url: repo.html_url },
              { $setOnInsert: doc },
              { upsert: true }
            );
            ghIngested.push(repo.html_url);
            discovered++;
          }
        }
      } catch (e) {
        // GitHub failure is silent — don't break the search UX
      }

      // 5. Return: the just-ingested GitHub matches (already relevance-ranked by
      // GitHub) PLUS any existing local matches, deduped. Skipping the regex
      // re-search means we trust GitHub's relevance ranking for query terms
      // that aren't substrings of any name/description in our catalog yet.
      let merged = local.slice();
      const seen = new Set(local.map((s) => s.github_url));
      if (ghIngested.length) {
        const fresh = await database.collection('skills')
          .find({ github_url: { $in: ghIngested } })
          .toArray();
        for (const s of fresh) {
          if (!seen.has(s.github_url)) {
            merged.push(s);
            seen.add(s.github_url);
          }
        }
      }
      merged.sort((a, b) => (b.github_stars || 0) - (a.github_stars || 0));
      merged = merged.slice(0, 20);

      return Response.json({ skills: applyFallback(merged), query: q, discovered });
    }

    // Admin — top recent search queries (last 7 days)
    if (path === '/search-trends') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const trends = await database.collection('search_queries').aggregate([
        { $match: { at: { $gte: sevenDaysAgo } } },
        { $group: { _id: '$q', count: { $sum: 1 }, lastSeen: { $max: '$at' } } },
        { $sort: { count: -1 } },
        { $limit: 50 },
      ]).toArray();
      return Response.json({ trends, count: trends.length });
    }

    // Admin/cron — auto-discover catalog additions from trending search queries
    if (path === '/auto-discover-from-searches') {
      const { searchParams } = new URL(request.url);
      const limit = Math.min(20, parseInt(searchParams.get('limit') || '10', 10));
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      // Top recent queries that had < 6 results in our catalog (still worth enriching)
      const topQueries = await database.collection('search_queries').aggregate([
        { $match: { at: { $gte: sevenDaysAgo } } },
        { $group: { _id: '$q', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit },
      ]).toArray();

      let totalAdded = 0;
      const results = [];
      for (const t of topQueries) {
        const q = t._id;
        try {
          const ghQuery = encodeURIComponent(q + ' in:name,description stars:>50');
          const ghRes = await fetch(`https://api.github.com/search/repositories?q=${ghQuery}&sort=stars&order=desc&per_page=5`, { headers: ghHeaders() });
          if (!ghRes.ok) continue;
          const data = await ghRes.json();
          let added = 0;
          for (const repo of (data.items || [])) {
            const slug = await uniqueSlug(database, repo.name, repo.owner?.login);
            const doc = {
              id: uuidv4(),
              slug,
              name: repo.name,
              description: repo.description || '',
              category: 'ai-agent',
              price: 0,
              source_url: repo.html_url,
              github_url: repo.html_url,
              github_stars: repo.stargazers_count,
              github_forks: repo.forks_count,
              github_topics: repo.topics || [],
              creator: repo.owner?.login,
              creator_avatar: repo.owner?.avatar_url,
              language: repo.language,
              last_updated: repo.pushed_at,
              created_at: repo.created_at,
              updated_at: new Date(),
              added_at: new Date(),
              published: true,
              rewrite_status: 'pending',
              auto_discovered: true,
              discovered_for_query: q,
            };
            const r = await database.collection('skills').updateOne(
              { github_url: repo.html_url },
              { $setOnInsert: doc },
              { upsert: true }
            );
            if (r.upsertedCount > 0) added++;
          }
          results.push({ q, added, searches: t.count });
          totalAdded += added;
          // Polite delay
          await new Promise((r) => setTimeout(r, 400));
        } catch {}
      }
      return Response.json({ success: true, totalAdded, queries: results.length, results });
    }

    if (path === '/skills') {
      const { searchParams } = new URL(request.url);
      const category = searchParams.get('category');
      const search = searchParams.get('search');

      // ?new=true — return the 8 most recently updated skills (freshest GitHub
      // pushes). Falls back to sort by last_updated since most skills share the
      // same added_at batch timestamp. "New" here means "active on GitHub recently."
      if (searchParams.get('new') === 'true') {
        const newSkills = await database.collection('skills')
          .find({ published: { $ne: false }, last_updated: { $exists: true } })
          .sort({ last_updated: -1, github_stars: -1 })
          .limit(8)
          .toArray();
        return Response.json({ skills: applyFallback(newSkills) });
      }

      // Quality gate: only show published listings (unless ?all=true)
      let query = searchParams.get('all') === 'true' ? {} : { published: { $ne: false } };
      if (category && category !== 'all') {
        query.category = category;
      }
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      const skills = await database.collection('skills')
        .find(query)
        .sort({ github_stars: -1 })
        .toArray();

      return Response.json({ skills: applyFallback(skills) });
    }

    // Get skill by slug or ID
    if (path.startsWith('/skills/')) {
      const key = path.split('/')[2];
      // Try slug first (the new canonical), then uuid for back-compat
      const skill = await database.collection('skills').findOne({ slug: key })
        || await database.collection('skills').findOne({ id: key });

      if (!skill) {
        return Response.json({ error: 'Skill not found' }, { status: 404 });
      }

      return Response.json({ skill: applyFallback([skill])[0] });
    }
    
    // Ingest from GitHub - Latest & Most Popular
    if (path === '/ingest') {
      // Founder-focused queries spanning every niche — trending & maintained repos
      const topicQueries = [
        // --- AI agents, MCP & Claude skills (core marketplace) ---
        { query: 'topic:mcp-server OR model-context-protocol', category: 'mcp-server', minStars: 30 },
        { query: 'topic:claude-skill OR claude anthropic tool', category: 'claude-skill', minStars: 20 },
        { query: 'ai-agent OR autonomous-agent llm', category: 'ai-agent', minStars: 200 },
        { query: 'topic:rag retrieval-augmented-generation', category: 'ai-agent', minStars: 150 },

        // --- Marketing & growth ---
        { query: 'ai copywriting OR content-generation marketing', category: 'marketing', minStars: 80 },
        { query: 'seo tools OR topic:seo', category: 'marketing', minStars: 150 },
        { query: 'social-media automation', category: 'marketing', minStars: 100 },

        // --- Performance marketing & paid ads (Meta / Google / TikTok) ---
        // Lower thresholds + repo-name targeting — paid-ads SDKs are a niche slice
        // of OSS, so a 200-star bar excludes the entire category.
        { query: 'facebook-business-sdk OR facebook-python-business-sdk', category: 'performance-marketing', minStars: 5 },
        { query: 'meta-ads-mcp OR facebook-ads-mcp OR meta-business-mcp', category: 'performance-marketing', minStars: 1 },
        { query: 'google-ads-api OR google-ads-python OR google-ads-mcp', category: 'performance-marketing', minStars: 5 },
        { query: 'tiktok-business OR tiktok-ads-api OR tiktok-marketing-api', category: 'performance-marketing', minStars: 5 },
        { query: 'linkedin-ads-api OR linkedin-marketing OR linkedin-api', category: 'performance-marketing', minStars: 10 },
        { query: 'ad-creative-ai OR ad-copy-ai OR generative-ads', category: 'performance-marketing', minStars: 10 },
        { query: 'paid-social-automation OR campaign-optimization OR ppc-automation', category: 'performance-marketing', minStars: 10 },

        // --- Google ecosystem: Looker, Flow (Veo), Opal/Opus, Gemini tools ---
        { query: 'looker-open-source OR looker-sdk OR looker-mcp', category: 'analytics', minStars: 1 },
        { query: 'looker-studio OR lookml OR looker-dashboard', category: 'analytics', minStars: 5 },
        { query: 'google-flow OR veo-3 OR veo3 OR gemini-flow', category: 'ai-agent', minStars: 5 },
        { query: 'veo-mcp OR flow-mcp OR ai-video-generation google', category: 'ai-agent', minStars: 1 },
        { query: 'google-opal OR opal-app-builder OR google-stitch', category: 'ai-agent', minStars: 1 },
        { query: 'opus-codec OR opus-mcp OR opus-tools', category: 'ai-agent', minStars: 5 },
        { query: 'gemini-cli OR gemini-mcp OR vertex-ai-mcp', category: 'ai-agent', minStars: 5 },

        // --- Marketing analytics, attribution & BI dashboards ---
        { query: 'open-source bi OR business-intelligence dashboard', category: 'analytics', minStars: 800 },
        { query: 'marketing-attribution OR multi-touch-attribution', category: 'analytics', minStars: 30 },
        { query: 'ga4 OR google-analytics mcp OR ga4-api', category: 'analytics', minStars: 30 },
        { query: 'metabase OR superset OR lightdash OR redash', category: 'analytics', minStars: 1000 },
        { query: 'performance-reporting OR marketing-dashboard OR kpi-dashboard', category: 'analytics', minStars: 30 },

        // --- Market research, competitor intel & web research ---
        { query: 'competitor-analysis OR market-research-ai OR competitor-intelligence', category: 'market-research', minStars: 30 },
        { query: 'web-research-agent OR research-assistant OR deep-research', category: 'market-research', minStars: 100 },
        { query: 'web-scraping research OR firecrawl OR trafilatura', category: 'market-research', minStars: 200 },
        { query: 'reddit-scraper OR youtube-research OR social-listening', category: 'market-research', minStars: 50 },
        { query: 'survey-analysis OR customer-feedback-ai OR voice-of-customer', category: 'market-research', minStars: 30 },

        // --- Sales & outreach ---
        { query: 'cold-email OR lead-generation OR outreach automation', category: 'sales', minStars: 50 },
        { query: 'open-source crm', category: 'sales', minStars: 200 },

        // --- Build / ship product (SaaS founders) ---
        { query: 'saas boilerplate nextjs OR saas-starter', category: 'saas-starter', minStars: 200 },
        { query: 'stripe subscription billing saas', category: 'saas-starter', minStars: 80 },

        // --- Automation / no-code ---
        { query: 'workflow-automation OR n8n OR no-code', category: 'automation', minStars: 300 },

        // --- Analytics, support, design ---
        { query: 'open-source product-analytics', category: 'analytics', minStars: 250 },
        { query: 'ai customer-support chatbot', category: 'support', minStars: 150 },
        { query: 'ai design OR ui-generator OR figma', category: 'design', minStars: 100 },

        // --- Prompts & founder resources ---
        { query: 'prompt-engineering OR awesome-prompts OR system-prompts', category: 'prompt', minStars: 300 },
        { query: 'awesome startup OR indie-hackers OR founder resources', category: 'founder-resource', minStars: 200 },

        // --- Emerging 2026/2027 categories (forward-looking) ---
        { query: 'computer-use OR browser-use OR topic:computer-use-agent', category: 'computer-use', minStars: 80 },
        { query: 'voice-agent OR realtime-voice OR text-to-speech agent', category: 'voice-ai', minStars: 100 },
        { query: 'agent-memory OR long-term-memory llm OR topic:memory', category: 'agent-memory', minStars: 80 },
        { query: 'llm-evaluation OR llm-observability OR ai-guardrails', category: 'ai-evals', minStars: 100 },
        { query: 'on-device llm OR local-llm OR edge-ai', category: 'local-ai', minStars: 150 },
        { query: 'multi-agent OR agent-orchestration OR autonomous agents', category: 'multi-agent', minStars: 200 }
      ];

      // Read options: /ingest?sort=updated&days=120  (defaults pull NEWEST content)
      const { searchParams } = new URL(request.url);
      const sort = searchParams.get('sort') || 'updated';
      const sinceDays = parseInt(searchParams.get('days') || '120', 10);

      const scrapedSkills = await scrapeGitHub(topicQueries, { limit: 8, sort, sinceDays });

      // SAFE UPSERT — refresh metadata for known repos, add new ones, and NEVER
      // overwrite curated fields (title_human/description_human/category) or wipe data.
      let inserted = 0;
      let refreshed = 0;
      for (const s of scrapedSkills) {
        // Pick a slug only when this repo isn't already in the catalog (skipped for known repos).
        const existing = await database.collection('skills').findOne({ github_url: s.github_url }, { projection: { slug: 1 } });
        const slug = existing?.slug ? null : await uniqueSlug(database, s.name, s.creator);
        const res = await database.collection('skills').updateOne(
          { github_url: s.github_url },
          {
            // Always refresh live GitHub metadata
            $set: {
              name: s.name,
              description: s.description,
              github_stars: s.github_stars,
              github_forks: s.github_forks,
              github_topics: s.github_topics,
              language: s.language,
              popularity_score: s.popularity_score,
              last_updated: s.last_updated,
              updated_at: s.updated_at
            },
            // Only set on first insert — preserves rewrites & reclassified category
            $setOnInsert: {
              id: s.id,
              ...(slug ? { slug } : {}),
              category: s.category,
              creator: s.creator,
              creator_avatar: s.creator_avatar,
              price: 0,
              is_premium: false,
              source_url: s.source_url,
              readme_preview: s.readme_preview,
              created_at: s.created_at,
              added_at: new Date(),
              // Quality gate: new repos stay hidden until rewritten + judged
              published: false,
              rewrite_status: 'pending'
            }
          },
          { upsert: true }
        );
        if (res.upsertedCount > 0) inserted++;
        else refreshed++;
      }

      return Response.json({
        message: 'Ingestion complete — newest GitHub content pulled (safe upsert, rewrites preserved).',
        scraped: scrapedSkills.length,
        newlyAdded: inserted,
        refreshed,
        sort,
        sinceDays,
        note: inserted > 0 ? `Run /api/agent-rewrite?pending=true to rewrite the ${inserted} new skill(s).` : 'No new repos this run.'
      });
    }
    
    // Get trending skills (high popularity score, recently updated)
    if (path === '/trending') {
      const skills = await database.collection('skills')
        .find({ popularity_score: { $exists: true }, published: { $ne: false } })
        .sort({ popularity_score: -1, last_updated: -1 })
        .limit(12)
        .toArray();

      return Response.json({ skills: applyFallback(skills) });
    }

    // Get hot skills (most stars, updated in last 30 days)
    if (path === '/hot') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const skills = await database.collection('skills')
        .find({
          last_updated: { $gte: thirtyDaysAgo },
          github_stars: { $exists: true },
          published: { $ne: false }
        })
        .sort({ github_stars: -1 })
        .limit(12)
        .toArray();

      return Response.json({ skills: applyFallback(skills) });
    }

    // Get new skills (most recently added to the marketplace)
    if (path === '/new') {
      // Prefer added_at (when it entered the marketplace); fall back to recency
      // of repo activity so the section is never empty for older data.
      let skills = await database.collection('skills')
        .find({ added_at: { $exists: true }, published: { $ne: false } })
        .sort({ added_at: -1 })
        .limit(12)
        .toArray();

      if (skills.length === 0) {
        skills = await database.collection('skills')
          .find({ published: { $ne: false } })
          .sort({ last_updated: -1, created_at: -1 })
          .limit(12)
          .toArray();
      }

      return Response.json({ skills: applyFallback(skills) });
    }
    
    // Re-classify skills into correct categories by keyword (fixes mis-tags)
    if (path === '/reclassify') {
      const classify = (s) => {
        const t = `${s.name} ${s.description || ''} ${(s.github_topics || []).join(' ')}`.toLowerCase();
        const name = (s.name || '').toLowerCase();
        const topics = (s.github_topics || []).map((x) => String(x).toLowerCase());
        const has = (...kw) => kw.some((k) => t.includes(k));
        const hasTopic = (...kw) => kw.some((k) => topics.includes(k));
        const isName = (...kw) => kw.some((k) => name === k);

        // Strong product-name signals win first (avoids generic-keyword bleed)
        if (isName('n8n') || has('workflow-automation', 'zapier alternative')) return 'automation';
        // MCP must be an explicit signal, not a stray "mcp" substring (e.g. n8n mentions MCP support)
        if (hasTopic('mcp', 'mcp-server', 'model-context-protocol') || has('model-context-protocol', 'mcp-server', 'mcp server')) return 'mcp-server';
        if (hasTopic('claude', 'anthropic', 'claude-skill') || has('claude skill', 'anthropic claude')) return 'claude-skill';
        if (has('prompt engineering', 'awesome-prompts', 'system-prompt', 'prompt library')) return 'prompt';
        if (has('puppeteer', 'playwright', 'selenium', 'scraper', 'scraping', 'browser-automation', 'testing', 'e2e', 'ansible', 'kubernetes', 'devops', 'home-assistant')) return 'devtools';
        if (has('crm', 'cold-email', 'cold email', 'lead-generation', 'lead generation', 'outreach', 'prospect', 'sales pipeline', 'erpnext')) return 'sales';
        // Performance marketing — Meta / Google / TikTok ads, ad-creative tooling.
        // Use unique multi-word phrases (no bare "ads" — too generic, catches every
        // ads-blocker / banner repo).
        if (has('facebook ads', 'meta ads', 'meta-ads', 'facebook-ads', 'google ads', 'google-ads', 'adwords', 'tiktok ads', 'linkedin ads', 'meta-business', 'facebook-business', 'ads-api', 'ad creative', 'ad-creative', 'ads automation', 'ads-automation', 'paid social', 'paid-social', 'ppc automation', 'campaign optimization', 'ad copy ai', 'ad-copy')) return 'performance-marketing';
        // Market research, competitor intel, web research agents. Avoid bare
        // "research" / "survey" / "agents" which match scientific & generic tools.
        if (has('competitor analysis', 'competitor-analysis', 'market research', 'market-research', 'competitor intelligence', 'competitor-intelligence', 'web research agent', 'web-research-agent', 'deep research agent', 'deep-research-agent', 'voice of customer', 'voice-of-customer', 'customer feedback', 'social listening', 'social-listening', 'reddit-scraper', 'reddit scraper', 'review-mining', 'product-research', 'product research')) return 'market-research';
        if (has('seo', 'copywriting', 'content-generation', 'social-media', 'social media', 'newsletter', 'marketing')) return 'marketing';
        if (has('saas boilerplate', 'saas-starter', 'boilerplate', 'stripe', 'subscription billing', 'starter kit')) return 'saas-starter';
        if (has('n8n', 'workflow', 'automation', 'zapier', 'no-code', 'low-code')) return 'automation';
        if (has('analytics', 'dashboard', 'metrics', 'tracking', 'telemetry', 'business intelligence', 'business-intelligence', 'bi-tool', 'metabase', 'superset', 'lightdash', 'redash', 'data visualization', 'data-visualization', 'kpi', 'reporting', 'attribution', 'ga4', 'google analytics', 'mixpanel', 'amplitude', 'product analytics', 'product-analytics')) return 'analytics';
        if (has('helpdesk', 'customer-support', 'customer support', 'ticketing', 'chatbot')) return 'support';
        if (has('figma', 'ui-generator', 'icon', 'design system', 'tailwind')) return 'design';
        // --- Emerging 2026/2027 categories (checked before the broad ai-agent rule) ---
        if (has('computer-use', 'computer use', 'browser-use', 'browser agent', 'gui agent', 'desktop agent', 'web automation agent', 'operator agent')) return 'computer-use';
        if (has('voice agent', 'text-to-speech', 'speech-to-text', 'realtime voice', 'voice assistant', 'speech synthesis', 'voice ai', 'whisper')) return 'voice-ai';
        if (has('agent memory', 'long-term memory', 'persistent memory', 'memory layer', 'mem0', 'vector memory')) return 'agent-memory';
        if (has('llm eval', 'evaluation framework', 'llm observability', 'llm tracing', 'guardrail', 'red-team', 'ai governance', 'prompt injection', 'llm-as-judge')) return 'ai-evals';
        if (has('on-device', 'local llm', 'local-first', 'edge inference', 'llama.cpp', 'offline ai', 'gguf')) return 'local-ai';
        if (has('multi-agent', 'multi agent', 'agent swarm', 'agent orchestration', 'crewai', 'agent team')) return 'multi-agent';
        if (has('rag', 'retrieval', 'ai-agent', 'autonomous-agent', 'autonomous agent', 'llm', 'transformer', 'ollama', 'langchain', 'agent framework')) return 'ai-agent';
        return s.category || 'ai-tool';
      };
      const all = await database.collection('skills').find({}).toArray();
      let changed = 0;
      for (const s of all) {
        const cat = classify(s);
        if (cat !== s.category) {
          await database.collection('skills').updateOne({ id: s.id }, { $set: { category: cat } });
          changed++;
        }
      }
      return Response.json({ success: true, total: all.length, recategorized: changed });
    }

    // Backfill slugs for every existing skill (admin only)
    if (path === '/backfill-slugs') {
      const { searchParams } = new URL(request.url);
      const force = searchParams.get('force') === 'true'; // if true, regenerate even existing slugs
      const skills = await database.collection('skills')
        .find(force ? {} : { slug: { $exists: false } })
        .toArray();
      let assigned = 0;
      let skipped = 0;
      for (const s of skills) {
        if (s.slug && !force) { skipped++; continue }
        const slug = await uniqueSlug(database, s.name || s.title_human, s.creator, s.id);
        if (!slug) { skipped++; continue }
        await database.collection('skills').updateOne(
          { id: s.id },
          { $set: { slug, slug_assigned_at: new Date() } }
        );
        assigned++;
      }
      return Response.json({ success: true, total: skills.length, assigned, skipped });
    }

    // Remove fake sample skills + test data (admin only)
    if (path === '/cleanup') {
      // Fake AgentPowers placeholder skills (not real GitHub repos)
      const fakes = await database.collection('skills').deleteMany({
        $or: [
          { creator: 'AgentPowers' },
          { github_url: { $regex: 'agentpowers', $options: 'i' } }
        ]
      });
      // Astronomy / cartography tools mis-tagged by "survey" keyword overlap.
      // They are real repos, just not marketplace-relevant. Unpublish (reversible).
      const sciency = await database.collection('skills').updateMany(
        { name: { $in: ['lftools', 'rubin_sim'] } },
        { $set: { published: false, hidden_reason: 'off-topic (sci/astronomy)' } }
      );
      // Test uploads created during QA
      const tests = await database.collection('skills').deleteMany({
        source: 'user',
        name: { $regex: '^Test Upload', $options: 'i' }
      });
      // Test subscriber
      const subs = await database.collection('subscribers').deleteMany({
        email: 'founder@example.com'
      });
      const remaining = await database.collection('skills').countDocuments();
      return Response.json({
        success: true,
        removedFakeSamples: fakes.deletedCount,
        removedTestUploads: tests.deletedCount,
        removedTestSubscribers: subs.deletedCount,
        skillsRemaining: remaining
      });
    }

    // Add a specific GitHub repo to the catalog by URL — for canonical tools the
    // generic scraper queries miss. ?url=https://github.com/owner/repo&category=...
    // Honest content only: pulls real metadata from the GitHub API.
    if (path === '/add-skill') {
      const { searchParams } = new URL(request.url);
      const ghUrl = searchParams.get('url');
      const category = searchParams.get('category') || 'ai-agent';
      if (!ghUrl) return Response.json({ error: 'url param required' }, { status: 400 });
      const m = ghUrl.match(/github\.com\/([^/]+)\/([^/#?]+)/i);
      if (!m) return Response.json({ error: 'invalid github url' }, { status: 400 });
      const owner = m[1];
      const repo = m[2].replace(/\.git$/, '');
      try {
        const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: ghHeaders() });
        if (!r.ok) return Response.json({ error: `GitHub returned ${r.status}` }, { status: 400 });
        const data = await r.json();
        const id = uuidv4();
        // Only assign slug on first insert — never overwrite an existing one.
        const existing = await database.collection('skills').findOne({ github_url: data.html_url }, { projection: { slug: 1 } });
        const slug = existing?.slug || await uniqueSlug(database, data.name, owner);
        const doc = {
          id,
          slug,
          name: data.name,
          description: data.description || '',
          category,
          price: 0,
          rating: Math.min(5, (data.stargazers_count / 1000) + 3.5),
          installs: Math.floor(data.stargazers_count * 2.5),
          source_url: ghUrl,
          github_url: data.html_url,
          github_stars: data.stargazers_count,
          github_forks: data.forks_count,
          github_topics: data.topics || [],
          popularity_score: data.stargazers_count + data.forks_count * 5,
          creator: owner,
          creator_avatar: `https://github.com/${owner}.png`,
          is_premium: false,
          readme_preview: data.description || '',
          language: data.language,
          last_updated: data.pushed_at,
          created_at: data.created_at,
          updated_at: new Date(),
          added_at: new Date(),
          published: true, // manually added = trust the curator
          rewrite_status: 'pending',
          stars_refreshed_at: new Date(),
        };
        await database.collection('skills').updateOne(
          { github_url: data.html_url },
          { $set: doc },
          { upsert: true }
        );
        return Response.json({ success: true, id, name: data.name, stars: data.stargazers_count, category });
      } catch (e) {
        return Response.json({ error: String(e.message || e) }, { status: 500 });
      }
    }

    // Bulk-publish all real skills in a category — for fresh content areas where
    // the LLM rewrite queue is rate-limited but the GitHub data is already real.
    // ?category=performance-marketing publishes every skill in that category with
    // github_stars > 0 (proof the repo exists). Rewrites fill in polish later.
    if (path === '/publish-category') {
      const { searchParams } = new URL(request.url);
      const cat = searchParams.get('category');
      if (!cat) return Response.json({ error: 'category param required' }, { status: 400 });
      const r = await database.collection('skills').updateMany(
        { category: cat, published: false, github_stars: { $gt: 0 } },
        { $set: { published: true } }
      );
      const nowPublished = await database.collection('skills').countDocuments({ category: cat, published: { $ne: false } });
      return Response.json({ success: true, category: cat, published: r.modifiedCount, totalPublishedInCategory: nowPublished });
    }

    // Refresh live GitHub star/fork counts so displayed numbers don't drift stale.
    // Processes the least-recently-refreshed skills first (capped per run), so the
    // daily cron rotates through the whole catalog over a few runs. Honest by design:
    // we only ever store the real number GitHub returns.
    if (path === '/refresh-stars') {
      const { searchParams } = new URL(request.url);
      const max = Math.min(120, parseInt(searchParams.get('max') || '60', 10));
      const skills = await database.collection('skills')
        .find({ github_url: { $exists: true, $ne: null } })
        .sort({ stars_refreshed_at: 1 }) // missing field sorts first → never-refreshed go first
        .limit(max)
        .toArray();

      let refreshed = 0, skipped = 0, changed = 0, hidden = 0;
      for (const s of skills) {
        const m = (s.github_url || '').match(/github\.com\/([^/]+)\/([^/#?]+)/i);
        if (!m) { skipped++; continue; }
        const owner = m[1];
        const repo = m[2].replace(/\.git$/, '');
        try {
          const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: ghHeaders() });
          // Repo deleted/renamed → hide from the catalog (reversible) so we never show a dead link.
          if (r.status === 404) {
            await database.collection('skills').updateOne(
              { id: s.id },
              { $set: { published: false, dead_repo: true, stars_refreshed_at: new Date() } }
            );
            hidden++; continue;
          }
          if (!r.ok) { skipped++; continue; }
          const data = await r.json();
          if (typeof data.stargazers_count !== 'number') { skipped++; continue; }
          const set = {
            github_stars: data.stargazers_count,
            github_forks: data.forks_count ?? s.github_forks ?? 0,
            stars_refreshed_at: new Date(),
            dead_repo: false,
          };
          if (data.pushed_at) set.last_updated = data.pushed_at;
          if (data.stargazers_count !== s.github_stars) changed++;
          await database.collection('skills').updateOne({ id: s.id }, { $set: set });
          refreshed++;
        } catch { skipped++; }
        await new Promise((res) => setTimeout(res, process.env.GITHUB_TOKEN ? 120 : 800));
      }

      return Response.json({
        success: true,
        message: `Refreshed ${refreshed} skill(s); ${changed} changed; hid ${hidden} dead repo(s).`,
        refreshed, changed, hidden, skipped, considered: skills.length,
      });
    }

    // De-duplicate skills: remove repeats by github_url and by normalized name,
    // keeping the highest-starred copy (tie-break: prefer an AI-rewritten one).
    if (path === '/dedupe') {
      const all = await database.collection('skills').find({}).toArray();
      const keyUrl = (s) => (s.github_url || '').trim().toLowerCase().replace(/\/+$/, '');
      const keyName = (s) => (s.name_original || s.name || '').trim().toLowerCase();
      const score = (s) =>
        (s.github_stars || 0) + (String(s.rewritten_by || '').match(/openrouter|anthropic|claude/) ? 1e9 : 0);

      const removeIds = new Set();
      for (const keyFn of [keyUrl, keyName]) {
        const groups = {};
        for (const s of all) {
          if (removeIds.has(s.id)) continue;
          const k = keyFn(s);
          if (!k) continue;
          (groups[k] = groups[k] || []).push(s);
        }
        for (const k in groups) {
          const grp = groups[k];
          if (grp.length < 2) continue;
          grp.sort((a, b) => score(b) - score(a)); // best first
          grp.slice(1).forEach((s) => removeIds.add(s.id)); // remove the rest
        }
      }

      const removed = [];
      for (const s of all) {
        if (removeIds.has(s.id)) removed.push({ name: s.name_original || s.name, url: s.github_url });
      }
      if (removeIds.size > 0) {
        await database.collection('skills').deleteMany({ id: { $in: [...removeIds] } });
      }
      const remaining = await database.collection('skills').countDocuments();
      return Response.json({ success: true, removedCount: removeIds.size, removed, remaining });
    }

    // Stats endpoint
    if (path === '/stats') {
      const totalSkills = await database.collection('skills').countDocuments();
      const categories = await database.collection('skills').aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]).toArray();

      const [agentsBuilt, subscriberCount, memberCount, publishedSkills] = await Promise.all([
        database.collection('agent_templates').countDocuments(),
        database.collection('subscribers').countDocuments(),
        database.collection('members').countDocuments(),
        database.collection('skills').countDocuments({ published: { $ne: false } }),
      ]);

      return Response.json({
        totalSkills,
        categories: categories.reduce((acc, cat) => {
          acc[cat._id] = cat.count;
          return acc;
        }, {}),
        agentsBuilt,
        communitySize: subscriberCount + memberCount,
        publishedSkills,
      });
    }
    
    // Get all personas
    if (path === '/personas') {
      const personas = await database.collection('personas')
        .find({})
        .sort({ created_at: -1 })
        .toArray();
      
      return Response.json({ personas });
    }
    
    // Get persona by ID
    if (path.startsWith('/personas/')) {
      const id = path.split('/')[2];
      const persona = await database.collection('personas').findOne({ id });
      
      if (!persona) {
        return Response.json({ error: 'Persona not found' }, { status: 404 });
      }
      
      // Fetch the skills in this persona
      const skills = await database.collection('skills')
        .find({ id: { $in: persona.skillIds } })
        .toArray();
      
      return Response.json({ persona, skills });
    }
    
    // Get all packs
    if (path === '/packs') {
      const packs = await database.collection('skill_packs')
        .find({})
        .sort({ created_at: -1 })
        .toArray();
      
      return Response.json({ packs });
    }
    
    // Get pack by ID with skills
    if (path.startsWith('/packs/')) {
      const id = path.split('/')[2];
      const pack = await database.collection('skill_packs').findOne({ id });
      
      if (!pack) {
        return Response.json({ error: 'Pack not found' }, { status: 404 });
      }
      
      // Fetch the skills in this pack
      const skills = await database.collection('skills')
        .find({ id: { $in: pack.skillIds } })
        .toArray();
      
      return Response.json({ pack, skills });
    }
    
    // Get all playbooks
    if (path === '/playbooks') {
      const playbooks = await database.collection('playbooks')
        .find({})
        .sort({ created_at: -1 })
        .toArray();
      
      return Response.json({ playbooks });
    }
    
    // Get playbook by ID with skills
    if (path.startsWith('/playbooks/')) {
      const id = path.split('/')[2];
      const playbook = await database.collection('playbooks').findOne({ id });
      
      if (!playbook) {
        return Response.json({ error: 'Playbook not found' }, { status: 404 });
      }
      
      // Fetch the skills in this playbook
      const skills = await database.collection('skills')
        .find({ id: { $in: playbook.skillIds } })
        .toArray();
      
      return Response.json({ playbook, skills });
    }
    
    // Get the current device's saved agents (lightweight account)
    if (path === '/my-agents') {
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get('userId');
      if (!userId) return Response.json({ agents: [] });

      const agents = await database.collection('agent_templates')
        .find({ userId })
        .sort({ created_at: -1 })
        .toArray();

      return Response.json({ agents });
    }

    // Get public agent templates
    if (path === '/agents') {
      const { searchParams } = new URL(request.url);
      const sort = searchParams.get('sort');
      const sortSpec = sort === 'new' ? { created_at: -1 } : { copyCount: -1, remixCount: -1, created_at: -1 };
      const agents = await database.collection('agent_templates')
        .find({ isPublic: true })
        .sort(sortSpec)
        .limit(60)
        .toArray();
      return Response.json({ agents });
    }

    // Match a problem (or any query) to the most relevant published skills
    if (path === '/match') {
      const { searchParams } = new URL(request.url);
      const q = (searchParams.get('q') || '').toLowerCase();
      const category = searchParams.get('category') || '';
      const catMap = {
        Sales: ['sales'], Marketing: ['marketing'], Support: ['support'],
        Ops: ['automation', 'devtools', 'mcp-server'], Finance: ['analytics'],
        Product: ['ai-agent', 'saas-starter', 'multi-agent'],
      };
      const cats = catMap[category] || [];
      const words = q.split(/[^a-z0-9]+/).filter((w) => w.length > 3);
      const skills = await database.collection('skills').find({ published: { $ne: false } }).toArray();
      const scored = skills
        .map((s) => {
          const hay = `${s.title_human || ''} ${s.name || ''} ${s.description_human || s.description || ''} ${(s.github_topics || []).join(' ')}`.toLowerCase();
          let score = 0;
          if (cats.includes(s.category)) score += 5;
          for (const w of words) if (hay.includes(w)) score += 2;
          score += Math.min(2, (s.github_stars || 0) / 50000);
          return { s, score };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      return Response.json({
        matches: scored.map((x) => ({ id: x.s.id, title: x.s.title_human || x.s.name, category: x.s.category, stars: x.s.github_stars || 0 })),
      });
    }

    // Problems board — founders post workflow bottlenecks (the demand side)
    if (path === '/problems') {
      const { searchParams } = new URL(request.url);
      const cat = searchParams.get('category');
      const q = {};
      if (cat && cat !== 'all') q.category = cat;
      const problems = await database.collection('problems')
        .find(q)
        .sort({ upvotes: -1, created_at: -1 })
        .limit(120)
        .toArray();
      return Response.json({ problems });
    }

    // Admin: review submitted deals + approve them (id=all approves every pending)
    if (path === '/approve-deals') {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      if (id && id !== 'all') {
        await database.collection('deals').updateOne({ id }, { $set: { approved: true } });
      } else if (id === 'all') {
        await database.collection('deals').updateMany({ approved: false }, { $set: { approved: true } });
      }
      const pending = await database.collection('deals').find({ approved: false }).sort({ created_at: -1 }).toArray();
      return Response.json({
        pending: pending.map((d) => ({ id: d.id, tool: d.tool, company: d.company, dealType: d.dealType, savingsPct: d.savingsPct, contactEmail: d.contactEmail, link: d.link })),
      });
    }

    // Top tool-deal requests (founders vote for deals they want — your demand radar)
    if (path === '/deals/requests') {
      const requests = await database.collection('deal_requests')
        .find({})
        .sort({ votes: -1, created_at: -1 })
        .limit(30)
        .toArray();
      return Response.json({ requests: requests.map((r) => ({ id: r.id, tool: r.tool, votes: r.votes || 1 })) });
    }

    // Admin demand dashboard — reservations per deal + top requests + emails to pitch vendors
    if (path === '/demand') {
      const denied = requireAdmin(request);
      if (denied) return denied;
      const deals = await database.collection('deals').find({}).toArray();
      const interest = await database.collection('deal_interest').find({}).toArray();
      const byDeal = {};
      for (const i of interest) (byDeal[i.dealId] = byDeal[i.dealId] || []).push(i.email);
      const requests = await database.collection('deal_requests').find({}).sort({ votes: -1 }).limit(30).toArray();
      return Response.json({
        deals: deals.map((d) => ({
          id: d.id, tool: d.tool, status: d.status || (d.approved === false ? 'pending' : 'open'),
          slotsTaken: d.slotsTaken || 0, slotsTotal: d.slotsTotal,
          reservations: (byDeal[d.id] || []).length, reservationEmails: byDeal[d.id] || [],
        })).sort((a, b) => b.reservations - a.reservations),
        topRequests: requests.map((r) => ({ tool: r.tool, votes: r.votes || 1 })),
      });
    }

    // Admin — all deals (including unapproved) for /admin Deals tab
    if (path === '/deals/all') {
      const deals = await database.collection('deals')
        .find({})
        .sort({ created_at: -1 })
        .toArray();
      return Response.json({ deals });
    }

    // Admin — list all Done-for-You requests
    if (path === '/dfy-requests') {
      const requests = await database.collection('dfy_requests')
        .find({})
        .sort({ created_at: -1 })
        .toArray();
      return Response.json({ requests, count: requests.length });
    }

    // Admin — DfY pipeline stats and revenue
    if (path === '/dfy-stats') {
      const all = await database.collection('dfy_requests').find({}).toArray();
      const stats = { new: 0, contacted: 0, quoted: 0, paid: 0, delivered: 0, declined: 0, totalPaidUsd: 0 };
      for (const r of all) {
        const st = r.status || 'new';
        if (stats[st] !== undefined) stats[st]++;
        if (r.paid) stats.totalPaidUsd += (typeof r.paid_amount_usd === 'number' ? r.paid_amount_usd : 99);
      }
      return Response.json(stats);
    }

    // Group-buy / affiliate tool deals (only approved ones show publicly)
    if (path === '/deals') {
      const deals = await database.collection('deals')
        .find({ approved: { $ne: false } })
        .sort({ featured: -1, created_at: -1 })
        .toArray();
      return Response.json({
        deals: deals.map((d) => ({
          id: d.id, tool: d.tool, category: d.category, blurb: d.blurb,
          retailPrice: d.retailPrice, groupPrice: d.groupPrice, savingsPct: d.savingsPct,
          slotsTotal: d.slotsTotal, slotsTaken: d.slotsTaken, featured: !!d.featured,
          dealType: d.dealType || 'groupbuy', link: d.link || null, code: d.code || null,
        })),
      });
    }

    // Featured members directory (LinkedIn-based community)
    if (path === '/members') {
      const { searchParams } = new URL(request.url);
      const cat = searchParams.get('category');
      const q = { approved: { $ne: false } };
      if (cat && cat !== 'all') q.category = cat;
      const members = await database.collection('members')
        .find(q)
        .sort({ featured: -1, created_at: -1 })
        .limit(300)
        .toArray();
      // Don't leak internal moderation fields beyond what's needed
      return Response.json({
        members: members.map((m) => ({
          id: m.id, name: m.name, category: m.category, headline: m.headline,
          country: m.country, linkedinUrl: m.linkedinUrl, builds: m.builds,
          featured: !!m.featured, created_at: m.created_at,
        })),
      });
    }

    // A single creator's payout status + earnings (for the /earnings page)
    if (path === '/creator') {
      const { searchParams } = new URL(request.url);
      const handle = (searchParams.get('handle') || '').replace(/^@/, '');
      if (!handle) return Response.json({ connected: false, earnings: 0, salesCount: 0 });
      const c = await database.collection('creators').findOne({ key: handle });
      const paidAgents = await database.collection('agent_templates')
        .find({ creatorName: handle, isPaid: true })
        .project({ id: 1, name: 1, price: 1, sales: 1, revenue: 1 })
        .toArray();
      return Response.json({
        connected: !!c?.stripeAccountId,
        earnings: c?.earnings || 0,
        salesCount: c?.salesCount || 0,
        paidAgents,
      });
    }

    // Creators leaderboard — aggregate public agents by handle
    if (path === '/creators') {
      const rows = await database.collection('agent_templates').aggregate([
        { $match: { isPublic: true } },
        {
          $group: {
            _id: { $ifNull: ['$creatorName', 'anonymous'] },
            agents: { $sum: 1 },
            copies: { $sum: { $ifNull: ['$copyCount', 0] } },
            remixes: { $sum: { $ifNull: ['$remixCount', 0] } },
          },
        },
        { $sort: { copies: -1, remixes: -1, agents: -1 } },
        { $limit: 20 },
      ]).toArray();
      return Response.json({
        creators: rows.map((r) => ({ handle: r._id, agents: r.agents, copies: r.copies, remixes: r.remixes })),
      });
    }
    
    // Get agent template by ID
    if (path.startsWith('/agents/')) {
      const id = path.split('/')[2];
      const agent = await database.collection('agent_templates').findOne({ id, isPublic: true });

      if (!agent) {
        return Response.json({ error: 'Agent not found' }, { status: 404 });
      }

      // Fetch the skills
      const skills = await database.collection('skills')
        .find({ id: { $in: agent.skillIds } })
        .toArray();

      return Response.json({ agent, skills });
    }

    // List creator outreach leads — emails discovered by /find-creators
    if (path === '/creator-leads') {
      const leads = await database.collection('creator_leads')
        .find({})
        .sort({ stars: -1 })
        .limit(200)
        .toArray()
      return Response.json({ leads, count: leads.length })
    }

    if (path === '/audit-log') {
      const logs = await database.collection('audit_logs').find({}).sort({ at: -1 }).limit(100).toArray()
      return Response.json({ logs, count: logs.length })
    }

    // Security monitoring — on-demand DNS drift check (admin)
    if (path === '/security/dns-check') {
      const result = await checkDnsBaseline()
      return Response.json(result)
    }

    // Security monitoring — admin auth anomaly summary (admin)
    if (path === '/security/audit-summary') {
      const result = await auditAnomalyCheck(database)
      return Response.json(result)
    }

    // Security monitoring — full check on demand (admin), emails if drift/anomaly
    if (path === '/security/run-now') {
      const dns = await checkDnsBaseline()
      const audit = await auditAnomalyCheck(database)
      let alert = { sent: false, reason: 'no_findings' }
      if (!dns.ok || !audit.ok) {
        const lines = []
        if (!dns.ok) lines.push('DNS drift:', JSON.stringify(dns.drift, null, 2))
        if (!audit.ok) lines.push('Audit anomalies:', JSON.stringify(audit.flags, null, 2))
        alert = await sendSecurityAlert('Manual run — anomaly detected', lines.join('\n\n'))
      }
      await database.collection('security_runs').insertOne({ id: uuidv4(), at: new Date(), source: 'manual', dns, audit, alert })
      return Response.json({ dns, audit, alert })
    }

    // Cron-triggered daily security monitor. Protected by CRON_SECRET header so
    // the URL alone can't trigger emails. Vercel cron includes the secret.
    if (path === '/cron/security-monitor') {
      const cronSecret = process.env.CRON_SECRET
      const provided = request.headers.get('authorization') || ''
      if (cronSecret && provided !== `Bearer ${cronSecret}`) {
        return Response.json({ error: 'Unauthorized — cron secret required' }, { status: 401 })
      }
      const dns = await checkDnsBaseline()
      const audit = await auditAnomalyCheck(database)
      let alert = { sent: false, reason: 'no_findings' }
      if (!dns.ok || !audit.ok) {
        const lines = [`Time: ${new Date().toISOString()}`, '']
        if (!dns.ok) { lines.push('━━ DNS DRIFT ━━'); lines.push(JSON.stringify(dns.drift, null, 2)); lines.push('') }
        if (!audit.ok) { lines.push('━━ AUDIT ANOMALIES ━━'); lines.push(JSON.stringify(audit.flags, null, 2)); lines.push(''); lines.push(`Window: ${audit.windowStart} → now`); lines.push(`Events: ${audit.totalEvents} | Unique IPs: ${audit.uniqueIps} | Denied: ${audit.denied}`) }
        lines.push('', '— WorkflowStacks Security Monitor')
        alert = await sendSecurityAlert('Daily check — anomaly detected', lines.join('\n'))
      }
      await database.collection('security_runs').insertOne({ id: uuidv4(), at: new Date(), source: 'cron', dns, audit, alert })
      return Response.json({ ok: true, dns: { ok: dns.ok, drift: dns.drift }, audit: { ok: audit.ok, flags: audit.flags }, alert })
    }

    if (path === '/admin-overview') {
      const [skills, published, agents, subs, members, problems, deals, leads, apps, sendsToday] = await Promise.all([
        database.collection('skills').countDocuments(),
        database.collection('skills').countDocuments({ published: { $ne: false } }),
        database.collection('agent_templates').countDocuments(),
        database.collection('subscribers').countDocuments(),
        database.collection('members').countDocuments(),
        database.collection('problems').countDocuments(),
        database.collection('deals').countDocuments(),
        database.collection('creator_leads').countDocuments(),
        database.collection('creator_applications').countDocuments({ status: 'pending' }),
        database.collection('newsletter_sends').countDocuments({ sent_at: { $gte: new Date(Date.now() - 24*60*60*1000) } }),
      ])
      return Response.json({ skills, published, agents, subs, members, problems, deals, leads, pendingApps: apps, sendsToday })
    }

    if (path === '/subscribers') {
      const subs = await database.collection('subscribers').find({}).sort({ created_at: -1 }).limit(500).toArray()
      return Response.json({ subscribers: subs, count: subs.length })
    }

    if (path === '/newsletter/preview') {
      const sevenDaysAgo = new Date(Date.now() - 7*24*60*60*1000)
      const recentSends = await database.collection('newsletter_sends').find({ sent_at: { $gte: sevenDaysAgo } }).toArray()
      const recentIds = new Set(recentSends.map(s => s.skill_id))
      const candidates = await database.collection('skills')
        .find({ published: { $ne: false }, id: { $nin: [...recentIds] } })
        .sort({ github_stars: -1 })
        .limit(5)
        .toArray()
      const pick = candidates[0] || (await database.collection('skills').findOne({ published: { $ne: false } }, { sort: { github_stars: -1 } }))
      const subCount = await database.collection('subscribers').countDocuments()
      return Response.json({ pick, candidates: candidates.slice(0, 5), subscriberCount: subCount })
    }

    if (path === '/newsletter/sends') {
      const sends = await database.collection('newsletter_sends').find({}).sort({ sent_at: -1 }).limit(50).toArray()
      return Response.json({ sends, count: sends.length })
    }

    // Admin: list all creator applications (sorted newest first)
    if (path === '/creator-applications') {
      const applications = await database.collection('creator_applications')
        .find({})
        .sort({ created_at: -1 })
        .toArray();
      return Response.json({ applications });
    }

    // Admin: send skill-of-the-day newsletter via Resend
    if (path === '/newsletter/send') {
      const subscribers = await database.collection('subscribers').find({}).toArray();
      if (subscribers.length === 0) {
        return Response.json({ ok: false, message: 'No subscribers yet.' });
      }

      // Pick a skill not sent in last 7 days, prefer highest stars
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentSends = await database.collection('newsletter_sends')
        .find({ sent_at: { $gte: sevenDaysAgo } })
        .toArray();
      const recentSkillIds = recentSends.map((s) => s.skill_id);

      let skill = await database.collection('skills').findOne(
        { published: { $ne: false }, id: { $nin: recentSkillIds } },
        { sort: { github_stars: -1 } }
      );
      // Fallback: all have been sent recently — pick the most-starred overall
      if (!skill) {
        skill = await database.collection('skills').findOne(
          { published: { $ne: false } },
          { sort: { github_stars: -1 } }
        );
      }
      if (!skill) {
        return Response.json({ ok: false, message: 'No published skills found.' });
      }

      const skillName = skill.title_human || skill.name;
      const whatItDoes = (skill.use_guide && skill.use_guide.whatItDoes) || skill.description_human || skill.description || '';
      const installCmd = (skill.use_guide && skill.use_guide.install) ? skill.use_guide.install : null;
      const stars = skill.github_stars || 0;
      const ctaUrl = `https://claude.ai/new?q=${encodeURIComponent('Act as ' + skillName + '. ' + whatItDoes)}`;
      const guideUrl = `https://workflowstacks.com/skills/${skill.slug || skill.id}`;

      let sentCount = 0;
      for (const sub of subscribers) {
        const unsubUrl = `https://workflowstacks.com/unsubscribe?email=${encodeURIComponent(sub.email)}`;
        const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WorkflowStacks</title></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e5e5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <tr><td style="text-align:center;padding-bottom:32px;">
      <span style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px;">WorkflowStacks</span>
    </td></tr>
    <tr><td style="background:#1a1a1a;border-radius:12px;padding:32px;">
      <p style="margin:0 0 8px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:1px;">Today's top AI skill</p>
      <h1 style="margin:0 0 16px;font-size:28px;font-weight:700;color:#fff;line-height:1.2;">${skillName}</h1>
      <p style="margin:0 0 24px;font-size:16px;color:#ccc;line-height:1.6;">${whatItDoes}</p>
      ${installCmd ? `<div style="background:#0f0f0f;border-radius:8px;padding:14px 16px;margin-bottom:24px;"><code style="font-family:monospace;font-size:13px;color:#6ee7b7;">${installCmd}</code></div>` : ''}
      <p style="margin:0 0 24px;font-size:14px;color:#888;">⭐ ${stars.toLocaleString()} stars on GitHub</p>
      <a href="${ctaUrl}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:8px;margin-bottom:12px;">Open in Claude →</a>
      <br>
      <a href="${guideUrl}" style="display:inline-block;margin-top:8px;font-size:14px;color:#888;text-decoration:underline;">View full guide</a>
    </td></tr>
    <tr><td style="text-align:center;padding-top:24px;font-size:12px;color:#555;line-height:1.6;">
      You're receiving this because you subscribed to WorkflowStacks.<br>
      <a href="${unsubUrl}" style="color:#555;">Unsubscribe</a>
    </td></tr>
  </table>
</body>
</html>`;

        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: 'WorkflowStacks <newsletter@workflowstacks.com>',
              to: sub.email,
              subject: `🔧 Skill of the Day: ${skillName}`,
              html,
            }),
          });
          sentCount++;
        } catch (e) {
          console.error('Resend error for', sub.email, e.message);
        }
      }

      await database.collection('newsletter_sends').insertOne({
        skill_id: skill.id,
        sent_at: new Date(),
        recipient_count: sentCount,
      });

      return Response.json({ ok: true, sent: sentCount, skill: skill.name });
    }

    // Admin: discover creator leads from skills with github_url + creator field
    if (path === '/find-creators') {
      const skills = await database.collection('skills')
        .find({ github_url: { $exists: true, $ne: null }, creator: { $exists: true, $ne: null } })
        .limit(50)
        .toArray();

      let discovered = 0;
      let withEmail = 0;

      for (const s of skills) {
        const username = (s.creator || '').toString().trim();
        if (!username) continue;

        // Skip if already a creator or has applied
        const [existingCreator, existingApp] = await Promise.all([
          database.collection('creators').findOne({ id: username }),
          database.collection('creator_applications').findOne({ github: username }),
        ]);
        if (existingCreator || existingApp) continue;

        // Check GitHub for public email
        let email = null;
        try {
          const r = await fetch(`https://api.github.com/users/${username}`, { headers: ghHeaders() });
          if (r.ok) {
            const ghUser = await r.json();
            if (ghUser.email) email = ghUser.email;
          }
        } catch (e) {
          console.error('GitHub user fetch error:', username, e.message);
        }

        // Upsert into creator_leads
        await database.collection('creator_leads').updateOne(
          { creator_username: username, skill_id: s.id },
          {
            $setOnInsert: {
              creator_username: username,
              email: email || null,
              skill_name: s.name,
              skill_id: s.id,
              github_url: s.github_url,
              stars: s.github_stars || 0,
              status: 'discovered',
              created_at: new Date(),
            },
          },
          { upsert: true }
        );

        discovered++;
        if (email) withEmail++;

        // Respect GitHub rate limits
        await new Promise((res) => setTimeout(res, process.env.GITHUB_TOKEN ? 200 : 1000));
      }

      return Response.json({ discovered, with_email: withEmail });
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
    
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { pathname } = new URL(request.url);
  const path = pathname.replace('/api', '') || '/';

  try {
    // Gate admin/expensive endpoints. Log denied attempts so brute-force shows up.
    if (ADMIN_PATHS.includes(path)) {
      const denied = requireAdmin(request);
      if (denied) { try { const db = await connectDB(); await logAdminDenied(request, db, `POST ${path}`) } catch {} ; return denied; }
    }

    const database = await connectDB();
    if (ADMIN_PATHS.includes(path)) await logAdmin(request, database, `POST ${path}`);

    if (path === '/skill-update') {
      const body = await request.json().catch(() => ({}))
      const { id, set } = body
      if (!id || !set) return Response.json({ error: 'id and set required' }, { status: 400 })
      const allowed = ['title_human', 'description_human', 'category', 'published', 'is_premium', 'price', 'hidden_reason']
      const filtered = {}
      for (const k of allowed) if (k in set) filtered[k] = set[k]
      if (!Object.keys(filtered).length) return Response.json({ error: 'no allowed fields' }, { status: 400 })
      filtered.admin_updated_at = new Date()
      await database.collection('skills').updateOne({ id }, { $set: filtered })
      return Response.json({ success: true, updated: filtered })
    }

    if (path === '/creator-outreach/send') {
      const body = await request.json().catch(() => ({}))
      const { lead_id, subject, html } = body
      if (!lead_id || !subject || !html) return Response.json({ error: 'lead_id, subject, html required' }, { status: 400 })
      const lead = await database.collection('creator_leads').findOne({ _id: lead_id }) || await database.collection('creator_leads').findOne({ creator_username: lead_id })
      if (!lead || !lead.email) return Response.json({ error: 'lead not found or no email' }, { status: 404 })
      if (!process.env.RESEND_API_KEY) return Response.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'WorkflowStacks <hello@workflowstacks.com>',
          to: [lead.email],
          subject,
          html,
        }),
      })
      if (!r.ok) {
        const err = await r.text()
        return Response.json({ error: 'resend failed', detail: err.slice(0, 200) }, { status: 500 })
      }
      await database.collection('creator_leads').updateOne(
        { creator_username: lead.creator_username },
        { $set: { outreach_status: 'emailed', outreach_subject: subject, outreach_sent_at: new Date() } }
      )
      return Response.json({ success: true, sent_to: lead.email })
    }

    if (path === '/creator-leads/update') {
      const body = await request.json().catch(() => ({}))
      const { creator_username, status, note } = body
      if (!creator_username || !status) return Response.json({ error: 'creator_username and status required' }, { status: 400 })
      const valid = ['discovered', 'emailed', 'replied', 'declined', 'converted']
      if (!valid.includes(status)) return Response.json({ error: 'invalid status' }, { status: 400 })
      const set = { outreach_status: status, updated_at: new Date() }
      if (note) set.outreach_note = note
      await database.collection('creator_leads').updateOne({ creator_username }, { $set: set })
      return Response.json({ success: true })
    }

    // Seed packs and playbooks
    if (path === '/seed-packs') {
      // Get all skills, then pick coherent bundles by category
      const allSkills = await database.collection('skills').find({}).toArray();
      const pick = (cats, n) => {
        const ids = [];
        for (const c of cats) {
          for (const s of allSkills) if (s.category === c) ids.push(s.id);
        }
        // Fallback to any skills if a category bucket is empty
        if (ids.length === 0) allSkills.slice(0, n).forEach((s) => ids.push(s.id));
        return [...new Set(ids)].slice(0, n);
      };

      const packs = [
        {
          id: uuidv4(),
          name: 'Founder Launch Pack',
          description: 'Everything you need to validate and launch your startup idea quickly',
          audience: 'Founder',
          useCase: 'Product Launch',
          skillIds: pick(['saas-starter', 'ai-agent', 'automation'], 5),
          created_at: new Date()
        },
        {
          id: uuidv4(),
          name: 'Outbound Sales Pack',
          description: 'Master outbound sales with AI-powered research, outreach, and CRM',
          audience: 'Agency',
          useCase: 'Sales',
          skillIds: pick(['sales'], 4),
          created_at: new Date()
        },
        {
          id: uuidv4(),
          name: 'Content & Marketing Pack',
          description: 'Create, optimize, and distribute content at scale',
          audience: 'Creator',
          useCase: 'Content Creation',
          skillIds: pick(['marketing'], 4),
          created_at: new Date()
        },
        {
          id: uuidv4(),
          name: 'Developer Productivity Pack',
          description: 'Supercharge your coding and shipping workflow with AI',
          audience: 'Developer',
          useCase: 'Development',
          skillIds: pick(['devtools', 'saas-starter', 'mcp-server'], 4),
          created_at: new Date()
        }
      ];
      
      const playbooks = [
        {
          id: uuidv4(),
          title: 'Validate a New Offer in 48 Hours',
          description: 'Research, survey, and create landing pages to validate your business idea quickly',
          audience: 'Founder',
          useCase: 'Validation',
          problem: 'You have a business idea but don\'t know if people will pay for it',
          skillIds: pick(['ai-agent', 'analytics', 'marketing'], 3),
          created_at: new Date()
        },
        {
          id: uuidv4(),
          title: 'Idea Validation with Market Research',
          description: 'Comprehensive market research, competitor analysis, and customer discovery to validate your startup idea',
          audience: 'Founder',
          useCase: 'Market Research',
          problem: 'Need to validate your idea with real market data before building anything',
          skillIds: pick(['analytics', 'ai-agent', 'marketing'], 4),
          created_at: new Date()
        },
        {
          id: uuidv4(),
          title: 'Warm Outreach for B2B Leads',
          description: 'Build relationships and generate qualified leads through personalized outreach',
          audience: 'Agency',
          useCase: 'Lead Generation',
          problem: 'Cold outreach is getting ignored, you need warmer approaches',
          skillIds: pick(['sales'], 3),
          created_at: new Date()
        },
        {
          id: uuidv4(),
          title: 'Ship Your MVP in a Weekend',
          description: 'Use SaaS starters and automation to go from idea to live product fast',
          audience: 'Developer',
          useCase: 'Development',
          problem: 'You keep starting projects but never ship them to real users',
          skillIds: pick(['saas-starter', 'devtools', 'automation'], 3),
          created_at: new Date()
        }
      ];
      
      // Founder personas — curated bundles of skills for a role/goal
      const personas = [
        {
          id: uuidv4(),
          name: 'Solo Founder',
          description: 'Wear every hat: validate, build, market, and sell — with an AI stack that replaces a small team.',
          audience: 'Founder',
          skillIds: pick(['saas-starter', 'marketing', 'ai-agent'], 5),
          created_at: new Date()
        },
        {
          id: uuidv4(),
          name: 'Growth Marketer',
          description: 'Scale organic + paid: SEO content, social automation, and high-converting copy on autopilot.',
          audience: 'Marketer',
          skillIds: pick(['marketing'], 5),
          created_at: new Date()
        },
        {
          id: uuidv4(),
          name: 'Sales Closer',
          description: 'Fill the pipeline: lead research, personalized outreach, and follow-ups that book meetings.',
          audience: 'Sales',
          skillIds: pick(['sales'], 4),
          created_at: new Date()
        },
        {
          id: uuidv4(),
          name: 'Indie Hacker',
          description: 'Ship fast: SaaS starters, automation, and AI agents to launch a product in a weekend.',
          audience: 'Developer',
          skillIds: pick(['saas-starter', 'devtools', 'automation'], 5),
          created_at: new Date()
        }
      ];

      // Clear and insert
      await database.collection('skill_packs').deleteMany({});
      await database.collection('playbooks').deleteMany({});
      await database.collection('personas').deleteMany({});

      await database.collection('skill_packs').insertMany(packs);
      await database.collection('playbooks').insertMany(playbooks);
      await database.collection('personas').insertMany(personas);

      return Response.json({
        success: true,
        packs: packs.length,
        playbooks: playbooks.length,
        personas: personas.length
      });
    }
    
    // A founder requests a tool deal (demand radar — deduped, upvoted)
    if (path === '/deals/request') {
      const rl = rateLimit(request, 10, 60_000); if (rl) return rl;
      const body = await request.json();
      const tl = tooLong(body); if (tl) return Response.json({ error: tl }, { status: 400 })
      const tool = (body.tool || '').toString().trim().slice(0, 60);
      if (!tool) return Response.json({ success: false, error: 'Tool name required' }, { status: 400 });
      const norm = tool.toLowerCase();
      const existing = await database.collection('deal_requests').findOne({ norm });
      if (existing) {
        await database.collection('deal_requests').updateOne({ norm }, { $inc: { votes: 1 } });
      } else {
        await database.collection('deal_requests').insertOne({ id: uuidv4(), tool, norm, votes: 1, created_at: new Date() });
      }
      return Response.json({ success: true });
    }

    // Company submits a deal (self-serve supply side) — moderated before going live
    if (path === '/deals/submit') {
      const body = await request.json();
      const tool = (body.tool || '').toString().trim().slice(0, 80);
      const contactEmail = (body.contactEmail || '').toString().trim().toLowerCase();
      if (!tool || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail)) {
        return Response.json({ success: false, error: 'Tool name and a valid contact email are required' }, { status: 400 });
      }
      const retailPrice = parseFloat(body.retailPrice) || 0;
      const groupPrice = parseFloat(body.groupPrice) || 0;
      const savingsPct = retailPrice > 0 && groupPrice > 0
        ? Math.round((1 - groupPrice / retailPrice) * 100)
        : parseInt(body.savingsPct) || 0;
      const deal = {
        id: uuidv4(),
        tool,
        company: (body.company || '').toString().slice(0, 80),
        category: (body.category || 'Other').toString().slice(0, 40),
        blurb: (body.blurb || '').toString().slice(0, 220),
        dealType: body.dealType === 'affiliate' ? 'affiliate' : 'groupbuy',
        link: (body.link || '').toString().slice(0, 500) || null,
        code: (body.code || '').toString().slice(0, 40) || null,
        retailPrice, groupPrice, savingsPct,
        slotsTotal: Math.max(1, parseInt(body.slotsTotal) || 50),
        slotsTaken: 0,
        contactEmail,
        approved: false, // we review before it goes live
        submitted: true,
        created_at: new Date(),
      };
      await database.collection('deals').insertOne(deal);
      return Response.json({ success: true, message: 'Submitted! We review every deal before it goes live (usually within 48h).' });
    }

    // Post a workflow problem (demand side)
    if (path === '/problems') {
      const rl = rateLimit(request, 10, 60_000); if (rl) return rl;
      const body = await request.json();
      const tl = tooLong(body); if (tl) return Response.json({ error: tl }, { status: 400 })
      const title = (body.title || '').toString().trim().slice(0, 140);
      if (!title) return Response.json({ success: false, error: 'A problem title is required' }, { status: 400 });
      const problem = {
        id: uuidv4(),
        title,
        description: (body.description || '').toString().slice(0, 600),
        category: (body.category || 'Ops').toString().slice(0, 30),
        author: (body.author || 'anonymous').toString().replace(/^@/, '').slice(0, 30) || 'anonymous',
        upvotes: 1,
        created_at: new Date(),
      };
      await database.collection('problems').insertOne(problem);
      return Response.json({ success: true, problem });
    }

    if (path === '/problems/upvote') {
      const body = await request.json();
      if (!body.problemId) return Response.json({ success: false }, { status: 400 });
      await database.collection('problems').updateOne({ id: body.problemId }, { $inc: { upvotes: 1 } });
      return Response.json({ success: true });
    }

    // Express interest in a group-buy deal (staged — no payment yet)
    if (path === '/deals/join') {
      const rl = rateLimit(request, 10, 60_000); if (rl) return rl;
      const body = await request.json();
      const email = (body.email || '').toString().trim().toLowerCase();
      if (!body.dealId || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return Response.json({ success: false, error: 'Valid email + deal required' }, { status: 400 });
      }
      await database.collection('deal_interest').updateOne(
        { dealId: body.dealId, email },
        { $setOnInsert: { dealId: body.dealId, email, created_at: new Date() } },
        { upsert: true }
      );
      await database.collection('deals').updateOne({ id: body.dealId }, { $inc: { slotsTaken: 1 } });
      return Response.json({ success: true, message: "You're on the list — we'll email you when the deal unlocks." });
    }

    // Seed example group-buy deals (admin)
    if (path === '/seed-deals') {
      const deals = [
        { id: uuidv4(), tool: 'Perplexity Pro', category: 'Research', retailPrice: 240, groupPrice: 96, savingsPct: 60, slotsTotal: 50, slotsTaken: 0, status: 'open', featured: true, blurb: 'AI research & answers — annual seats at wholesale.', created_at: new Date() },
        { id: uuidv4(), tool: 'n8n Cloud (Pro)', category: 'Automation', retailPrice: 600, groupPrice: 300, savingsPct: 50, slotsTotal: 40, slotsTaken: 0, status: 'open', featured: true, blurb: 'Self-host-grade automation, hosted — group rate.', created_at: new Date() },
        { id: uuidv4(), tool: 'Apollo.io', category: 'Sales', retailPrice: 588, groupPrice: 235, savingsPct: 60, slotsTotal: 30, slotsTaken: 0, status: 'open', featured: false, blurb: 'B2B lead data + outreach — collective seats.', created_at: new Date() },
        { id: uuidv4(), tool: 'Framer Pro', category: 'Design', retailPrice: 360, groupPrice: 180, savingsPct: 50, slotsTotal: 25, slotsTaken: 0, status: 'open', featured: false, blurb: 'Ship landing pages fast — bundled annual.', created_at: new Date() },
      ];
      await database.collection('deals').deleteMany({});
      await database.collection('deals').insertMany(deals);
      return Response.json({ success: true, deals: deals.length });
    }

    // Become a featured member (LinkedIn-based, auto-listed, deduped)
    if (path === '/members/apply') {
      const rl = rateLimit(request, 10, 60_000); if (rl) return rl;
      const body = await request.json();
      const name = (body.name || '').toString().trim().slice(0, 80);
      const linkedinUrl = (body.linkedinUrl || '').toString().trim();
      if (!name || !linkedinUrl) {
        return Response.json({ success: false, error: 'Name and LinkedIn URL are required' }, { status: 400 });
      }
      if (!/^https?:\/\/(www\.)?linkedin\.com\//i.test(linkedinUrl)) {
        return Response.json({ success: false, error: 'Please enter a valid LinkedIn profile URL' }, { status: 400 });
      }
      const member = {
        id: uuidv4(),
        name,
        linkedinUrl,
        category: (body.category || 'Developer').toString().slice(0, 40),
        headline: (body.headline || '').toString().slice(0, 140),
        country: (body.country || '').toString().slice(0, 60),
        builds: (body.builds || '').toString().slice(0, 220),
        ref: (body.ref || '').toString().slice(0, 40) || null,
        approved: true, // auto-listed for virality; admin can feature/remove
        featured: false,
        created_at: new Date(),
      };
      // Dedupe by LinkedIn URL
      const res = await database.collection('members').updateOne(
        { linkedinUrl },
        { $setOnInsert: member },
        { upsert: true }
      );
      return Response.json({
        success: true,
        alreadyListed: res.upsertedCount === 0,
        id: member.id,
        message: res.upsertedCount === 0 ? "You're already in the directory!" : "You're in! Welcome to the network.",
      });
    }

    // Done-for-You — public request capture (rate-limited)
    if (path === '/dfy-request') {
      const rl = rateLimit(request, 10, 60_000); if (rl) return rl;
      const body = await request.json().catch(() => ({}));
      const tl = tooLong(body); if (tl) return Response.json({ error: tl }, { status: 400 });
      const { email, name, agent_goal, skill_ids, preferred_contact_time, tier } = body;
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return Response.json({ error: 'Valid email required' }, { status: 400 });
      const doc = {
        id: uuidv4(),
        email: email.toLowerCase().trim(),
        name: (name || '').trim().slice(0, 100),
        agent_goal: (agent_goal || '').slice(0, 1000),
        skill_ids: Array.isArray(skill_ids) ? skill_ids.slice(0, 30) : [],
        preferred_contact_time: (preferred_contact_time || '').slice(0, 200),
        tier: ['starter', 'pro', 'agency'].includes(tier) ? tier : 'starter',
        source: 'builder',
        status: 'new',
        paid: false,
        created_at: new Date(),
      };
      await database.collection('dfy_requests').insertOne(doc);
      // Best-effort confirmation email via Resend (silent fail if no key)
      if (process.env.RESEND_API_KEY) {
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'WorkflowStacks <hello@workflowstacks.com>',
              to: [email],
              subject: 'Done-for-You request received — we’ll confirm scope within 24h',
              html: `<div style="font-family:system-ui;max-width:560px;margin:0 auto;padding:24px;background:#0A0C0D;color:#ECEFEA"><h2 style="color:#C6F24E">Got it.</h2><p>Thanks for the Done-for-You request. We’ll review your agent goal and reply within 24h with a scoped plan and a one-time Stripe checkout link.</p><p style="color:#8B928D;font-size:14px">Your goal: <em>${(agent_goal || '(none)').slice(0, 200)}</em></p><p style="color:#8B928D;font-size:14px">— WorkflowStacks</p></div>`,
            }),
          });
        } catch {}
      }
      return Response.json({ ok: true, id: doc.id });
    }

    // Admin — update a DfY request (status, paid, notes, etc.)
    if (path === '/dfy-request/update') {
      const body = await request.json().catch(() => ({}));
      const { id, set } = body;
      if (!id || !set) return Response.json({ error: 'id and set required' }, { status: 400 });
      const allowed = ['status', 'paid', 'paid_at', 'paid_amount_usd', 'stripe_session_id', 'notes'];
      const filtered = {};
      for (const k of allowed) if (k in set) filtered[k] = set[k];
      if (!Object.keys(filtered).length) return Response.json({ error: 'no allowed fields' }, { status: 400 });
      if (filtered.status) {
        const validStatuses = ['new', 'contacted', 'quoted', 'paid', 'delivered', 'declined'];
        if (!validStatuses.includes(filtered.status)) return Response.json({ error: 'invalid status' }, { status: 400 });
      }
      // Auto-set paid_at when flipping paid to true (if not provided)
      if (filtered.paid === true && !filtered.paid_at) filtered.paid_at = new Date();
      filtered.admin_updated_at = new Date();
      await database.collection('dfy_requests').updateOne({ id }, { $set: filtered });
      return Response.json({ success: true, updated: filtered });
    }

    // Admin — update a single deal (affiliate link / approval / metadata)
    if (path === '/deal-update') {
      const body = await request.json().catch(() => ({}));
      const { id, set } = body;
      if (!id || !set) return Response.json({ error: 'id and set required' }, { status: 400 });
      const allowed = ['tool', 'category', 'blurb', 'dealType', 'link', 'code', 'savingsPct', 'retailPrice', 'groupPrice', 'slotsTotal', 'featured', 'approved'];
      const filtered = {};
      for (const k of allowed) if (k in set) filtered[k] = set[k];
      if (!Object.keys(filtered).length) return Response.json({ error: 'no allowed fields' }, { status: 400 });
      filtered.admin_updated_at = new Date();
      await database.collection('deals').updateOne({ id }, { $set: filtered });
      return Response.json({ success: true });
    }

    // Admin — seed affiliate-deal placeholders (each unapproved until link is filled in)
    if (path === '/seed-affiliate-deals') {
      const affiliatePlaceholders = [
        { tool: 'Cursor', category: 'Productivity', dealType: 'affiliate', blurb: 'AI code editor with built-in agents. 20% off first year for WorkflowStacks readers (apply for partner ID).', savingsPct: 20, link: 'https://cursor.com', code: '' },
        { tool: 'Perplexity Pro', category: 'Research', dealType: 'affiliate', blurb: 'AI search engine with sources. 1 free month + 20% off for paid plans.', savingsPct: 20, link: 'https://perplexity.ai/pro', code: '' },
        { tool: 'Notion', category: 'Productivity', dealType: 'affiliate', blurb: '6 months Notion AI free for founders.', savingsPct: 100, link: 'https://notion.so', code: '' },
        { tool: 'Linear', category: 'Productivity', dealType: 'affiliate', blurb: '3 months free on the Plus plan for early-stage founders.', savingsPct: 50, link: 'https://linear.app', code: '' },
        { tool: 'Vercel', category: 'Developer', dealType: 'affiliate', blurb: '$100 of platform credit for new accounts.', savingsPct: 30, link: 'https://vercel.com', code: '' },
        { tool: 'n8n Cloud', category: 'Automation', dealType: 'affiliate', blurb: '14-day free trial + 25% off annual plans.', savingsPct: 25, link: 'https://n8n.io', code: '' },
        { tool: 'Resend', category: 'Developer', dealType: 'affiliate', blurb: 'Transactional email. 3000 free/mo + 20% off paid plans.', savingsPct: 20, link: 'https://resend.com', code: '' },
        { tool: 'Replicate', category: 'Developer', dealType: 'affiliate', blurb: 'Run open-source AI models via API. $5 free credit.', savingsPct: 100, link: 'https://replicate.com', code: '' },
      ];
      let inserted = 0, skipped = 0;
      for (const p of affiliatePlaceholders) {
        const exists = await database.collection('deals').findOne({ tool: p.tool, dealType: 'affiliate' });
        if (exists) { skipped++; continue; }
        await database.collection('deals').insertOne({
          id: uuidv4(),
          ...p,
          slotsTotal: 0,
          slotsTaken: 0,
          featured: false,
          approved: false, // hidden until real affiliate link is dropped in via /admin
          created_at: new Date(),
        });
        inserted++;
      }
      return Response.json({ success: true, inserted, skipped, total: affiliatePlaceholders.length });
    }

    // Email subscribe — stores waitlist emails (deduped)
    if (path === '/subscribe') {
      const rl = rateLimit(request, 10, 60_000); if (rl) return rl;
      const body = await request.json();
      const tl = tooLong(body); if (tl) return Response.json({ error: tl }, { status: 400 })
      const email = (body.email || '').trim().toLowerCase();
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return Response.json({ success: false, error: 'Invalid email' }, { status: 400 });
      }
      await database.collection('subscribers').updateOne(
        { email },
        { $setOnInsert: { email, created_at: new Date() } },
        { upsert: true }
      );
      return Response.json({ success: true });
    }

    // Email unsubscribe — removes the email from the subscribers collection
    if (path === '/unsubscribe') {
      const { email } = await request.json().catch(() => ({}))
      if (!email) return Response.json({ error: 'Email required' }, { status: 400 })
      await database.collection('subscribers').deleteOne({ email: email.toLowerCase().trim() })
      return Response.json({ ok: true, message: 'Unsubscribed successfully.' })
    }

    // Upload skill
    if (path === '/upload') {
      const body = await request.json();

      // Basic validation
      if (!body.name || !body.description) {
        return Response.json({ success: false, error: 'Name and description are required' }, { status: 400 });
      }

      const name = String(body.name).slice(0, 120);
      const creator = body.creator || 'Anonymous';
      const slug = await uniqueSlug(database, name, creator);
      const skill = {
        id: uuidv4(),
        slug,
        name,
        description: String(body.description).slice(0, 500),
        category: body.category || 'ai-tool',
        price: parseFloat(body.price) || 0,
        source_url: body.source_url || '',
        github_stars: 0,
        creator,
        is_premium: body.price > 0,
        readme_preview: '',
        created_at: new Date(),
        added_at: new Date(),
        source: 'user',
        // Quality gate: user submissions are hidden until reviewed/rewritten
        published: false,
        rewrite_status: 'pending'
      };
      // Only set github_url when provided — avoids empty-string collisions on the
      // unique sparse index (which would reject a 2nd URL-less submission).
      if (body.github_url) skill.github_url = body.github_url;

      await database.collection('skills').insertOne(skill);

      return Response.json({
        success: true,
        skill,
        message: 'Submitted! Your skill is in review and will appear once approved.'
      });
    }
    
    // Create Agent Template
    if (path === '/agent-templates') {
      const body = await request.json();
      const { goal, selectedSkillIds, isPublic, userId, creatorName, price } = body;
      const agentPrice = Math.max(0, Math.min(999, parseFloat(price) || 0));

      if (!goal || !selectedSkillIds || selectedSkillIds.length === 0) {
        return Response.json({ 
          success: false, 
          error: 'Goal and at least one skill required' 
        }, { status: 400 });
      }
      
      // Fetch selected skills
      const selectedSkills = await database.collection('skills')
        .find({ id: { $in: selectedSkillIds } })
        .toArray();
      
      if (selectedSkills.length === 0) {
        return Response.json({ 
          success: false, 
          error: 'No valid skills found' 
        }, { status: 400 });
      }
      
      // Build agent blueprint
      let agentBlueprint = `You are an AI agent that helps with: ${goal}\n\n`;
      agentBlueprint += `Use the following skills to accomplish this goal:\n\n`;
      
      selectedSkills.forEach((skill, index) => {
        agentBlueprint += `---\n`;
        agentBlueprint += `Skill ${index + 1}: ${skill.name}\n`;
        agentBlueprint += `Category: ${skill.category}\n`;
        agentBlueprint += `Description: ${skill.description}\n\n`;
        
        if (skill.readme_preview) {
          agentBlueprint += `Instructions:\n${skill.readme_preview}\n\n`;
        }
        
        if (skill.github_url) {
          agentBlueprint += `Source: ${skill.github_url}\n`;
        }
        
        agentBlueprint += `\n`;
      });
      
      agentBlueprint += `---\n\n`;
      agentBlueprint += `Your task is to combine these ${selectedSkills.length} skills to: ${goal}\n\n`;
      agentBlueprint += `When responding:\n`;
      agentBlueprint += `1. Use the appropriate skill based on the user's request\n`;
      agentBlueprint += `2. Combine multiple skills when needed\n`;
      agentBlueprint += `3. Be helpful, accurate, and follow the instructions from each skill\n`;
      agentBlueprint += `4. If you need more information, ask the user\n`;
      
      // Create agent template record
      const template = {
        id: uuidv4(),
        name: goal.substring(0, 100),
        description: `Agent with ${selectedSkills.length} skills`,
        goal: goal,
        skillIds: selectedSkillIds,
        skills: selectedSkills.map(s => ({ id: s.id, name: s.name, category: s.category })),
        agentBlueprint: agentBlueprint,
        isPublic: isPublic || false,
        userId: userId || null,
        creatorName: (creatorName || '').toString().replace(/^@/, '').slice(0, 30) || 'anonymous',
        price: agentPrice,
        isPaid: agentPrice > 0,
        sales: 0,
        revenue: 0,
        copyCount: 0,
        remixCount: 0,
        created_at: new Date()
      };
      
      await database.collection('agent_templates').insertOne(template);
      
      return Response.json({ 
        success: true, 
        template 
      });
    }
    
    // Increment copy count for agent
    if (path === '/agent-templates/copy') {
      const body = await request.json();
      const { agentId } = body;

      await database.collection('agent_templates').updateOne(
        { id: agentId },
        { $inc: { copyCount: 1 } }
      );

      return Response.json({ success: true });
    }

    // React (thumbs-up) a skill — increments reactions_up, returns new count
    if (path.startsWith('/skills/') && path.endsWith('/react')) {
      const parts = path.split('/');
      // path is /skills/{id}/react → parts = ['', 'skills', id, 'react']
      const skillId = parts[2];
      if (!skillId) return Response.json({ error: 'Skill id required' }, { status: 400 });

      const result = await database.collection('skills').findOneAndUpdate(
        { id: skillId },
        { $inc: { reactions_up: 1 } },
        { returnDocument: 'after' }
      );
      if (!result) return Response.json({ error: 'Skill not found' }, { status: 404 });

      return Response.json({ ok: true, reactions_up: result.reactions_up || 1 });
    }

    // Creator application — anyone can apply to list their tools
    if (path === '/creator-apply') {
      const rl = rateLimit(request, 10, 60_000); if (rl) return rl;
      const body = await request.json();
      const tl = tooLong(body); if (tl) return Response.json({ error: tl }, { status: 400 })
      const email = (body.email || '').toString().trim().toLowerCase();
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return Response.json({ ok: false, error: 'Valid email is required' }, { status: 400 });
      }

      // Check for duplicate application
      const existing = await database.collection('creator_applications').findOne({ email });
      if (existing) {
        return Response.json({ ok: false, error: 'An application with this email already exists.' }, { status: 409 });
      }

      const application = {
        id: uuidv4(),
        name: (body.name || '').toString().trim().slice(0, 100),
        email,
        github: (body.github || '').toString().trim().slice(0, 60),
        twitter: (body.twitter || '').toString().trim().slice(0, 60),
        bio: (body.bio || '').toString().trim().slice(0, 500),
        what_you_want_to_list: (body.what_you_want_to_list || '').toString().trim().slice(0, 500),
        status: 'pending',
        created_at: new Date(),
      };

      await database.collection('creator_applications').insertOne(application);
      return Response.json({ ok: true, message: 'Application received! We review within 48 hours.' });
    }

    // Admin: approve a creator application, generate API key, upsert creator record
    if (path === '/creator-applications/approve') {
      const denied = requireAdmin(request);
      if (denied) return denied;

      const body = await request.json();
      const { id, notes } = body;
      if (!id) return Response.json({ error: 'Application id required' }, { status: 400 });

      const application = await database.collection('creator_applications').findOne({ id });
      if (!application) return Response.json({ error: 'Application not found' }, { status: 404 });

      const apiKey = uuidv4();
      const now = new Date();

      await database.collection('creator_applications').updateOne(
        { id },
        { $set: { status: 'approved', approved_at: now, api_key: apiKey, notes: notes || '' } }
      );

      await database.collection('creators').updateOne(
        { id },
        {
          $set: {
            id,
            name: application.name,
            email: application.email,
            github: application.github,
            api_key: apiKey,
            revenue_split: 0.85,
            approved_at: now,
            status: 'active',
          },
        },
        { upsert: true }
      );

      return Response.json({ ok: true, api_key: apiKey });
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
    
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}