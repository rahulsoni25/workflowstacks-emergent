import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

const client = new MongoClient(process.env.MONGO_URL);
let db;

async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db(process.env.DB_NAME || 'workflowstacks');
  }
  return db;
}

// Same scraper as ingest
async function scrapeGitHub(topicQueries, limit = 10) {
  const skills = [];
  const seenRepos = new Set();
  
  for (const queryConfig of topicQueries) {
    try {
      const { query, category, minStars = 50 } = queryConfig;
      
      const dateFilter = 'created:>=2026-03-01';
      const searchQuery = `${query} ${dateFilter} stars:>${minStars}`;
      
      const response = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=stars&order=desc&per_page=${limit}`,
        {
          headers: {
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'WorkflowStacks',
            'Authorization': process.env.GITHUB_TOKEN ? `token ${process.env.GITHUB_TOKEN}` : undefined
          }
        }
      );
      
      if (!response.ok) continue;
      const data = await response.json();
      
      for (const repo of data.items || []) {
        if (seenRepos.has(repo.full_name) || repo.archived) continue;
        seenRepos.add(repo.full_name);
        
        let readmePreview = '';
        try {
          const readmeResponse = await fetch(
            `https://api.github.com/repos/${repo.full_name}/readme`,
            {
              headers: {
                'Accept': 'application/vnd.github.raw+json',
                'User-Agent': 'WorkflowStacks',
                'Authorization': process.env.GITHUB_TOKEN ? `token ${process.env.GITHUB_TOKEN}` : undefined
              }
            }
          );
          if (readmeResponse.ok) {
            const readmeText = await readmeResponse.text();
            readmePreview = readmeText.substring(0, 600);
          }
        } catch (e) {}
        
        const daysSinceUpdate = (Date.now() - new Date(repo.updated_at)) / (1000 * 60 * 60 * 24);
        const recencyBonus = daysSinceUpdate < 7 ? 20 : daysSinceUpdate < 30 ? 10 : 0;
        const starScore = Math.min(50, (repo.stargazers_count / 1000) * 10);
        const forkScore = Math.min(20, (repo.forks_count / 100) * 10);
        const popularityScore = starScore + forkScore + recencyBonus;
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
          updated_at: new Date(repo.updated_at)
        };
        
        skills.push(skill);
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`Error scraping query ${queryConfig.query}:`, error.message);
    }
  }
  
  return skills;
}

export async function GET(request) {
  // Simple auth check for production
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('x-cron-secret');
  
  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (!authHeader || authHeader !== cronSecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  
  try {
    const database = await connectDB();
    
    // Enhanced topic queries for fresh, high-signal skills
    const topicQueries = [
      { query: 'topic:claude-skills OR claude skill', category: 'claude-skill', minStars: 20 },
      { query: 'topic:mcp-server OR model-context-protocol', category: 'mcp-server', minStars: 10 },
      { query: 'ai-agent OR autonomous-agent llm', category: 'ai-agent', minStars: 100 },
      { query: 'langchain OR langgraph agent', category: 'ai-agent', minStars: 50 },
      { query: 'gemini-extension OR google-gemini', category: 'gemini-extension', minStars: 10 },
      { query: 'prompt-engineering OR awesome-prompts', category: 'prompt', minStars: 50 },
      { query: 'chatgpt-plugin OR gpt-plugin', category: 'ai-tool', minStars: 30 }
    ];
    
    console.log('🔄 Starting GitHub skill refresh...');
    const scrapedSkills = await scrapeGitHub(topicQueries, 8);
    
    // Upsert skills (update existing or insert new)
    for (const skill of scrapedSkills) {
      await database.collection('skills').updateOne(
        { github_url: skill.github_url },
        { $set: skill },
        { upsert: true }
      );
    }
    
    console.log(`✅ Refreshed ${scrapedSkills.length} skills from GitHub`);
    
    return Response.json({ 
      success: true,
      refreshed: scrapedSkills.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Cron error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
