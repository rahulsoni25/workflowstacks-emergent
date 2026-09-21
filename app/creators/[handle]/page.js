import { cache } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BadgeCheck, Github, Globe, MapPin, Star, Twitter } from 'lucide-react'
import { SITE_URL as BASE } from '@/lib/site-url'
import { breadcrumbSchema } from '@/lib/schema'
import { getCreator, foundingSlotsLeft, badgeMarkdown, normHandle } from '@/lib/creators'
import ClaimBox from '@/components/creators/ClaimBox'
import CopyLine from '@/components/creators/CopyLine'
import InviteCapture from '@/components/creators/InviteCapture'

// Rendered on first visit, then cached for a week. A successful claim calls
// revalidatePath for this URL, so verification shows up immediately. Nothing is
// prebuilt: ~2k owner pages would be ~2k ISR writes on every deploy.
export const revalidate = 604800
export function generateStaticParams() {
  return []
}

const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n || 0))

// cache(): generateMetadata and the page share one Mongo read per render.
const load = cache(async (handle) => {
  try {
    return await getCreator(handle)
  } catch (e) {
    console.error('creator page', e)
    return null
  }
})

export async function generateMetadata({ params }) {
  const key = normHandle(params.handle)
  const c = key ? await load(key) : null
  if (!c) return { title: 'Creator not found | WorkflowStacks', robots: { index: false, follow: true } }
  const n = c.skills.length
  return {
    title: `${c.profile?.name || c.handle} (@${c.handle}) — ${n} open-source AI ${n === 1 ? 'skill' : 'skills'} | WorkflowStacks`,
    description: `Open-source AI skills, MCP servers and agents by @${c.handle} listed on WorkflowStacks: ${c.skills.slice(0, 3).map((s) => s.name).join(', ')}.`,
    alternates: { canonical: `/creators/${c.handle.toLowerCase()}` },
    // Auto-generated pages stay out of the index until the creator claims them.
    robots: c.verified ? undefined : { index: false, follow: true },
  }
}

export default async function CreatorPage({ params }) {
  const key = normHandle(params.handle)
  // Mixed-case URLs render in place (a redirect would drop ?invite=); the
  // canonical tag points at the lowercase URL and every link we emit uses it.
  if (!key) notFound()
  const c = await load(key)
  if (!c) notFound()
  const foundingLeft = c.verified ? 0 : await foundingSlotsLeft().catch(() => 0)
  const url = `${BASE}/creators/${key}`
  const crumbs = breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Creators', path: '/creators' }, { name: c.handle, path: `/creators/${key}` }])
  const profileLd = c.verified
    ? {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        url,
        mainEntity: {
          '@type': c.org ? 'Organization' : 'Person',
          name: c.profile?.name || c.handle,
          alternateName: c.handle,
          image: c.avatar,
          sameAs: [c.github, c.profile?.website, c.profile?.x].filter(Boolean),
        },
      }
    : null

  return (
    <div className="min-h-screen bg-[#0A0C0D]">
      <InviteCapture />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      {profileLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(profileLd) }} />}
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <nav className="t-mono text-xs text-text-muted"><Link prefetch={false} href="/creators" className="text-text-muted hover:text-[#C6F24E]">← All creators</Link></nav>

        <header className="mt-5 flex items-start gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.avatar} alt="" width={88} height={88} className="h-[88px] w-[88px] shrink-0 rounded-full border border-[#262B2D] bg-[#101314]" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-text-primary">{c.profile?.name || c.handle}</h1>
              {c.verified ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#C6F24E]/40 bg-[#C6F24E]/10 px-2.5 py-0.5 text-xs font-semibold text-[#C6F24E]"><BadgeCheck className="h-3.5 w-3.5" />Verified creator</span>
              ) : (
                <span className="rounded-full border border-[#262B2D] px-2.5 py-0.5 text-xs text-text-muted">Listed · not yet claimed</span>
              )}
              {c.founding && <span className="t-mono rounded-full border border-[#C6F24E]/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#C6F24E]">Founding creator</span>}
            </div>
            <div className="mt-1 text-sm text-text-muted">@{c.handle}{c.org ? ' · Organization' : ''}</div>
            {c.profile?.bio && <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-text-muted">{c.profile.bio}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-text-muted">
              <span className="inline-flex items-center gap-1"><Star className="h-4 w-4" />{fmt(c.stars)} stars across {c.skills.length} listed</span>
              <a href={c.github} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-text-muted hover:text-[#C6F24E]"><Github className="h-4 w-4" />GitHub</a>
              {c.profile?.website && <a href={c.profile.website} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-text-muted hover:text-[#C6F24E]"><Globe className="h-4 w-4" />Website</a>}
              {c.profile?.x && <a href={c.profile.x} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-text-muted hover:text-[#C6F24E]"><Twitter className="h-4 w-4" />X</a>}
              {c.profile?.location && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{c.profile.location}</span>}
            </div>
          </div>
        </header>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-text-primary">On WorkflowStacks</h2>
          <ul className="mt-4 space-y-3">
            {c.skills.map((s) => (
              <li key={s.slug}>
                <Link prefetch={false} href={`/skills/${s.slug}`} className="group block rounded-xl border border-[#262B2D] bg-[#101314] p-4 no-underline transition-colors hover:border-[#C6F24E]/40">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-text-primary group-hover:text-[#C6F24E]">{s.name}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs text-text-muted"><Star className="h-3.5 w-3.5" />{fmt(s.stars)}</span>
                  </div>
                  {s.description && <p className="mt-1 line-clamp-2 text-[13.5px] leading-relaxed text-text-muted">{s.description}</p>}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-10">
          {c.verified ? (
            <section className="rounded-xl border border-[#262B2D] bg-[#101314] p-5">
              <h2 className="text-lg font-semibold text-text-primary">Invite a builder</h2>
              <p className="mt-1.5 mb-3 text-[14px] text-text-muted">Know someone whose work belongs here? Share this link. When they verify their page or submit a repo, it is credited to @{c.handle}.</p>
              <CopyLine text={`${BASE}/creators?invite=${key}`} label="Copy link" />
            </section>
          ) : (
            <ClaimBox handle={c.handle} badgeMd={badgeMarkdown(c.skills[0].slug)} foundingLeft={foundingLeft} />
          )}
        </div>

        {!c.verified && (
          <p className="mt-6 text-[13px] text-text-muted">
            This page lists public open-source projects and links to their GitHub repos. @{c.handle} has not signed up to WorkflowStacks.
            If this is you and you would rather not be listed, email <a href="mailto:hello@workflowstacks.com" className="text-[#C6F24E]">hello@workflowstacks.com</a>.
          </p>
        )}
      </div>
    </div>
  )
}
