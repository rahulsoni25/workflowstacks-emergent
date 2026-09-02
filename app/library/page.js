// /library — the anonymous personal skill collection. Shared between the
// website (ws_lib cookie) and the MCP connector (OAuth), so a skill saved
// here shows up when Claude calls list_my_skills, and vice versa.

import { cookies } from 'next/headers'
import Link from 'next/link'
import { listLibrary } from '@/lib/library'
import LibraryClient from './LibraryClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'My Library | WorkflowStacks',
  description: 'Your saved AI skills — synced with the WorkflowStacks connector in Claude.',
  robots: { index: false },
}

export default async function LibraryPage() {
  const libraryId = cookies().get('ws_lib')?.value || ''
  const items = await listLibrary(libraryId).catch(() => [])

  return (
    <div className="min-h-screen bg-neptune">
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="text-4xl font-bold text-white mb-3">My Library</h1>
        <p className="text-slate-400 mb-8">
          Skills you've saved — from this site or by telling Claude "install this skill" through the{' '}
          <Link href="/mcp" className="text-teal-300 hover:text-teal-200">WorkflowStacks connector</Link>. No account needed; it lives in your browser and your connected Claude.
        </p>
        <LibraryClient initialItems={items.map(({ _id, library_id, ...rest }) => ({ ...rest, added_at: rest.added_at?.toISOString?.() || rest.added_at }))} />
      </div>
    </div>
  )
}
