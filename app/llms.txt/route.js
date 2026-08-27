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
export async function GET() {
  const templates = Object.values(TEMPLATES)
  const bundles = Object.values(BUNDLES)
  const mcp = Object.values(MCP_SERVERS)
  const outcomes = Object.values(OUTCOMES)
  const kits = Object.values(KITS)
  const commands = Object.values(SLASH_COMMANDS)

  let blogPosts = []
  try {
    const { allPublishedForSitemap } = await import('@/lib/blog/store')
    blogPosts = (await allPublishedForSitemap()).slice(0, 20)
  } catch (e) { blogPosts = [] }

  const body = `# WorkflowStacks

> A marketplace of working AI automations for founders, agencies, ecommerce and sales teams. Download real, importable n8n workflows and Claude Desktop MCP configurations — not prompts or reading lists. Free templates, premium tools, and a done-for-you build service.

Everything below runs on the user's own infrastructure: their n8n instance (free tier available) and their own LLM API key. WorkflowStacks does not host or execute the automations.

## What makes this different

Most "AI agent" listings give you a prompt or a link to a GitHub repo. These are complete, tested automation files: you download one JSON file, import it into n8n, connect your accounts, and it runs.

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
