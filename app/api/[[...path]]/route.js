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

const ADMIN_PATHS = ['/ingest', '/reclassify', '/dedupe', '/seed-packs', '/cleanup', '/seed-deals', '/approve-deals', '/refresh-stars', '/creator-applications', '/creator-applications/approve', '/newsletter/send', '/find-creators', '/publish-category'];

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

      // ?new=true — return the 8 most recently updated skills (freshest GitHub
      // pushes). Falls back to sort by last_updated since most skills share the
      // same added_at batch timestamp. "New" here means "active on GitHub recently."
      if (searchParams.get('new') === 'true') {
        const newSkills = await database.collection('skills')
          .find({ published: { $ne: false }, last_updated: { $exists: true } })
          .sort({ last_updated: -1, github_stars: -1 })
          .limit(8)
          .toArray();
        return Response.json({ skills: newSkills });
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
      const guideUrl = `https://workflowstacks.com/skills/${skill.id}`;

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
    
    // A founder requests a tool deal (demand radar — deduped, upvoted)
    if (path === '/deals/request') {
      const body = await request.json();
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
      const body = await request.json();
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
      const body = await request.json();
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