import { SITE_URL } from '@/lib/site-url'

// Packs, playbooks and personas are three genuinely different things — a pack
// is a bundle of skills for a job, a playbook is an ordered procedure with an
// outcome, a persona is a role's whole stack — but there are four of each, and
// each had its own top-level nav slot and its own section on the homepage's
// link surface. Twelve items were taking three of the site's strongest link
// positions and three of the entity types an answer engine has to hold before
// it can say what this site is.
//
// They keep their own URLs and their own index pages. This module gives them a
// shared hub, and gives their items a URL a human can read: every one resolved
// to /packs/c5398430-f54f-4f33-98d1-08745d529619 and similar, which carries no
// keyword signal and cannot be quoted back by an answer engine.

export const COLLECTION_KINDS = {
  packs: {
    kind: 'packs',
    label: 'Starter Pack',
    plural: 'Starter Packs',
    blurb: 'A bundle of skills chosen for one job, so you install a working set instead of picking one at a time.',
    titleOf: (x) => x.name,
  },
  playbooks: {
    kind: 'playbooks',
    label: 'Playbook',
    plural: 'Playbooks',
    blurb: 'An ordered procedure with a stated outcome and a time estimate — the steps, not just the tools.',
    titleOf: (x) => x.title || x.name,
  },
  personas: {
    kind: 'personas',
    label: 'Persona',
    plural: 'Personas',
    blurb: "A whole role's stack: what that person does all day, and the skills that cover it.",
    titleOf: (x) => x.name,
  },
}

// Deliberately derived from the name rather than stored: there are twelve
// items, the names are stable, and a derived slug needs no migration and no
// second source of truth that can drift from the one the page renders.
export function slugifyName(raw) {
  if (!raw) return ''
  return String(raw)
    .toLowerCase()
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '')
}

function unwrap(json, kind) {
  if (Array.isArray(json)) return json
  if (!json || typeof json !== 'object') return []
  return json[kind] || json.items || json.data || []
}

export async function fetchCollection(kind, { revalidate = 86400 } = {}) {
  try {
    const res = await fetch(`${SITE_URL}/api/${kind}?limit=200`, {
      next: { revalidate },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return []
    const items = unwrap(await res.json(), kind)
    const meta = COLLECTION_KINDS[kind]
    return items.map((x) => ({ ...x, _slug: slugifyName(meta?.titleOf(x) || x.name || x.title) }))
  } catch {
    return []
  }
}

// Accepts either form of the path segment. Old UUID links — internal, external
// and already-indexed — keep resolving; the page redirects them to the slug so
// only one URL accumulates signal.
export async function resolveItem(kind, param) {
  const items = await fetchCollection(kind)
  if (!items.length) return null
  const byId = items.find((x) => x.id === param)
  if (byId) return { item: byId, matchedBy: 'id' }
  const bySlug = items.find((x) => x._slug && x._slug === param)
  if (bySlug) return { item: bySlug, matchedBy: 'slug' }
  return null
}

export async function allCollectionItems() {
  const kinds = Object.keys(COLLECTION_KINDS)
  const lists = await Promise.all(kinds.map((k) => fetchCollection(k)))
  return kinds.flatMap((k, i) =>
    lists[i].map((x) => ({
      kind: k,
      slug: x._slug,
      id: x.id,
      title: COLLECTION_KINDS[k].titleOf(x) || x.name || x.title,
      description: x.description || '',
      audience: x.audience || 'Everyone',
      useCase: x.useCase || '',
      outcome: x.outcome || '',
      timeEstimate: x.timeEstimate || '',
      skillCount: Array.isArray(x.skillIds) ? x.skillIds.length : 0,
    }))
  )
}
