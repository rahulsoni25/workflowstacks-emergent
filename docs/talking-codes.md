# Talking Codes (Print That Talks platform)

Every printed QR points at `workflowstacks.com/t/<CODE>`, never at a video
file. The code is a record that says which video plays now, so a client's
video can be swapped without reprinting. Every scan is counted (city and
device only) and can send the card's owner a WhatsApp alert.

## Pages and routes

| URL | Who | What |
|---|---|---|
| `/t/<CODE>` | Anyone who scans | The player: greeting, EN/AR switch, button, privacy line. Logs the scan. |
| `/sites/talk/admin.html` | You (admin secret) | Create codes, swap videos, upload, batch personal greetings, download QRs |
| `/sites/talk/report.html?code=<CODE>&key=<key>` | The client | Their own scan report (no secret needed; the key is per code) |
| `/sites/talk/report.html` | You (admin secret) | All codes |
| `/api/talk/qr/<CODE>?src=card` | Anyone | Print QR as SVG; add `&format=png` for a 1200 px PNG |

Add `?src=<where>` to a QR (card, menu, box…) to see in the report which
printed item the scans came from. `?preview=1` plays without counting.

Not counted: link-preview bots (WhatsApp, Facebook, Slack…), admin previews,
and the language switch (it reloads with `?sw=1`).

## Data

- `talk_codes`: code, name, client, title, videos {en, ar}, poster, greeting,
  cta {label, url}, alertPhone, alertMinutes, active, reportKey, scans,
  lastAlertAt, createdAt, updatedAt. Codes are never deleted; set inactive.
- `talk_scans`: code, at, city, region, country, device, lang, src, vid.
  `vid` is a salted hash of IP + browser + day, used only to count unique
  scanners; it rotates daily and the IP is never stored.

## Hosting videos on workflowstacks.com (current setup)

Until R2 is set up, client videos are files in this repo:

- Use-case videos already on the site, e.g.
  `/sites/founder-avatar-studio/use-cases/ast-digital-print-center-9x16.mp4`.
- Videos only for a card go under `public/sites/talk/media/<client>/`.
  Encode for phones first: 576×1024 (9:16), H.264, about 1 Mbps, AAC,
  `-movflags +faststart` (a 30 s film is about 2 MB).
- A new file needs a commit and a production deploy before its link works.
  Swapping a code between files that are already on the site needs no deploy.

The admin page only accepts direct video files (.mp4, .m4v, .webm, .mov).
YouTube, Google Drive, Instagram and web-page links are refused because the
player's `<video>` tag can't play them.

## Setup: video uploads (Cloudflare R2)

Without this, paste video links instead (e.g. files under `/sites/…`).

1. Cloudflare dashboard → R2 → create a bucket (e.g. `talk-media`).
2. Make it public through a custom domain (e.g. `media.workflowstacks.com`),
   or the r2.dev URL for testing.
3. Bucket → Settings → CORS policy:
   ```json
   [{ "AllowedOrigins": ["https://workflowstacks.com"],
      "AllowedMethods": ["PUT", "GET"],
      "AllowedHeaders": ["content-type"],
      "MaxAgeSeconds": 3600 }]
   ```
   Add the preview URL to AllowedOrigins while testing on a preview.
4. R2 → Manage API tokens → create a token with Object Read & Write on that
   bucket only.
5. Vercel → Project → Settings → Environment Variables:
   `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`,
   `R2_PUBLIC_BASE` (e.g. `https://media.workflowstacks.com`).

Uploads go from the browser straight to R2 with a 15-minute presigned URL;
no file passes through Vercel. The signature is computed locally
(`presignPut` in `lib/talk.js`, checked against botocore).

## Setup: WhatsApp scan alerts (Meta WhatsApp Cloud API)

1. Meta Business Manager → WhatsApp → add a dedicated business number.
2. Create a **Utility** message template, e.g. name `card_scanned`, body:
   `Your Print That Talks card {{1}} was just scanned: {{2}}.`
   ({{1}} = card name, {{2}} = place and time in Dubai time).
3. Create a permanent system-user token with `whatsapp_business_messaging`.
4. Vercel env: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_TEMPLATE`
   (`card_scanned`), optional `WHATSAPP_TEMPLATE_LANG` (default `en`).
5. In the admin page, put the owner's number on the code. Alerts are sent at
   most once per `alertMinutes` (default 10) per code.

Meta charges per template message; check current pricing for the UAE before
turning alerts on for many cards.

## Costs (docs/COSTS.md)

- `/t/<CODE>` and the admin routes are `force-dynamic` route handlers: no ISR
  output, so no ISR writes. Each scan is one short function call + 2–3 Mongo
  writes.
- The only outbound call is the WhatsApp send in `lib/talk.js`, made with
  `cache: 'no-store'` and a 2.5 s timeout, from a force-dynamic route.
- Video bytes are served by R2 (or the static site), never by a function.
