import AskClient from './AskClient'

export const metadata = {
  title: 'Ask — Find the Right AI Skill by Describing Your Problem | WorkflowStacks',
  description: 'Ask a question in plain English — "how do I transcribe meetings" — and get real, open-source AI tools from the WorkflowStacks catalog, ranked and ready to click through.',
  alternates: { canonical: '/ask' },
}

export default function AskPage() {
  return <AskClient />
}
