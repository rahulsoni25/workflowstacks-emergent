import Link from 'next/link'

export const metadata = { title: 'Page not found | WorkflowStacks' }

export default function NotFound() {
  return (
    <div className="min-h-screen bg-neptune flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-7xl font-extrabold text-gradient-neptune mb-4">404</div>
        <h1 className="text-2xl font-bold text-white mb-3">This page wandered off</h1>
        <p className="text-slate-400 mb-8">
          The page or skill you're looking for doesn't exist or may have been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/">
            <span className="inline-block px-5 py-2.5 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium">
              Go Home
            </span>
          </Link>
          <Link href="/skills">
            <span className="inline-block px-5 py-2.5 rounded-lg border border-slate-700 text-slate-200">
              Browse Skills
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
