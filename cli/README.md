# workflowstacks CLI

Terminal installer for [WorkflowStacks](https://workflowstacks.com) skills.

```bash
npx workflowstacks add cli-anything        # → ~/.claude/skills/cli-anything/SKILL.md
npx workflowstacks add cli-anything --project   # → ./.claude/skills/ (this repo only)
npx workflowstacks mcp                     # print the MCP connector command
```

Zero dependencies, Node 18+.

## Telemetry

A successful `add` is counted anonymously — the skill slug and the channel
`cli`, nothing else (no machine id, no path, no email). It is the same event
the website's install buttons send, so the stats can compare channels. The
CLI says so once, on first use.

Opt out with `WORKFLOWSTACKS_NO_TELEMETRY=1` (the `DO_NOT_TRACK=1` convention
is honoured too). A failed or slow count never affects the install.

## Publishing (maintainers)

```bash
cd cli && npm publish
```
