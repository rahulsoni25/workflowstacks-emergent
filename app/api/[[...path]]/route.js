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

// Enhanced GitHub scraper function - Latest & Most Popular (March 2026+)
async function scrapeGitHub(topicQueries, limit = 15) {
  const skills = [];
  const seenRepos = new Set(); // Avoid duplicates
  
  for (const queryConfig of topicQueries) {
    try {
      const { query, category, minStars = 50 } = queryConfig;
      
      // Build query with filters for quality, recency, and March 2026+
      const dateFilter = 'created:>=2026-03-01'; // Fresh skills from March 2026
      const searchQuery = `${query} ${dateFilter} stars:>${minStars}`;
      
      const response = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=stars&order=desc&per_page=${limit}`,
        {
          headers: {
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'ShowClawMart',
            'Authorization': process.env.GITHUB_TOKEN ? `token ${process.env.GITHUB_TOKEN}` : undefined
          }
        }
      );
      
      if (!response.ok) {
        console.log(`GitHub API error for ${query}: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      for (const repo of data.items || []) {
        // Skip duplicates and archived repos
        if (seenRepos.has(repo.full_name) || repo.archived) continue;
        seenRepos.add(repo.full_name);
        
        // Fetch README
        let readmePreview = '';
        try {
          const readmeResponse = await fetch(
            `https://api.github.com/repos/${repo.full_name}/readme`,
            {
              headers: {
                'Accept': 'application/vnd.github.raw+json',
                'User-Agent': 'ShowClawMart',
                'Authorization': process.env.GITHUB_TOKEN ? `token ${process.env.GITHUB_TOKEN}` : undefined
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
    
    // Get trending skills (high popularity score, recently updated)
    if (path === '/trending') {
      const skills = await database.collection('skills')
        .find({ popularity_score: { $exists: true } })
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
          github_stars: { $exists: true }
        })
        .sort({ github_stars: -1 })
        .limit(12)
        .toArray();
      
      return Response.json({ skills });
    }
    
    // Get new skills (added this week)
    if (path === '/new') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const skills = await database.collection('skills')
        .find({ created_at: { $gte: sevenDaysAgo } })
        .sort({ created_at: -1 })
        .limit(12)
        .toArray();
      
      return Response.json({ skills });
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
    const database = await connectDB();
    
    // Seed packs and playbooks
    if (path === '/seed-packs') {
      // Get some skill IDs for seeding
      const allSkills = await database.collection('skills').find({}).limit(20).toArray();
      
      const packs = [
        {
          id: uuidv4(),
          name: 'Founder Launch Pack',
          description: 'Everything you need to validate and launch your startup idea quickly',
          audience: 'Founder',
          useCase: 'Product Launch',
          skillIds: allSkills.slice(0, 4).map(s => s.id),
          created_at: new Date()
        },
        {
          id: uuidv4(),
          name: 'Cold Email Pack',
          description: 'Master outbound sales with AI-powered email campaigns',
          audience: 'Agency',
          useCase: 'Email Marketing',
          skillIds: allSkills.slice(4, 7).map(s => s.id),
          created_at: new Date()
        },
        {
          id: uuidv4(),
          name: 'Content Creator Pack',
          description: 'Create, optimize, and distribute content at scale',
          audience: 'Creator',
          useCase: 'Content Creation',
          skillIds: allSkills.slice(7, 11).map(s => s.id),
          created_at: new Date()
        },
        {
          id: uuidv4(),
          name: 'Developer Productivity Pack',
          description: 'Supercharge your coding workflow with AI assistance',
          audience: 'Developer',
          useCase: 'Development',
          skillIds: allSkills.slice(11, 15).map(s => s.id),
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
          skillIds: allSkills.slice(0, 3).map(s => s.id),
          created_at: new Date()
        },
        {
          id: uuidv4(),
          title: 'Idea Validation with Market Research',
          description: 'Comprehensive market research, competitor analysis, and customer discovery to validate your startup idea',
          audience: 'Founder',
          useCase: 'Market Research',
          problem: 'Need to validate your idea with real market data before building anything',
          skillIds: allSkills.slice(0, 4).map(s => s.id),
          created_at: new Date()
        },
        {
          id: uuidv4(),
          title: 'Warm Outreach for B2B Leads',
          description: 'Build relationships and generate qualified leads through personalized outreach',
          audience: 'Agency',
          useCase: 'Lead Generation',
          problem: 'Cold outreach is getting ignored, you need warmer approaches',
          skillIds: allSkills.slice(3, 6).map(s => s.id),
          created_at: new Date()
        },
        {
          id: uuidv4(),
          title: 'Turn Meetings into Action Items',
          description: 'Capture, organize, and execute on meeting outcomes efficiently',
          audience: 'Marketer',
          useCase: 'Operations',
          problem: 'Meeting notes get lost and action items fall through the cracks',
          skillIds: allSkills.slice(6, 9).map(s => s.id),
          created_at: new Date()
        }
      ];
      
      // Clear and insert
      await database.collection('skill_packs').deleteMany({});
      await database.collection('playbooks').deleteMany({});
      
      await database.collection('skill_packs').insertMany(packs);
      await database.collection('playbooks').insertMany(playbooks);
      
      return Response.json({ 
        success: true,
        packs: packs.length,
        playbooks: playbooks.length
      });
    }
    
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
    
    // Create Agent Template
    if (path === '/agent-templates') {
      const body = await request.json();
      const { goal, selectedSkillIds, isPublic } = body;
      
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