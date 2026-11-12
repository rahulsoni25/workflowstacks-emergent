---
name: magic-ui
description: Add and customize Magic UI components (magicui.design), an MIT-licensed shadcn/ui registry of animated React + Tailwind components — Backlight glow, marquee, globe, blur-fade, shimmer/shiny/rainbow buttons, border-beam, number-ticker, particles, grid and dot patterns, text animations. Uses the official Magic UI MCP server. Use when the user mentions Magic UI, @magicui, "backlight"/"backlit" glow effects, or wants an animated landing-page section (hero, logo marquee, testimonials, CTA) in a React/Next.js project.
---

# Magic UI

Magic UI ("UI Library for Design Engineers") is an MIT-licensed **shadcn/ui
registry** of animated components. You install a component's source into
the project with the shadcn CLI, and from then on the project owns that
code.

## Connected tools

This plugin connects the **official Magic UI MCP server**
(`npx -y @magicuidesign/mcp@latest`), which gives the agent access to all
Magic UI components.

- If `/mcp` doesn't show it connected, the shadcn CLI commands below work
  without it.
- An alternative the Magic UI docs also document: the shadcn MCP server
  (`npx shadcn@latest mcp`) plus the `@magicui` registry in
  `components.json`.

## Workflow

1. **Define the outcome:** section type, tone, how much motion, and
   responsive behavior. Start with one core component plus one supporting
   effect, and don't stack several high-motion effects in one viewport.
2. **Check the prerequisites.**
   - React or Next.js with Tailwind CSS. The **current Magic UI targets
     Tailwind CSS v4**.
   - If `package.json` shows Tailwind v3, tell the user. The Tailwind v3
     versions live at https://v3.magicui.design, and the upgrade path is
     https://ui.shadcn.com/docs/tailwind-v4. Let them choose.
   - shadcn must be initialized (`components.json`). If it's missing, run
     `npx shadcn@latest init`.
3. **Register the namespace** in `components.json`. Keep any registries
   that are already there.
   ```json
   {
     "registries": {
       "@magicui": "https://magicui.design/r/{name}.json"
     }
   }
   ```
4. **Install:**
   ```bash
   npx shadcn@latest add @magicui/<component-slug>
   ```
   Slugs are listed in `references/components.md`, a snapshot from when
   this skill was written. Live docs: https://magicui.design/docs/components.
5. **Integrate.**
   - Import from the generated path, usually `@/components/ui/<slug>`.
   - Customize through props and `className`. Don't rewrite internals.
   - If the docs list extra dependencies or global CSS keyframes, add them.
6. **Check the result:**
   - Semantic HTML, keyboard access and labels.
   - Mobile overflow.
   - Reduced motion.
   - No needless client-only wrappers.

## Backlight (glow behind media)

`backlight` puts a saturated, blurred glow behind a video, image or SVG.
It uses an SVG `feGaussianBlur` filter, so no extra packages are needed.

```bash
npx shadcn@latest add @magicui/backlight
```

```tsx
import { Backlight } from "@/components/ui/backlight"

<Backlight blur={20} className="rounded-xl">
  <img src="/product.png" alt="Product screenshot" />
</Backlight>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `blur` | `number` | `20` | Blur intensity of the glow |
| `children` | `React.ReactElement` | — | The video, image or SVG to light |
| `className` | `string` | — | Classes for the wrapper div |

## Picking components (Magic UI's own heuristics)

- Social proof and logo rails: `marquee`, `avatar-circles`
- Hero visual impact: `globe`, `warp-background`, `animated-grid-pattern`
- Text animation: `blur-fade`, `text-animate`, `word-rotate`, `sparkles-text`
- CTA emphasis: `shiny-button`, `shimmer-button`, `rainbow-button`
- Ambient backgrounds: `grid-pattern`, `dot-pattern`, `particles`,
  `flickering-grid`, `dither-field`
- Glow or lighting on media: `backlight`. Related: `light-rays`,
  `border-beam`, `shine-border`, `neon-gradient-card`

## Troubleshooting

| Symptom | Fix |
|---|---|
| `components.json` or registry error | Run `npx shadcn@latest init` at the project root |
| `@/` alias doesn't resolve | Use the project's alias style or relative imports |
| Looks wrong after install | Add the global CSS or keyframes from the component's docs |
| Missing package | Install the dependencies listed in the manual-install steps |

## Sources

Everything above was verified against these sources:

- `magicuidesign/magicui` on GitHub, read 2026-11-12 (MIT):
  - `skills/magic-ui/SKILL.md` (workflow, heuristics, troubleshooting).
  - `apps/www/content/docs/mcp.mdx` (MCP server config and the shadcn MCP
    alternative).
  - `apps/www/content/docs/legacy.mdx` (Tailwind v3 legacy site).
  - `apps/www/content/docs/components/backlight.mdx` and
    `apps/www/registry/magicui/backlight.tsx` (Backlight install, usage,
    props and implementation).
  - `apps/www/public/r/*.json` (slug check).

The Backlight usage snippet adds `blur`, `className` and `alt` to the
docs' example. All three are documented props or standard HTML.
