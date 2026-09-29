# Hosting costs: the rules this repo runs under

The site is on Vercel's Hobby plan. Two meters were over their cap in
September 2026 — **ISR Writes** (328K of 200K units) and **Fluid Active CPU**
(5h47m of 4h) — and Vercel pauses projects that stay over. Everything below
exists to keep both under.

## How the meters work

- **ISR writes are billed per 8 KB of compressed output**, not per page. A
  skill page is about 6 units, `/skills` about 10, most list pages 3–5.
- **Every production deploy starts with an empty ISR cache.** Vercel scopes the
  cache to a deployment, so after a deploy the whole catalog is regenerated on
  demand as crawlers and visitors arrive.
- **A regeneration whose output is byte-identical costs no write units.** Any
  timestamp or counter in the output defeats that.
- **Next 14 caches every `fetch()` in a route handler by default**, in the same
  store. A call with a unique body or a rotating token is a write that is never
  read back.
- **Per-route numbers are not available on Hobby.** The Observability query API
  answers 402, `vercel usage` 404s, `vercel logs` returns ~100 rows. The only
  source is the Usage page in the dashboard. Measure there before and after.

## Rules

1. **Production deploys are batched.** Merging to `main` does not deploy.
   `scripts/vercel-ignore-build.sh` only builds a production commit whose
   message contains `[deploy]`; `.github/workflows/release.yml` writes that
   commit every Monday, or on demand from the Actions tab
   (*Release to production → Run workflow*). For an urgent fix, put `[deploy]`
   in the merge commit title.
2. **Previews build only on branches named `preview/*`.**
3. **No page revalidates more often than every 6 hours** (`21600`). Detail
   pages use 30 days plus on-demand `revalidatePath` from the endpoint that
   changed them. The `fetch(..., { next: { revalidate } })` values inside a page
   count too — the lowest one wins.
4. **Route handlers that call GitHub, an LLM or an email API export
   `fetchCache = 'default-no-store'`** (or are `force-dynamic`).
5. **Pages pass the browser only what they render.** No `stars_history`, no
   refresh timestamps, no whole Mongo documents for cards.
6. **Scheduled jobs do their work in the GitHub runner** (see
   `scripts/refresh-stars.mjs`), not by calling a Vercel function in a loop. No
   workflow calls the site more often than every 6 hours.

`npm run cost-guard` (also run on every pull request) checks rules 3, 4 and 6.

## Hobby is for non-commercial use

Vercel's fair-use guidelines restrict Hobby to non-commercial projects and name
taking payments and advertising a product for sale as commercial. This site
does both. Staying under the usage caps does not change that.
