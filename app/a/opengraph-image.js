// Social card for every /a/<id> agent page. It shows nothing agent-specific,
// so it lives here, outside the [id] segment: Next prerenders it once at build
// and serves it as a static file. Under [id] it was rendered by a Function on
// every request (ƒ in `next build`), the same PNG each time. app/a/[id]/page.js
// points its og:image at this route. See docs/COSTS.md.
import { ImageResponse } from 'next/og'

export const alt = 'AI agent on WorkflowStacks'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: '#04141f',
          backgroundImage: 'linear-gradient(135deg, #04141f 0%, #06283d 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 40 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: '#2dd4bf', marginRight: 18 }} />
          <div style={{ fontSize: 34, fontWeight: 700, color: '#ffffff', display: 'flex' }}>
            <span>Workflow</span>
            <span style={{ color: '#2dd4bf' }}>Stacks</span>
          </div>
        </div>
        <div style={{ fontSize: 28, color: '#2dd4bf', marginBottom: 16 }}>COMMUNITY AI AGENT</div>
        <div style={{ fontSize: 64, fontWeight: 800, color: '#ffffff', lineHeight: 1.1, maxWidth: 1000 }}>
          A custom AI agent, built from free skills
        </div>
        <div style={{ fontSize: 30, color: '#94a3b8', marginTop: 24 }}>
          Remix it free on WorkflowStacks
        </div>
      </div>
    ),
    { ...size }
  )
}
