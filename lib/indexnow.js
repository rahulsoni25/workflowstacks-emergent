// IndexNow: push URLs to Bing (and Yandex, Seznam, Naver — one endpoint feeds
// all of them). ChatGPT search and Microsoft Copilot answer from Bing's
// index, not Google's, so this is the fastest path to being citable by
// answer engines — and Bing indexes a small site in hours where Google takes
// weeks. Free, no authority required.
//
// The key is not a secret: the protocol requires it to be served publicly at
// /<key>.txt so the engine can confirm we control the host. Rotating it means
// changing this constant AND renaming public/<key>.txt together.
export const INDEXNOW_KEY = '8f433a337262384c1eecb4bf3e496b02'
export const INDEXNOW_HOST = 'workflowstacks.com'
const ENDPOINT = 'https://api.indexnow.org/IndexNow'

// Submit up to 10,000 absolute URLs on our host. Returns the HTTP status:
// 200/202 accepted; 400 bad request; 403 key not found at keyLocation;
// 422 URL/host mismatch; 429 too many. Never throws — callers treat this as
// best-effort and never let it fail a publish.
export async function submitUrls(urls) {
  const list = [...new Set(urls)].filter((u) => typeof u === 'string' && u.startsWith(`https://${INDEXNOW_HOST}/`)).slice(0, 10000)
  if (!list.length) return { status: 0, submitted: 0 }
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: INDEXNOW_HOST, key: INDEXNOW_KEY, keyLocation: `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`, urlList: list }),
      signal: AbortSignal.timeout(15_000),
    })
    return { status: res.status, submitted: list.length }
  } catch (e) {
    return { status: 0, submitted: 0, error: String(e.message || e).slice(0, 120) }
  }
}
