import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Terms of Service | WorkflowStacks',
  description: 'WorkflowStacks Terms of Service. Read our terms and conditions for using the AI skills marketplace.',
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/"><Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5"><ArrowLeft className="w-4 h-4 mr-2" />Home</Button></Link>
        </div>
      </header>
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="text-4xl font-bold text-white mb-8">Terms of Service</h1>
        <div className="prose prose-invert max-w-none space-y-6">
          <p className="text-slate-300 leading-relaxed"><strong className="text-white">Effective Date:</strong> February 1, 2026</p>
          
          <section>
            <h2 className="text-2xl font-bold text-white mb-3">1. Acceptance of Terms</h2>
            <p className="text-slate-300 leading-relaxed">By accessing or using WorkflowStacks ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">2. Description of Service</h2>
            <p className="text-slate-300 leading-relaxed">WorkflowStacks is an AI skills marketplace that allows users to discover, combine, and deploy AI agent blueprints. The Service provides text-based agent configurations that users can paste into third-party AI tools.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">3. User Responsibilities</h2>
            <ul className="space-y-2 text-slate-300">
              <li>• You are responsible for how you use generated agent blueprints</li>
              <li>• You must comply with the terms of service of third-party AI tools (ChatGPT, Claude, Gemini)</li>
              <li>• You may not use the Service for illegal, harmful, or abusive purposes</li>
              <li>• You may not redistribute premium skills without authorization</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">4. Intellectual Property</h2>
            <p className="text-slate-300 leading-relaxed">Open-source skills are subject to their respective licenses. Premium skills are licensed for personal or team use as specified. WorkflowStacks's platform, branding, and curated content are our intellectual property.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">5. Limitation of Liability</h2>
            <p className="text-slate-300 leading-relaxed">WorkflowStacks provides agent blueprints as-is. We are not responsible for the outputs or actions of AI tools when used with our blueprints. Use at your own discretion.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">6. Changes to Terms</h2>
            <p className="text-slate-300 leading-relaxed">We may update these terms from time to time. Continued use of the Service constitutes acceptance of the updated terms.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">7. Contact</h2>
            <p className="text-slate-300 leading-relaxed">For questions about these terms, please contact us at support@workflowstacks.com.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
