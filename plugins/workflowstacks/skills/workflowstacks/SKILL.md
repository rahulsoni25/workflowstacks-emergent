---
name: workflowstacks
description: Find and install open-source AI tools and skills for any task. Use when the user asks for a tool, skill, integration, or automation they don't have yet — search the WorkflowStacks catalog, load the best match's instructions, and offer to save it to their library.
---

# WorkflowStacks catalog

WorkflowStacks is a free marketplace of 2,000+ open-source AI skills, MCP
servers, and agent tools curated from GitHub. This plugin connects it as an
MCP server, so the catalog is searchable from inside the conversation.

## When to use

- The user wants a capability you don't currently have (scrape a site,
  transcribe audio, drive a desktop app, automate ads reporting…).
- The user asks "is there a tool/skill for X?"
- The user wants to build an agent and needs building blocks.

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

## Notes

- Every listing is open source; the skill text includes the upstream repo
  for attribution and deeper reading.
- Full browsable catalog: https://workflowstacks.com/skills
