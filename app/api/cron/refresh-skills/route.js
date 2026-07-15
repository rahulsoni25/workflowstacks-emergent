import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { isSpamRepo, classifyContentType } from '../../../../lib/catalog-gates';

const client = new MongoClient(process.env.MONGO_URL);
let db;

async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db(process.env.DB_NAME || 'workflowstacks');
  }
  return db;
}

function ghHeaders(accept = 'application/vnd.github+json') {
  const headers = { 'Accept': accept, 'User-Agent': 'WorkflowStacks' };
  if (process.env.GITHUB_TOKEN) headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  return headers;
}

// Same scraper as ingest (token-optional, founder-focused, newest-first)
async function scrapeGitHub(topicQueries, opts = {}) {
  const { limit = 10, sort = 'updated', sinceDays = 120 } = typeof opts === 'number' ? { limit: opts } : opts;
  const skills = [];
  const seenRepos = new Set();
  const fetchReadmes = !!process.env.GITHUB_TOKEN;
  const cutoff = new Date(Date.now() - sinceDays * 86400000).toISOString().slice(0, 10);
  const ghSort = sort === 'stars' ? 'stars' : 'updated';

  for (const queryConfig of topicQueries) {
    try {
      const { query, category, minStars = 50 } = queryConfig;

      const dateFilter = `pushed:>=${cutoff}`;
      const searchQuery = `${query} ${dateFilter} stars:>${minStars}`;

      const response = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=${ghSort}&order=desc&per_page=${limit}`,
        { headers: ghHeaders() }
      );

      if (!response.ok) {
        if (response.status === 403) await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      const data = await response.json();

      for (const repo of data.items || []) {
        if (seenRepos.has(repo.full_name) || repo.archived) continue;
        seenRepos.add(repo.full_name);

        // Trust gate: never list fork-farms or account-automation spam
        if (isSpamRepo(repo)) continue;

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
          } catch (e) {}
        }

        const daysSinceUpdate = (Date.now() - new Date(repo.updated_at)) / (1000 * 60 * 60 * 24);
        const recencyBonus = daysSinceUpdate < 7 ? 20 : daysSinceUpdate < 30 ? 10 : 0;
        const starScore = Math.min(50, (repo.stargazers_count / 1000) * 10);
        const forkScore = Math.min(20, (repo.forks_count / 100) * 10);
        const popularityScore = starScore + forkScore + recencyBonus;

        const skill = {
          id: uuidv4(),
          name: repo.name,
          description: repo.description || 'No description available',
          category: category,
          content_type: classifyContentType(repo),
          price: 0,
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
          updated_at: new Date(repo.updated_at)
        };
        
        skills.push(skill);
      }
      
      await new Promise(resolve => setTimeout(resolve, process.env.GITHUB_TOKEN ? 300 : 1500));
    } catch (error) {
      console.error(`Error scraping query ${queryConfig.query}:`, error.message);
    }
  }

  return skills;
}

export async function GET(request) {
  // Fail-CLOSED auth. Accepts Vercel Cron's `Authorization: Bearer <CRON_SECRET>`,
  // or x-cron-secret / x-admin-secret. Denies if no secret is configured.
  const cronSecret = process.env.CRON_SECRET;
  const adminSecret = process.env.ADMIN_SECRET;
  const auth = request.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const provided = request.headers.get('x-cron-secret') || request.headers.get('x-admin-secret') || bearer;

  const ok =
    (cronSecret && provided === cronSecret) ||
    (adminSecret && provided === adminSecret);
  if (!ok) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const database = await connectDB();
    
    // Founder-focused queries spanning every niche — trending & maintained repos
    const topicQueries = [
      { query: 'topic:mcp-server OR model-context-protocol', category: 'mcp-server', minStars: 30 },
      { query: 'topic:claude-skill OR claude anthropic tool', category: 'claude-skill', minStars: 20 },
      { query: 'ai-agent OR autonomous-agent llm', category: 'ai-agent', minStars: 200 },
      { query: 'ai copywriting OR content-generation marketing', category: 'marketing', minStars: 80 },
      { query: 'seo tools OR topic:seo', category: 'marketing', minStars: 150 },
      { query: 'cold-email OR lead-generation OR outreach automation', category: 'sales', minStars: 50 },
      { query: 'open-source crm', category: 'sales', minStars: 200 },
      { query: 'saas boilerplate nextjs OR saas-starter', category: 'saas-starter', minStars: 200 },
      { query: 'workflow-automation OR n8n OR no-code', category: 'automation', minStars: 300 },
      { query: 'open-source product-analytics', category: 'analytics', minStars: 250 },
      { query: 'ai customer-support chatbot', category: 'support', minStars: 150 },
      { query: 'prompt-engineering OR awesome-prompts OR system-prompts', category: 'prompt', minStars: 300 },
      { query: 'awesome startup OR indie-hackers OR founder resources', category: 'founder-resource', minStars: 200 }
    ];

    console.log('🔄 Starting GitHub skill refresh...');
    const scrapedSkills = await scrapeGitHub(topicQueries, { limit: 8, sort: 'updated', sinceDays: 120 });

    // Safe upsert: refresh live metadata, add new repos, preserve curated fields
    let inserted = 0;
    for (const s of scrapedSkills) {
      const res = await database.collection('skills').updateOne(
        { github_url: s.github_url },
        {
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
            added_at: new Date()
          }
        },
        { upsert: true }
      );
      if (res.upsertedCount > 0) inserted++;
    }

    console.log(`✅ Refreshed ${scrapedSkills.length}, newly added ${inserted}`);

    return Response.json({
      success: true,
      scraped: scrapedSkills.length,
      newlyAdded: inserted,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Cron error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
