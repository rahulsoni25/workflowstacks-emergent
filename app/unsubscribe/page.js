'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function UnsubscribePage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const [status, setStatus] = useState('loading') // 'loading' | 'success' | 'error' | 'no-email'

  useEffect(() => {
    if (!email) {
      setStatus('no-email')
      return
    }

    fetch('/api/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setStatus('success')
        else setStatus('error')
      })
      .catch(() => setStatus('error'))
  }, [email])

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <Link href="/" className="inline-block mb-10">
          <span className="text-xl font-semibold text-white tracking-tight">
            WorkflowStacks
          </span>
        </Link>

        <div className="bg-[#111111] border border-white/8 rounded-2xl p-8">
          {status === 'loading' && (
            <>
              <div className="flex justify-center mb-5">
                <div className="w-10 h-10 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
              </div>
              <p className="text-white/60 text-sm">Processing your request…</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex justify-center mb-5">
                <div className="w-12 h-12 rounded-full bg-teal-400/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h1 className="text-white text-xl font-semibold mb-3">You've been unsubscribed</h1>
              <p className="text-white/60 text-sm leading-relaxed">
                You've been unsubscribed from WorkflowStacks emails. You can resubscribe anytime on the homepage.
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex justify-center mb-5">
                <div className="w-12 h-12 rounded-full bg-red-400/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <h1 className="text-white text-xl font-semibold mb-3">Something went wrong</h1>
              <p className="text-white/60 text-sm leading-relaxed">
                We couldn't process your request. Please try again or contact us if the issue persists.
              </p>
            </>
          )}

          {status === 'no-email' && (
            <>
              <div className="flex justify-center mb-5">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <h1 className="text-white text-xl font-semibold mb-3">No email specified</h1>
              <p className="text-white/60 text-sm leading-relaxed">
                This link appears to be invalid. Please use the unsubscribe link from one of our emails.
              </p>
            </>
          )}
        </div>

        <Link
          href="/"
          className="inline-block mt-6 text-sm text-white/40 hover:text-teal-400 transition-colors"
        >
          ← Back to WorkflowStacks
        </Link>
      </div>
    </div>
  )
}
