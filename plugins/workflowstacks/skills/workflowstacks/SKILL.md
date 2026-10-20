---
name: workflowstacks
description: Find and install open-source AI tools and skills for any task. Use when the user asks for a tool, skill, integration, or automation they don't have yet — search the WorkflowStacks catalog, load the best match's instructions, and offer to save it to their library.
---

# WorkflowStacks catalog

WorkflowStacks is a free catalog of open-source AI skills, MCP servers, and
agent tools curated from GitHub. Its MCP connector makes the catalog
searchable from inside the conversation; without the connector, the same
catalog is readable over plain HTTPS (see "Without the connector").

## When to use

- The user wants a capability you don't currently have (scrape a site,
  transcribe audio, drive a desktop app, automate ads reporting…).
- The user asks "is there a tool/skill for X?"
- The user wants to build an agent and needs building blocks.

## Setup

Check whether the `search_skills` tool is available. If it is, skip to
"How to work". If it isn't, offer to add the connector — a remote MCP server
at `https://workflowstacks.com/api/mcp`:

- Claude Code: `claude mcp add --transport http workflowstacks https://workflowstacks.com/api/mcp`
- claude.ai: add it as a custom connector (Settings → Connectors) with that URL.
- Cursor, VS Code, Windsurf and other MCP clients: add it as a remote (HTTP)
  MCP server with that URL.

If the user would rather not add a connector, or their tool can't, use
"Without the connector" below.

## How to work

1. Call `search_skills` with the user's task in plain words.
2. Pick the best result (stars and category help) and call `get_skill` with
   its slug — then follow the loaded instructions for the user's task.
3. If it fits well, offer to save it with `install_skill` so
   `list_my_skills` can recall it in future conversations (requires the
   connected/OAuth session; on anonymous connections just note the skill's
   page URL instead).
4. For tools that need local installation, the loaded skill includes install
   options — walk the user through them, asking for anything only they can
   provide (API keys, paths) rather than guessing.

## Without the connector

1. Fetch `https://workflowstacks.com/llms-full.txt`. It lists the catalog's
   most popular skills, one per entry: a name linking to the skill's page, a
   one-line description, and a `skill_md:` URL.
2. Pick the entry that best matches the user's task.
3. Fetch its `skill_md:` URL — it returns a ready-to-use SKILL.md — and follow
   it for the user's task. Append `?format=zip` for a package the user can
   upload to the Claude app.
4. If nothing in the list fits, say so and point the user to
   https://workflowstacks.com/skills to search the full catalog rather than
   guessing a URL.

## Notes

- Every listing is open source; the skill text includes the upstream repo
  for attribution and deeper reading.
- Full browsable catalog: https://workflowstacks.com/skills
