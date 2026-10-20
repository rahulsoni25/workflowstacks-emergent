// Live catalog numbers for marketing pages — the same /api/stats the home page
// reads, so a count on the site can't drift from the database. Returns {} when
// the API is unreachable (e.g. a build without network); callers then leave the
// number out instead of showing a made-up one.
import { SITE_URL } from '@/lib/site-url'

export async function getCatalogStats() {
  try {
    const res = await fetch(`${SITE_URL}/api/stats`, { next: { revalidate: 604800 }, signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return {}
    return await res.json()
  } catch {
    return {}
  }
}

// Rounded down to the nearest ten, like the home page: 537 → "530+". Under ten
// returns '' so a tiny number isn't dressed up as a stat.
export function countLabel(n) {
  const v = Number(n) || 0
  return v >= 10 ? `${(Math.floor(v / 10) * 10).toLocaleString('en-US')}+` : ''
}
