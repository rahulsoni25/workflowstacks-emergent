---
name: openwhispr
description: Install and use OpenWhispr (openwhispr.com, GitHub OpenWhispr/openwhispr), the MIT-licensed, privacy-first voice-to-text dictation and meeting-notes app — local Whisper, Parakeet, Orukeet or Cohere models, or BYOK cloud — and work with its notes, transcriptions, dictionary and snippets through the hosted OpenWhispr MCP server (OAuth), the REST API at api.openwhispr.com, or the `openwhispr` CLI. Use when the user mentions OpenWhispr, wants a free Wispr Flow or Granola alternative, or wants Claude to read or write their dictation notes and meeting transcripts.
---

# OpenWhispr

OpenWhispr turns your voice into text, notes and actions from your desktop.
Press a hotkey, speak, and the words appear at your cursor. Transcription
can be fully offline with local speech-to-text models (Orukeet, Whisper,
NVIDIA Parakeet, Cohere Transcribe), where audio never leaves the device, or
cloud processing with your own keys. It describes itself as "the
open-source and free alternative to WisprFlow and Granola", MIT-licensed
("free for personal and commercial use"), with "no data collection, no
telemetry". Desktop app version 1.12.0 when this skill was written; stack
React 19, TypeScript, Tailwind CSS v4, Electron 41, better-sqlite3,
whisper.cpp, sherpa-onnx, shadcn/ui.

Features, per the README: voice dictation with automatic pasting;
dictation translation (speak one language, paste another); an AI agent
hotkey that talks to GPT-5, Claude, Gemini, Groq, Tinfoil, OpenRouter or
local models, edits highlighted text in place and can send a screenshot as
context; meeting transcription that auto-detects Zoom, Teams and FaceTime
with live, on-device speaker diarization and voice fingerprinting plus
Google, Microsoft or Apple Calendar integration; notes with folders,
semantic search, cloud sync and AI actions; team spaces and web sharing
(free for signed-in users); audio and video import including YouTube URLs;
GPU-accelerated local Whisper on Metal, CUDA and Vulkan; enterprise
controls (policy, SSO, SCIM, Bedrock or Azure OpenAI without distributing
keys); and a public API plus MCP server.

Repository: https://github.com/OpenWhispr/openwhispr. Docs:
https://docs.openwhispr.com.

## Install

| Platform | Package |
|---|---|
| macOS (Apple Silicon or Intel) | `.dmg` from the latest GitHub release, or `brew install --cask openwhispr` (community-maintained cask, macOS and x86_64 Linux) |
| Windows | `.exe` |
| Linux | `.AppImage`, `.deb`, `.rpm` or `.tar.gz` |

On Intel Macs, live speaker identification and voice fingerprinting are
unavailable (ONNX Runtime stopped shipping macOS x86_64 binaries in 1.24);
meetings still record and transcribe, and notes search falls back to
keyword matching.

From source (Node.js 24+):

```bash
git clone https://github.com/OpenWhispr/openwhispr.git
cd openwhispr
npm install
npm run dev
```

That runs the desktop app at the repository root. The Expo mobile app lives
in `openwhispr-mobile/` with its own dependencies, lockfile and release
process. Platform guides, build details and troubleshooting are at
https://docs.openwhispr.com/quickstart. An example custom ASR shim for
self-hosted transcription against non-OpenAI-compatible ASR APIs is in
`examples/custom-asr-shim/`.

## Hosted MCP server (bundled)

This plugin's `.mcp.json` connects `openwhispr` at
`https://mcp.openwhispr.com/mcp`, the same endpoint as OpenWhispr's own
Claude plugin. It exposes your notes, folders, transcriptions, dictionary,
snippets and usage stats.

- **Claude (web, desktop, mobile):** Customize → Connectors → Add custom
  connector, paste `https://mcp.openwhispr.com/mcp`, sign in and approve.
  No API key; Claude gets a short-lived scoped token that it refreshes.
- **Claude Code:** run `/mcp` and sign in with your OpenWhispr account, or
  register it with an API key instead of OAuth:

  ```bash
  claude mcp add openwhispr --transport http https://mcp.openwhispr.com/mcp \
    --header "Authorization: Bearer owk_live_YOUR_KEY"
  ```

- **Cursor / VS Code:** `{"mcpServers": {"openwhispr": {"url":
  "https://mcp.openwhispr.com/mcp", "headers": {"Authorization": "Bearer
  owk_live_YOUR_KEY"}}}}` in their MCP config.

API keys come from the desktop app under **Settings → API Keys** and start
with `owk_live_`. An agent without the desktop app can create its own key:
`POST https://api.openwhispr.com/api/v1/auth/email-code` with
`{"email": "..."}`, then `POST .../auth/email-code/verify` with the 6-digit
code, then `POST .../keys/create` with `Authorization: Bearer owt_...` and
`{"name": "My Agent", "scopes": ["notes:read", "notes:write", ...]}`.

| Tool | Scope |
|---|---|
| `list_notes`, `get_note`, `search_notes` (semantic + full text), `list_folders`, `get_note_transcript` | `notes:read` |
| `create_note`, `update_note`, `delete_note`, `create_folder` | `notes:write` |
| `list_transcriptions`, `get_transcription` | `transcriptions:read` |
| `transcribe_audio` (beta: clips up to 3 MB in wav, mp3, m4a, ogg, flac or webm; Pro or Business plan; 600 minutes/month) | `transcriptions:write` |
| `list_dictionary` / `add_dictionary_words`, `update_dictionary_word`, `delete_dictionary_word` | `dictionary:read` / `dictionary:write` |
| `list_snippets` / `create_snippet`, `update_snippet`, `delete_snippet` | `snippets:read` / `snippets:write` |
| `get_usage` | `usage:read` |

OAuth clients ask for scopes when they connect (Claude asks for all of
them). With an API key, create it with only the scopes you need. OAuth
access tokens expire after an hour and refresh while in use; a connector
unused for 30 days stops working. Revoke keys under Settings → API Keys.
For longer files than the beta limit, use the CLI, which can transcribe
locally for free.

The assistant sees what is saved to the OpenWhispr account. Turn on
**Settings → Privacy & Data → Cloud backup** (paid plans) so notes, meetings
and dictation history are included; anything kept only on the device stays
there.

**OpenWhispr's own Claude plugin** adds six skills on top of the same
connector: meeting recap, ask my notes, dictionary builder, snippet
builder, weekly review, and transcribe a recording (runs the CLI locally).

```
/plugin install openwhispr --marketplace OpenWhispr/openwhispr-plugin
```

Then connect with `/mcp`. Skills run as `/openwhispr:meeting-recap`,
`/openwhispr:weekly-review` and so on. If you already added the connector,
the plugin reuses it.

## REST API v1

Base URL `https://api.openwhispr.com/api/v1`; every request sends
`Authorization: Bearer <key>`. Two kinds of key: **personal** (`owk_live_`,
Settings → API Keys) for your own notes, folders and transcriptions, and
**workspace** (`ow_wks_live_`, Settings → Workspace → Developer, admin only)
for a workspace's team spaces. Workspace keys must pass a `space_id` to
`list`, `create` and `search` for notes and folders (personal keys must
not); operations addressed by note id resolve the space automatically;
`GET /spaces/list` discovers reachable spaces. Workspace scopes are
`workspace:notes:read|write`, `workspace:folders:read|write`,
`workspace:transcriptions:read` (space discovery only for now) and
`workspace:*`.

Responses are enveloped: `{ "data": {...} }`, paginated lists as
`{ "data": [...], "has_more": true, "next_cursor": "..." }` (pass
`next_cursor` back verbatim as `cursor`; never parse it), errors as
`{ "error": { "code": "...", "message": "..." } }` with codes
`validation_error` (400), `invalid_api_key` (401), `forbidden` (403),
`not_found` (404), `method_not_allowed` (405), `conflict` and
`note_version_conflict` (409), `rate_limited` (429, read `Retry-After`),
`internal_error` (500). Rate limits per key: Free 30/minute and
1,000/day, Pro 120 and 10,000, Business 300 and 50,000; search requests
cost 5x. Headers `X-RateLimit-Limit`, `X-RateLimit-Remaining` and
`X-RateLimit-Reset` are on every response. Full reference:
https://docs.openwhispr.com/api/overview, and the repo's
`agent-skills/openwhispr-api/SKILL.md`.

## CLI

```bash
npm install -g @openwhispr/cli      # Node.js 20+; verify with `openwhispr --version`
openwhispr auth login               # remote backend: prompts for an API key, stores it 0600 in ~/.openwhispr/cli-config.json
openwhispr auth status
```

Every command runs against one of two backends with identical behavior:
**local** (the running desktop app's loopback bridge on 127.0.0.1, read
from `~/.openwhispr/cli-bridge.json`; authoritative during or right after a
recording) or **remote** (`https://api.openwhispr.com/api/v1`). Resolution
order: `--local`/`--remote` flag, `OPENWHISPR_BACKEND` (`local`, `remote`,
`auto`), the `backend` key in `~/.openwhispr/cli-config.json`, then
auto-detect.

```bash
openwhispr notes list [--folder <id>] [--limit N] [--format json|table]
openwhispr notes get <id> [--format json|markdown]
openwhispr notes create --content <text> | --content-file <path> [--title <t>] [--folder <id>]
openwhispr notes update <id> [--content <t>] [--folder <id>] [--title <t>]
openwhispr notes delete <id> [--dry-run] [--format json]
openwhispr notes search <query> [--limit N] [--format json|table]
openwhispr folders list | folders create --name <name> [--sort-order <n>]
openwhispr transcriptions list | get <id> [--format json|text] | delete <id> [--dry-run]
openwhispr audio delete <transcription-id>
```

Output is human-readable on a TTY and JSON when piped; pass `--format json`
when parsing. Exit codes: `0` success, `1` user error, `2` backend
unreachable, `3` auth failure or missing scope (don't retry; surface it),
`4` not found. SRT/VTT export isn't exposed by the CLI; post-process
`--format json`. In local mode audio stays on the machine; in cloud mode
the audio (not its path) is uploaded to `api.openwhispr.com`.

## Guardrails

- Change or delete notes, dictionary words or snippets only when asked, and
  confirm before replacing or deleting anything. Use `--dry-run` first.
- Never paste an `owk_live_`, `ow_wks_live_` or `owt_` token into chat or
  a committed file; create keys with the smallest scope set.
- Don't fabricate transcripts or meeting decisions; quote the note or
  transcription and name its date.
- Search costs 5x against the rate limit; batch questions rather than
  firing many small searches.

## Sources

Everything above was verified against these sources on 2026-11-19:

- `OpenWhispr/openwhispr` on GitHub, `main` branch (MIT; `LICENSE` reads
  "MIT License, Copyright (c) 2024 OpenWhispr Team"): `README.md`
  (description, downloads, features, quick start, tech stack, license);
  `package.json` (`open-whispr` 1.12.0, `engines.node >=24`);
  `agent-skills/openwhispr-api/SKILL.md` (auth, key types, scopes, team
  spaces, envelope, error codes, rate limits, pagination);
  `agent-skills/openwhispr-cli/SKILL.md` (install, backends, auth,
  commands, output, exit codes).
- `OpenWhispr/openwhispr-mcp` on GitHub (last push 2026-10-23):
  `README.md` (endpoint, setup per client, agent self-setup, tool table,
  scopes, beta limits, token lifetimes); `package.json`
  (`@openwhispr/mcp-server` 1.0.0).
- `OpenWhispr/openwhispr-plugin` on GitHub (MIT, last push 2026-11-12):
  `README.md`, `.mcp.json` (`https://mcp.openwhispr.com/mcp`),
  `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`.
- GitHub repository metadata from the search API: `OpenWhispr/openwhispr`
  11,851 stars, last push 2026-11-19, homepage https://openwhispr.com.
- Not verified here: docs.openwhispr.com pages (cited by URL only) and the
  CLI's current npm version beyond the plugin README's "0.3.0 or later".
