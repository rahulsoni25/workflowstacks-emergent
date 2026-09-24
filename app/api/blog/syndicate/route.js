import { postsCollection, publicFilter } from '@/lib/blog/store'
import { assembleBody } from '@/lib/blog/markdown'
import { SITE_URL } from '@/lib/site-url'

// Next 14 caches every fetch() in a route handler by default ("auto cache"),
// including the GitHub, Groq and Resend calls below. Each cache miss is a
// write to Vercel's ISR store (billed per 8 KB), and these calls almost never
// hit: the star-refresh job sends a per-run GitHub token (new cache key every
// run) and the LLM calls carry unique bodies. That was most of the Hobby-plan
// ISR-write overage (usage window Aug 25 -> Sep 24, 2026). Nothing here needs
// caching, so default fetch() to no-store; an explicit cache option still wins.
export const fetchCache = 'default-no-store'

// Admin: republish recent Journal posts on Dev.to and Hashnode with a
// canonical link back. The pipeline already writes an article a day into a
// site with almost no visitors; syndication puts the same article in front
// of the communities that already read about n8n, MCP and agents, and every
// copy ends with a link to the digest. No-ops (200, skipped) until the keys
// are set, so the workflow step is safe to ship ahead of the accounts.
//
//   DEVTO_API_KEY                       — dev.to → Settings → Extensions → API keys
//   HASHNODE_TOKEN + HASHNODE_PUBLICATION_ID — hashnode.com → Developer settings
//
// GET|POST /api/blog/syndicate?limit=2&dry=true

function requireAdmin(request) {
  const secret = process.env.ADMIN_SECRET
  if (!secret || request.headers.get('x-admin-secret') !== secret) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return null
}

const devtoTag = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30)

function syndicatedBody(post, platform) {
  const canonical = `${SITE_URL}/blog/${post.slug}`
  const parts = []
  if (post.answer) parts.push(`> ${post.answer}\n`)
  parts.push(assembleBody(post))
  if (post.key_takeaways?.length) {
    parts.push('## Key takeaways\n\n' + post.key_takeaways.map((t) => `- ${t}`).join('\n') + '\n')
  }
  parts.push(
    `---\n\n*Originally published at [WorkflowStacks](${canonical}?utm_source=${platform}&utm_medium=syndication). ` +
    `Get the five fastest-growing open-source AI skills every Monday — [subscribe to the digest](${SITE_URL}/newsletter?utm_source=${platform}&utm_medium=syndication).*`
  )
  return parts.join('\n')
}

async function publishDevto(post, key) {
  const r = await fetch('https://dev.to/api/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': key },
    body: JSON.stringify({
      article: {
        title: post.title,
        published: true,
        body_markdown: syndicatedBody(post, 'devto'),
        canonical_url: `${SITE_URL}/blog/${post.slug}`,
        description: String(post.excerpt || '').slice(0, 150),
        tags: (post.tags || []).map(devtoTag).filter(Boolean).slice(0, 4),
      },
    }),
    signal: AbortSignal.timeout(20_000),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`dev.to ${r.status}: ${String(j.error || '').slice(0, 200)}`)
  return { id: j.id, url: j.url, at: new Date() }
}

async function publishHashnode(post, token, publicationId) {
  const query = 'mutation Publish($input: PublishPostInput!) { publishPost(input: $input) { post { id url } } }'
  const input = {
    title: post.title,
    contentMarkdown: syndicatedBody(post, 'hashnode'),
    publicationId,
    originalArticleURL: `${SITE_URL}/blog/${post.slug}`,
    ...(post.excerpt ? { subtitle: String(post.excerpt).slice(0, 250) } : {}),
  }
  const r = await fetch('https://gql.hashnode.com', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify({ query, variables: { input } }),
    signal: AbortSignal.timeout(20_000),
  })
  const j = await r.json().catch(() => ({}))
  const p = j?.data?.publishPost?.post
  if (!r.ok || !p) throw new Error(`hashnode: ${JSON.stringify(j.errors || j).slice(0, 200)}`)
  return { id: p.id, url: p.url, at: new Date() }
}

async function run(request) {
  const denied = requireAdmin(request)
  if (denied) return denied
  const devto = process.env.DEVTO_API_KEY || ''
  const hnToken = process.env.HASHNODE_TOKEN || ''
  const hnPub = process.env.HASHNODE_PUBLICATION_ID || ''
  const targets = []
  if (devto) targets.push('devto')
  if (hnToken && hnPub) targets.push('hashnode')
  if (!targets.length) {
    return Response.json({ ok: true, skipped: true, reason: 'No syndication keys configured (DEVTO_API_KEY, HASHNODE_TOKEN + HASHNODE_PUBLICATION_ID).' })
  }
  const { searchParams } = new URL(request.url)
  const limit = Math.min(5, Math.max(1, parseInt(searchParams.get('limit') || '2', 10) || 2))
  const dry = searchParams.get('dry') === 'true'

  const col = await postsCollection()
  // Newest published posts still missing at least one configured target.
  const posts = await col
    .find({ ...publicFilter(), $or: targets.map((t) => ({ [`syndication.${t}`]: { $exists: false } })) })
    .sort({ published_at: -1 })
    .limit(limit)
    .toArray()

  const results = []
  for (const post of posts) {
    for (const t of targets) {
      if (post.syndication?.[t]) continue
      if (dry) { results.push({ slug: post.slug, target: t, status: 'would-publish' }); continue }
      try {
        const out = t === 'devto' ? await publishDevto(post, devto) : await publishHashnode(post, hnToken, hnPub)
        await col.updateOne({ _id: post._id }, { $set: { [`syndication.${t}`]: out } })
        results.push({ slug: post.slug, target: t, status: 'published', url: out.url })
      } catch (e) {
        results.push({ slug: post.slug, target: t, status: 'failed', error: String(e.message || e).slice(0, 200) })
      }
    }
  }
  return Response.json({ ok: true, dry, targets, considered: posts.length, results })
}

export async function GET(request) { return run(request) }
export async function POST(request) { return run(request) }
