---
name: appflowy
description: Install, self-host or contribute to AppFlowy (appflowy.com, GitHub AppFlowy-IO/AppFlowy), the AGPL-3.0 open-source Notion alternative built with Flutter and Rust — desktop and mobile apps, plus the AppFlowy self-hosted server via Docker Compose — and explain which parts are open source and which are commercial. Use when the user mentions AppFlowy, wants a self-hosted Notion or Confluence alternative, or asks how to run the AppFlowy server.
---

# AppFlowy

AppFlowy is "the AI workspace where you achieve more without losing control
of your data" and "the leading open source Notion alternative": projects,
wikis and teams in one app, built with Flutter and Rust. The desktop and
mobile app repository is AGPL-3.0. Its stated values are data privacy
first, a reliable native experience, and community-driven extensibility.

Repository: https://github.com/AppFlowy-IO/AppFlowy (79,180 stars when
this skill was written). Website: https://appflowy.com.

## Open source vs. open core (know which part you're installing)

| Part | Repo | License and status |
|---|---|---|
| Desktop and mobile app (Flutter + Rust) | `AppFlowy-IO/AppFlowy` | AGPL-3.0, actively developed |
| Web app | `AppFlowy-IO/AppFlowy-Web` | AGPL-3.0 |
| Editor and board widgets for Flutter | `appflowy-editor`, `appflowy-board` | Open source |
| Legacy server | `AppFlowy-IO/AppFlowy-Cloud` | Archived. Its README says: "Do not build the server from this archived repository"; it is "no longer maintained or in use across any AppFlowy product offerings" |
| Current server (SaaS and self-hosted) | `AppFlowy-IO/AppFlowy-SelfHost-Commercial` (Compose files) built from a closed-source commercial codebase | AppFlowy Self-Hosted Commercial License (`SELF_HOST_LICENSE_AGREEMENT.md`), with a Free Tier |

So: the app you install is open source; the server you self-host for sync,
collaboration, web access and AI is commercial software with a free tier.
Say that plainly when a user asks whether "AppFlowy is fully open source".
AppFlowy's own wording is that AppFlowy Cloud "adopts an open-core model,
while AppFlowy Web and AppFlowy Flutter remain entirely open source."

The self-hosted Free Tier includes one user seat per instance, web app
access via your domain, up to 3 guest editors on selected pages with
view/comment/edit permissions, version history, publish pages, and
unlimited workspaces. Paid self-hosted tiers upgrade the same deployment;
pricing is at https://appflowy.com/pricing and in the admin panel.

## Install the app

- Desktop (macOS, Windows, Linux): the GitHub releases page,
  https://github.com/AppFlowy-IO/AppFlowy/releases, or Flathub
  (`io.appflowy.AppFlowy`), Snapcraft (`appflowy`) and SourceForge.
- iPhone: App Store (id 6457261352). Android: Play Store
  (`io.appflowy.appflowy`), Android 10 or above; ARMv7 is not supported.
- Release notes: https://appflowy.com/what-is-new.

The app works locally without a server; connect it to AppFlowy's managed
cloud or to a self-hosted server for sync and collaboration.

## Self-host the server (Docker Compose)

```bash
git clone https://github.com/AppFlowy-IO/AppFlowy-SelfHost-Commercial
cd AppFlowy-SelfHost-Commercial
cp deploy.env .env
# edit .env, then:
docker compose up -d        # Docker Compose 2.30 or newer
```

Key settings in `.env` (from `deploy.env`): `FQDN` (replace `localhost`
with your domain), `SCHEME` (`http` or `https`), `WS_SCHEME` (`ws` or
`wss`), the derived `APPFLOWY_BASE_URL` and `APPFLOWY_WEBSOCKET_BASE_URL`
(`/ws/v2`), PostgreSQL (`POSTGRES_HOST`, `POSTGRES_USER`,
`POSTGRES_PASSWORD`, `POSTGRES_PORT`, `POSTGRES_DB`) and Redis
(`REDIS_HOST`, `REDIS_PORT`). Change the default database password before
exposing anything. Optional profiles: `APPFLOWY_BACKUP_PROFILE=backup`
adds the Backup service (then **Tools → Backup** in the admin console) and
`APPFLOWY_SERVER_LOGS_PROFILE=server-logs` adds server logs; both are
applied with another `docker compose up -d`.

The bundled `docker/nginx/nginx.conf` serves AppFlowy Web and the APIs from
one origin and forwards every `/api` request to Cloud. If Web runs on
another origin behind a proxy or CDN that answers CORS preflights itself,
that edge must allow the `X-Request-Time`, `X-Request-Stream-Id` and
`X-AppFlowy-Media-Retry` request headers or the browser drops those
requests. Upgrade Cloud, Worker, Search, GoTrue, Admin and Backup as a
compatible set, letting Cloud finish its migrations before starting the
others. The repo's `docs/` folder covers Compose details, backups,
audit logging, Google Drive and Calendar connections, SCIM and the OpenAPI
(Swagger) explorer. The step-by-step guide and video tutorials are at
https://appflowy.com/docs and the project's YouTube playlist.

**MCP:** the commercial server's release notes describe an optional
standalone MCP service for "AI app connections" (One, Team and Enterprise
plans) configured with `APPFLOWY_MCP_BASE_URL`, with Admin API controls for
availability and policy. This plugin bundles no MCP server: there is no
public endpoint for the open-source desktop app, and the self-hosted one is
per-instance and tier-gated. Community MCP servers exist on GitHub but are
not AppFlowy projects; vet them before use.

## Develop and contribute

- Build from source: https://docs.appflowy.io/docs/documentation/appflowy/from-source
  (OS-specific instructions; Flutter and Rust toolchains).
- Contributing guide: https://docs.appflowy.io/docs/documentation/software-contributions/contributing-to-appflowy.
  Roadmap: https://docs.appflowy.io/docs/appflowy/roadmap and the public
  GitHub project board. Feature requests and bug reports use the repo's
  issue templates.
- Translations live in `/frontend/resources/translations` as JSON; edit
  them directly, use the inlang online editor, or run
  `npx inlang machine translate` for missing strings.

## Guardrails

- AGPL-3.0 applies to the app: if you modify it and offer it to users over
  a network, the AGPL's source-sharing terms apply. The server's commercial
  license has its own terms; read `SELF_HOST_LICENSE_AGREEMENT.md` before
  deploying or redistributing.
- Don't build the server from the archived `AppFlowy-Cloud` repo; newer
  web and client apps depend on the current prebuilt images
  (`appflowyinc/appflowy_cloud` on Docker Hub).
- Self-hosting is for people comfortable with server administration;
  back up the Postgres data and object storage before upgrades.

## Sources

Everything above was verified against these sources on 2026-11-19:

- `AppFlowy-IO/AppFlowy` on GitHub, `main` branch (AGPL-3.0; `LICENSE` is
  the GNU Affero General Public License v3): `README.md` (description,
  install channels, built with, roadmap, contributing, translations, why,
  license).
- `AppFlowy-IO/AppFlowy-Cloud` `README.md` (archived-repo notice, the
  switch to the commercial repo, open source vs. open core, Free Tier).
- `AppFlowy-IO/AppFlowy-SelfHost-Commercial` on GitHub: `README.md`
  (deployment options, Free Tier, commercial license, nginx and CORS notes,
  upgrade ordering, release notes through v0.21.9 including the MCP
  service and `APPFLOWY_MCP_BASE_URL`), `deploy.env` (variables quoted
  above). Its `LICENSE` file is absent; the README links
  `SELF_HOST_LICENSE_AGREEMENT.md`.
- GitHub repository metadata from the search API: `AppFlowy-IO/AppFlowy`
  79,180 stars, last push 2026-11-15, homepage https://appflowy.com;
  `AppFlowy-Web` 355 stars (AGPL-3.0); `AppFlowy-Cloud` 2,014 stars
  (AGPL-3.0, last push 2026-09-11).
- Not verified here: appflowy.com and docs.appflowy.io pages (they were not
  reachable from the build environment and are cited by URL only), store
  listings, and the contents of `SELF_HOST_LICENSE_AGREEMENT.md`.
