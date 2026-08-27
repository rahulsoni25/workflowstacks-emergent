// The internal-link universe: every real, linkable URL on the site built from
// the same registries the pages render from. The brief agent picks links from
// here; the SEO check rejects any /path the writer invented.
import { TEMPLATES } from '@/lib/templates'
import { MCP_SERVERS } from '@/lib/mcp-servers'
import { BUNDLES } from '@/lib/bundles'
import { OUTCOMES } from '@/lib/outcomes'
import { SLASH_COMMANDS } from '@/lib/commands'
import { KITS } from '@/lib/kits'

const STATIC = [
  ['/', 'WorkflowStacks home'],
  ['/templates', 'Free n8n workflow templates'],
  ['/tools', 'Premium n8n tools'],
  ['/bundles', 'Bundles'],
  ['/mcp', 'MCP configs for Claude Desktop'],
  ['/commands', 'Claude Code slash commands'],
  ['/kits', 'Finishing kits'],
  ['/skills', 'Open-source agent skills catalog'],
  ['/discover', "What's trending"],
  ['/personas', 'Personas'],
  ['/packs', 'Starter packs'],
  ['/playbooks', 'Playbooks'],
  ['/problems', 'Problems board'],
  ['/deals', 'Deals'],
  ['/community', 'Community gallery'],
  ['/builder', 'Agent builder'],
  ['/build-for-me', 'Done-for-you automation (from $500)'],
  ['/pricing', 'Pricing'],
  ['/learn/how-it-works', 'How it works'],
  ['/learn/skills', 'What are skills'],
  ['/learn/agents', 'What are agents'],
  ['/learn/mcp', 'What is MCP'],
  ['/learn/security', 'Security'],
  ['/learn/resources', 'Learning resources'],
  ['/blog', 'Blog'],
]

export function linkUniverse() {
  const out = STATIC.map(([path, label]) => ({ path, label, kind: 'page' }))
  for (const t of Object.values(TEMPLATES)) out.push({ path: `/templates/${t.slug}`, label: t.title, kind: 'template', persona: t.persona, keywords: t.match_keywords || [] })
  for (const b of Object.values(BUNDLES)) out.push({ path: `/bundles/${b.slug}`, label: `${b.title} ($${b.price_usd})`, kind: 'bundle' })
  for (const m of Object.values(MCP_SERVERS)) out.push({ path: `/mcp/${m.slug}`, label: `${m.name} MCP config`, kind: 'mcp' })
  for (const o of Object.values(OUTCOMES)) out.push({ path: `/automate/${o.slug}`, label: o.h1 || o.title, kind: 'outcome', persona: o.persona })
  for (const c of Object.values(SLASH_COMMANDS)) out.push({ path: `/commands/${c.slug}`, label: c.name, kind: 'commands' })
  for (const k of Object.values(KITS)) out.push({ path: `/kits/${k.slug}`, label: k.title || k.slug, kind: 'kit' })
  return out
}

const DYNAMIC_PREFIXES = ['/skills/', '/blog/', '/packs/', '/playbooks/', '/personas/', '/community/']

// Is this internal path one we can vouch for? Static/registry paths must be
// exact; catalog-style dynamic paths are allowed by prefix (existence is
// checked at publish time via HEAD request, see /api/blog/publish).
export function isKnownInternalPath(path) {
  if (!path || !path.startsWith('/')) return false
  const clean = path.split('#')[0].split('?')[0].replace(/\/$/, '') || '/'
  if (linkUniverse().some((l) => l.path === clean)) return true
  return DYNAMIC_PREFIXES.some((p) => clean.startsWith(p) && clean.length > p.length)
}

// Extract [text](href) markdown links.
export function extractLinks(md) {
  const out = []
  const re = /\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
  let m
  while ((m = re.exec(md || ''))) out.push({ text: m[1], href: m[2] })
  return out
}

export function classifyLinks(md) {
  const links = extractLinks(md)
  const internal = links.filter((l) => l.href.startsWith('/') || /^https?:\/\/(www\.)?workflowstacks\.com/.test(l.href))
    .map((l) => ({ ...l, path: l.href.replace(/^https?:\/\/(www\.)?workflowstacks\.com/, '') || '/' }))
  const external = links.filter((l) => /^https?:\/\//.test(l.href) && !/workflowstacks\.com/.test(l.href))
  const badInternal = internal.filter((l) => !isKnownInternalPath(l.path))
  return { internal, external, badInternal }
}

// Suggest link targets for a topic/persona — used by the brief agent so it
// only ever proposes real URLs.
export function suggestLinks({ persona, keywords = [], limit = 12 }) {
  const uni = linkUniverse()
  const kw = keywords.map((k) => String(k).toLowerCase())
  const scored = uni.map((l) => {
    let s = 0
    const hay = `${l.path} ${l.label} ${(l.keywords || []).join(' ')}`.toLowerCase()
    for (const k of kw) if (k && hay.includes(k)) s += 3
    if (persona && l.persona === persona) s += 2
    if (l.kind === 'template' || l.kind === 'mcp' || l.kind === 'outcome') s += 1
    return { ...l, score: s }
  })
  return scored.filter((l) => l.score > 0).sort((a, b) => b.score - a.score).slice(0, limit)
}
