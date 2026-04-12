import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Privacy Policy | ShowClawMart',
  description: 'ShowClawMart Privacy Policy. Learn how we collect, use, and protect your data on our AI skills marketplace.',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-neptune">
      <header className="border-b border-teal-500/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <Link href="/"><Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5"><ArrowLeft className="w-4 h-4 mr-2" />Home</Button></Link>
        </div>
      </header>
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>
        <div className="prose prose-invert max-w-none space-y-6">
          <p className="text-slate-300 leading-relaxed"><strong className="text-white">Effective Date:</strong> February 1, 2026</p>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">1. Information We Collect</h2>
            <p className="text-slate-300 leading-relaxed">We collect minimal data necessary to provide the Service:</p>
            <ul className="space-y-2 text-slate-300 mt-2">
              <li>\u2022 <strong className="text-white">Usage Data:</strong> Pages visited, features used, search queries</li>
              <li>\u2022 <strong className="text-white">Email:</strong> Only if you subscribe to our newsletter</li>
              <li>\u2022 <strong className="text-white">Agent Data:</strong> Goals and skill selections when building agents</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">2. How We Use Your Information</h2>
            <ul className="space-y-2 text-slate-300">
              <li>\u2022 To provide and improve the Service</li>
              <li>\u2022 To send newsletter updates (with consent)</li>
              <li>\u2022 To analyze usage patterns and improve skill recommendations</li>
              <li>\u2022 We do NOT sell your data to third parties</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">3. Data Storage</h2>
            <p className="text-slate-300 leading-relaxed">Your data is stored securely on encrypted servers. Agent blueprints are generated on-demand and not permanently stored unless you explicitly save them.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">4. Cookies</h2>
            <p className="text-slate-300 leading-relaxed">We use essential cookies for site functionality and analytics cookies to understand usage patterns. You can disable non-essential cookies in your browser settings.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">5. Third-Party Services</h2>
            <p className="text-slate-300 leading-relaxed">We integrate with GitHub's public API for skill discovery. When you use generated blueprints in third-party AI tools, those tools' privacy policies apply.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">6. Your Rights</h2>
            <p className="text-slate-300 leading-relaxed">You may request access to, correction of, or deletion of your personal data at any time by contacting privacy@showclawmart.com.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">7. Contact</h2>
            <p className="text-slate-300 leading-relaxed">For privacy inquiries, contact privacy@showclawmart.com.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
