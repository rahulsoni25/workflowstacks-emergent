---
name: cal-com
description: Work with Cal.com scheduling from Claude — read bookings, check availability, book, reschedule, cancel, manage event types and schedules — through the hosted Cal.com MCP server (OAuth) or the Cal.com API v2, and self-host Cal.diy, the MIT community edition that the calcom/cal.com GitHub repo now redirects to. Use when the user mentions Cal.com, Cal.diy or Calendso, asks about their meetings or booking links, wants to integrate scheduling into an app, or wants to self-host a Calendly alternative.
---

# Cal.com and Cal.diy

Three things share the name, and they are not interchangeable:

| Name | What it is | License |
|---|---|---|
| **Cal.com** | The hosted, commercial scheduling product at https://cal.com, with the API v2 at `https://api.cal.com/v2` and the hosted MCP server at `https://mcp.cal.com/mcp` | Commercial, plus "Open Core" source |
| **Cal.diy** (`calcom/cal.diy`) | The community-driven, fully open-source fork of Cal.com with all enterprise and commercial code removed. **On GitHub, `calcom/cal.com` now redirects to this repo** (both names resolve to the same HEAD commit). Self-host only; there is no hosted Cal.diy | MIT, "Copyright (c) 2020-present Cal.com, Inc." |
| **`@calcom/cal-mcp`** | An older stdio MCP server on npm (0.0.6), marked "in active development and subject to rapid changes", driven by a Cal.com API key | Unspecified in its repo |

Cal.diy's README says: it is "strictly recommended for personal,
non-production use"; it drops Teams, Organizations, Insights, Workflows,
SSO/SAML and other EE-only features; it needs no license key; and
contributions to it do not flow to Cal.com's production platform. For
commercial or enterprise scheduling the README points to Cal.com itself,
hosted or on-prem via https://cal.com/sales.

## Hosted Cal.com MCP server (bundled)

This plugin's `.mcp.json` connects the `cal-com` server at
`https://mcp.cal.com/mcp` (Streamable HTTP). The first time a tool is used
the client opens a browser to sign in to Cal.com and approve access; the
server supports OAuth 2.1 with PKCE and dynamic client registration, so no
API key is needed. In Claude Code, run `/mcp` to sign in or re-authenticate.
Every write goes to the signed-in user's real calendar and can email real
attendees, so follow these rules (they are Cal.com's own, from its agent
skill):

1. **Discover, never guess.** Never invent IDs, booking UIDs, emails,
   usernames, slugs or time zones. Look them up with the read tools, or ask.
2. **Check availability before booking.** Call `get_availability` before
   `create_booking` or `reschedule_booking`, and offer only slots it
   returned.
3. **Confirm before changing anything.** Before you create, reschedule,
   cancel, confirm or decline a booking, or create, update or delete
   anything else, show exactly what will happen (who, what, when, in the
   user's time zone) and wait for an explicit yes. Anything named
   `delete_*`, `cancel_*` or `unassign_*` is destructive: name the exact
   item and ask again.
4. **Be explicit about time zones.** Get the user's zone from `get_me`.
   The API takes UTC ISO 8601 (`2026-11-09T14:00:00Z`); show times in the
   user's zone with the zone named.
5. **Docs questions go to `search_docs`**, not memory. Link bookings, event
   types and settings pages with `get_app_link`.

Tools named in Cal.com's skill (list the server's tools at runtime; the
set can change):

| Need | Tool |
|---|---|
| User id, username, email, time zone | `get_me` (`update_me` to change) |
| Event types | `get_event_types`, `get_event_type`, `get_event_type_settings`; write: `create_event_type`, `update_event_type`, `delete_event_type`, `duplicate_event_type` |
| Bookings | `get_bookings` (filter by status, `afterStart`/`beforeEnd`, attendee), `get_booking`, `get_booking_attendees`, `get_booking_attendee`; write: `create_booking`, `reschedule_booking`, `cancel_booking`, `confirm_booking`, `add_booking_attendee`, `mark_booking_absent` |
| Open slots and busy times | `get_availability`; `get_connected_calendars` then `get_busy_times` |
| Working hours | `get_schedules`, `get_schedule`, `get_default_schedule`; write: `create_schedule`, `update_schedule`, `delete_schedule` |
| Teams and apps | `get_my_teams`, `get_team_memberships`, `get_org_teams`, `get_conferencing_apps` |
| Anything else in API v2 | `find_api_operation` → `describe_api_operation` → `call_api_operation`, same confirmation rules |

Workflows from the same skill: to list a day's bookings, take the zone from
`get_me`, convert the day's bounds to UTC, call `get_bookings` with
`afterStart`/`beforeEnd` (and `status: upcoming` for future meetings). To
book, pick the event type (ask if several fit), ask for the attendee's
name, email and zone, call `get_availability`, offer a few slots, summarize
and ask "Book it?", then `create_booking` with `start` in UTC; never set
`allowConflicts` or `allowBookingOutOfBounds` unless the user explicitly
asks. To reschedule, call `get_availability` with `bookingUidToReschedule`.
A 401 or 403 means the sign-in expired or the OAuth scopes don't cover the
action: tell the user to re-authenticate; don't retry in a loop.
Organization and team actions need admin rights in Cal.com.

**stdio alternative.** The older `@calcom/cal-mcp` package runs locally with
an API key, for clients that can't do OAuth:

```json
{
  "mcpServers": {
    "cal": {
      "command": "npx",
      "args": ["@calcom/cal-mcp@latest"],
      "env": { "CAL_API_KEY": "YOUR CAL API KEY" }
    }
  }
}
```

By default it enables `getBooking`, `getBookings`, `createBooking`,
`rescheduleBooking`, `cancelBooking`, `getEventTypes`, `getEventTypeById`,
`updateEventType` and `deleteEventType`; add `--all-tools` (or `-a`) to
the args for tools covering every API endpoint. Its repo was last pushed in
May 2025 and warns that features and APIs may change frequently.

## API v2 (for code the user is building)

Base URL `https://api.cal.com/v2`. Every request sends
`Authorization: Bearer cal_<your_api_key>`; keys are prefixed `cal_live_`
or `cal_test_` and come from **Settings → Developer → API Keys**. Platform
integrations that act for other users also send `x-cal-client-id`
(`CAL_CLIENT_ID`) and `x-cal-secret-key` (`CAL_SECRET_KEY`); webhook
payloads are signed in the `X-Cal-Signature-256` header with the webhook
secret. Core objects: **event types** (bookable configurations with a slug),
**bookings** (confirmed appointments with a UID), **schedules** (working
hours) and **slots** (bookable windows).

```http
GET /v2/slots?startTime=2024-01-15T00:00:00Z&endTime=2024-01-22T00:00:00Z&eventTypeId=123

POST /v2/bookings
Content-Type: application/json
{ "start": "2024-01-15T10:00:00Z", "eventTypeId": 123,
  "attendee": { "name": "John Doe", "email": "john@example.com", "timeZone": "America/New_York" } }

POST /v2/webhooks
Content-Type: application/json
{ "subscriberUrl": "https://your-app.com/webhook", "triggers": ["BOOKING_CREATED", "BOOKING_CANCELLED"] }
```

Reschedule with `POST /v2/bookings/{uid}/reschedule`, cancel with
`POST /v2/bookings/{uid}/cancel`. Always check slots before booking, store
booking UIDs, use ISO 8601 timestamps, and back off exponentially on rate
limits. Full reference: https://cal.com/docs/api-reference/v2 and the
OpenAPI spec at https://api.cal.com/v2/docs. The same guidance ships inside
Cal.diy as `agents/skills/calcom-api/SKILL.md` with per-domain reference
files for bookings, event types, schedules, slots, calendars and webhooks.

## Self-hosting Cal.diy

Prerequisites: Node.js 18+, PostgreSQL 13+, Yarn. Built with Next.js, tRPC,
React, Tailwind CSS, Prisma and Daily.co.

### Development checkout

```sh
git clone https://github.com/calcom/cal.diy.git     # Windows: add -c core.symlinks=true in an admin Git Bash
cd cal.diy
yarn
cp .env.example .env
# NEXTAUTH_SECRET:         openssl rand -base64 32
# CALENDSO_ENCRYPTION_KEY: openssl rand -base64 24
nvm install && nvm use
yarn dx        # needs Docker + Compose: starts a local Postgres with seeded test users
```

`yarn dx` seeds users such as `pro@example.com` / `pro` and
`admin@example.com` / `ADMINadmin2022!`; `yarn db-studio` lists them at
http://localhost:5555. Without Docker: set `DATABASE_URL` in `.env` (and
copy it to `.env.appStore`), run `yarn workspace @calcom/prisma db-migrate`
(dev) or `db-deploy` (production), optionally run mailhog for outgoing
mail, then `yarn dev` and open http://localhost:3000. Create the first user
in Prisma Studio (`yarn db-studio`, bcrypt the password, set `metadata` to
`{}`) or seed dummy users with `cd packages/prisma && yarn db-seed`.
Set `NODE_OPTIONS="--max-old-space-size=16384"` if the build runs out of
memory and `NEXT_PUBLIC_LOGGER_LEVEL=0..6` for tRPC logging. E2E tests:
`yarn test-e2e` with `NEXTAUTH_URL=http://localhost:3000`.

### Docker Compose (prebuilt image)

```bash
git clone --recursive https://github.com/calcom/cal.diy.git
cd cal.diy
cp .env.example .env
# set NEXTAUTH_SECRET (openssl rand -base64 32) and CALENDSO_ENCRYPTION_KEY (openssl rand -base64 24)
# set NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY from: npx web-push generate-vapid-keys
docker compose pull
docker compose up -d                     # full stack: Postgres, web app, Prisma Studio
# docker compose up -d calcom studio     # against a remote DATABASE_URL
# docker compose up -d calcom            # web app only
```

Open http://localhost:3000 (or `NEXT_PUBLIC_WEBAPP_URL`); the first run
shows a setup wizard. The "Connect your Calendar" step can be skipped by
going to `<NEXT_PUBLIC_WEBAPP_URL>/event-types`. The image is
`calcom/cal.diy` on Docker Hub; ARM hosts use the `-arm` tag suffix (e.g.
`calcom/cal.diy:v5.6.19-arm`). Update with `docker compose down`,
`docker compose pull`, adjust `.env`, `docker compose up -d`. Building the
image yourself needs a reachable database at build time and
`DOCKER_BUILDKIT=0 docker compose build calcom`.

Run-time variables:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Point at the pooler if you use one; default `postgresql://unicorn_user:magical_password@database:5432/calendso` |
| `NEXTAUTH_SECRET` | yes | Cookie encryption key; must match the build-time value |
| `CALENDSO_ENCRYPTION_KEY` | yes | 32 bytes for AES-256; must match the build-time value |
| `NEXT_PUBLIC_WEBAPP_URL` | no | Base URL; a value different from build time delays container start while static files are rewritten |
| `NEXTAUTH_URL` | no | Defaults to `{NEXT_PUBLIC_WEBAPP_URL}/api/auth` |

Build-time extras: `MAX_OLD_SPACE_SIZE` (4096), `NEXT_PUBLIC_WEBSITE_TERMS_URL`,
`NEXT_PUBLIC_WEBSITE_PRIVACY_POLICY_URL`, `CALCOM_TELEMETRY_DISABLED=1` to
turn off anonymous usage data. `CSP_POLICY="non-strict"` enables a strict
Content Security Policy except `unsafe-inline` styles (login page enforced,
other SSR pages report-only).

One-click deploys exist for Railway, Northflank, Render (via `calcom/docker`)
and Elestio; Vercel needs the Pro plan because of the serverless function
count.

Troubleshooting from the README: `CLIENT_FETCH_ERROR` from next-auth
usually means the container can't resolve `NEXT_PUBLIC_WEBAPP_URL`, so set
`NEXTAUTH_URL=http://localhost:3000/api/auth`; behind an SSL-terminating
load balancer you may need `NODE_TLS_REJECT_UNAUTHORIZED=0` (only if you
trust the balancer); a failing `prisma.user.create()` wants `metadata` set
to `{}`.

### Integrations

Each app needs its own credentials in `.env` and a redirect URL of the form
`<Cal.diy URL>/api/integrations/<app>/callback`: Google Calendar
(`GOOGLE_API_CREDENTIALS` holds the downloaded OAuth client JSON; also add
`<Cal.diy URL>/api/auth/callback/google`, then `cd packages/prisma && yarn
seed-app-store`), Microsoft 365 (`MS_GRAPH_CLIENT_ID`,
`MS_GRAPH_CLIENT_SECRET`, `office365calendar`), Zoom (`ZOOM_CLIENT_ID`,
`ZOOM_CLIENT_SECRET`, `zoomvideo`, scopes `meeting:write:meeting` and
`user:read:settings`), Daily.co (`DAILY_API_KEY`, `DAILY_SCALE_PLAN=true`
for recording), Basecamp (`BASECAMP3_CLIENT_ID`/`_SECRET`), HubSpot
(`HUBSPOT_CLIENT_ID`/`_SECRET`, scopes `crm.objects.contacts` and
`crm.lists`), Zoho CRM (`ZOHOCRM_CLIENT_ID`/`_SECRET`), plus Webex, Zoho
Calendar, Zoho Bigin and Pipedrive via their app-store READMEs. Rate
limiting with Unkey is optional (`UNKEY_ROOT_KEY`).

## Guardrails

- Hosted-MCP writes are real: bookings email real attendees. Confirm first,
  every time, and never guess an email or a time zone.
- Keep API keys, `NEXTAUTH_SECRET`, `CALENDSO_ENCRYPTION_KEY` and VAPID keys
  out of chat and out of `.env.example`; rotate a Cal.com API key at once if
  it leaks.
- Say "Cal.diy" when the user means the self-hosted MIT fork and "Cal.com"
  for the hosted product, and repeat the README's own warnings: Cal.diy is
  "use at your own risk" and recommended for personal, non-production use.
- The hosted MCP and API v2 act on a Cal.com account, not on a self-hosted
  Cal.diy instance; this skill doesn't document a self-hosted MCP.

## Sources

Everything above was verified against these sources on 2026-11-19:

- `calcom/cal.diy` on GitHub, `main` branch (MIT; `LICENSE` reads "MIT
  License, Copyright (c) 2020-present Cal.com, Inc."): `README.md` (the
  Cal.diy warning and description, setup, `yarn dx` and seeded users,
  Docker Compose, run-time and build-time variables, troubleshooting,
  deployment buttons, integrations, CSP); `package.json`
  (`calcom-monorepo`, workspaces); `agents/skills/calcom-api/SKILL.md` (API
  v2 base URL, credentials, quick-start requests, workflows).
- `git ls-remote https://github.com/calcom/cal.com HEAD` and
  `git ls-remote https://github.com/calcom/cal.diy HEAD` returned the same
  commit (`ae027bb7…`) on 2026-11-19, and a GitHub search for
  `repo:calcom/cal.com` reported the repository as not found; that is the
  basis for "calcom/cal.com now redirects to calcom/cal.diy".
- `calcom/cursor-plugin` on GitHub (last push 2026-11-07): root
  `README.md`, `plugins/cal-com/README.md`, `plugins/cal-com/mcp.json`
  (`https://mcp.cal.com/mcp`) and
  `plugins/cal-com/skills/cal-com-scheduling/SKILL.md` (rules, tool names,
  workflows, error handling).
- `calcom/cal-mcp` on GitHub (last push 2025-05-22): `README.md` and
  `package.json` (`@calcom/cal-mcp` 0.0.6, default tools, `--all-tools`).
- GitHub repository metadata from the search API: `calcom/cal.diy` 50,192
  stars, last push 2026-11-13, homepage https://cal.diy.
- Not verified here: cal.com's docs site and the API v2 reference pages
  (cited by URL only), and the hosted MCP's current tool list beyond the
  names in Cal.com's own skill.
