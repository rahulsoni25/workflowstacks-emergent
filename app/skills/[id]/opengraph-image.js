// Per-skill social card. Every skill page previously shared the single
// site-wide /opengraph-image, so a share of any listing rendered an identical
// generic card with no skill name, category or stars — thousands of URLs, one
// preview. This renders the actual listing.
//
// Cost (docs/COSTS.md). `next build` lists this route as ƒ: it renders on
// every request, about 150-600 ms of CPU for a ~100 KB PNG (measured locally
// 2026-11-14). It is deliberately not ISR: at 13 write units per image
// (billed per 8 KB) it would cost twice the skill page itself after every
// deploy. Two things keep it cheap instead:
//   - It reads Mongo directly, like the page. It used to self-fetch
//     /api/skills/:id first: a second Function invocation, plus a data-cache
//     write of the whole skill document.
//   - A rendered card is kept by Vercel's CDN (s-maxage), which is not billed
//     as ISR writes. A card drawn without data (unknown id, or the database
//     unreachable) is not kept for long, so it can't stick.
import { ImageResponse } from 'next/og'
import { getSkillDirect } from '@/lib/skills-data'

export const alt = 'WorkflowStacks skill'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const CACHE_FOUND = 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400'
const CACHE_MISSING = 'public, max-age=0, s-maxage=3600'
const CACHE_FAILED = 'no-store'

async function getSkill(id) {
  try {
    const skill = await getSkillDirect(id)
    return { skill, cache: skill ? CACHE_FOUND : CACHE_MISSING }
  } catch {
    return { skill: null, cache: CACHE_FAILED }
  }
}

function fmtStars(n) {
  const v = Number(n) || 0
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`
  return String(v)
}

export default async function SkillOgImage({ params }) {
  const { skill, cache } = await getSkill(params.id)
  const title = (skill?.title_human || skill?.name || 'AI skill').slice(0, 70)
  const desc = (skill?.description_human || skill?.description || '').replace(/\s+/g, ' ').slice(0, 150)
  const category = skill?.category || ''
  const stars = skill?.github_stars
  const score = typeof skill?.rewrite_score === 'number' ? skill.rewrite_score : null

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: '#0A0C0D',
          backgroundImage: 'linear-gradient(135deg, #0A0C0D 0%, #101314 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#C6F24E', marginRight: 16 }} />
          <div style={{ fontSize: 30, fontWeight: 700, color: '#ECEFEA', display: 'flex' }}>
            <span>workflow</span>
            <span style={{ color: '#C6F24E' }}>stacks</span>
          </div>
          {category ? (
            <div
              style={{
                marginLeft: 'auto',
                fontSize: 22,
                color: '#8B928D',
                border: '1px solid #323A3C',
                borderRadius: 8,
                padding: '6px 16px',
              }}
            >
              {category}
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 64, fontWeight: 800, color: '#ECEFEA', lineHeight: 1.1, maxWidth: 1040 }}>{title}</div>
          {desc ? (
            <div style={{ fontSize: 28, color: '#8B928D', marginTop: 24, lineHeight: 1.4, maxWidth: 1000 }}>{desc}</div>
          ) : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', fontSize: 26, color: '#8B928D' }}>
          {stars ? <span style={{ marginRight: 32 }}>★ {fmtStars(stars)} GitHub stars</span> : null}
          {score !== null ? <span style={{ color: '#C6F24E', marginRight: 32 }}>● {score}/10 guide quality</span> : null}
          <span>Install into Claude · ChatGPT · Gemini</span>
        </div>
      </div>
    ),
    // Lower-case key: it replaces ImageResponse's own default instead of being
    // merged with it into one combined header.
    { ...size, headers: { 'cache-control': cache } }
  )
}
