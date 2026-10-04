// Network side of the daily social job: the live checks the Fact-checker runs,
// hosting for the media Instagram fetches by URL, and the three publishers.
// A platform without its secrets is skipped, never an error. Setup for each
// one is in docs/SOCIAL.md.

import { oauth1Header } from './social-lib.mjs'

const env = process.env
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const UA = 'WorkflowStacks-Social/1.0 (+https://workflowstacks.com)'

export const configured = {
  x: () => Boolean(env.X_API_KEY && env.X_API_SECRET && env.X_ACCESS_TOKEN && env.X_ACCESS_TOKEN_SECRET),
  linkedin: () => Boolean(env.LINKEDIN_ACCESS_TOKEN && env.LINKEDIN_ORG_ID),
  instagram: () => Boolean(env.INSTAGRAM_ACCESS_TOKEN && env.INSTAGRAM_USER_ID),
}

async function failText(res) {
  return `${res.status} ${(await res.text().catch(() => '')).slice(0, 300)}`
}

// ------------------------------------------------------------ live checks

function ghHeaders() {
  const h = { Accept: 'application/vnd.github+json', 'User-Agent': UA, 'X-GitHub-Api-Version': '2022-11-28' }
  if (env.GITHUB_TOKEN) h.Authorization = `Bearer ${env.GITHUB_TOKEN}`
  return h
}

// The Fact-checker's first question: is this still real, today? The repo must
// exist and not be archived; the page we link to must load.
export async function checkLive({ owner, repo, pageUrl }) {
  const problems = []
  const live = {}
  if (owner && repo) {
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: ghHeaders() })
    if (r.status === 404) problems.push(`GitHub repo ${owner}/${repo} no longer exists`)
    else if (!r.ok) problems.push(`GitHub repo check failed: ${await failText(r)}`)
    else {
      const d = await r.json()
      if (d.archived) problems.push(`GitHub repo ${owner}/${repo} is archived`)
      if (d.disabled) problems.push(`GitHub repo ${owner}/${repo} is disabled`)
      live.stars = d.stargazers_count
      live.description = d.description || ''
      live.license = d.license?.spdx_id && d.license.spdx_id !== 'NOASSERTION' ? d.license.spdx_id : null
    }
  }
  if (pageUrl) {
    const r = await fetch(pageUrl, { headers: { 'User-Agent': UA }, redirect: 'follow' }).catch((e) => ({ ok: false, status: e.message }))
    if (!r.ok) problems.push(`${pageUrl} does not load (${r.status})`)
  }
  return { ok: problems.length === 0, problems, live }
}

// ---------------------------------------------------------------- hosting

// Instagram only accepts media by public URL. The day's files go to a
// single-commit orphan branch of this (public) repository, replaced on every
// run so the history never grows, and are served by commit SHA from
// raw.githubusercontent.com. The commit carries its own vercel.json so Vercel
// does not try to build it.
const ASSET_BRANCH = env.SOCIAL_ASSET_BRANCH || 'social-assets'
const ASSET_VERCEL_JSON = JSON.stringify({ git: { deploymentEnabled: false }, ignoreCommand: 'exit 0' }, null, 2)
const ASSET_README = 'Media for the daily social posts, written by scripts/social-daily.mjs.\nThis branch is replaced on every run; nothing here is source.\n'

export async function hostFiles(files, { message }) {
  const repo = env.GITHUB_REPOSITORY
  if (!repo || !env.GITHUB_TOKEN) throw new Error('GITHUB_REPOSITORY and GITHUB_TOKEN are needed to host media for Instagram')
  const api = `https://api.github.com/repos/${repo}/git`
  const call = async (method, path, body) => {
    const r = await fetch(`${api}${path}`, { method, headers: { ...ghHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return r
  }
  const tree = [
    { path: 'vercel.json', mode: '100644', type: 'blob', content: ASSET_VERCEL_JSON },
    { path: 'README.md', mode: '100644', type: 'blob', content: ASSET_README },
  ]
  for (const f of files) {
    const r = await call('POST', '/blobs', { content: f.buf.toString('base64'), encoding: 'base64' })
    if (!r.ok) throw new Error(`asset blob ${f.name}: ${await failText(r)}`)
    tree.push({ path: f.name, mode: '100644', type: 'blob', sha: (await r.json()).sha })
  }
  const t = await call('POST', '/trees', { tree })
  if (!t.ok) throw new Error(`asset tree: ${await failText(t)}`)
  const c = await call('POST', '/commits', { message, tree: (await t.json()).sha, parents: [] })
  if (!c.ok) throw new Error(`asset commit: ${await failText(c)}`)
  const sha = (await c.json()).sha
  let ref = await call('PATCH', `/refs/heads/${ASSET_BRANCH}`, { sha, force: true })
  if (ref.status === 422 || ref.status === 404) ref = await call('POST', '/refs', { ref: `refs/heads/${ASSET_BRANCH}`, sha })
  if (!ref.ok) throw new Error(`asset branch: ${await failText(ref)}`)

  const urls = Object.fromEntries(files.map((f) => [f.name, `https://raw.githubusercontent.com/${repo}/${sha}/${f.name}`]))
  // Instagram fetches these within seconds; make sure they already resolve.
  for (const url of Object.values(urls)) {
    for (let i = 0; ; i++) {
      const r = await fetch(url, { method: 'HEAD' })
      if (r.ok) break
      if (i === 5) throw new Error(`hosted file never became reachable: ${url} (${r.status})`)
      await sleep(3000)
    }
  }
  return { sha, urls }
}

// ---------------------------------------------------------------------- X

// Text plus link; X builds the preview card from the page's own OG image.
export async function postX(text) {
  const url = `${env.X_API_BASE || 'https://api.x.com'}/2/tweets`
  const { header } = oauth1Header({
    method: 'POST', url,
    consumerKey: env.X_API_KEY, consumerSecret: env.X_API_SECRET,
    token: env.X_ACCESS_TOKEN, tokenSecret: env.X_ACCESS_TOKEN_SECRET,
  })
  const r = await fetch(url, { method: 'POST', headers: { Authorization: header, 'Content-Type': 'application/json', 'User-Agent': UA }, body: JSON.stringify({ text }) })
  if (!r.ok) {
    const why = await failText(r)
    const hint = r.status === 403 ? ' (check the app has Read and Write permission, and regenerate the access token after changing it)' : ''
    throw new Error(`X ${why}${hint}`)
  }
  const id = (await r.json()).data?.id
  return { id, url: id ? `https://x.com/i/web/status/${id}` : null }
}

// --------------------------------------------------------------- LinkedIn

// LinkedIn's REST API needs a dated version header and retires each version
// about a year after release; when this one is retired, set the repository
// variable LINKEDIN_VERSION to a current YYYYMM.
const LI_VERSION = env.LINKEDIN_VERSION || '202601'

function liHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${env.LINKEDIN_ACCESS_TOKEN}`,
    'LinkedIn-Version': LI_VERSION,
    'X-Restli-Protocol-Version': '2.0.0',
    ...extra,
  }
}

async function linkedinImage(buf, owner) {
  const init = await fetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
    method: 'POST', headers: liHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ initializeUploadRequest: { owner } }),
  })
  if (!init.ok) throw new Error(`LinkedIn image init ${await failText(init)}`)
  const { uploadUrl, image } = (await init.json()).value || {}
  const up = await fetch(uploadUrl, { method: 'PUT', headers: { Authorization: `Bearer ${env.LINKEDIN_ACCESS_TOKEN}` }, body: buf })
  if (!up.ok) throw new Error(`LinkedIn image upload ${await failText(up)}`)
  for (let i = 0; i < 10; i++) {
    const s = await fetch(`https://api.linkedin.com/rest/images/${encodeURIComponent(image)}`, { headers: liHeaders() })
    if (s.ok && (await s.json()).status === 'AVAILABLE') break
    await sleep(3000)
  }
  return image
}

// One image for a single post, several (in order) for a carousel or Reel day.
export async function postLinkedIn({ text, images, altText }) {
  const owner = `urn:li:organization:${env.LINKEDIN_ORG_ID}`
  const ids = []
  for (const buf of images) ids.push(await linkedinImage(buf, owner))
  const content = ids.length === 1
    ? { media: { id: ids[0], altText } }
    : { multiImage: { images: ids.map((id) => ({ id, altText })) } }
  const r = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST', headers: liHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      author: owner,
      commentary: text,
      visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
      content,
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    }),
  })
  if (!r.ok) {
    const why = await failText(r)
    const hint = r.status === 401 ? ' (the access token has expired; LinkedIn tokens last 60 days)' : /VERSION/i.test(why) ? ` (set the LINKEDIN_VERSION variable; ${LI_VERSION} is not accepted)` : ''
    throw new Error(`LinkedIn ${why}${hint}`)
  }
  const id = r.headers.get('x-restli-id')
  return { id, url: id ? `https://www.linkedin.com/feed/update/${id}/` : null }
}

// -------------------------------------------------------------- Instagram

// Instagram API with Instagram Login (graph.instagram.com). For an account
// connected through a Facebook Page instead, set INSTAGRAM_GRAPH_URL to
// https://graph.facebook.com/v23.0.
const IG = () => env.INSTAGRAM_GRAPH_URL || 'https://graph.instagram.com/v23.0'

async function igPost(path, params) {
  const r = await fetch(`${IG()}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...params, access_token: env.INSTAGRAM_ACCESS_TOKEN }),
  })
  if (!r.ok) {
    const why = await failText(r)
    throw new Error(`Instagram ${path} ${why}${/OAuth|expired|190/.test(why) ? ' (the access token has expired; Instagram long-lived tokens last 60 days)' : ''}`)
  }
  return r.json()
}

async function igGet(id, fields) {
  const r = await fetch(`${IG()}/${id}?fields=${fields}&access_token=${encodeURIComponent(env.INSTAGRAM_ACCESS_TOKEN)}`)
  if (!r.ok) throw new Error(`Instagram GET ${id} ${await failText(r)}`)
  return r.json()
}

// A container has to finish processing before it can be published; a video
// takes far longer than an image.
async function igReady(id, timeoutMs) {
  const until = Date.now() + timeoutMs
  for (;;) {
    const s = await igGet(id, 'status_code,status')
    if (s.status_code === 'FINISHED') return
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error(`Instagram container ${id} ${s.status_code}: ${s.status || ''}`)
    if (Date.now() > until) throw new Error(`Instagram container ${id} still ${s.status_code} after ${timeoutMs / 1000}s`)
    await sleep(5000)
  }
}

export async function postInstagram({ format, caption, imageUrls, videoUrl, coverUrl }) {
  const user = env.INSTAGRAM_USER_ID
  let container
  if (format === 'reel') {
    container = (await igPost(`${user}/media`, { media_type: 'REELS', video_url: videoUrl, cover_url: coverUrl, caption, share_to_feed: 'true' })).id
    await igReady(container, 10 * 60 * 1000)
  } else if (format === 'carousel') {
    const children = []
    for (const url of imageUrls.slice(0, 10)) {
      const child = (await igPost(`${user}/media`, { image_url: url, is_carousel_item: 'true' })).id
      await igReady(child, 2 * 60 * 1000)
      children.push(child)
    }
    container = (await igPost(`${user}/media`, { media_type: 'CAROUSEL', children: children.join(','), caption })).id
    await igReady(container, 2 * 60 * 1000)
  } else {
    container = (await igPost(`${user}/media`, { image_url: imageUrls[0], caption })).id
    await igReady(container, 2 * 60 * 1000)
  }
  const media = (await igPost(`${user}/media_publish`, { creation_id: container })).id
  const permalink = await igGet(media, 'permalink').then((d) => d.permalink).catch(() => null)
  return { id: media, url: permalink }
}
