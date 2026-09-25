// Skill slugs. Moved out of app/api/[[...path]]/route.js (a Next route file
// cannot export helpers) so lib/curated-repos.js and the refresh-skills cron
// can assign slugs the same way the ingest and add-skill paths do.

// Slug generation — Pattern C (name-first, owner-name on collision).
// Lowercase, hyphens, no diacritics/emoji, max 60 chars on a word boundary.
export function slugify(raw) {
  if (!raw) return ''
  let s = String(raw).toLowerCase()
    // Strip emoji and pictographs
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    // Replace non-alphanumeric with hyphens (keep dots+digits in things like llama.cpp -> llama-cpp)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (s.length <= 60) return s
  // Truncate at a hyphen boundary so we never end mid-word
  const cut = s.slice(0, 60)
  const last = cut.lastIndexOf('-')
  return last > 30 ? cut.slice(0, last) : cut
}

// Pick a unique slug for a skill, deferring to the DB to check collisions.
// Order: name → owner-name → owner-name-2 → owner-name-3 …
export async function uniqueSlug(database, name, owner, currentId = null) {
  const base = slugify(name)
  if (!base) return slugify(owner + '-' + (currentId || 'skill')) || ('skill-' + Date.now())
  // Try base first
  const baseHit = await database.collection('skills').findOne({ slug: base, id: { $ne: currentId } })
  if (!baseHit) return base
  // Try owner-base
  const ownerSlug = owner ? slugify(owner + '-' + name) : null
  if (ownerSlug) {
    const ownerHit = await database.collection('skills').findOne({ slug: ownerSlug, id: { $ne: currentId } })
    if (!ownerHit) return ownerSlug
    // Try owner-base-2, -3, …
    for (let i = 2; i < 50; i++) {
      const candidate = ownerSlug + '-' + i
      const hit = await database.collection('skills').findOne({ slug: candidate, id: { $ne: currentId } })
      if (!hit) return candidate
    }
  }
  // Last resort fallback
  return base + '-' + Date.now().toString(36).slice(-4)
}
