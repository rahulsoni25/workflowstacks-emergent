# Connecting Google Search Console

The codebase treats Google Search Console (GSC) as the ground truth for Google
rankings — `lib/blog/serp.js`, `app/sitemap.js` and `middleware.js` all say so.
`lib/gsc.js` is what actually reads it.

No SDK is used: auth is a signed JWT via `node:crypto`, and the API is plain
`fetch`. Anything importing `lib/gsc.js` must run on the **Node runtime**
(`export const runtime = 'nodejs'`), not Edge.

## What you get

| Surface | What it does |
| --- | --- |
| `lib/gsc.js` | Search Analytics + URL Inspection client. `topQueries`, `topPages`, `byDate`, `byCountry`, `byDevice`, `siteTotals`, `gscRankFor`, `gscRanksForKeywords`, `inspectUrl`, `listSites`. |
| `GET /api/gsc` | Admin-gated read API (`x-admin-secret`). Actions: `overview`, `queries`, `pages`, `dates`, `countries`, `devices`, `totals`, `rank`, `inspect`, `sites`, `status`. |
| `/admin/search-console` | Dashboard: totals, top queries, top pages, 7/28/90-day windows. |
| `POST /api/blog/pipeline?action=rank` | Rank tracking now reads GSC first and only falls back to the Brave/DDG proxy for keywords GSC has no row for. |

## Option A — service account (recommended for URL-prefix properties)

1. In [Google Cloud Console](https://console.cloud.google.com/), create (or pick)
   a project and enable the **Google Search Console API**.
2. **IAM & Admin → Service Accounts → Create service account.** No project roles
   are needed — access is granted inside Search Console, not IAM.
3. On the service account, **Keys → Add key → Create new key → JSON**. Download it.
4. In [Search Console](https://search.google.com/search-console) open the
   property → **Settings → Users and permissions → Add user**. Paste the service
   account's `client_email` (`…@….iam.gserviceaccount.com`).
   Permission: **Full** if you want URL Inspection, **Restricted** is enough for
   Search Analytics.
5. Set the env var. Base64 is the safer form — Vercel mangles the multi-line PEM
   inside raw JSON:

   ```bash
   base64 -w0 service-account.json    # macOS: base64 -i service-account.json
   ```

   ```env
   GSC_SERVICE_ACCOUNT_JSON=<base64 of the JSON file>
   ```

   Raw JSON also works if your host preserves newlines. As an alternative, set
   the two fields separately (escape the newlines as `\n`):

   ```env
   GSC_CLIENT_EMAIL=svc@project.iam.gserviceaccount.com
   GSC_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
   ```

> **Domain properties (`sc-domain:…`)** sometimes refuse service-account users in
> the UI. If **Add user** won't accept the service account, use Option B.

## Option B — OAuth user credentials

1. Google Cloud Console → **APIs & Services → Credentials → Create credentials →
   OAuth client ID → Desktop app**. Note the client ID and secret.
2. Get a refresh token for the scope
   `https://www.googleapis.com/auth/webmasters.readonly`, consenting as a Google
   account that already has access to the property (the
   [OAuth Playground](https://developers.google.com/oauthplayground/) works —
   tick "Use your own OAuth credentials"). Make sure you request offline access,
   or no refresh token is issued.
3. Set:

   ```env
   GSC_OAUTH_CLIENT_ID=…apps.googleusercontent.com
   GSC_OAUTH_CLIENT_SECRET=…
   GSC_OAUTH_REFRESH_TOKEN=1//…
   ```

A refresh token for an app still in "Testing" on the OAuth consent screen expires
after 7 days. Publish the consent screen to make it durable.

## Pick the property

```env
GSC_SITE_URL=sc-domain:workflowstacks.com   # default
# or, for a URL-prefix property (note the trailing slash):
# GSC_SITE_URL=https://workflowstacks.com/
```

Domain and URL-prefix properties are **different properties with different
data**. Set this to whichever one you actually verified.

## Verify the connection

```bash
# Is it wired up at all, and as what?
curl -H "x-admin-secret: $ADMIN_SECRET" 'http://localhost:3001/api/gsc?action=status'

# Which properties can this credential read? If GSC_SITE_URL isn't listed,
# the credential has no access to it.
curl -H "x-admin-secret: $ADMIN_SECRET" 'http://localhost:3001/api/gsc?action=sites'

# Real numbers
curl -H "x-admin-secret: $ADMIN_SECRET" 'http://localhost:3001/api/gsc?action=overview&days=28'
```

Then open `/admin/search-console`.

## Reading the numbers honestly

These are the traps that turn GSC data into wrong conclusions. The code labels
for them; keep the labels when the numbers move into a deck or a report.

- **~3-day lag.** GSC finalises data on a delay. Every default window here ends
  three days back and requests `dataState=final`. Querying "yesterday" returns
  partial rows that look like a traffic collapse.
- **Average position is an average.** It is impression-weighted across the whole
  window and comes back as a decimal. `4.2` does not mean "we sit at #4 right
  now" — it is not a live SERP slot, and it is not comparable to the integer
  position from the Brave/DDG proxy in `lib/blog/serp.js`.
- **Rows are withheld below a privacy threshold.** Per-query clicks will not sum
  to the site total, and a keyword absent from the response means *no
  impressions recorded / withheld*, not "unindexed" and not "rank 0".
  `gscRankFor` returns `no_data: true` for this case specifically.
- **Property scope.** `sc-domain:` covers every subdomain and protocol; a
  URL-prefix property does not. Two properties over the same site will disagree,
  and neither is wrong.
- **Every response carries `meta`** — property, date range, `data_state`,
  `fetched_at`. Cite it. If `meta.error` is set, the rows are empty because the
  call failed, not because traffic was zero.

## Failure modes

| Symptom | Cause |
| --- | --- |
| `not_configured` (HTTP 503) | No credential env vars set. |
| `GSC auth failed (400): Invalid grant` | Bad/mangled private key, revoked grant, or host clock skew. |
| `403 … lacks access to this property` | Credential is valid but is not a user on the property (step 4 above), or `GSC_SITE_URL` names the wrong property. |
| Empty rows, no error | Genuinely no data — window too recent (lag), or the property has no impressions. |

Never commit credentials. All of the above are environment variables; keep them
in `.env.local` locally and in the host's env settings in production.
