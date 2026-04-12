# ShowClawMart 🎯

> **Discover AI Skills from GitHub** - A marketplace for Claude Skills, Gemini Extensions, and MCP Servers automatically sourced from the best GitHub repositories.

![ShowClawMart](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![MongoDB](https://img.shields.io/badge/MongoDB-6.6-green?style=for-the-badge&logo=mongodb)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-blue?style=for-the-badge&logo=tailwindcss)

## ✨ Features

- **🔄 Automatic GitHub Scraping** - Fetch real-time AI skills from GitHub based on topics
- **⚡ Build My Agent** - Combine multiple skills into one ready-to-use AI agent prompt
- **🎨 Beautiful Modern UI** - Gradient backgrounds, glass-morphism cards, responsive design
- **🔍 Search & Filter** - Search by name/description, filter by category (AI Agents, Claude, MCP, Prompts)
- **📊 Live Stats** - Real-time statistics on total skills and categories
- **📝 Skill Details** - View README previews, GitHub stats, topics, and creator info
- **⬆️ Upload Skills** - Community can submit their own AI skills
- **🆓 Free Tier Optimized** - Uses MongoDB (local), no external paid services

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and Yarn
- MongoDB running locally

### Installation

```bash
# Install dependencies
yarn install

# Start development server
yarn dev
```

The app will be available at `http://localhost:3000`

### First Run - Ingest Skills

Click the **"🔄 Sync GitHub"** button in the header to automatically fetch skills from GitHub!

This will:
- Scrape GitHub for repositories tagged with: `claude-skill`, `mcp-server`, `gemini-extension`, `anthropic-claude`, `ai-prompt`
- Fetch README previews and repository metadata
- Seed the database with 30+ real skills from top GitHub repos

## 📁 Project Structure

```
/app
├── app/
│   ├── api/[[...path]]/route.js    # Backend API (GitHub scraper, CRUD, agent builder)
│   ├── page.js                      # Home page with skills grid
│   ├── layout.js                    # Root layout
│   ├── skills/[id]/page.js         # Skill detail page
│   ├── upload/page.js              # Upload form
│   ├── builder/page.js             # Build My Agent page (NEW!)
│   └── globals.css                 # Global styles
├── components/ui/                   # shadcn/ui components
├── lib/                            # Utilities
└── .env                            # Environment variables
```

## 🎯 API Endpoints

### GET `/api/skills`
Get all skills with optional filtering
- Query params: `?category=ai-agent&search=code&limit=30`
- Returns: Array of skills

### GET `/api/skills/:id`
Get a single skill by ID
- Returns: Skill object with full details

### GET `/api/ingest`
Scrape GitHub and populate database
- Fetches from 7 topics (10 repos each = 70 skills max)
- Adds 6 sample AgentPowers skills
- Returns: Count and breakdown

### GET `/api/stats`
Get marketplace statistics
- Returns: Total skills count and category breakdown

### POST `/api/upload`
Upload a new skill
- Body: `{ name, description, category, price, creator, github_url, source_url }`
- Returns: Created skill object

### POST `/api/agent-templates`
Create an AI agent blueprint from multiple skills
- Body: `{ goal, selectedSkillIds }`
- Returns: Agent template with combined prompt ready to use in Claude/ChatGPT/Gemini

## 🎨 Design System

- **Colors**: Purple-pink gradients, dark slate backgrounds
- **Typography**: Modern sans-serif, bold headings
- **Components**: Glass-morphism cards, backdrop blur effects
- **Icons**: Lucide React icons
- **UI Library**: shadcn/ui + Radix UI primitives

## 📊 Database Schema

```javascript
{
  id: uuid,
  name: string,
  description: string,
  category: enum, // claude-skill, gemini-extension, mcp-server, prompt, etc.
  price: number,
  rating: number,
  installs: number,
  source_url: string,
  github_url: string,
  github_stars: number,
  github_topics: array,
  creator: string,
  creator_avatar: string,
  is_premium: boolean,
  readme_preview: string,
  language: string,
  created_at: date,
  updated_at: date
}
```

## 🔧 Environment Variables

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=showclawmart
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

## 🌟 GitHub Scraping

The scraper fetches repositories from GitHub API based on topics:
- `claude-skill` - Claude AI skills
- `mcp-server` - Model Context Protocol servers
- `gemini-extension` - Google Gemini extensions
- `anthropic-claude` - Anthropic Claude tools
- `ai-prompt` - AI prompt templates

For each repo, it extracts:
- Name, description, stars
- Topics/tags
- README preview (first 500 chars)
- Creator info
- Programming language
- Creation/update dates

**Note**: GitHub API has rate limits (60 requests/hour unauthenticated). For production, add a GitHub token.

## 🎭 Sample Data

Includes 6 pre-seeded AgentPowers.ai skills:
- Code Reviewer Pro - $12
- Security Scanner - $19
- Prompt Optimizer - Free
- Data Analyzer - $15
- API Builder - Free
- Document Generator - $8

## 🚢 Deployment

This app is ready to deploy on Vercel:

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy!

For MongoDB, use MongoDB Atlas free tier or Railway.

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: MongoDB 6.6
- **Styling**: Tailwind CSS + shadcn/ui
- **Icons**: Lucide React
- **HTTP Client**: Native fetch API
- **Deployment**: Vercel-ready

## 🛠️ Build My Agent Feature

The **Build My Agent** feature allows non-technical users to combine multiple AI skills into one ready-to-use agent prompt.

### How It Works:

1. **Define Goal** - Describe what you want your agent to do in natural language
   - Example: "Help me analyze customer feedback and generate reports"

2. **Select Skills** - Choose from 50+ curated AI skills
   - Browse by category (AI Agents, MCP Servers, Claude Skills, Prompts)
   - Multi-select up to any number of skills
   - See descriptions and categories for each skill

3. **Generate Blueprint** - Get a complete agent prompt
   - Automatically combines skill instructions
   - Includes README content from each skill
   - Ready to paste into Claude, ChatGPT, Gemini, or Custom GPT

### Example Output:

```
You are an AI agent that helps with: Create a smart assistant for developers

Use the following skills to accomplish this goal:

---
Skill 1: AutoGPT
Category: ai-agent
Description: Build, deploy, and run AI agents
Instructions: [README content from GitHub]
---

Skill 2: Code Reviewer Pro
Category: claude-skill  
Description: AI-powered code review assistant
Instructions: [Skill documentation]
---

Your task is to combine these 2 skills to: Create a smart assistant for developers

When responding:
1. Use the appropriate skill based on the user's request
2. Combine multiple skills when needed
3. Be helpful, accurate, and follow the instructions from each skill
```

### Database Collection:

The feature stores agent templates in MongoDB:

```javascript
agent_templates: {
  id: uuid,
  name: string,
  description: string,
  goal: string,          // User's natural language goal
  skillIds: array,       // List of selected skill IDs
  skills: array,         // Skill metadata (name, category)
  agentBlueprint: text,  // Complete generated prompt
  created_at: date
}
```

## 📝 Future Enhancements

- [ ] Add GitHub authentication for higher rate limits
- [ ] Implement Stripe payments for premium skills
- [ ] Add user authentication (Supabase/Auth.js)
- [ ] Creator dashboard with analytics
- [ ] Skill reviews and ratings
- [ ] Advanced search with Algolia
- [ ] Download tracking
- [ ] Webhooks for auto-sync

## 🤝 Contributing

Contributions welcome! This is an MVP focused on rapid development.

## 📄 License

MIT License - feel free to use this project!

## 🙏 Acknowledgments

- Built with ❤️ using Next.js and MongoDB
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Icons from [Lucide](https://lucide.dev)
- Inspired by the AI development community

---

**ShowClawMart** - Discover the best AI skills from GitHub in one beautiful marketplace! 🚀
