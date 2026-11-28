import { getDb } from '../../../lib/mongo'
import {
  CODES, SCANS, CODE_RE, normCode, isBot, deviceOf, locationOf, visitorId,
  prefersArabic, sendScanAlert, whatsappConfigured, findCard,
} from '../../../lib/talk'

// The page behind every Print That Talks QR: workflowstacks.com/t/<CODE>.
// Looks up which video the code plays now, logs the scan and returns a small
// self-contained player. Runs per request (each scan has to be counted), so
// it is force-dynamic and sends Cache-Control: no-store. No ISR output.
export const dynamic = 'force-dynamic'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

const HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

function notFound() {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Card not found</title><meta name="robots" content="noindex">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0c0c0e;color:#f2f2f4;font:16px/1.5 system-ui,sans-serif;text-align:center;padding:24px}
a{color:#2ce5d4;font-weight:700}</style></head><body><main><h1>This card isn't active</h1>
<p>The video for this code is not available right now.</p>
<p><a href="/print-that-talks?src=inactive">What is Print That Talks?</a></p></main></body></html>`
  return new Response(html, { status: 404, headers: HEADERS })
}

function place({ city, country }) {
  const when = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dubai', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date())
  const where = [city, country].filter(Boolean).join(', ') || 'Unknown location'
  return `${where} · ${when} (Dubai time)`
}

export async function GET(request, { params }) {
  const code = normCode(params.code)
  if (!CODE_RE.test(code)) return notFound()

  const db = await getDb()
  const card = await findCard(db, code, { _id: 0, reportKey: 0 })
  if (!card || card.active === false || !(card.videos?.en || card.videos?.ar)) return notFound()

  const url = new URL(request.url)
  const ua = request.headers.get('user-agent') || ''
  const preview = url.searchParams.get('preview') === '1'
  // The language button reloads with ?sw=1: that is the same visit, not a new scan.
  const switched = url.searchParams.get('sw') === '1'
  const asked = url.searchParams.get('l')
  let lang = asked === 'ar' || asked === 'en' ? asked : (prefersArabic(request) ? 'ar' : 'en')
  if (!card.videos?.[lang]) lang = lang === 'ar' ? 'en' : 'ar'

  if (!preview && !switched && !isBot(ua)) {
    const loc = locationOf(request)
    const src = (url.searchParams.get('src') || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 30)
    await db.collection(SCANS).insertOne({
      code, at: new Date(), ...loc, device: deviceOf(ua), lang, src, vid: visitorId(request),
    })
    if (!card.builtin) await db.collection(CODES).updateOne({ code }, { $inc: { scans: 1 } })

    // WhatsApp alert, at most one per card every `alertMinutes` (default 10).
    if (!card.builtin && card.alertPhone && whatsappConfigured()) {
      const gap = Math.max(1, Number(card.alertMinutes) || 10) * 60_000
      const claimed = await db.collection(CODES).findOneAndUpdate(
        { code, $or: [{ lastAlertAt: { $exists: false } }, { lastAlertAt: { $lt: new Date(Date.now() - gap) } }] },
        { $set: { lastAlertAt: new Date() } },
      )
      if (claimed) await sendScanAlert({ to: card.alertPhone, cardName: card.name || code, place: place(loc) })
    }
  }

  const other = lang === 'en' ? 'ar' : 'en'
  const hasOther = Boolean(card.videos?.[other])
  const rtl = lang === 'ar'
  const t = rtl
    ? { play: 'اضغط للتشغيل مع الصوت', hi: 'مرحباً', switchTo: 'English', privacy: 'نحسب المشاهدات بشكل مجهول (المدينة ونوع الجهاز فقط).', made: 'صُنع بواسطة Print That Talks' }
    : { play: 'Tap to play with sound', hi: 'Hi', switchTo: 'عربي', privacy: 'Scans are counted anonymously (city and device only).', made: 'Made with Print That Talks' }
  const keep = new URLSearchParams()
  if (url.searchParams.get('src')) keep.set('src', url.searchParams.get('src'))
  if (preview) keep.set('preview', '1')
  keep.set('l', other)
  keep.set('sw', '1')
  const switchHref = `/t/${encodeURIComponent(code)}?${keep.toString()}`
  const cta = card.cta?.url && card.cta?.label ? card.cta : null
  const title = card.title || card.name || 'A message for you'

  const html = `<!doctype html>
<html lang="${lang}" dir="${rtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title><meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#0c0c0e">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="A video message. Tap to play.">
${card.poster ? `<meta property="og:image" content="${esc(card.poster)}">` : ''}
<style>
:root{--bg:#0c0c0e;--ink:#f4f4f6;--soft:#a9a9b2;--acc:#2ce5d4;--panel:#17171b}
*{box-sizing:border-box}html,body{margin:0;height:100%}
body{background:var(--bg);color:var(--ink);font:16px/1.45 system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif;display:flex;flex-direction:column;align-items:center;min-height:100dvh;padding:max(14px,env(safe-area-inset-top)) 14px max(16px,env(safe-area-inset-bottom))}
header{width:100%;max-width:460px;display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}
h1{font-size:17px;font-weight:700;margin:0;overflow-wrap:anywhere}
.lang{color:var(--ink);background:var(--panel);border:1px solid #2a2a31;border-radius:999px;padding:8px 14px;font-weight:700;text-decoration:none;white-space:nowrap;min-height:40px;display:inline-flex;align-items:center}
.stage{position:relative;width:100%;max-width:460px;aspect-ratio:9/16;max-height:calc(100dvh - 190px);border-radius:22px;overflow:hidden;background:#000;box-shadow:0 0 0 1px #24242a,0 20px 60px rgba(0,0,0,.5)}
video{width:100%;height:100%;object-fit:cover;display:block;background:#000}
.over{position:absolute;inset:0;display:grid;place-items:center;align-content:center;gap:16px;background:linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.55));border:0;color:#fff;cursor:pointer;font:inherit;width:100%;padding:24px;text-align:center}
.hi{font-size:30px;font-weight:800;letter-spacing:-.01em}
.btn{display:inline-flex;align-items:center;gap:10px;background:var(--acc);color:#05201d;font-weight:800;border-radius:999px;padding:14px 22px;font-size:17px}
.tri{width:0;height:0;border-left:14px solid #05201d;border-top:9px solid transparent;border-bottom:9px solid transparent}
[dir=rtl] .tri{transform:scaleX(-1)}
.over:focus-visible,.lang:focus-visible,.cta:focus-visible{outline:3px solid #fff;outline-offset:3px}
.cta{margin-top:14px;width:100%;max-width:460px;display:flex;justify-content:center;background:#fff;color:#0c0c0e;font-weight:800;border-radius:16px;padding:15px;text-decoration:none;font-size:17px;min-height:52px}
footer{margin-top:auto;padding-top:16px;text-align:center;color:var(--soft);font-size:12.5px;max-width:460px}
footer a{color:var(--soft)}
@media (prefers-reduced-motion:no-preference){.btn{animation:pulse 2s ease-in-out infinite}@keyframes pulse{50%{transform:scale(1.04)}}}
</style></head><body>
<header><h1>${esc(title)}</h1>${hasOther ? `<a class="lang" href="${esc(switchHref)}" lang="${other}">${esc(t.switchTo)}</a>` : ''}</header>
<div class="stage">
<video id="v" playsinline preload="metadata"${card.poster ? ` poster="${esc(card.poster)}"` : ''} src="${esc(card.videos[lang] + (card.poster || card.videos[lang].includes('#') ? '' : '#t=0.1'))}"></video>
<button class="over" id="o" type="button" aria-label="${esc(t.play)}">
${card.greeting ? `<span class="hi">${esc(t.hi)} ${esc(card.greeting)} 👋</span>` : ''}
<span class="btn"><span class="tri" aria-hidden="true"></span>${esc(t.play)}</span>
</button>
</div>
${cta ? `<a class="cta" href="${esc(cta.url)}" rel="noopener">${esc(cta.label)}</a>` : ''}
<footer><p>${esc(t.privacy)}</p><p><a href="/print-that-talks?src=player">${esc(t.made)}</a></p></footer>
<script>
(function(){var v=document.getElementById('v'),o=document.getElementById('o');
o.addEventListener('click',function(){o.hidden=true;v.controls=true;v.muted=false;var p=v.play();if(p&&p.catch)p.catch(function(){o.hidden=false})});
v.addEventListener('ended',function(){v.controls=true});})();
</script>
</body></html>`
  return new Response(html, { status: 200, headers: HEADERS })
}
