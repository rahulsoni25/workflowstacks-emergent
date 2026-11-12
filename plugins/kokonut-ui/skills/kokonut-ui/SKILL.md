---
name: kokonut-ui
description: Add and customize Kokonut UI components (kokonutui.com), an MIT-licensed shadcn/ui registry of animated React + Tailwind CSS v4 + Motion components — AI chat UI (prompt input, tool approval, model selector), buttons, cards, inputs, navigation, text effects and backgrounds. Installs via the shadcn CLI and the shadcn MCP server. Use when the user mentions Kokonut UI or @kokonutui, or wants a ready-made animated component (AI input, particle button, bento grid, smooth drawer, typewriter text, animated background) in a React/Next.js project.
---

# Kokonut UI

Kokonut UI is an MIT-licensed **shadcn/ui registry**. Its components are
built with Tailwind CSS, shadcn/ui and Motion. You install a component's
source into the project with the shadcn CLI, and from then on the project
owns that code.

## Connected tools

This plugin connects the **shadcn MCP server** (`npx shadcn@latest mcp`).
That's the server Kokonut UI's own Agents page recommends for Claude Code.
It lists, searches and installs components from every registry in the
project's `components.json`, so the `@kokonutui` entry below must exist
first.

- If `/mcp` doesn't show `shadcn` as connected, use the CLI commands below
  directly. They do the same thing.

## Workflow

1. **Check the prerequisites.**
   - React or Next.js with **Tailwind CSS v4**. The current components are
     styled for v4. Read `package.json`. If the project is on Tailwind v3,
     **stop and tell the user**. Components may need class fixes, or the
     project needs the Tailwind v4 upgrade. Don't silently install.
   - A `components.json` (shadcn). If it's missing, run
     `npx shadcn@latest init`.
2. **Register the namespace** in `components.json`. Keep any registries
   that are already there.
   ```json
   {
     "registries": {
       "@kokonutui": "https://kokonutui.com/r/{name}.json"
     }
   }
   ```
3. **Install the `cn` helper** the components use, if the project doesn't
   have it:
   `npx shadcn@latest add https://kokonutui.com/r/utils.json`
4. **Pick the component.**
   - Use `references/components.md` for the slug list, which was a snapshot
     when this skill was written.
   - The live index is https://kokonutui.com/llms.txt.
   - Any docs page is also available as Markdown with full source: add
     `.md` to its URL, e.g. `https://kokonutui.com/docs/buttons/particle-button.md`.
5. **Install. Never paste code by hand.**
   ```bash
   npx shadcn@latest add @kokonutui/<name>
   ```
   - Alternatives:
     `npx shadcn@latest add https://kokonutui.com/r/<name>.json`, or straight
     from GitHub: `npx shadcn@latest add kokonut-labs/kokonutui/<name>`.
   - The CLI writes `components/kokonutui/<name>.tsx` and installs the
     dependencies, such as `motion`, `lucide-react` and shadcn/ui
     primitives.
   - Use the project's package-manager runner (`npx`, `pnpm dlx` or
     `bunx --bun`).
6. **Use it.** The README example:
   ```tsx
   import AIToolApproval from "@/components/kokonutui/ai-tool-approval";

   export default function Page() {
     return <AIToolApproval />;
   }
   ```
7. **Edit in place.** Installed components are project code. Edit them
   directly instead of wrapping them.
8. **Check the result:**
   - Keyboard access and labels.
   - Mobile overflow.
   - Reduced motion. If the project uses Motion, a root
     `<MotionConfig reducedMotion="user">` covers Motion-driven components.

## Rules

- Before building an animated or interactive component from scratch, check
  whether Kokonut UI already has one.
- **Kokonut UI Pro** (kokonutui.pro) is paid. It adds premium components,
  blocks and Next.js templates, and installs through the same CLI. Some
  docs pages are Pro-only previews: `audio-player-card`,
  `dither-reveal-hero`, `image-generation-card`, `kinetic-type-hero`,
  `onboarding-checklist`, `pay-button`, `price-range`, `rhythm-hero`,
  `slash-command-menu` and `swatch-fan`. Don't try to install those from
  the free registry, and don't recreate their source.
- If the project's import alias isn't `@/`, adapt the import paths.
- Optional: offer to add Kokonut's short rules block to the project's
  `CLAUDE.md` / `AGENTS.md`, so future sessions check the registry first.
  Only add it if the user agrees.

## Sources

Everything above was verified against these sources:

- `kokonut-labs/kokonutui` on GitHub, read 2026-11-12 (MIT):
  - `README.md` (quick start, install paths, Pro, MCP).
  - `content/docs/index.mdx` (Tailwind CSS v4, `cn` helper, install
    location).
  - `content/docs/agents.mdx` and `lib/agents.ts` (shadcn MCP config for
    Claude Code `.mcp.json`, the `utils.json` step, the rules text, and
    `/llms.txt` and `.md` endpoints).
  - `registry/registry-components.ts` (116 free slugs).
  - Docs pages marked "Part of Kokonut UI Pro".
