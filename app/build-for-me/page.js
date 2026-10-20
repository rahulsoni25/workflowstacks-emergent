import BuildForMeClient from './BuildForMeClient'

export const metadata = {
  title: 'We Build Your AI Agent — Working in 7 Days | WorkflowStacks',
  description:
    'Describe the workflow you want automated. We build a working AI agent from proven open-source tools, set it up in your tools and hand you the keys. From $500.',
  alternates: { canonical: '/build-for-me' },
}

export default function BuildForMePage() {
  return <BuildForMeClient />
}
