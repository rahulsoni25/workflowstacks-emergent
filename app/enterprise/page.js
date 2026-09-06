import Link from 'next/link'
import { ArrowLeft, Building } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import EnterpriseContactClient from './EnterpriseContactClient'

export const metadata = {
  title: 'Enterprise AI Solutions | WorkflowStacks',
  description: 'WorkflowStacks Enterprise offers custom AI skill ingestion, white-label agents, API access, SSO, and dedicated support for agencies and large teams.',
  alternates: { canonical: '/enterprise' },
}

export default function EnterprisePage() {
  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/"><Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5"><ArrowLeft className="w-4 h-4 mr-2" />Home</Button></Link>
        </div>
      </header>
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="text-center mb-16">
          <Building className="w-16 h-16 text-teal-400 mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">WorkflowStacks Enterprise</h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">Custom AI automation at scale for agencies and large teams.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {[
            { title: 'Custom Skill Ingestion', desc: 'Ingest skills from your private repositories, internal tools, and proprietary systems.' },
            { title: 'White-Label Agents', desc: 'Create branded AI agents for your clients with your company identity.' },
            { title: 'API Access', desc: 'Programmatic access to all marketplace features for custom integrations.' },
            { title: 'SSO & Team Management', desc: 'Enterprise-grade authentication with role-based access control.' },
            { title: 'Dedicated Support', desc: 'Priority support with a dedicated account manager.' },
            { title: 'Custom Playbooks', desc: 'We\'ll create custom playbooks tailored to your industry and workflows.' },
          ].map((f, i) => (
            <Card key={i} className="bg-slate-900/60 border-slate-700/50">
              <CardContent className="py-6">
                <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                <p className="text-slate-300 text-sm">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <EnterpriseContactClient />
      </div>
    </div>
  )
}
