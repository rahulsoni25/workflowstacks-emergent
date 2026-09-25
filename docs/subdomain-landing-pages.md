# Subdomain landing pages

Standalone marketing pages that live on their own hostname but deploy with
this repo. They are plain static sites — one folder of HTML, CSS, JS and
media under `public/sites/<dir>/` — with none of the WorkflowStacks layout,
header, footer or analytics.

## Live sites

| Hostname | Folder | Page |
| --- | --- | --- |
| `founder-avatar.workflowstacks.com` | `public/sites/founder-avatar-studio/` | FluoDigital — Founder Avatar Studio |

## How a request is served

Everything is driven by the `SUBDOMAIN_SITES` list at the top of
`next.config.js`. For each entry:

- `rewrites().beforeFiles` maps `/` on the hostname to the folder's
  `index.html`, and every other path (except `_next/` and `sites/`) to the
  same-named file in the folder. So `https://<host>/hero.mp4` serves
  `public/sites/<dir>/hero.mp4`. `beforeFiles` is what stops `/` from
  falling through to the WorkflowStacks homepage.
- `redirects()` keeps one URL per page: `/index.html` on the hostname folds
  back to `/`, and the folder's real path on the apex
  (`workflowstacks.com/sites/<dir>/…`) 308s to the hostname.
- Vercel preview deployments (`*.vercel.app`) match neither host, so on a
  preview you open the page at its real path:
  `/sites/<dir>/index.html`.
- Locally, `npm run dev` then open `http://founder-avatar.localhost:3001/`
  (browsers resolve `*.localhost` to loopback; the host regex accepts it).

Unknown paths on the hostname return the normal 404 rather than the landing
page, so the subdomain does not produce soft-404s.

## The one manual step: pointing the hostname at Vercel

The repo cannot register the hostname. In the Vercel project:

1. Settings → Domains → Add `founder-avatar.workflowstacks.com`.
2. Vercel shows the DNS record to create (for a subdomain this is a CNAME;
   use the exact target Vercel displays). Add it where the
   `workflowstacks.com` DNS is managed.
3. Once it verifies, Vercel issues the certificate and the rewrites above
   take over. Nothing else to configure — no redirect rules in the Vercel UI.

`vercel.json`'s bot firewall (`routes[].mitigate`) and the security headers
in `next.config.js` already apply to the new hostname because they are
project-wide.

## Adding another landing page

1. Put the site in `public/sites/<new-dir>/` with an `index.html`. Reference
   its assets by bare relative name (`hero.mp4`, not `/sites/…/hero.mp4`) so
   the same file works on the hostname and at the preview path. Give it its
   own `robots.txt` and `sitemap.xml`; the apex ones are not served there.
2. Add an entry to `SUBDOMAIN_SITES` in `next.config.js`:

   ```js
   {
     host: 'new-name\\.(?:workflowstacks\\.com|localhost)',
     canonicalHost: 'new-name.workflowstacks.com',
     dir: 'new-dir',
   }
   ```

3. Add the hostname in Vercel as above.

## SEO notes for a page on a hostname

- The page needs its own `<title>`, meta description, `<link rel="canonical">`
  and Open Graph tags — nothing from `app/layout.js` applies to it.
- Keep media as separate files rather than base64 inside the HTML; a
  self-contained HTML export of a page can be several hundred KB before the
  first byte of text renders.
- The apex sitemap (`app/sitemap.js`) deliberately does not list subdomain
  URLs; each hostname submits its own `sitemap.xml` to Search Console as a
  separate property.
