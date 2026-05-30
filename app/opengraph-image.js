import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'WorkflowStacks — AI Skills & Agent Marketplace'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
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
          background: 'linear-gradient(135deg, #04141f 0%, #06283d 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 40 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: 'linear-gradient(135deg, #2dd4bf, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 44,
            }}
          >
            ✦
          </div>
          <div style={{ fontSize: 40, fontWeight: 800, color: 'white' }}>
            Workflow<span style={{ color: '#2dd4bf' }}>Stacks</span>
          </div>
        </div>
        <div style={{ fontSize: 64, fontWeight: 800, color: 'white', lineHeight: 1.1, maxWidth: 900 }}>
          AI Skills & Agent Marketplace
        </div>
        <div style={{ fontSize: 32, color: '#94a3b8', marginTop: 24, maxWidth: 850 }}>
          100+ free, trending GitHub AI skills, MCP servers & agent tools — for founders, no code required.
        </div>
      </div>
    ),
    { ...size }
  )
}
