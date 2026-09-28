import { getDb } from './mongo'
import { TOOLS_ONLY } from './catalog-gates'

// Same field exclusions as the API route's LIST_PROJECTION (app/api/[[...path]]/route.js) —
// kept in sync by hand since the route can't import from here without a bigger
// refactor of that file. Detail-page-only fields, dropped from list queries.
const LIST_PROJECTION = {
  readme_preview: 0, description_original: 0, name_original: 0, rewritten_at: 0,
  codeflow: 0,
}

// Lighter than the API route's applyFallback() (no acronym-casing / boilerplate
// scrub) — acceptable here because these two calls only read title_human /
// description_human as-is once the nightly rewrite has run, which is true for
// nearly every published skill by the time it has real traffic.
function lightFallback(s) {
  return {
    ...s,
    title_human: s.title_human || s.name,
    description_human: s.description_human || s.description,
  }
}

// Direct-Mongo equivalent of `GET /api/skills/:key` (slug, falling back to id).
// The skill detail page (app/skills/[id]/page.js) used to self-fetch this over
// HTTP on every ISR regeneration — an extra Vercel Function invocation + full
// network round-trip per render, on the catalog's highest-volume page type
// (~2.7k pages). Each hop bills its own Fluid Active CPU; with weekly
// regeneration across the whole catalog, that hop was pure overhead.
export async function getSkillDirect(key) {
  const db = await getDb()
  const col = db.collection('skills')
  const skill = (await col.findOne({ slug: key })) || (await col.findOne({ id: key }))
  return skill ? lightFallback(skill) : null
}

// Direct-Mongo equivalent of the two `/api/skills?category=..&sort=popular|updated`
// calls the detail page's "Related skills" module made over HTTP.
export async function getRelatedSkillsDirect(category) {
  const db = await getDb()
  const col = db.collection('skills')
  const query = { published: { $ne: false }, ...TOOLS_ONLY, category }
  const [popular, recent] = await Promise.all([
    col.find(query, { projection: LIST_PROJECTION }).sort({ github_stars: -1 }).limit(6).toArray(),
    col.find(query, { projection: LIST_PROJECTION }).sort({ last_updated: -1 }).limit(60).toArray(),
  ])
  return { popular: popular.map(lightFallback), recent: recent.map(lightFallback) }
}
