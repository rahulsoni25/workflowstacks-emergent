# Homepage cheat codes

The homepage section "Secret codes for the AI tools you already use"
(`components/CheatCodes.js`, anchor `/#cheat-codes`) lists shortcuts,
prefixes and commands for Claude Code, Claude Cowork, Google Antigravity and
OpenAI Codex. The data is `lib/cheat-codes.js`. A scheduled Claude task
refreshes it daily by following **Daily refresh** below and opening a pull
request. A person merges it, and it goes live with the Monday release.

## The accuracy rules

Visitors copy these into real tools, so a wrong code is worse than a missing
one.

1. **Official sources only.** Each tool's sources are listed below. No blogs,
   Reddit, X, YouTube, newsletters, other cheat-sheet sites, or memory. If
   only an unofficial source mentions a code, leave it out.
2. **Every entry has `proof`**: one or more snippets copied verbatim from the
   fetched source page, long enough to be unambiguous (aim for 6+ words).
   Never paraphrase a proof. `npm run check-cheat-codes` must find every one.
3. **`does` says only what the source says.** Plain English for a
   non-developer, one sentence, no claims the proof doesn't support. If the
   source limits it (Mac only, desktop app only, a plan, a mode), say so in
   `where` or `note`.
4. **Generally available only.** Skip anything behind a feature flag, marked
   experimental or preview, admin-only, enterprise-only, or "not available to
   new users". Skip bug fixes, settings-file keys, and SDK/API-only features.
5. **Removed or renamed beats new.** A code that stopped working is fixed or
   deleted before anything is added.

## Official sources per tool

| Tool | Changelog (what's new) | Pages to verify against |
|---|---|---|
| Claude Code | `CHANGELOG.md` in anthropics/claude-code | `https://code.claude.com/docs/en/<page>` (append `.md` to read the text): `interactive-mode`, `commands`, `cli-reference`, `common-workflows`, `model-config`, `permission-modes`, `keybindings` |
| Claude Cowork | `https://claude.com/docs/cowork/changelog` (Claude Desktop release notes; read the General and Cowork parts) | `support.claude.com` help articles about Cowork, or the changelog entry itself when no help article covers it |
| Antigravity | `https://antigravity.google/docs/changelog/` (App, CLI and IDE streams on one page) | `https://antigravity.google/docs/...`, e.g. `slash-commands/`, `at-mentions/`, `features/`, `cli/...`, `ide/...` |
| Codex | release tags of github.com/openai/codex, plus the release notes page for each tag | the source files at the pinned tag: `codex-rs/tui/src/slash_command.rs`, `codex-rs/tui/assets/tooltips.txt`, `codex-rs/tui/src/keymap.rs`, `codex-rs/cli/src/main.rs`; `developers.openai.com/codex` when the network allows it |

## Tools

- `npm run check-cheat-codes` fetches every entry's source and confirms each
  proof. Exit 0 means all found. Exit 1 means a proof is missing or the data
  is malformed. Exit 2 means only network failures. It reads `github.com/.../blob/...` links
  from `raw.githubusercontent.com` and code.claude.com pages as `.md`.
- `npm run cheat-codes-changelogs` prints only the changelog entries newer than
  `CHEAT_CODES_SEEN` (and, for Codex, a diff of the files above between the
  pinned tag and the newest stable tag). Its last line, `NEWEST_MARKERS {...}`,
  is what `CHEAT_CODES_SEEN` should become once those entries are handled.

Both need outbound access to the hosts above. In a cloud session, the
environment allows `antigravity.google` explicitly.

## Daily refresh

Run from an up-to-date `main`. Work only in `lib/cheat-codes.js` (plus this
file, if a step here turns out to be wrong).

1. **Preconditions.** If `lib/cheat-codes.js` or
   `scripts/check-cheat-codes.mjs` is missing on `main`, stop: the section
   isn't merged yet. Report that and do nothing else.
2. **Branch.** Use the branch `claude/cheat-codes-refresh`. If an open pull
   request already comes from it, check that branch out and continue on it, so
   one PR collects the unmerged days. Otherwise create it fresh from `main`. A
   force push is fine when the old branch holds only merged work. If you can't
   push to that branch, use the session's own branch, and close the older
   refresh PR as superseded once the new one is open.
3. **Install.** Run `npm ci` if `node_modules` is missing.
4. **Re-check what's there.** Run `npm run check-cheat-codes`. For each FAIL,
   read the source page:
   - renamed or reworded: update `code`, `does` and `proof` to match
   - removed: delete the entry and add it, with the evidence, to the
     "deliberately absent" list in the header comment
   - page moved: find the new official URL and update `source`
5. **Read what's new.** Run `npm run cheat-codes-changelogs`. For Codex, if a
   newer stable tag exists, set `CODEX_TAG` to it, run
   `npm run check-cheat-codes -- codex`, and handle FAILs as in step 4.
6. **Pick candidates.** From the new entries, list things a person types or
   presses: keyboard shortcuts, input prefixes, slash commands, @-mention
   forms, magic keywords, CLI subcommands or flags. Keep the ones a newcomer
   would find useful and wouldn't stumble on, and that pass rule 4. Aim for
   quality over count. Zero is a normal day. At most 3 new per tool per run.
7. **Verify each candidate.** Fetch the tool's current official docs page for
   it (not only the changelog, when a docs page exists) and copy the proof
   text from what you fetched. If the docs contradict the changelog, trust the
   docs or leave it out.
8. **Add it.** Insert new entries at the **top** of the tool's `codes` list
   with `added: '<today YYYY-MM-DD>'`, so they show first with a "New" badge.
   A tool holds at most 18 codes. Past that, remove the least useful older
   entry and say which in the PR.
9. **Markers and date.** Set `CHEAT_CODES_SEEN` to the `NEWEST_MARKERS`
   values, and `CHEAT_CODES_CHECKED` to today. Do this only in a run that
   commits other changes too. A run that changes nothing commits nothing.
10. **Check.** `npm run check-cheat-codes` must exit 0 (or 2 when the only
    unreachable host is `developers.openai.com`). `npm run cost-guard` must
    pass.
11. **Commit, push, PR.** Commit only when something changed. Open a PR from
    the branch, or update the open one, with a body that has:
    - a table: Change (added/updated/removed) | Tool | Code | What it does |
      Source | Proof quote
    - candidates you rejected and why, one line each
    - the checker's output line
    - "Reviewer: open two or three Source links before merging."
12. **Never** merge, enable auto-merge, put `[deploy]` in a commit message, or
    edit any other part of the site.

If nothing changed: no commit and no PR. End with one line saying the
changelogs were read up to which markers and nothing qualified.
