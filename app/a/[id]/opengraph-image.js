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
