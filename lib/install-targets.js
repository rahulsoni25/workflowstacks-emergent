// The AI tools a listing can be installed into, one hub page each (/for/<slug>).
//
// Why these pages exist (2026-10-20, from the skills.sh comparison in
// docs/STRATEGY.md): Google indexes skills.sh's per-agent hubs ("Skills for
// Claude Code — Install via the skills CLI", /agent/claude-code) and its topic
// hubs, and every skill page there hangs off several of them. Here the only
// hubs were /best/<category>; 168 pages in the weekly crawl had one inbound
// link. A hub per tool also matches how people search ("claude code skills",
// "cursor mcp servers") better than the catalog's internal category names.
//
// `categories` are the catalog categories that install into the tool; the hub
// lists the best of those. `channels` are the install_events channel names
// (app/api/track-install/route.js) a visitor on this tool produces, so the
// hub can later show real per-tool install counts. Keep the copy truthful:
// each listing's page has the actual buttons; the hub only explains the paths.
export const INSTALL_TARGETS = [
  {
    slug: 'claude-code',
    name: 'Claude Code',
    kind: 'terminal coding agent',
    categories: ['claude-skill', 'mcp-server', 'ai-agent'],
    channels: ['claude-code', 'editor-claude-code', 'cli'],
    paths: [
      { label: 'MCP connector (search and install from inside Claude Code)', code: 'claude mcp add --transport http workflowstacks https://workflowstacks.com/api/mcp' },
      { label: 'Plugin marketplace', code: '/plugin marketplace add rahulsoni25/workflowstacks-emergent' },
      { label: 'One listing, from the terminal', code: 'npx workflowstacks add <slug>' },
    ],
    blurb: 'Skill packages, MCP servers and agent blueprints that Claude Code loads from a SKILL.md folder or an MCP connection.',
  },
  {
    slug: 'claude-desktop',
    name: 'Claude Desktop',
    kind: 'desktop app',
    categories: ['mcp-server', 'claude-skill', 'prompt'],
    channels: ['try-claude', 'mcp-copy'],
    paths: [
      { label: 'MCP servers: copy the config block from the listing into claude_desktop_config.json', code: null },
      { label: 'Skills and prompts: open in Claude from the listing', code: null },
    ],
    blurb: 'MCP servers with copy-paste configs, plus skills and prompts you can open straight in the app.',
    related: [{ href: '/mcp', label: 'MCP servers for Claude Desktop, with configs' }],
  },
  {
    slug: 'claude-cowork',
    name: 'Claude Cowork',
    kind: 'desktop agent',
    categories: ['claude-skill', 'prompt', 'ai-agent'],
    channels: ['editor-claude-cowork', 'try-claude'],
    paths: [{ label: 'Add from the listing, or install the skill folder with the CLI', code: 'npx workflowstacks add <slug>' }],
    blurb: 'Skills and prompts that run in Cowork sessions, installed as skill folders.',
  },
  {
    slug: 'cursor',
    name: 'Cursor',
    kind: 'AI code editor',
    categories: ['mcp-server', 'claude-skill', 'prompt'],
    channels: ['editor-cursor', 'cursor-mcp'],
    paths: [
      { label: 'MCP servers: the listing’s “Add to Cursor” button opens Cursor’s one-click MCP install (a cursor:// deep link); the config block is there to copy as well', code: null },
      { label: 'Skill folders and prompts, from the terminal', code: 'npx workflowstacks add <slug>' },
    ],
    blurb: 'MCP servers Cursor can call, and SKILL.md packages that work as rules and context.',
  },
  {
    slug: 'windsurf',
    name: 'Windsurf',
    kind: 'AI code editor',
    categories: ['mcp-server', 'claude-skill', 'prompt'],
    channels: ['editor-windsurf'],
    paths: [
      { label: 'MCP servers: copy the config from the listing into Windsurf’s MCP settings', code: null },
      { label: 'Skill folders and prompts, from the terminal', code: 'npx workflowstacks add <slug>' },
    ],
    blurb: 'MCP servers and skill packages for Windsurf’s Cascade agent.',
  },
  {
    slug: 'vs-code',
    name: 'VS Code',
    kind: 'editor with Copilot agent mode',
    categories: ['mcp-server', 'claude-skill', 'prompt'],
    channels: ['editor-vs-code'],
    paths: [
      { label: 'MCP servers: copy the config from the listing into .vscode/mcp.json', code: null },
      { label: 'Skill folders and prompts, from the terminal', code: 'npx workflowstacks add <slug>' },
    ],
    blurb: 'MCP servers and skill packages for VS Code’s agent mode.',
  },
  {
    slug: 'antigravity',
    name: 'Antigravity',
    kind: 'agent-first IDE',
    categories: ['claude-skill', 'mcp-server', 'prompt'],
    channels: ['editor-antigravity'],
    paths: [{ label: 'Add from the listing, or install the skill folder with the CLI', code: 'npx workflowstacks add <slug>' }],
    blurb: 'Skill packages and MCP servers for Antigravity agents.',
  },
  {
    slug: 'chatgpt',
    name: 'ChatGPT',
    kind: 'chat assistant',
    categories: ['prompt', 'ai-agent'],
    channels: ['open-chatgpt', 'copy-prompt'],
    paths: [{ label: 'Open in ChatGPT from the listing, or copy the prompt / agent blueprint', code: null }],
    blurb: 'Prompts and agent blueprints that paste into ChatGPT or a Custom GPT. No install.',
  },
  {
    slug: 'gemini',
    name: 'Gemini',
    kind: 'chat assistant',
    categories: ['prompt', 'ai-agent'],
    channels: ['open-gemini', 'copy-prompt'],
    paths: [{ label: 'Open in Gemini from the listing, or copy the prompt / agent blueprint', code: null }],
    blurb: 'Prompts and agent blueprints that paste into Gemini. No install.',
  },
]

export const INSTALL_TARGET_SLUGS = INSTALL_TARGETS.map((t) => t.slug)

export function getInstallTarget(slug) {
  return INSTALL_TARGETS.find((t) => t.slug === slug) || null
}
