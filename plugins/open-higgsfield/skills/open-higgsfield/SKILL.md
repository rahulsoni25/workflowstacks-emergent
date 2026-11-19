---
name: open-higgsfield
description: Run, self-host or extend Open Higgsfield ("OpenHiggsfield AI", GitHub wide-trace/open-higgsfield), the open-source alternative to Higgsfield AI — a Next.js 16 studio with one prompt bar for 38 image and video models, driven by your own generation-platform key — hosted at openhiggsfield.ai or locally with pnpm. Use when the user mentions Open Higgsfield or OpenHiggsfield, wants a self-hosted AI image/video generation studio, or wants to add a model to its catalog. Flags the upstream repo's missing license before any fork or redistribution.
---

# Open Higgsfield (OpenHiggsfield AI)

OpenHiggsfield AI describes itself as "the free, open-source alternative to
Higgsfield AI": a browser studio that generates images and videos with 38
models from one prompt bar, with no closed ecosystem and no studio
subscription. You bring your own platform key; the studio itself is free.
It is an alternative to, not a product of, Higgsfield AI.

- Hosted: https://openhiggsfield.ai (no Node.js, no setup; add your
  platform key as `id:secret` to start generating).
- Source: https://github.com/wide-trace/open-higgsfield (package
  `openhiggsfield-ai`; Next.js 16 App Router on Vercel, React 19, plain CSS,
  Zustand, pnpm; `@vercel/blob` and `@tanstack/react-virtual` are the other
  runtime dependencies).

**Read the license section before forking, redistributing or shipping a
modified copy.** As of 2026-11-19 the repository publishes no license.

## What the studio does

- **One composer for image and video.** The model you pick decides the
  output type; `⌘/Ctrl + Enter` submits.
- **38 models in the catalog** (8 image, 30 video), including Soul 2, Soul
  Cinema, Seedance 2.5 (Edit / Extend), Seedance 2.0 (Fast / Mini), Kling 3
  (Turbo / Std / Pro / 4K / Motion), Wan, Flux, Ideogram, Recraft, LTX,
  MiniMax, PixVerse, Grok and Qwen, in a searchable picker.
- **Per-model settings** (aspect ratio, resolution, duration, output
  format, audio, batch size, prompt enhancement): each model declares its
  own allow-list and the studio renders exactly that.
- **Media inputs by role** (start frame, end frame, references, video,
  audio) with per-role caps the model declares. Files upload to Vercel Blob
  and become public URLs the generate request can carry. An asset picker
  attaches uploads or any finished run.
- **Batch** of up to 4 results per press. **Live lifecycle:** skeletons
  open on submit, the request is polled every 4 s until a terminal status
  (10-minute deadline).
- **Gallery** with Image, Video, Assets and Favorites scopes, masonry grid,
  reuse (restores model, settings and prompt), viewer with copyable prompt
  and download, selection mode with bulk download/favorite/delete, and a
  6-second undo for deletion.
- **State:** history persists in IndexedDB in the browser (60 records;
  favorites never age out). Result URLs belong to the generation platform,
  so old history can outlive its CDN lifetime. Failed, NSFW and canceled
  runs are recorded as failed tiles with a retry. Your platform key is
  entered in a modal and stored by a server action in an httpOnly cookie;
  a missing key opens the modal rather than failing silently.

## Run it locally

```bash
git clone https://github.com/wide-trace/open-higgsfield.git
cd open-higgsfield
pnpm install
pnpm dev            # http://localhost:3000
```

Open the studio, press **Add key**, and paste your platform key as
`id:secret`.

Environment:

```bash
HF_API_BASE_URL=                      # generation API origin, server only
OPEN_HIGGSFIELD_READ_WRITE_TOKEN=     # Vercel Blob read-write token (uploads)
```

The README doesn't name the provider behind the platform key or
`HF_API_BASE_URL`; it describes the API only by shape (below). Don't assume
a provider; ask the user which generation platform their key belongs to.

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server on port 3000 |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm brand` | Rebuild the icons and OG card in `public/` |

## Architecture (for changes and new models)

Each generate is one object: `{ model, prompt, media, settings }`.

- The UI builds that object and hands it to a **server action**, which
  resolves it against the catalog and maps it to the generation API's own
  fields (`image_urls`, `aspect_ratio`, …). Server actions are the only
  caller; the browser never talks to the generation API. Submit is
  `POST /{model}`; status is `GET /requests/{id}/status`; auth is
  `Authorization: Key <api_key>`.
- **The catalog is the source of truth** (`src/generation/catalog/`). A new
  entry appears in the picker, brings its own settings rail and media
  roles, and needs no studio changes. To add a model, copy the shape of an
  existing catalog entry; don't invent fields or keep a parallel hardcoded
  list.
- Five small Zustand stores: shared image/video prompt, shared image/video
  media, `settings[modelId]`, and a tiny `active` store. No store per model.
- Uploads go client-direct to Vercel Blob through `/api/blob`, which issues
  scoped tokens; `blob:` URLs are preview-only.

```
src/
  app/            "/" is the full-viewport studio and the only page; /api/blob issues upload tokens; base.css owns the canvas
  generation/     generate requests, server actions, API mapping, catalog, stores
  openhiggsfield/ composer, gallery, viewer, model picker, settings, asset picker, selection bar, openhiggsfield.css
```

Design rules the project states: dark studio ground with a single lime
accent `#d1fe17`, Inter throughout, accent only for state (selection,
primary action, liveness), tabular numerals for data, no decorative loops,
every control shipping all its states (hover, focus, active, disabled,
loading, error, empty).

## License: read before you fork

- The repository has **no license file** (`LICENSE`, `LICENSE.md`,
  `LICENSE.txt`, `LICENCE` and `COPYING` all 404 on `main`), `package.json`
  has no `license` field, and GitHub reports no detected license. The
  README's words "free & open-source" are not a license grant. Under
  default copyright that means you may read the code but have no granted
  right to modify, redistribute or self-host a modified copy. Running the
  hosted studio at openhiggsfield.ai is a separate matter governed by that
  site.
- Before building on it: open an issue asking the maintainers to add a
  license, or check whether one has been added since 2026-11-19.
- If you need a permissively licensed base today, a different project with
  a similar name exists: `thehiggsfieldai/OpenHiggsfield` ("OpenHiggsfield
  Story Studio", MIT, Docker Compose, character-to-film workflow with fal
  and Higgsfield provider connections; it states it is not affiliated with
  Higgsfield.ai). It is a different app, not a drop-in replacement, and
  much smaller (117 stars vs 6,381).
- Generations cost money on the platform behind your key. Confirm prompt,
  model, batch size and duration with the user before submitting.

## Guardrails

- Don't promise what a model will generate; show the finished run.
- Never put the platform key in client code, `.env.example` or a commit;
  the studio holds it in an httpOnly cookie for a reason.
- When extending the catalog, keep the studio provider-agnostic: settings
  and media roles come from the entry, not from UI code.

## Sources

Everything above was verified against these sources on 2026-11-19:

- `wide-trace/open-higgsfield` on GitHub, `main` branch: `README.md`
  (hosted version, features, architecture, getting started, environment,
  commands, layout, design principles) and `package.json`
  (`openhiggsfield-ai`, scripts, dependencies: `next ^16.0.0`,
  `react ^19.2.0`, `zustand ^5.0.15`, `@vercel/blob ^2.8.0`,
  `@tanstack/react-virtual ^3.14.10`; no `license` field). Raw fetches of
  `LICENSE`, `LICENSE.md`, `LICENSE.txt`, `LICENCE` and `COPYING` returned
  404.
- GitHub repository metadata from the search API: 6,381 stars, created
  2026-08-26, last push 2026-09-17, homepage https://openhiggsfield.ai,
  license "none".
- `thehiggsfieldai/OpenHiggsfield` on GitHub: `README.md` and the search
  API metadata (MIT, 117 stars, last push 2026-09-26).
- Not verified here: the hosted site's own terms, and the identity of the
  generation platform behind `HF_API_BASE_URL` (the README doesn't name it).
