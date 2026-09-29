# Working in this repo

Read `docs/COSTS.md` before changing a page's `revalidate`, adding a `fetch()`
to a route handler, adding a scheduled workflow, or merging to `main`.

- **Merging to `main` does not deploy.** Production goes out once a week via
  `.github/workflows/release.yml`. Do not add `[deploy]` to a commit message
  unless the change is urgent and the owner asked for it to go live now.
- **A preview deployment needs a branch named `preview/*`.**
- **`npm run cost-guard` must pass.** It fails on a page that revalidates more
  often than every 6 hours, a route handler that calls an external service
  without opting out of Next's fetch cache, and a workflow that calls the site
  more often than every 6 hours.
- Verify on production after a release, not on a preview: previews sit behind
  Vercel's login.
