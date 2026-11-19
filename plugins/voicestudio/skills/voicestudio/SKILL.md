---
name: voicestudio
description: Install and drive VoiceStudio (voicestudio.sh, GitHub debpalash/VoiceStudio), the AGPL-3.0, fully local ElevenLabs alternative — voice cloning, voice design, video dubbing, dictation, transcription and audiobooks in 646 languages — through its desktop app, OpenAI-compatible local API at http://localhost:3900, its MCP server at /mcp/, or the `voicestudio` terminal command. Use when the user mentions VoiceStudio or "Voice Studio", wants local text-to-speech, voice cloning, dubbing or transcription without a cloud API, or wants Claude to speak in a chosen voice.
---

# VoiceStudio

VoiceStudio is an AGPL-3.0 desktop app plus a headless Python backend that
runs speech models on your own hardware: clone a voice from a clean
reference recording, design a voice from a text description, dub videos
with speech timed to the original, dictate, transcribe, and narrate stories
and audiobooks in 646 languages. The default engine is "VoiceStudio",
powered by k2-fsa/OmniVoice; dozens of other engines are available in the
Model Manager. Everything in the free app runs locally and needs no
account. Pro (a closed-source build with a commercial license, up to three
devices and remote GPU jobs) and Cloud (a hosted API, marked "coming soon"
and "not available yet") are optional.

Repository: https://github.com/debpalash/VoiceStudio (monorepo version
0.5.9-beta.6, Bun 1.4.2, when this skill was written). Website and
installer: https://voicestudio.sh. The backend listens on
`http://localhost:3900` by default (`OMNIVOICE_PORT` changes it).

## Workflow

1. **Is it running?** `curl http://localhost:3900/health`. If that fails,
   launch the installed app, or install it (below). Let the desktop app
   supervise the backend; never start a second one.
2. **Discover, don't assume.** Read `GET /openapi.json` for the running
   version's contracts and `GET /v1/audio/voices` for installed voices and
   engines. Don't invent profile IDs, and don't infer installed models from
   a catalog listing. `GET /models` shows `"installed": true|false` per
   engine model.
3. **Ask before downloading a model.** State its size and license, then
   `POST /models/install` with that entry's `{"repo_id": "…"}` and poll
   `GET /models/install/status`. Stop on a `failed` state; treat an empty
   `jobs` array as finished only once `GET /models` reports installed.
4. **Generate or transcribe** through the MCP tools bundled with this plugin
   (once VoiceStudio is running) or the REST API below.
5. **Verify the output** before reporting it: check the HTTP status, probe
   the file (duration, format) and report the saved path. An error body can
   be written to the output path. Never fabricate a successful generation,
   transcript or job completion.

## Install

Desktop and phone installers are on the latest GitHub release; Docker
images come from GHCR. No GPU? The app is fully usable on the CPU, just
slower. Native GGUF engines can also use Vulkan on AMD, Intel and NVIDIA.

| Platform | Install |
|---|---|
| macOS 13.3+, Apple Silicon (Metal/MPS) | `brew tap debpalash/tap && brew trust --cask debpalash/tap/voicestudio && brew install --cask debpalash/tap/voicestudio`, or `curl -fsSL https://voicestudio.sh/install \| sh`, or the DMG. Intel Macs run the UI only, against a backend on another computer. |
| Windows 10/11 x64 (CUDA, opt-in ROCm, CPU) | `irm https://voicestudio.sh/install.ps1 \| iex`, or the `.exe`. Windows on ARM is experimental (x64 backend under emulation). |
| Linux x64 (CUDA, CPU, Vulkan for GGUF engines) | `curl -fsSL https://voicestudio.sh/install \| sh`; Arch `yay -S voicestudio-bin`; Debian/Ubuntu `sudo apt install ./VoiceStudio-*-linux-x64.deb`; Snap `sudo snap install voicestudio` then `sudo snap connect voicestudio:audio-record`; AppImage `chmod +x VoiceStudio-*-linux-x64.AppImage && ./VoiceStudio-*-linux-x64.AppImage`; Nix `nix develop .#fhs && bun run dev` from a checkout. |
| Docker (headless backend: CPU, CUDA, ROCm) | See below. |
| Android 10+ / iOS 17+ | Preview builds on the release page; on-device and offline after model download. |

Installer flags: `-- --version X.Y.Z` for a specific release, `-- --main`
to build current main, `-- --uninstall` to remove the app and keep data.
If voicestudio.sh is unreachable, the same script lives at
`https://raw.githubusercontent.com/debpalash/VoiceStudio/main/scripts/install.sh`.
On macOS, "VoiceStudio is damaged and can't be opened" is Gatekeeper, not a
broken download; the macOS install guide has the fix.

**Docker (CPU, Bash):**

```sh
export OMNIVOICE_API_KEY="$(openssl rand -hex 32)"
docker run -d --name omnivoice \
  -p 127.0.0.1:3900:3900 \
  -e OMNIVOICE_API_KEY \
  -e OMNIVOICE_DATA_DIR=/app/omnivoice_data \
  -v omnivoice-data:/app/omnivoice_data \
  ghcr.io/debpalash/voicestudio:stable
printf 'API key: %s\n' "$OMNIVOICE_API_KEY"
```

Open http://localhost:3900 and use the printed key. `docs/install/docker.md`
covers NVIDIA, AMD ROCm and Compose; a Docker Hub mirror is
`palashdeb/omnivoice-studio:stable`. Docker is the headless backend, not
the desktop app.

**From source:** `git clone https://github.com/debpalash/VoiceStudio.git &&
cd VoiceStudio && bun run dev`. That installs the JavaScript and, for a
supported local backend, the Python dependencies before launching Electron;
`bun run setup:api` rebuilds only the Python environment. Upgrading from
0.5.3 or older (the archived Tauri app)? Install the new app separately per
`docs/electron-migration.md`; never install or launch the Tauri app.

**Install with a coding agent.** The README's prompt is:

```text
Install the VoiceStudio app on this device and verify it works, following
https://github.com/debpalash/VoiceStudio/blob/main/docs/install/agent.md
```

That guide's rules: install the Electron app; reuse existing data, settings
and models; ask before any model download; leave the first-run analytics
consent to the user; verify the actual compute device rather than assuming
GPU support; name any step you can't perform instead of skipping it; and
finish by generating a short clip with a bundled or authorized voice and
reporting version, engine, device, data location and output path.

## Local API (OpenAI-compatible plus native)

Discover capabilities first:

```bash
curl http://127.0.0.1:3900/.well-known/voicestudio-speech   # returns voicestudio.speech.v1 with relative URLs
```

Generate speech (replace `voice` with a discovered profile ID when the user
chose a voice):

```sh
cat > speech-request.json <<'JSON'
{"model":"tts-1","voice":"alloy","input":"Every voice has a story. Let's tell yours.","response_format":"wav"}
JSON
curl --fail-with-body --show-error http://localhost:3900/v1/audio/speech \
  -H 'Content-Type: application/json' --data-binary @speech-request.json \
  --output speech.wav
```

`tts-1` and `tts-1-hd` are aliases, not quality guarantees, and OpenAI voice
names are compatibility aliases, not those providers' voices. Prefer a
discovered saved voice for repeatable narration.

Transcribe:

```sh
curl --fail-with-body --show-error http://localhost:3900/v1/audio/transcriptions \
  -F file=@clip.wav -F model=whisper-1 -F response_format=verbose_json
```

Use `json` or `text` for plain transcripts, `verbose_json` for timestamps,
`srt`/`vtt` for subtitles when the running schema supports them. Cloning,
design, dubbing and long-form jobs use the native endpoints in
`/openapi.json`; they are broader than the OpenAI-compatible surface and
evolve independently. For async work use the returned job IDs and the
documented status endpoints; don't blindly resubmit timed-out generations.

A dependency-free Python bridge ships in the repo for hooks and TUIs:
`python -m backend.speech_client capabilities` and
`python -m backend.speech_client transcribe recording.wav`. It targets
`VOICESTUDIO_URL`, else the loopback backend on `OMNIVOICE_PORT`, and sends
`OMNIVOICE_API_KEY` as a bearer key when set. Local configurations may
allow unauthenticated calls; protected deployments require the configured
credentials. Treat 401/403 as authentication failures, never as permission
to disable auth, and never print tokens. The old Tauri control server on
port 3902 is retired; 3902 is now the Electron development server's port.

## MCP server (bundled)

The backend mounts an MCP server at `/mcp/`, so there is nothing extra to
start once VoiceStudio is open. This plugin's `.mcp.json` points Claude Code
at `http://localhost:3900/mcp/` (keep the trailing slash: it works on every
version, while bare `/mcp` returned HTTP 405 on older Docker and source
builds) and sends `X-OmniVoice-Client-Id: claude-code`. If VoiceStudio
isn't running, the server simply fails to connect; nothing else breaks.
Use the backend's real port if you moved it with `OMNIVOICE_PORT`.

| Tool | What it does |
|---|---|
| `generate_speech` | Text to WAV by default, with the agent-bound voice unless `profile_id` is given; `format="ogg"` or `"opus"` (Opus in Ogg) in `files` or `both` output mode |
| `clone_voice` | Reference audio (base64, or `ref_audio_path` under the base path) → new voice profile; returns a `profile_id` |
| `describe_voice` | Maps free text to design attributes (gender, age, pitch, style, accent) and reports unmapped words, saving nothing |
| `design_voice` | Creates a design profile from a description and returns its `profile_id` |
| `transcribe` | Audio (base64, or `audio_path` under the base path) → text, 646 languages |
| `list_voices`, `list_personalities`, `list_languages` | Enumerate what's available |
| `check_health` | Backend status and active GPU device |

Resources: `voice://{profile_id}` and `history://recent` (at most 20
items). `list_voices`, `list_personalities`, `transcribe`, `check_health`
and both resources return JSON-encoded text; parse it with a JSON parser.
A missing voice returns a JSON object with an `error` message.

**Per-agent voices.** The `X-OmniVoice-Client-Id` header (e.g.
`claude-code`, `codex-cli`, `hermes`) binds a client to a saved voice in
the desktop app's per-agent voice settings. The app's **Integrations** page
exports ready-made configs for Claude Code (`.mcp.json`), Cursor, Codex CLI
and a generic Streamable HTTP + stdio card. Codex CLI's exported table is:

```toml
[mcp_servers.voicestudio]
url = "http://127.0.0.1:3900/mcp/"
http_headers = { "X-OmniVoice-Client-Id" = "codex-cli" }
```

**Keep audio out of context.** Set these on the backend's environment (the
launcher, a service file, Docker `-e`), or on the server entry's `env` when
running `python -m backend.mcp_server` standalone:

| Variable | Values | Effect |
|---|---|---|
| `OMNIVOICE_MCP_OUTPUT_MODE` | `resources` (default), `files`, `both` | `resources` returns `wav_base64` inline; `files` returns an `audio_url` (served at `/audio/<audio_id>.<format>`) and, with a base path, an `output_path` instead |
| `OMNIVOICE_MCP_TIMEOUT_S` | seconds | How long a tool waits on the backend; unset, it follows the backend's own timeouts plus 30 s, never less than 120 s |
| `OMNIVOICE_MCP_BASE_PATH` | a directory | The security boundary for file inputs and outputs; relative paths resolve inside it, symlinks are resolved before the check |

The base path must be visible to both the backend and the agent; in
separate containers, mount one shared directory at the same path in both.
Compressed formats need ffmpeg on the backend.

**Permissions and remote agents.** The local HTTP connection allows
consumption tools (including clone and design profile creation) without an
administrator key; editing, deleting or importing saved content needs
administrator access (`docs/api-auth.md`). For agents on another machine,
turn on **Settings → Sharing → Local network**, use the shown LAN address
and share port with `/mcp/`, and send the access PIN as `X-OmniVoice-Pin`.
Plain HTTP sends the PIN and traffic unencrypted, so do that only on a
trusted LAN; otherwise use an encrypted tunnel or HTTPS. In n8n, containers
or other hosts, remember that `localhost` means that container.

## Terminal command and upstream skills

`voicestudio` opens the desktop app; `voicestudio --help` shows the command
tree and `voicestudio version` reports the installed version offline. Lists
print as tables, or as tab-separated rows when piped
(`voicestudio voices list | cut -f2`); `--json` gives raw machine-readable
output with errors on stderr. Exit codes: `0` success, `1` failure, `2`
invalid usage, `3` from `status` when VoiceStudio is not running.
`settings get` with no name shows every setting. The installer adds the
command to your shell profile once; **Settings → General → Terminal
command → Add to terminal** adds it back.

VoiceStudio's own agent skills install with
`npx skills add debpalash/VoiceStudio`: `voicestudio` for audio work and
`voicestudio-maintainer` for the repo. This skill is written from those
files and the docs; prefer upstream's if both are installed.

## Guardrails

- **License and consent.** AGPL-3.0 covers the app, including commercial
  use under its terms. Model weights, voices and generated output have
  their own licences, shown per model in the Model Manager. Clone a voice
  only with its owner's permission. The project prohibits unauthorized
  voice cloning, impersonation, fraud and scams.
- Keep cloud services and analytics opt-in; never answer the consent prompt
  for the user. Don't switch to a hosted provider or download a model
  without authorization.
- Distinguish, on errors: backend unavailable, missing model, unsupported
  capability, authentication, busy hardware. Fix the reported condition.
- For dubbing, keep the original media, speaker assignments, segment timing
  and background-audio intent; translation completion is not rendered-dub
  completion. Make the output a separate artifact.
- Check the installed engine's language and voice-design capabilities
  before promising a result.

## Sources

Everything above was verified against these sources on 2026-11-19:

- `debpalash/VoiceStudio` on GitHub, `main` branch (AGPL-3.0; `LICENSE`
  is the GNU Affero General Public License v3): `README.md` (features,
  platform installers, Docker command, from-source steps, the coding-agent
  prompt, Pro/Cloud, license and disclaimer); `package.json`
  (`omnivoice-studio-monorepo` 0.5.9-beta.6, `license` AGPL-3.0-only,
  `packageManager` bun@1.4.2); `docs/mcp.md` (tools, resources, output
  mode variables, `/mcp/` endpoint, client configs, LAN sharing);
  `docs/install/agent.md` (agent install rules and verification steps);
  `docs/install/script.md` (installer flags and the `voicestudio` terminal
  command); `docs/speech-platform.md` (capabilities discovery, the Python
  bridge, the retired port 3902); `skills/voicestudio/SKILL.md` (the REST
  examples, discovery rules and error handling).
- GitHub repository metadata from the search API: 113,633 stars, last push
  2026-11-18, homepage https://voicestudio.sh.
- Not verified here: `docs/install/docker.md` (GPU variants), `docs/api-auth.md`,
  and the engine catalog; they are cited by path only.
