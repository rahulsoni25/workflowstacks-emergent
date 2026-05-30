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
  if (!secret) return null;
  const provided =
    request.headers.get('x-admin-secret') ||
    new URL(request.url).searchParams.get('secret');
  if (provided !== secret) {
    return Response.json({ error: 'Unauthorized — admin secret required' }, { status: 401 });
  }
  return null;
}

const ADMIN_PATHS = ['/ingest', '/reclassify', '/dedupe', '/seed-packs', '/cleanup'];

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

export async function GET(request) {
  const { pathname } = new URL(request.url);
  const path = pathname.replace('/api', '') || '/';

  try {
    // Gate admin/expensive endpoints
    if (ADMIN_PATHS.includes(path)) {
      const denied = requireAdmin(request);
      if (denied) return denied;
    }

    const database = await connectDB();

    // Root endpoint
    if (path === '/' || path === '') {
      return Response.json({ message: 'WorkflowStacks API v1.0' });
    }
    
    // Get all skills
    if (path === '/skills') {
      const { searchParams } = new URL(request.url);
      const category = searchParams.get('category');
      const search = searchParams.get('search');
      
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

      return Response.json({ skills });
    }
    
    // Get skill by ID
    if (path.startsWith('/skills/')) {
      const id = path.split('/')[2];
      const skill = await database.collection('skills').findOne({ id });
      
      if (!skill) {
        return Response.json({ error: 'Skill not found' }, { status: 404 });
      }
      
      return Response.json({ skill });
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
        { query: 'awesome startup OR indie-hackers OR founder resources', category: 'founder-resource', minStars: 200 }
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

      return Response.json({ skills });
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

      return Response.json({ skills });
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

      return Response.json({ skills });
    }
    
    // Re-classify skills into correct categories by keyword (fixes mis-tags)
    if (path === '/reclassify') {
      const classify = (s) => {
        const t = `${s.name} ${s.description || ''} ${(s.github_topics || []).join(' ')}`.toLowerCase();
        const has = (...kw) => kw.some((k) => t.includes(k));
        if (has('mcp', 'model-context-protocol')) return 'mcp-server';
        if (has('claude-skill', 'anthropic')) return 'claude-skill';
        if (has('prompt', 'awesome-prompts', 'system-prompt')) return 'prompt';
        if (has('puppeteer', 'playwright', 'selenium', 'scraper', 'scraping', 'browser-automation', 'testing', 'e2e', 'ansible', 'kubernetes', 'docker', 'devops', 'home-assistant')) return 'devtools';
        if (has('crm', 'lead', 'outreach', 'cold-email', 'cold email', 'sales', 'prospect', 'erp')) return 'sales';
        if (has('seo', 'marketing', 'copywriting', 'content-generation', 'social-media', 'social media', 'newsletter', 'ads')) return 'marketing';
        if (has('saas', 'boilerplate', 'starter', 'stripe', 'billing', 'subscription', 'template')) return 'saas-starter';
        if (has('n8n', 'workflow', 'automation', 'zapier', 'no-code', 'low-code')) return 'automation';
        if (has('analytics', 'dashboard', 'metrics', 'tracking', 'telemetry')) return 'analytics';
        if (has('support', 'chatbot', 'helpdesk', 'customer', 'ticketing')) return 'support';
        if (has('design', 'figma', 'ui-', 'icon', 'css', 'tailwind', 'component')) return 'design';
        if (has('rag', 'retrieval', 'agent', 'autonomous', 'llm', 'transformer', 'ollama', 'langchain')) return 'ai-agent';
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

    // Remove fake sample skills + test data (admin only)
    if (path === '/cleanup') {
      // Fake AgentPowers placeholder skills (not real GitHub repos)
      const fakes = await database.collection('skills').deleteMany({
        $or: [
          { creator: 'AgentPowers' },
          { github_url: { $regex: 'agentpowers', $options: 'i' } }
        ]
      });
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
      
      return Response.json({ 
        totalSkills,
        categories: categories.reduce((acc, cat) => {
          acc[cat._id] = cat.count;
          return acc;
        }, {})
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
      const agents = await database.collection('agent_templates')
        .find({ isPublic: true })
        .sort({ copyCount: -1, created_at: -1 })
        .toArray();
      
      // For each agent, get dominant audience from skills
      for (let agent of agents) {
        const skills = await database.collection('skills')
          .find({ id: { $in: agent.skillIds } })
          .toArray();
        agent.skills = skills;
      }
      
      return Response.json({ agents });
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
    // Gate admin/expensive endpoints
    if (ADMIN_PATHS.includes(path)) {
      const denied = requireAdmin(request);
      if (denied) return denied;
    }

    const database = await connectDB();

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
    
    // Email subscribe — stores waitlist emails (deduped)
    if (path === '/subscribe') {
      const body = await request.json();
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

    // Upload skill
    if (path === '/upload') {
      const body = await request.json();

      // Basic validation
      if (!body.name || !body.description) {
        return Response.json({ success: false, error: 'Name and description are required' }, { status: 400 });
      }

      const skill = {
        id: uuidv4(),
        name: String(body.name).slice(0, 120),
        description: String(body.description).slice(0, 500),
        category: body.category || 'ai-tool',
        price: parseFloat(body.price) || 0,
        source_url: body.source_url || '',
        github_stars: 0,
        creator: body.creator || 'Anonymous',
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
      const { goal, selectedSkillIds, isPublic, userId } = body;

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
        copyCount: 0,
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
    
    return Response.json({ error: 'Not found' }, { status: 404 });
    
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}