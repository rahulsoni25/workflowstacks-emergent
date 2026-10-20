import LearnCreatorsClient from './LearnCreatorsClient'
import { getCatalogStats, countLabel } from '@/lib/catalog-stats'

export const revalidate = 604800

export const metadata = {
  title: 'For Creators — List Your AI Skill & Earn 85% | WorkflowStacks',
  description: 'Submit your Claude Skill, MCP server, or AI agent to WorkflowStacks. Reach founders, agencies, and ecommerce teams — keep 85% of every sale. See how submission, review, and security screening work.',
  alternates: { canonical: '/learn/creators' },
}

export default async function LearnCreatorsPage() {
  const stats = await getCatalogStats()
  return (
    <LearnCreatorsClient
      skillCount={countLabel(stats.publishedSkills)}
      communitySize={countLabel(stats.communitySize)}
    />
  )
}
