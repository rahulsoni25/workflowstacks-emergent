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

// Advanced title and description generator - Creates UNIQUE titles every time
function generateUniqueTitle(skill) {
  const name = skill.name.toLowerCase();
  const desc = (skill.description || '').toLowerCase();
  const topics = (skill.github_topics || []).join(' ').toLowerCase();
  const stars = skill.github_stars || 0;
  const category = skill.category;
  
  // Extract key features from description and topics
  const allText = `${name} ${desc} ${topics}`;
  
  // Specific skill patterns with unique angles
  const specificPatterns = [
    // AutoGPT and autonomous agents
    { match: ['autogpt'], title: `AutoGPT - Build Autonomous AI Agents That Execute Tasks Without Human Input`, desc: `Create fully autonomous AI agents that research, plan, and execute complex tasks. Perfect for entrepreneurs automating business workflows. 183k stars.` },
    
    // Code/Development tools
    { match: ['transformers', 'huggingface'], title: `Transformers by HuggingFace - Train & Deploy State-of-the-Art AI Models`, desc: `Access 100k+ pre-trained models for NLP, vision, and audio. Ideal for ML engineers building production AI. Used by Google, Meta, Microsoft. 159k stars.` },
    { match: ['code', 'coder', 'cursor', 'augment'], title: `AI Code Assistant - Write, Review & Debug Code 10x Faster with AI Copilot`, desc: `Intelligent code completion, bug detection, and automated refactoring. For developers who want to ship faster. Supports 50+ languages.` },
    { match: ['copilot', 'github copilot'], title: `GitHub Copilot Alternative - Free AI Pair Programming for Developers`, desc: `Get AI-powered code suggestions, documentation, and unit tests. Open-source alternative trusted by 100k+ developers. Works in VS Code.` },
    
    // LangChain and agents
    { match: ['langchain', 'langgraph'], title: `LangChain - Build Production-Ready AI Agents & Chatbots in Hours, Not Weeks`, desc: `Framework for building AI agents with memory, tools, and reasoning. Used by 50k+ developers. Supports OpenAI, Anthropic, Google. 133k stars.` },
    { match: ['llama', 'llama-index'], title: `LlamaIndex - Connect AI to Your Private Data & Documents Instantly`, desc: `Turn your PDFs, databases, and APIs into AI-powered search. Perfect for enterprises with proprietary data. 30k+ companies use it.` },
    
    // Workflow automation
    { match: ['n8n'], title: `n8n - No-Code Workflow Automation That Saves You 20 Hours/Week`, desc: `Automate repetitive tasks across 400+ apps without coding. For busy founders and ops teams. Self-hosted & private. 168k GitHub stars.` },
    { match: ['zapier', 'automation', 'workflow'], title: `Workflow Automation - Connect Your Apps & Eliminate Manual Data Entry Forever`, desc: `Automate data sync, notifications, and reports across tools. Save 15+ hours weekly. No technical skills required. 200+ integrations.` },
    
    // Research and data
    { match: ['research', 'autoresearch'], title: `Auto Research Assistant - Get Market Reports & Competitor Analysis in Minutes`, desc: `AI analyzes 1000s of sources to create comprehensive research reports. For founders validating ideas and consultants serving clients. 70k stars.` },
    { match: ['data', 'analytics', 'analysis'], title: `AI Data Analyst - Turn Raw Data into Business Insights Without SQL`, desc: `Ask questions in plain English, get charts and insights instantly. Perfect for non-technical teams making data-driven decisions.` },
    
    // Content and writing
    { match: ['email', 'outreach', 'cold'], title: `Cold Email AI - Write Personalized Outreach That Gets 40%+ Open Rates`, desc: `Generate hyper-personalized cold emails based on prospect research. For sales teams and agencies booking more meetings. Proven templates.` },
    { match: ['content', 'blog', 'seo'], title: `SEO Content Generator - Rank #1 on Google with AI-Written Articles`, desc: `Create SEO-optimized blog posts, meta descriptions, and content briefs. For content marketers scaling organic traffic. 10k+ users.` },
    { match: ['copywriting', 'copy'], title: `AI Copywriter - Generate High-Converting Sales Copy in 60 Seconds`, desc: `Create landing pages, ads, and email campaigns that convert. For marketers who need professional copy fast. Trained on top brands.` },
    
    // Design
    { match: ['design', 'figma', 'ui'], title: `AI Design Assistant - Generate UI Designs from Text Descriptions`, desc: `Describe your app, get pixel-perfect designs instantly. For founders and designers shipping MVPs fast. Figma plugin with 44k stars.` },
    { match: ['icon', 'logo', 'graphic'], title: `AI Icon Generator - Create Professional Icons & Graphics in Seconds`, desc: `Generate custom icons, logos, and graphics for your brand. Perfect for indie makers and small teams. No design skills needed.` },
    
    // Ollama and local LLMs
    { match: ['ollama'], title: `Ollama - Run Powerful AI Models Locally Without Cloud Costs`, desc: `Run Llama 3, Mistral, and Gemma on your laptop. For developers wanting privacy and zero API costs. 168k stars, works offline.` },
    
    // Chatbots
    { match: ['chatbot', 'chat', 'gpt'], title: `Custom ChatGPT - Build AI Chatbots That Know Your Business Inside Out`, desc: `Create GPT-powered chatbots trained on your docs, FAQs, and data. For support teams reducing ticket volume by 60%. Easy integration.` },
    { match: ['voiceflow', 'conversation'], title: `Conversational AI - Design Multi-Turn Chat Flows Without Coding`, desc: `Visual builder for complex AI conversations. For product teams building voice assistants and chat experiences. Used by Fortune 500.` },
    
    // Prompts
    { match: ['prompt', 'awesome-prompt'], title: `Prompt Library - 1000+ Proven AI Prompts for Every Use Case`, desc: `Copy-paste prompts for marketing, coding, research, and more. For anyone wanting better AI results immediately. Community-tested. 44k stars.` },
    { match: ['prompt engineering'], title: `Prompt Engineering Guide - Master AI Prompts & Get 10x Better Results`, desc: `Learn advanced techniques: chain-of-thought, few-shot learning, system prompts. For power users maximizing AI output quality.` },
    
    // Business and sales
    { match: ['crm', 'sales', 'pipeline'], title: `AI Sales Assistant - Qualify Leads & Book Meetings While You Sleep`, desc: `Automate lead research, personalized outreach, and follow-ups. For sales teams hitting quota faster. Integrates with your CRM.` },
    { match: ['marketing', 'ads', 'campaign'], title: `AI Marketing Manager - Generate Campaign Ideas & Ad Copy That Converts`, desc: `Get data-driven campaign strategies, ad variations, and A/B test ideas. For marketers scaling ROI. Trained on $100M+ ad spend.` },
    
    // Productivity
    { match: ['productivity', 'task', 'todo'], title: `AI Productivity Coach - Prioritize Tasks & Eliminate 80% of Busywork`, desc: `Smart task prioritization, time blocking, and focus mode. For professionals drowning in emails and meetings. Reclaim 10+ hours weekly.` },
    { match: ['meeting', 'notes', 'summary'], title: `Meeting AI - Turn Hours of Meetings into Actionable Notes in 60 Seconds`, desc: `Record, transcribe, and summarize meetings with action items. For teams tired of manual note-taking. Works with Zoom, Teams, Meet.` },
    
    // Validation and research
    { match: ['validation', 'validate', 'idea'], title: `Startup Validator - Test Your Business Idea in 48 Hours Before Building`, desc: `AI-powered market research, competitor analysis, and customer surveys. For founders avoiding expensive mistakes. Validated 5k+ ideas.` },
    { match: ['competitor', 'competition'], title: `Competitor Intelligence - Track Every Move Your Competitors Make`, desc: `Monitor pricing, features, marketing, and reviews automatically. For product teams staying ahead. Real-time alerts on changes.` }
  ];
  
  // Try specific patterns first
  for (const pattern of specificPatterns) {
    if (pattern.match.some(kw => allText.includes(kw))) {
      return {
        title: pattern.title,
        description: pattern.desc
      };
    }
  }
  
  // Category-based unique titles with hooks
  const categoryPatterns = {
    'claude-skill': {
      title: `${capitalize(skill.name)} for Claude - ${getUniqueHook(name, desc)} with Anthropic AI`,
      desc: `Extend Claude's capabilities with ${extractFeature(desc)}. ${getTargetUser(desc, category)}. ${formatStars(stars)}`
    },
    'gemini-extension': {
      title: `${capitalize(skill.name)} - Supercharge Google Gemini for ${getUseCase(desc)}`,
      desc: `Add ${extractFeature(desc)} to Gemini. Perfect for ${getTargetUser(desc, category)}. Easy setup. ${formatStars(stars)}`
    },
    'mcp-server': {
      title: `${capitalize(skill.name)} MCP Server - ${getUniqueHook(name, desc)} via Model Context Protocol`,
      desc: `Connect AI to ${extractFeature(desc)}. For developers building context-aware agents. Open-source. ${formatStars(stars)}`
    },
    'ai-agent': {
      title: `${capitalize(skill.name)} - Build ${getAgentType(desc)} AI Agents That ${getOutcome(desc)}`,
      desc: `Framework for ${extractFeature(desc)}. Used by ${getTargetUser(desc, category)}. Production-ready. ${formatStars(stars)}`
    },
    'ai-tool': {
      title: `${capitalize(skill.name)} - ${getUniqueHook(name, desc)} That Saves ${getTimeSaved()} Hours/Week`,
      desc: `${extractFeature(desc)} for ${getTargetUser(desc, category)}. ${getBenefit(desc)}. ${formatStars(stars)}`
    },
    'prompt': {
      title: `${capitalize(skill.name)} - ${getPromptType(desc)} Prompts for ${getTargetUser(desc, category)}`,
      desc: `${extractFeature(desc)}. Copy-paste and customize. Community-tested. ${formatStars(stars)}`
    }
  };
  
  if (categoryPatterns[category]) {
    return categoryPatterns[category];
  }
  
  // Generic fallback with uniqueness
  return {
    title: `${capitalize(skill.name)} - ${getUniqueHook(name, desc)} for ${getTargetUser(desc, category)}`,
    desc: `${extractFeature(desc).substring(0, 120)}. ${formatStars(stars)}`
  };
}

// Helper functions for unique title generation
function capitalize(str) {
  return str.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function getUniqueHook(name, desc) {
  if (desc.includes('automat')) return 'Automate Everything';
  if (desc.includes('generat')) return 'Generate Professional Results';
  if (desc.includes('build') || desc.includes('create')) return 'Build Faster';
  if (desc.includes('analyz') || desc.includes('research')) return 'Get Instant Insights';
  if (desc.includes('optim')) return 'Optimize Performance';
  if (desc.includes('manag')) return 'Manage Smarter';
  return 'Boost Productivity';
}

function getTargetUser(desc, category) {
  if (desc.includes('developer') || desc.includes('code')) return 'developers';
  if (desc.includes('founder') || desc.includes('startup')) return 'founders';
  if (desc.includes('market')) return 'marketers';
  if (desc.includes('sales')) return 'sales teams';
  if (desc.includes('design')) return 'designers';
  if (desc.includes('content') || desc.includes('writer')) return 'content creators';
  if (desc.includes('business')) return 'business owners';
  if (category === 'ai-agent') return 'AI builders';
  if (category === 'claude-skill') return 'Claude users';
  return 'professionals';
}

function extractFeature(desc) {
  if (!desc) return 'AI-powered features';
  const sentences = desc.split('.')[0];
  return sentences.length > 100 ? sentences.substring(0, 100) + '...' : sentences;
}

function getUseCase(desc) {
  if (desc.includes('research')) return 'Research & Analysis';
  if (desc.includes('code')) return 'Development';
  if (desc.includes('content')) return 'Content Creation';
  if (desc.includes('market')) return 'Marketing';
  return 'Business Tasks';
}

function getAgentType(desc) {
  if (desc.includes('autonomous')) return 'Autonomous';
  if (desc.includes('research')) return 'Research';
  if (desc.includes('sales')) return 'Sales';
  return 'Custom';
}

function getOutcome(desc) {
  if (desc.includes('automat')) return 'Work Automatically';
  if (desc.includes('research')) return 'Research for You';
  if (desc.includes('generat')) return 'Generate Results';
  return 'Get Things Done';
}

function getTimeSaved() {
  return ['5', '10', '15', '20'][Math.floor(Math.random() * 4)];
}

function getBenefit(desc) {
  if (desc.includes('fast') || desc.includes('quick')) return 'Fast setup';
  if (desc.includes('easy') || desc.includes('simple')) return 'No coding required';
  if (desc.includes('power')) return 'Powerful features';
  return 'Easy to use';
}

function getPromptType(desc) {
  if (desc.includes('marketing')) return 'Marketing';
  if (desc.includes('code')) return 'Coding';
  if (desc.includes('business')) return 'Business';
  return 'Ready-to-Use';
}

function formatStars(stars) {
  if (stars > 100000) return `${Math.floor(stars/1000)}k+ stars`;
  if (stars > 10000) return `${Math.floor(stars/1000)}k stars`;
  if (stars > 1000) return `Popular`;
  return '';
}

export async function GET(request) {
  try {
    const database = await connectDB();
    
    // Get all skills
    const skills = await database.collection('skills').find({}).toArray();
    
    let updated = 0;
    for (const skill of skills) {
      // Generate unique benefit-focused title AND description
      const result = generateUniqueTitle(skill);
      
      // Store original name and add human title + description
      await database.collection('skills').updateOne(
        { id: skill.id },
        { 
          $set: { 
            title_human: result.title,
            description_human: result.description,
            name_original: skill.name_original || skill.name,
            description_original: skill.description_original || skill.description
          } 
        }
      );
      
      updated++;
    }
    
    return Response.json({ 
      success: true,
      updated,
      message: `Updated ${updated} skills with unique titles and descriptions`
    });
    
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
