// Per-skill social card. Every skill page previously shared the single
// site-wide /opengraph-image, so a share of any listing rendered an identical
// generic card with no skill name, category or stars — thousands of URLs, one
// preview. This renders the actual listing.
import { ImageResponse } from 'next/og'
import { SITE_URL } from '@/lib/site-url'

export const alt = 'WorkflowStacks skill'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

async function getSkill(id) {
  try {
    const res = await fetch(`${SITE_URL}/api/skills/${encodeURIComponent(id)}`, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return null
    return (await res.json()).skill || null
  } catch {
    return null
  }
}

function fmtStars(n) {
  const v = Number(n) || 0
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`
  return String(v)
}

export default async function SkillOgImage({ params }) {
  const skill = await getSkill(params.id)
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
    { ...size }
  )
}
