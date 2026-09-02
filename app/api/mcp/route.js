// WorkflowStacks MCP server — Streamable HTTP transport, stateless, no SDK.
//
// This is the "connect once, then everything is one click" channel: add this
// endpoint to Claude (Claude Code: `claude mcp add --transport http
// workflowstacks <base>/api/mcp`; claude.ai custom connectors once OAuth is
// added at finalize) and Claude can search the whole catalog and load any
// skill's instructions mid-conversation — no Agent Builder, no copy-paste.
//
// Implements the MCP JSON-RPC surface a tools-only server needs: initialize,
// ping, tools/list, tools/call. Each POST is independent (no sessions, no
// SSE), which the spec explicitly allows for simple servers.

import { loadSkill, searchSkills, compileSkillMd, skillSlug, SITE } from '@/lib/claude-skill'
import { getAccessToken } from '@/lib/oauth-store'

export const dynamic = 'force-dynamic'

const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05']
const SERVER_INFO = { name: 'workflowstacks', title: 'WorkflowStacks', version: '1.0.0' }
const INSTRUCTIONS =
  'WorkflowStacks is a free marketplace of open-source AI skills, MCP servers, and agents from GitHub. ' +
  'Use search_skills to find tools for a task, then get_skill to load a skill\'s full instructions into the conversation and follow them.'

const TOOLS = [
  {
    name: 'search_skills',
    title: 'Search the WorkflowStacks catalog',
    description:
      'Search WorkflowStacks for open-source AI skills, MCP servers, and agent tools that match a task or topic. ' +
      'Returns matching skills with their slug — pass a slug to get_skill to load the full instructions.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What the user wants to do, e.g. "transcribe meetings" or "scrape websites"' },
        category: {
          type: 'string',
          description: 'Optional category filter: claude-skill, mcp-server, ai-agent, prompt, marketing, etc.',
        },
        limit: { type: 'number', description: 'Max results (1-20, default 8)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_skill',
    title: 'Load a skill\'s instructions',
    description:
      'Fetch the compiled SKILL.md for one WorkflowStacks skill (by slug or id) and return its full instructions. ' +
      'After loading, follow the skill\'s instructions for the user\'s task. Also returns permanent install options.',
    inputSchema: {
      type: 'object',
      properties: {
        skill: { type: 'string', description: 'The skill slug (preferred) or id, e.g. "cli-anything"' },
      },
      required: ['skill'],
    },
  },
]

function rpcResult(id, result) {
  return Response.json({ jsonrpc: '2.0', id, result })
}

function rpcError(id, code, message, status = 200) {
  return Response.json({ jsonrpc: '2.0', id: id ?? null, error: { code, message } }, { status })
}

function textResult(id, text, isError = false) {
  return rpcResult(id, { content: [{ type: 'text', text }], isError })
}

function installBlock(skill) {
  const slug = skillSlug(skill)
  return [
    '',
    '---',
    'Permanent install options for the user:',
    `- Claude app (paid plans): download ${SITE}/api/skills/${slug}/claude-skill?format=zip then upload under Settings → Capabilities → Skills.`,
    `- Claude Code: mkdir -p ~/.claude/skills/${slug} && curl -fsSL ${SITE}/api/skills/${slug}/claude-skill -o ~/.claude/skills/${slug}/SKILL.md`,
    `- Full guide: ${SITE}/skills/${skill.slug || skill.id}`,
  ].join('\n')
}

async function callTool(id, name, args = {}) {
  if (name === 'search_skills') {
    const results = await searchSkills({
      query: String(args.query || ''),
      category: args.category ? String(args.category) : '',
      limit: Number(args.limit) || 8,
    })
    if (!results.length) {
      return textResult(id, `No skills matched "${args.query}". Try broader keywords, or browse ${SITE}/skills.`)
    }
    const lines = results.map((s) => {
      const stars = s.github_stars ? ` · ★${s.github_stars.toLocaleString('en-US')}` : ''
      return `- ${s.title_human || s.name} (slug: ${s.slug || s.id}) [${s.category}${stars}]\n  ${(s.description_human || s.description || '').slice(0, 180)}`
    })
    return textResult(
      id,
      `Found ${results.length} skills for "${args.query}":\n\n${lines.join('\n')}\n\nCall get_skill with a slug to load its instructions.`
    )
  }

  if (name === 'get_skill') {
    const skill = await loadSkill(String(args.skill || ''))
    if (!skill) return textResult(id, `No skill found for "${args.skill}". Use search_skills to find the right slug.`, true)
    const { markdown } = compileSkillMd(skill)
    return textResult(id, markdown + installBlock(skill))
  }

  return rpcError(id, -32602, `Unknown tool: ${name}`)
}

export async function POST(request) {
  // Dual-mode auth: a Bearer token, when presented, must be valid (this is
  // what claude.ai sends after the OAuth flow — see /oauth/authorize). With
  // no Authorization header the catalog tools still work anonymously, which
  // keeps existing `claude mcp add` / Cursor setups functional.
  const auth = request.headers.get('authorization') || ''
  if (auth.toLowerCase().startsWith('bearer ')) {
    const grant = await getAccessToken(auth.slice(7).trim()).catch(() => null)
    if (!grant) {
      const base = new URL(request.url).origin
      return new Response(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Invalid or expired token' } }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': `Bearer error="invalid_token", resource_metadata="${base}/.well-known/oauth-protected-resource"`,
        },
      })
    }
  }

  let msg
  try {
    msg = await request.json()
  } catch {
    return rpcError(null, -32700, 'Parse error', 400)
  }
  if (Array.isArray(msg)) {
    return rpcError(null, -32600, 'Batch requests are not supported', 400)
  }
  const { id, method, params } = msg || {}
  if (!method) return rpcError(id, -32600, 'Invalid request', 400)

  // Notifications (no id) get an empty 202 per the Streamable HTTP transport.
  if (id === undefined || id === null) {
    return new Response(null, { status: 202 })
  }

  switch (method) {
    case 'initialize': {
      const requested = params?.protocolVersion
      return rpcResult(id, {
        protocolVersion: PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      })
    }
    case 'ping':
      return rpcResult(id, {})
    case 'tools/list':
      return rpcResult(id, { tools: TOOLS })
    case 'tools/call': {
      try {
        return await callTool(id, params?.name, params?.arguments)
      } catch (e) {
        return textResult(id, `Tool failed: ${e?.message || 'unknown error'}`, true)
      }
    }
    default:
      return rpcError(id, -32601, `Method not found: ${method}`)
  }
}

// No server-initiated stream and no sessions: GET/DELETE are 405 per spec.
export function GET() {
  return Response.json(
    { name: SERVER_INFO.name, transport: 'streamable-http', endpoint: '/api/mcp', hint: 'POST JSON-RPC messages here' },
    { status: 405, headers: { Allow: 'POST, OPTIONS' } }
  )
}

export function DELETE() {
  return new Response(null, { status: 405, headers: { Allow: 'POST, OPTIONS' } })
}

export function OPTIONS() {
  return new Response(null, { status: 204 })
}
