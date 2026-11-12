---
name: v0
description: Use Vercel's v0 (v0.app) from Claude — generate UI and full Next.js apps from a prompt, iterate with follow-up messages, fetch the preview URL and source files, and deploy to Vercel. Works through the official v0 MCP server (OAuth) or the v0 Platform API via the `v0` TypeScript SDK. Use when the user mentions v0, v0.dev or v0.app, asks to "generate this UI with v0", wants a v0 preview or deployment, or is building an app on the v0 Platform API.
---

# v0 (Vercel)

v0 is Vercel's AI app and UI generator. Claude can drive it in two ways:

| Path | When | Auth |
|---|---|---|
| **v0 MCP server**: `https://v0.app/api/mcp`, bundled with this plugin | Interactive use from this conversation: create a chat, iterate, get a preview | OAuth in the browser. **No API key.** |
| **Platform API** via the `v0` npm SDK | Code the user is building: scripts, backends, their own app on top of v0 | `V0_API_KEY`, or Vercel OIDC when deployed on Vercel |

## Using the MCP server

1. The first connection starts an OAuth flow. In Claude Code, run `/mcp`,
   pick the v0 server and sign in. The user picks the v0 account or team
   and approves.
   - **Never** put a v0 API key into an MCP config.
   - To switch accounts or teams, remove the connection and connect again.
2. List the server's tools before using them, and use only what it
   actually exposes. This skill doesn't hard-code tool names.
3. **Every generation spends the user's v0 credits.**
   - Before you start a new chat or deploy, confirm the prompt with the
     user, and the target if it's a deploy.
   - Batch your feedback into one follow-up instead of many small
     messages.
4. Show the user the preview URL. Then ask whether they want the code
   pulled into this repo or kept in v0.
5. Don't confuse this server with **Vercel's** MCP server
   (`https://mcp.vercel.com`). That one manages Vercel projects,
   deployments and logs, not v0 generations.

## Using the Platform API (`v0` SDK)

The current SDK is the npm package **`v0`**, a generated TypeScript client
for the v2 API with base URL `https://api.v0.dev/v2`. The older `v0-sdk`
package is the previous generation. Don't add it to new code.

```bash
npm install v0
```

```ts
import { v0 } from 'v0'

const response = await v0.chats.create({
  message: 'Build me a personal website',
})

if (response.error) {
  throw new Error(response.error.message)
}

const preview = await v0.chats.getPreview({
  chatId: response.data.chat.id,
})

if (preview.error) {
  throw new Error(preview.error.message)
}

console.log(preview.data?.url)
```

- **Auth.** The default `v0` client reads `V0_API_KEY`. Without it, the
  client falls back to Vercel OIDC for server-side code deployed on Vercel.
  - Keys come from https://v0.app/settings.
  - For custom auth or `baseUrl`, use
    `createV0Client({ auth: process.env.CUSTOM_V0_API_KEY! })`.
- **Results.** Every call returns `{ data, error }`. Check `error` first.
- **Keep the key server-side.** Never expose a team-wide API key to
  browser code. Proxy through the user's own authenticated backend, and
  verify the chat belongs to the signed-in user.

### SDK methods

| Namespace | Methods |
|---|---|
| `v0.chats` | `create` (blocks until done), `createStream`, `createAsync`, `createFromFiles`, `createFromZip`, `createFromRepo`, `createFromVercelProject`, `list`, `get`, `update`, `delete`, `duplicate`, `getPreview`, `getFiles`, `updateFiles`, `downloadFiles`, `deploy`, `createVercelProject`, `restoreMessage`, `resume`, `getConnectStatus` |
| `v0.messages` | `send` (blocks), `sendStream`, `sendAsync`, `list`, `get`, `resolve`, `resolveStream`, `resolveAsync`, `stop` |
| `v0.mcpServers` | `list`, `create`, `get`, `update`, `delete`. These register *custom* MCP servers that v0 itself can call. |
| `v0.webhooks` | `list`, `create`, `get`, `update`, `delete` |
| `v0.usage` | `getSummary`, `listEvents`, `getActivity` |
| `v0.settings` | `getPreviewHosts`, `setPreviewHosts`, `appendPreviewHosts`, `deletePreviewHosts` |

Behavior notes from the SDK's own doc comments:

- `getPreview` returns `null` until the preview is ready. Poll it.
- `sendAsync` returns right away with the assistant message ID. Poll that
  message and check `finishReason`.
- `downloadFiles` returns the source as a ZIP.
- `deploy` triggers a Vercel deployment and creates a Vercel project if one
  doesn't exist. **That's outward-facing: confirm with the user first.**
- `createFromRepo` creates a chat from a GitHub repo. It links an existing
  Vercel project or creates a new one.

### Streaming

From the SDK's `examples/basic/chats/stream.ts`:

```ts
import { createV0Client, readV0Stream } from 'v0'

const v0 = createV0Client({ auth: process.env.V0_API_KEY! })

const serverResult = await v0.chats.createStream({
  message: 'Simple hello world button',
})

const result = readV0Stream(serverResult.toResponse())
for await (const update of result.stream) console.log(update)
const final = await result.final
```

### Design Mode (advanced)

`createDesignModeBridge` from `v0/browser` connects a host app's iframe to
the Design Mode runtime in v0's proxied previews. `parseDesignModeMessage`
(server) forwards edits to `messages.send`. Generation credits apply.
Read the SDK README before building this, because it needs the preview
proxy set up.

## Guardrails

- Don't promise what v0 will generate. Show the actual preview.
- Code pulled from v0 into this repo is new code. Review it like any
  other change: dependencies, Tailwind version, conventions and secrets.
- If the user wants plans, pricing or rate limits, point them to
  https://v0.app/docs. This skill doesn't carry those numbers because they
  change.

## Sources

Everything above was verified against these sources:

- `vercel/v0-sdk` on GitHub, read 2026-11-12 (Apache-2.0):
  - Root `README.md` and `packages/v0-sdk/README.md` (install, usage,
    auth, Design Mode, the key-exposure warning).
  - `packages/v0-sdk/package.json` (`v0` 4.0.0).
  - `src/generated/sdk.gen.ts` (namespaces, methods and doc comments).
  - `src/generated/client.gen.ts` (base URL).
  - `examples/basic/chats/stream.ts`.
- npm registry: `v0` `latest` = 4.0.0, and `v0-sdk` = 0.16.7.
- MCP endpoint, OAuth flow and the no-API-key rule:
  https://v0.app/docs/api/v2/guides/mcp-server, read through search
  results. v0.app was not reachable from the build environment, so this
  wasn't fetched directly.
- Vercel's separate MCP server: https://vercel.com/docs/agent-resources/vercel-mcp
  (search result).
