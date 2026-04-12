import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

const client = new MongoClient(process.env.MONGO_URL);
let db;

async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db(process.env.DB_NAME || 'showclawmart');
  }
  return db;
}

// Enhanced GitHub scraper function - Latest & Most Popular
async function scrapeGitHub(topicQueries, limit = 15) {
  const skills = [];
  const seenRepos = new Set(); // Avoid duplicates
  
  for (const queryConfig of topicQueries) {
    try {
      const { query, category, minStars = 50 } = queryConfig;
      
      // Build query with filters for quality and recency
      const searchQuery = `${query} stars:>${minStars} pushed:>2023-01-01`;
      
      const response = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=stars&order=desc&per_page=${limit}`,
        {
          headers: {
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'ShowClawMart'
          }
        }
      );
      
      if (!response.ok) {
        console.log(`GitHub API error for ${query}: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      for (const repo of data.items || []) {
        // Skip duplicates
        if (seenRepos.has(repo.full_name)) continue;
        seenRepos.add(repo.full_name);
        
        // Skip archived or very old repos
        if (repo.archived) continue;
        
        // Fetch README
        let readmePreview = '';
        try {
          const readmeResponse = await fetch(
            `https://api.github.com/repos/${repo.full_name}/readme`,
            {
              headers: {
                'Accept': 'application/vnd.github.raw+json',
                'User-Agent': 'ShowClawMart'
              }
            }
          );
          if (readmeResponse.ok) {
            const readmeText = await readmeResponse.text();
            readmePreview = readmeText.substring(0, 600);
          }
        } catch (e) {
          console.log('Error fetching README:', e.message);
        }
        
        // Calculate quality score
        const daysSinceUpdate = (Date.now() - new Date(repo.updated_at)) / (1000 * 60 * 60 * 24);
        const recencyBonus = daysSinceUpdate < 30 ? 0.5 : daysSinceUpdate < 90 ? 0.3 : 0;
        const rating = Math.min(5, (repo.stargazers_count / 1000) + 3.5 + recencyBonus);
        
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
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
      
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
    const database = await connectDB();
    
    // Root endpoint
    if (path === '/' || path === '') {
      return Response.json({ message: 'ShowClawMart API v1.0' });
    }
    
    // Get all skills
    if (path === '/skills') {
      const { searchParams } = new URL(request.url);
      const category = searchParams.get('category');
      const search = searchParams.get('search');
      
      let query = {};
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
        .sort({ rating: -1, installs: -1 })
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
      // Enhanced topic queries with better targeting
      const topicQueries = [
        // Claude Skills & MCP Servers (most popular)
        { query: 'topic:mcp-server OR topic:model-context-protocol', category: 'mcp-server', minStars: 10 },
        { query: 'topic:claude-skill OR anthropic claude tool', category: 'claude-skill', minStars: 20 },
        
        // AI Agents & Automation (trending)
        { query: 'ai-agent OR autonomous-agent llm', category: 'ai-agent', minStars: 100 },
        { query: 'langchain OR langgraph agent', category: 'ai-agent', minStars: 50 },
        
        // Gemini & Google AI
        { query: 'gemini-extension OR google-gemini', category: 'gemini-extension', minStars: 10 },
        
        // AI Prompts & Templates
        { query: 'prompt-engineering OR awesome-prompts', category: 'prompt', minStars: 100 },
        
        // ChatGPT Plugins & Tools
        { query: 'chatgpt-plugin OR gpt-plugin', category: 'ai-tool', minStars: 50 }
      ];
      
      const scrapedSkills = await scrapeGitHub(topicQueries, 10);
      const allSkills = [...agentPowersSkills, ...scrapedSkills];
      
      // Clear existing and insert new
      await database.collection('skills').deleteMany({});
      
      if (allSkills.length > 0) {
        await database.collection('skills').insertMany(allSkills);
      }
      
      return Response.json({ 
        message: 'Ingestion complete - Latest & most popular skills loaded!', 
        count: allSkills.length,
        breakdown: {
          agentPowers: agentPowersSkills.length,
          github: scrapedSkills.length
        },
        note: 'Skills filtered for quality (min stars) and recency (updated since 2023)'
      });
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
    const database = await connectDB();
    
    // Upload skill
    if (path === '/upload') {
      const body = await request.json();
      
      const skill = {
        id: uuidv4(),
        name: body.name,
        description: body.description,
        category: body.category,
        price: parseFloat(body.price) || 0,
        rating: 0,
        installs: 0,
        source_url: body.source_url || '',
        github_url: body.github_url || '',
        github_stars: 0,
        creator: body.creator || 'Anonymous',
        is_premium: body.price > 0,
        readme_preview: '',
        created_at: new Date()
      };
      
      await database.collection('skills').insertOne(skill);
      
      return Response.json({ success: true, skill });
    }
    
    return Response.json({ error: 'Not found' }, { status: 404 });
    
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}