// Verified MCP-server configs for Claude Desktop. Hand-checked seed set — each
// entry is a real, current server with a config in the standard
// claude_desktop_config.json shape. The repo link is the source of truth; we
// always point there so a moved package name is one click from correct.
//
// This registry is the "seed"; the extraction-enrichment pass grows it from the
// catalog by adding only servers whose config it can confidently read from a
// README (never a guess).
//
// `source: 'verified'` = hand-checked here. `source: 'catalog'` = auto-extracted.

export const MCP_SERVERS = {
  filesystem: {
    slug: 'filesystem',
    name: 'Filesystem',
    blurb: 'Let Claude read and write files in folders you choose.',
    category: 'Files & data',
    repo: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
    needs_key: false,
    config: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/your/folder'] },
    note: 'Replace /path/to/your/folder with a real directory. Add more paths as extra args to grant access to multiple folders.',
    source: 'verified',
  },
  github: {
    slug: 'github',
    name: 'GitHub',
    blurb: 'Search repos, read code, open issues and PRs from Claude.',
    category: 'Developer',
    repo: 'https://github.com/github/github-mcp-server',
    needs_key: true,
    key_names: ['GITHUB_PERSONAL_ACCESS_TOKEN'],
    config: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'], env: { GITHUB_PERSONAL_ACCESS_TOKEN: 'ghp_your_token_here' } },
    note: 'Create a token at github.com/settings/tokens (classic, repo scope). Paste it in place of the placeholder.',
    source: 'verified',
  },
  'brave-search': {
    slug: 'brave-search',
    name: 'Brave Search',
    blurb: 'Give Claude live web search via the Brave Search API.',
    category: 'Search & web',
    repo: 'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search',
    needs_key: true,
    key_names: ['BRAVE_API_KEY'],
    config: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-brave-search'], env: { BRAVE_API_KEY: 'your_brave_api_key' } },
    note: 'Get a free API key at brave.com/search/api.',
    source: 'verified',
  },
  puppeteer: {
    slug: 'puppeteer',
    name: 'Puppeteer (browser)',
    blurb: 'Let Claude control a headless browser — navigate, screenshot, scrape.',
    category: 'Search & web',
    repo: 'https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer',
    needs_key: false,
    config: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-puppeteer'] },
    note: 'No key needed. First run downloads a browser, so give it a moment.',
    source: 'verified',
  },
  memory: {
    slug: 'memory',
    name: 'Memory (knowledge graph)',
    blurb: 'Persistent memory across chats via a local knowledge graph.',
    category: 'Productivity',
    repo: 'https://github.com/modelcontextprotocol/servers/tree/main/src/memory',
    needs_key: false,
    config: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-memory'] },
    note: 'Stores memory locally. No key needed.',
    source: 'verified',
  },
  'sequential-thinking': {
    slug: 'sequential-thinking',
    name: 'Sequential Thinking',
    blurb: 'Give Claude a structured, step-by-step reasoning scratchpad.',
    category: 'Productivity',
    repo: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking',
    needs_key: false,
    config: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-sequential-thinking'] },
    note: 'No key needed.',
    source: 'verified',
  },
  slack: {
    slug: 'slack',
    name: 'Slack',
    blurb: 'Read channels and post messages to your Slack workspace.',
    category: 'Productivity',
    repo: 'https://github.com/modelcontextprotocol/servers/tree/main/src/slack',
    needs_key: true,
    key_names: ['SLACK_BOT_TOKEN', 'SLACK_TEAM_ID'],
    config: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-slack'], env: { SLACK_BOT_TOKEN: 'xoxb-your-token', SLACK_TEAM_ID: 'T01234567' } },
    note: 'Create a Slack app, add bot scopes, and install it to your workspace to get the bot token and team ID.',
    source: 'verified',
  },
  postgres: {
    slug: 'postgres',
    name: 'PostgreSQL',
    blurb: 'Let Claude run read-only queries against your Postgres database.',
    category: 'Files & data',
    repo: 'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres',
    needs_key: false,
    config: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-postgres', 'postgresql://user:pass@localhost:5432/dbname'] },
    note: 'Replace the connection string with your own. Access is read-only by design.',
    source: 'verified',
  },
  'google-maps': {
    slug: 'google-maps',
    name: 'Google Maps',
    blurb: 'Geocoding, directions, and place search inside Claude.',
    category: 'Search & web',
    repo: 'https://github.com/modelcontextprotocol/servers/tree/main/src/google-maps',
    needs_key: true,
    key_names: ['GOOGLE_MAPS_API_KEY'],
    config: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-google-maps'], env: { GOOGLE_MAPS_API_KEY: 'your_maps_api_key' } },
    note: 'Enable the Maps/Places APIs in Google Cloud and create an API key.',
    source: 'verified',
  },
  context7: {
    slug: 'context7',
    name: 'Context7 (live docs)',
    blurb: 'Pull up-to-date library docs into Claude so it codes against the real API.',
    category: 'Developer',
    repo: 'https://github.com/upstash/context7',
    needs_key: false,
    config: { command: 'npx', args: ['-y', '@upstash/context7-mcp'] },
    note: 'No key needed. Ask Claude to "use context7" when you want current docs. (In your catalog too.)',
    source: 'verified',
    catalog: true,
  },
  playwright: {
    slug: 'playwright',
    name: 'Playwright (browser)',
    blurb: 'Drive a real browser for testing and automation from Claude.',
    category: 'Developer',
    repo: 'https://github.com/microsoft/playwright-mcp',
    needs_key: false,
    config: { command: 'npx', args: ['-y', '@playwright/mcp@latest'] },
    note: 'No key needed. Microsoft-maintained.',
    source: 'verified',
  },
  fetch: {
    slug: 'fetch',
    name: 'Fetch (URL → markdown)',
    blurb: 'Let Claude fetch a web page and read it as clean markdown.',
    category: 'Search & web',
    repo: 'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch',
    needs_key: false,
    config: { command: 'uvx', args: ['mcp-server-fetch'] },
    note: 'This one runs via uvx (Python). Install uv first: see astral.sh/uv. No key needed.',
    source: 'verified',
  },
}

export function getMcpServer(slug) {
  if (!Object.prototype.hasOwnProperty.call(MCP_SERVERS, slug)) return null
  return MCP_SERVERS[slug]
}

// The exact claude_desktop_config.json block a user pastes, as a pretty string.
export function claudeConfigBlock(server) {
  const entry = { command: server.config.command, args: server.config.args }
  if (server.config.env) entry.env = server.config.env
  return JSON.stringify({ mcpServers: { [server.slug]: entry } }, null, 2)
}
