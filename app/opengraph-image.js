import { ImageResponse } from 'next/og'

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
          background: '#04141f',
          backgroundImage: 'linear-gradient(135deg, #04141f 0%, #06283d 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 40 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: '#2dd4bf',
              marginRight: 20,
            }}
          />
          <div style={{ fontSize: 40, fontWeight: 700, color: '#ffffff', display: 'flex' }}>
            <span>Workflow</span>
            <span style={{ color: '#2dd4bf' }}>Stacks</span>
          </div>
        </div>
        <div style={{ fontSize: 68, fontWeight: 800, color: '#ffffff', lineHeight: 1.1, maxWidth: 1000 }}>
          AI Skills & Agent Marketplace
        </div>
        <div style={{ fontSize: 30, color: '#94a3b8', marginTop: 28, maxWidth: 900 }}>
          100+ free, trending open-source AI skills, playbooks & agents — for founders, no code.
        </div>
      </div>
    ),
    { ...size }
  )
}
