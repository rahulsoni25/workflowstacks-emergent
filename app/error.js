'use client'

import { useEffect } from 'react'

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-neptune flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-white mb-3">Something went wrong</h1>
        <p className="text-text-muted mb-8">
          An unexpected error occurred. Try again, or head back home.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium"
          >
            Try again
          </button>
          <a href="/" className="px-5 py-2.5 rounded-lg border border-slate-700 text-text-secondary">
            Go Home
          </a>
        </div>
      </div>
    </div>
  )
}
