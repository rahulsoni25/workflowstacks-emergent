import { isAdmin, normCode, CODE_RE, presignPut, r2Configured } from '../../../../lib/talk'

// Admin: a short-lived presigned URL to upload a video or poster straight
// from the browser to Cloudflare R2 (no file passes through Vercel). The
// signature is computed locally; this route makes no network call.
// Needs R2_* env vars (see lib/talk.js) and a CORS rule on the bucket that
// allows PUT from https://workflowstacks.com.
export const dynamic = 'force-dynamic'

const TYPES = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export async function POST(request) {
  if (!isAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!r2Configured()) {
    return Response.json({ ok: false, error: 'Video storage is not set up yet. Paste a video link instead, or add the R2 settings in Vercel.' }, { status: 501 })
  }
  const body = await request.json().catch(() => ({}))
  const ext = TYPES[String(body.contentType || '')]
  if (!ext) return Response.json({ ok: false, error: 'Upload an MP4, MOV, WebM, JPG, PNG or WebP file' }, { status: 400 })
  const code = normCode(body.code)
  const folder = CODE_RE.test(code) ? code : 'unassigned'
  const stamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)
  const rand = Math.random().toString(36).slice(2, 8)
  const key = `talk/${folder}/${stamp}-${rand}.${ext}`

  const e = process.env
  const uploadUrl = presignPut({
    accountId: e.R2_ACCOUNT_ID, accessKeyId: e.R2_ACCESS_KEY_ID, secretAccessKey: e.R2_SECRET_ACCESS_KEY,
    bucket: e.R2_BUCKET, key,
  })
  const publicUrl = `${e.R2_PUBLIC_BASE.replace(/\/+$/, '')}/${key}`
  return Response.json({ ok: true, uploadUrl, publicUrl }, { headers: { 'Cache-Control': 'no-store' } })
}
