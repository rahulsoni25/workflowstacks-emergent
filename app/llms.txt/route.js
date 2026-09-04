import { TEMPLATES } from '@/lib/templates'
import { BUNDLES } from '@/lib/bundles'
import { MCP_SERVERS } from '@/lib/mcp-servers'
import { OUTCOMES } from '@/lib/outcomes'
import { KITS, kitItemCount } from '@/lib/kits'
import { SLASH_COMMANDS } from '@/lib/commands'
import { SITE_URL } from '@/lib/schema'

export const revalidate = 86400

// /llms.txt — the emerging convention for telling LLM crawlers and answer
// engines what a site actually offers, in one clean, parseable file.
//
// GEO rationale: ChatGPT, Perplexity and Claude cite sources they can parse
// confidently. Our HTML is a React app wrapped in nav/footer chrome; this
// gives them the substance with none of the noise. Generated from the live
// registries so it can never drift out of sync with what we actually ship.
//
// Every claim here must stay literally true — an answer engine repeating an
// inflated claim is worse than not being cited at all.
// The flagship product is the open-source skill catalog, but llms.txt
// previously described only templates/MCP configs and mentioned the catalog
// in one line at the very bottom — so an answer engine reading this file
// could not surface a single skill. Pull the real top listings, same source
// as llms-full.txt.
async function topSkills(limit = 40) {
  try {
    const res = await fetch(`${SITE_URL}/api/skills?sort=popular&limit=${limit}`, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return []
    return (await res.json()).skills || []
  } catch {
    return []
  }
}

export async function GET() {
  const templates = Object.values(TEMPLATES)
  const bundles = Object.values(BUNDLES)
  const mcp = Object.values(MCP_SERVERS)
  const outcomes = Object.values(OUTCOMES)
  const kits = Object.values(KITS)
  const commands = Object.values(SLASH_COMMANDS)

  const skills = await topSkills()
  let blogPosts = []
  try {
    const { allPublishedForSitemap } = await import('@/lib/blog/store')
    blogPosts = (await allPublishedForSitemap()).slice(0, 20)
  } catch (e) { blogPosts = [] }

  const body = `# WorkflowStacks

> An open marketplace of AI skills and automations for founders, agencies, ecommerce and sales teams: a quality-gated catalog of open-source AI agents, Claude skills and MCP servers that install into Claude, ChatGPT or Gemini as a compiled prompt or a Claude Skill package — plus free importable n8n workflow templates, Claude Desktop MCP configurations, premium tools, and a done-for-you build service.

WorkflowStacks does not host or execute anything. Catalog skills run inside the user's own AI assistant; n8n templates run on the user's own n8n instance (free tier available) with their own LLM API key.

## For AI agents: install directly

- MCP connector: add ${SITE_URL}/api/mcp as an MCP server (OAuth supported) — tools: search_skills, get_skill, install_skill, list_my_skills.
- Full machine-readable skill catalog with per-skill install endpoints: ${SITE_URL}/llms-full.txt
- Any skill installs as a Claude Skill: GET ${SITE_URL}/api/skills/{slug}/claude-skill (append ?format=zip for a package, ?format=setup for a clone-and-build prompt).

## What makes this different

Every catalog listing is a real open-source repository that cleared an 8/10 quality gate, with a plain-English usage guide and a one-click install (compiled prompt, Claude Skill package, or the MCP connector). The n8n templates are complete, tested workflow files: download one JSON file, import it into n8n, connect your accounts, and it runs.

## AI skills catalog${skills.length ? ` (top ${skills.length} of the published catalog)` : ''}

Open-source AI agents, Claude skills and MCP servers, quality-gated at 8/10. Each installs into Claude, ChatGPT or Gemini as a compiled prompt, or into Claude / Claude Code as a Skill package via its skill_md endpoint. Full machine-readable list: ${SITE_URL}/llms-full.txt · Browse: ${SITE_URL}/skills
${skills.length ? '\n' + skills.map((s) => {
  const slug = s.slug || s.id
  const desc = (s.description_human || s.description || '').replace(/\s+/g, ' ').slice(0, 160)
  const stars = s.github_stars ? ` (${s.github_stars.toLocaleString('en-US')} GitHub stars)` : ''
  return `- [${s.title_human || s.name}](${SITE_URL}/skills/${slug})${stars} — ${desc}\n  skill_md: ${SITE_URL}/api/skills/${slug}/claude-skill`
}).join('\n') : ''}

## Free n8n workflow templates (${templates.length})

${templates.map((t) => `- [${t.title}](${SITE_URL}/templates/${t.slug}) — ${t.outcome} Setup: about ${t.setup_minutes} minutes. For: ${t.persona}.`).join('\n')}

## Premium tools (one-time purchase)

${bundles.map((b) => `- [${b.title}](${SITE_URL}/bundles/${b.slug}) — ${b.tagline} $${b.price_usd} one-time. Requires: ${b.needs || 'no extra API keys'}.`).join('\n')}

## Claude Desktop MCP server configurations (${mcp.length})

Hand-verified configuration blocks for connecting MCP servers to Claude Desktop.

${mcp.map((m) => `- [${m.title || m.name}](${SITE_URL}/mcp/${m.slug})`).join('\n')}

## Journal — tested guides (${blogPosts.length} recent)

Hands-on articles, each checked against the actual workflow files and repos it covers.

${blogPosts.map((p) => `- [${p.title}](${SITE_URL}/blog/${p.slug}) — ${p.excerpt || ''}`).join('\n')}

## Automation guides by outcome

${outcomes.map((o) => `- [${o.title || o.h1}](${SITE_URL}/automate/${o.slug})`).join('\n')}

## Finishing kits (${kits.length})

Curated, link-only sets of free/paid-tier creative assets (captions, badges, LUTs, overlays, SFX, music) matched to a specific ad style — not a generic stock library. We host none of these files; every pick links to its real source, and each includes what it actually costs.

${kits.map((k) => `- [${k.title}](${SITE_URL}/kits/${k.slug}) — ${k.outcome} ${kitItemCount(k)} picks. Pairs with: ${k.template}.`).join('\n')}

## Claude Code slash commands (${commands.length})

Hand-verified slash commands for Claude Code. Each page shows the actual command file (not a description of one), credits its original author, and links to the source repo.

${commands.map((c) => `- [${c.name}](${SITE_URL}/commands/${c.slug}) — ${c.blurb} License: ${c.license}, by ${c.author}.`).join('\n')}

## Services

- [Done-for-you agent build](${SITE_URL}/build-for-me) — from $500 per agent, delivered within 7 days, including setup and a handover walkthrough.
- [Pricing](${SITE_URL}/pricing) — free catalog, premium tools $29–$39 one-time, done-for-you from $500, custom enterprise.

## Catalog

- [Browse open-source AI skills](${SITE_URL}/) — a quality-gated index of open-source AI tools, agents and MCP servers, each linking to its source repository.
- [Free AI agent builder](${SITE_URL}/builder) — describe a goal, get a matching template or an agent blueprint. No code, no account required.

## Contact

- Website: ${SITE_URL}
- Creator submissions: ${SITE_URL}/submit
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
    },
  })
}
