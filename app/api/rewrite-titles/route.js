import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGO_URL);
let db;

async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db(process.env.DB_NAME || 'showclawmart');
  }
  return db;
}

// AI-powered title generator based on keywords and description
function generateBenefitTitle(skill) {
  const name = skill.name.toLowerCase();
  const desc = (skill.description || '').toLowerCase();
  const category = skill.category;
  
  // Keyword mapping for common patterns
  const patterns = [
    // Research & Analysis
    { keywords: ['research', 'market', 'competitor'], template: (name) => `Automate Market Research & Competitor Analysis with AI` },
    { keywords: ['data', 'analysis', 'analytics'], template: (name) => `Analyze Data & Generate Insights Instantly` },
    
    // Content & Writing
    { keywords: ['email', 'outreach', 'cold'], template: (name) => `Write Winning Cold Emails That Get Responses` },
    { keywords: ['content', 'blog', 'article'], template: (name) => `Generate High-Quality Content in Minutes` },
    { keywords: ['seo', 'optimization'], template: (name) => `Boost SEO Rankings & Drive Organic Traffic` },
    
    // Code & Development
    { keywords: ['code', 'programming', 'developer'], template: (name) => `Build & Review Code Faster with AI Assistance` },
    { keywords: ['api', 'backend', 'server'], template: (name) => `Create APIs & Backend Services Automatically` },
    { keywords: ['automation', 'workflow', 'n8n'], template: (name) => `Automate Business Workflows Without Coding` },
    
    // AI Agents
    { keywords: ['agent', 'autonomous', 'langchain'], template: (name) => `Build Custom AI Agents for Any Task` },
    { keywords: ['chatbot', 'chat', 'conversation'], template: (name) => `Create Smart Chatbots That Understand Context` },
    
    // Prompts
    { keywords: ['prompt', 'engineering'], template: (name) => `Master AI Prompts for Better Results` },
    { keywords: ['awesome', 'collection'], template: (name) => `Access Proven Prompts & Templates Library` },
    
    // Design
    { keywords: ['design', 'ui', 'ux'], template: (name) => `Design Beautiful Interfaces with AI Help` },
    { keywords: ['icon', 'graphic'], template: (name) => `Generate Professional Graphics & Icons` },
    
    // Productivity
    { keywords: ['productivity', 'task', 'todo'], template: (name) => `Boost Productivity & Get More Done Daily` },
    { keywords: ['meeting', 'notes', 'summary'], template: (name) => `Turn Meetings into Actionable Notes Instantly` },
    
    // Business
    { keywords: ['validate', 'validation', 'idea'], template: (name) => `Validate Business Ideas Before You Build` },
    { keywords: ['sales', 'crm', 'pipeline'], template: (name) => `Close More Deals with AI Sales Assistant` },
    { keywords: ['marketing', 'ads', 'campaign'], template: (name) => `Create Marketing Campaigns That Convert` }
  ];
  
  // Try to match patterns
  for (const pattern of patterns) {
    if (pattern.keywords.some(kw => name.includes(kw) || desc.includes(kw))) {
      return pattern.template(skill.name);
    }
  }
  
  // Category-based fallbacks
  const categoryTitles = {
    'claude-skill': `Master ${skill.name} - AI Skill for Claude`,
    'gemini-extension': `${skill.name} - Extend Google Gemini Capabilities`,
    'mcp-server': `${skill.name} - Model Context Protocol Server`,
    'ai-agent': `Build AI Agents with ${skill.name}`,
    'ai-tool': `${skill.name} - AI-Powered Productivity Tool`,
    'prompt': `${skill.name} - Ready-to-Use AI Prompts`
  };
  
  // Use category fallback or create generic benefit title
  if (categoryTitles[category]) {
    return categoryTitles[category];
  }
  
  // Generic benefit-driven title
  const firstWord = skill.name.split(/[-_]/)[0];
  return `${firstWord.charAt(0).toUpperCase() + firstWord.slice(1)} - Solve Problems with AI`;
}

export async function GET(request) {
  try {
    const database = await connectDB();
    
    // Get all skills
    const skills = await database.collection('skills').find({}).toArray();
    
    let updated = 0;
    for (const skill of skills) {
      // Generate benefit-focused title
      const humanTitle = generateBenefitTitle(skill);
      
      // Store original name and add human title
      await database.collection('skills').updateOne(
        { id: skill.id },
        { 
          $set: { 
            title_human: humanTitle,
            name_original: skill.name_original || skill.name // Preserve original
          } 
        }
      );
      
      updated++;
    }
    
    return Response.json({ 
      success: true,
      updated,
      message: `Updated ${updated} skills with benefit-focused titles`
    });
    
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
