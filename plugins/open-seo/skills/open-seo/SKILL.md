---
name: open-seo
description: Use OpenSEO (openseo.so, GitHub every-app/open-seo), the MIT-licensed open-source alternative to Semrush and Ahrefs — keyword research, rank tracking, competitor insights, backlinks, site audits and AI visibility — through its hosted MCP server, its official Claude plugin, or a self-hosted Docker, Cloudflare or EveryApp instance that needs a DataForSEO key. Use when the user mentions OpenSEO or "Open SEO", wants SEO data inside Claude, or asks to self-host an Ahrefs or Semrush replacement.
---

# OpenSEO

OpenSEO calls itself "an SEO tool for the people": an MIT-licensed,
pay-as-you-go alternative to Semrush and Ahrefs that you can run yourself or
use hosted at https://openseo.so. It is built for agents: the app exposes an
MCP server and ships Agent Skills, and its UI gives you focused workflows
(keyword research, rank tracking, competitor insights, backlinks, site
audits, AI visibility) instead of a bloated suite. SEO data comes from
DataForSEO, a third-party pay-as-you-go API, so a DataForSEO key (or a treg
token) is required whichever way you run it.

Repository: https://github.com/every-app/open-seo (`open-seo` 0.1.30 when
this skill was written). Hosted app: https://app.openseo.so. Docs:
https://openseo.so/docs.

## Three ways to use it from Claude

| Path | What you get | Auth |
|---|---|---|
| **Hosted MCP server** `https://app.openseo.so/mcp`, bundled with this plugin | OpenSEO's tools: keyword research, SERP inspection, local business research, competitive search intelligence, domain research, backlink overview, saved keywords, rank tracking, shared project context, Google Search Console performance and URL inspection | OAuth login on first connection, or an API key |
| **OpenSEO's own Claude Code plugin** `openseo@openseo` | The same MCP server plus twelve SEO Agent Skills (listed below) | Same |
| **Self-hosted instance** | Your data on your server; its MCP endpoint is `<your instance>/mcp` | Your instance's email/password accounts, or an API key from its Settings |

This plugin's `.mcp.json` points at the hosted server, the same endpoint the
official plugin uses. For a self-hosted instance, register it yourself:
`claude mcp add --transport http openseo https://seo.example.com/mcp`.

## Using the MCP server

1. **First connection.** Claude Code should prompt you to log in to OpenSEO.
   If it doesn't, run `/mcp` and approve the OpenSEO connection there. The
   connection is tied to the workspace that was active when you authorized;
   connect again to use another workspace.
2. **Headless or CI.** In the app open **Settings → API keys**, create a key
   and copy it when it appears (it is shown once and starts with `oseo_`).
   Then register the server with a header instead of OAuth:

   ```bash
   claude mcp add --transport http --scope user openseo https://app.openseo.so/mcp \
     --header "Authorization: Bearer oseo_YOUR_KEY"
   ```

   Other clients can send `Authorization: Bearer oseo_YOUR_KEY` or
   `x-api-key: oseo_YOUR_KEY`. A key acts as you, in the workspace that was
   active when you created it.
3. **List projects first.** If a tool can't find a project, ask the server to
   list OpenSEO projects and use the returned project ID in later calls.
   Listing projects uses no credits; the docs' "OpenSEO MCP tools" page says
   which tools do.
4. **Discover tools at runtime.** List the server's tools and use what it
   exposes; this skill doesn't hard-code tool names.
5. **If it won't connect**, check the URL is exactly
   `https://app.openseo.so/mcp`. If authorization fails, remove the server
   from your client, add it again and repeat the login.

## The official plugin (MCP + twelve skills)

```
/plugin marketplace add every-app/open-seo
/plugin install openseo@openseo
```

Run `/reload-plugins` if the install summary asks for it. The skills are
namespaced by the plugin name:

```
/openseo:seo-project-setup   /openseo:seo-coach            /openseo:seo-audit
/openseo:ai-visibility-audit /openseo:ai-prompt-research   /openseo:keyword-research
/openseo:keyword-clustering  /openseo:competitive-landscape /openseo:competitor-analysis
/openseo:local-seo           /openseo:link-prospecting     /openseo:seo-report
```

OpenSEO's docs recommend starting with one focused workflow (project setup
first, so every other skill reuses your goals, competitors and key pages),
not "do SEO" broadly. Update with `/plugin marketplace update openseo`,
`/plugin update openseo@openseo` and `/reload-plugins`; remove with
`/plugin uninstall openseo@openseo`. The docs note that plugins need a paid
Claude plan; on the Free plan they point to the OpenSEO connector in
Claude's directory plus skills uploaded under **Customize → Skills**.

Separately, the repo publishes `skills`-CLI skills, for example
`npx skills add every-app/open-seo --skill simple-issue-description` for
filing good issues.

## Self-hosting

OpenSEO is written for Cloudflare Workers. In Docker it runs on celld, an
open-source runtime for Workers code. Three supported paths:

### EveryApp (the project's recommendation)

EveryApp is the company behind OpenSEO; it runs entirely in your Cloudflare
account on their $5/month plan.

```bash
npm install -g everyapp
everyapp setup --domain apps.yourcompany.com
everyapp install https://github.com/every-app/open-seo
```

### Docker Compose

Needs Docker Engine or Docker Desktop with Compose, at least 4 GiB of memory
for Docker, and a DataForSEO key (or treg token). Every command runs from
the repository root:

```sh
git clone https://github.com/every-app/open-seo.git
cd open-seo
export COMPOSE_FILE=deploy/standalone/compose.yaml
cp deploy/standalone/.env.example deploy/standalone/.env
# In deploy/standalone/.env:
#   STORAGE_SECRET_KEY   = a unique random value, e.g. `openssl rand -hex 32`
#   DATAFORSEO_API_KEY   = your key (base64 of login:password)
#   BETTER_AUTH_URL      = http://localhost:3001 for use on this machine
docker compose pull
docker compose up -d
docker compose logs -f init
```

Wait for `OpenSEO initialized and ready.`, open http://localhost:3001 and
create the administrator's account. **Registration closes once that account
exists**, so create it before the installation is reachable from the
internet. Teammates join from invitation links copied in Team settings
(there is no email delivery). Password resets and extra accounts use the
admin command, e.g. `pnpm standalone:admin reset-password you@example.com`
with the password on standard input, or without pnpm
`docker compose exec -T runtime node /opt/standalone/admin.mjs ...`.

Feature credentials go in `deploy/standalone/.env` and apply with
`docker compose up -d --force-recreate init web crawl-gateway`:

| Variable | Purpose |
|---|---|
| `DATAFORSEO_API_KEY` | Base64-encoded `login:password`; keyword, backlink, rank and site data |
| `TREG_API_TOKEN` | Instead of the DataForSEO key: the same data bought per call through treg |
| `OPENROUTER_API_KEY`, optional `OPENROUTER_BASE_URL` and `OPENROUTER_MODEL` | SAM conversations, website research and summaries; the base URL can point at another OpenAI-compatible server (vLLM, LiteLLM, Ollama) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Search Console and Analytics linking with your own Google OAuth app (redirects `/api/gsc/oauth/callback` and `/api/ga4/oauth/callback`) |
| `CONTEXT_API_KEY` | JavaScript rendering for site audits |
| `GOOGLE_MAPS_API_KEY` | Map for Local SEO |
| `CRAWLER_ACCESS_SECRET` | 32+ random characters; encrypts saved Shopify crawler signatures |

- **Public HTTPS:** set `BETTER_AUTH_URL=https://seo.example.com` before the
  first start (or force-recreate `init web crawl-gateway` after changing
  it), put an HTTPS reverse proxy in front of `127.0.0.1:3001` and forward
  WebSocket upgrades for SAM. Plain HTTP is accepted only for `localhost`.
  Only Nginx is published, and only on the host's loopback address.
- **No sign-in:** `AUTH_MODE=local_noauth` runs OpenSEO as one admin user
  with no login. Use it only where the network already controls access
  (a private network, Tailscale, or your own authenticating proxy).
- **MCP:** clients connect to `<instance>/mcp` and sign in with an OpenSEO
  account, or use an API key from Settings. Clients that register with a
  metadata URL (CIMD) are not supported; use dynamic client registration or
  an API key.
- **Health and logs:** `curl --fail http://localhost:3001/api/health`;
  `docker compose logs --tail 100 init runtime storage crawl-gateway web`.
- **Updates:** back up first (`node scripts/celld/backup.mjs backup
  ./backups/<date>`), then `docker compose pull`, `docker compose stop web
  crawl-gateway runtime`, `docker compose up -d`. Migrations run in `init`
  and are not undone by an older image; restore the matching backup instead.
- `docker compose down -v` deletes the installation's data and secrets.
- The older single-container image `ghcr.io/every-app/open-seo` still gets
  updates; `docs/SELF_HOSTING_DOCKER.md` has a one-time `migrate` service to
  move its data to this setup.
- Site audits crawl up to 10,000 pages (1,000 with JavaScript rendering),
  with no lifetime quota; costs are what the providers charge.

### Cloudflare without EveryApp

See `docs/SELF_HOSTING_CLOUDFLARE.md` in the repo (`pnpm deploy:selfhost`
with `.env.selfhost`), optionally with Cloudflare Access in front.

## DataForSEO key

1. Create an account at DataForSEO and open its API Access page.
2. Copy the credential labelled "Base64" (the base64 of `email:password`),
   or build it yourself: `printf '%s' 'YOUR_LOGIN:YOUR_PASSWORD' | base64`.
3. Set it as `DATAFORSEO_API_KEY`: `deploy/standalone/.env` for Docker,
   `.env.selfhost` for Cloudflare, `.env.local` for local development.

The repo's guide says new DataForSEO accounts include $1 of free credit and
the minimum top-up is $50. treg (a third-party reseller) sells the same
calls from a prepaid balance at DataForSEO's rates with no minimum: set
`TREG_API_TOKEN` instead. When both are set, OpenSEO uses the DataForSEO
key. treg relays only the endpoints in its catalog, shares one DataForSEO
account across its customers, and is untested for rank trackers with
thousands of keywords; EveryApp deployments don't support it yet. When you
self-host you pay DataForSEO directly; the hosted service's margin is 28%
on every DataForSEO request it makes for you.

## Local development

```sh
corepack enable                 # activates the pnpm version in package.json
pnpm install --frozen-lockfile
pnpm run db:migrate:local       # once per fresh local DB
cp .env.example .env.local      # add DATAFORSEO_API_KEY; set AUTH_MODE=local_noauth
pnpm run dev                    # or: mkdir .logs && touch .logs/dev-server.log && pnpm dev:agents
```

Node.js 20+ with Corepack (bundled through Node 24). `pnpm --version` must
match the `packageManager` field in `package.json`. `pnpm dev:agents` runs
through portless at `http://open-seo.localhost:1355` and tees logs to
`.logs/dev-server.log` for agent debugging. The marketing site (`web/`) and
the audit test site (`tests/badseo/`) are separate pnpm projects with their
own lockfiles.

## Guardrails

- Never paste an `oseo_` key or a DataForSEO key into chat, a committed
  file, or an `.mcp.json` inside a repository. Use `--scope user`, an
  environment variable, or the OAuth login.
- Data tools spend DataForSEO credits (and hosted-plan credits). Before a
  large keyword, backlink or audit pull, say which calls you will make, and
  reuse the project context instead of re-fetching.
- Don't invent keyword volumes, rankings, backlink counts or audit scores.
  Report what the tool returned, naming the project and the date.
- OpenSEO is unaffiliated with DataForSEO and treg; both are paid third
  parties with their own terms.

## Sources

Everything above was verified against these sources on 2026-11-19:

- `every-app/open-seo` on GitHub, `main` branch (MIT; `LICENSE` reads
  "MIT License, Copyright (c) 2026 Ben Senescu"): `README.md`;
  `package.json` (`open-seo` 0.1.30, `packageManager` pnpm@10.30.1);
  `docs/SELF_HOSTING_DOCKER.md`; `docs/DATAFORSEO_API_KEY.md`;
  `docs/LOCAL_DEVELOPMENT.md`; the docs-site sources
  `web/content/docs/mcp.mdx` and `web/content/docs/claude-code-plugin.md`
  (openseo.so itself was not reachable from the build environment, so the
  docs were read from these source files in the repo);
  `plugins/openseo/.mcp.json`, `plugins/openseo/.claude-plugin/plugin.json`
  (plugin 1.0.28) and `.claude-plugin/marketplace.json` (the official
  `openseo@openseo` plugin).
- GitHub repository metadata from the search API: 28,263 stars, last push
  2026-11-19, homepage https://openseo.so, topics including `mcp`,
  `seo-skills` and `google-search-console-mcp`.
- Not verified here: the hosted MCP tool list on the docs' "MCP tools" page,
  and hosted pricing beyond the README's "$10/month" line.
