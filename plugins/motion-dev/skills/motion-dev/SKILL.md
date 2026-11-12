---
name: motion-dev
description: Build animations with Motion (motion.dev, formerly Framer Motion) for React, vanilla JS and Vue — motion components, AnimatePresence exit animations, layout and layoutId animations, gestures, scroll-linked effects, springs, reduced motion, and migrating from the `framer-motion` package. Uses Motion's official MCP server to search the current docs. Use when the user mentions Motion, motion.dev, framer-motion, motion/react, or asks to animate React/Next.js UI.
---

# Motion (motion.dev)

Motion is the MIT-licensed animation library formerly called Framer
Motion. It covers React (`motion/react`), vanilla JS (`motion`) and Vue
(`motion-v`). The npm `latest` for both `motion` and `framer-motion` was
14.12.0 when this skill was written. Its peer dependencies are
`react`/`react-dom` `^18.0.0 || ^19.0.0`.

## Connected tools

This plugin connects **Motion's official hosted MCP server**
(`https://mcp.motion.dev`). It's free and needs no API key. The server
searches the full, current Motion documentation and example metadata, and
can generate CSS `linear()` springs.

- Before you use any API you aren't sure about (option names, hook
  signatures, version changes), **search the Motion MCP docs first**. Don't
  rely on memory.
- If the server isn't connected (`/mcp` doesn't list it), say so. Then
  continue using the rules below, which work without it.
- **Motion+** is a paid tier on a second server, `https://mcp.motion.dev/plus`.
  It adds MotionScore performance audits, Motion+ docs, and source code for
  450+ examples and Motion UI components. It's **not** bundled here.
  Mention it once only if the user asks for audits or premium components.
  It can be added with `npx motion-ai --plus`.
- The official installer `npx motion-ai` installs Motion's own skill files
  plus this MCP server into Claude Code and other agents. Suggest it if the
  user wants Motion's full official skill set.

## Workflow

1. **Check what's installed.** Look in `package.json` for `motion`,
   `framer-motion` or `motion-v`.
   - Only `framer-motion` installed: the API is the same. When the user
     wants to modernize, swap imports to `motion/react`, install `motion`,
     then uninstall `framer-motion`. **Never leave both installed.** For
     upgrades across major versions, search the MCP docs for "upgrade" and
     follow the guide in order. Don't summarize it.
   - Nothing installed: `npm install motion`.
2. **Decide between CSS and Motion.** Simple hover and color transitions are
   fine in CSS. Use Motion for exit animations, layout changes,
   interruptible springs, gestures, scroll-linked effects and orchestration.
3. Write the code using the rules below.
4. Add reduced-motion handling if the app doesn't already have it.

## React rules

These come from Motion's official AI Kit best practices.

### Imports

- Import from `motion/react` in client components. **Never** import from
  `framer-motion` in new code.
- In React Server Components, use `import * as motion from "motion/react-client"`.
  This entry only provides `motion` elements. Hooks, `AnimatePresence` and
  `MotionConfig` need a `"use client"` file that imports from `motion/react`.
- The `animate` function: import it from `motion/react` in React files and
  from `motion` elsewhere.
- Other entry points: `motion/mini`, `motion/react-mini` and `motion/react-m`.
  Search the docs before using them.

### Basics

```jsx
"use client"
import { motion, AnimatePresence } from "motion/react"

<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: 8 }}
  transition={{ type: "spring", bounce: 0.2, visualDuration: 0.4 }}
  whileHover={{ scale: 1.03 }}
  whileTap={{ scale: 0.97 }}
/>
```

### `AnimatePresence`

- Keep `AnimatePresence` mounted. Put the condition *inside* it, and give
  each direct child a stable, unique `key`.
- `mode="wait"` finishes the exit before the next child enters. Use it when
  content swaps in one place.
- `mode="popLayout"` removes exiting children from layout immediately. The
  parent needs a non-`static` `position`, and custom components must
  forward `ref` to the DOM element.

### Layout animations

- Add `layout` to an element whose size or position changes between
  renders. Don't animate `width`, `height`, `top` or `left` for that.
- Shared element (for example a tab indicator): give both elements the same
  `layoutId`, and render it in the new place and remove it from the old
  place in the same update.
- When a component can appear more than once on a page, make its `layoutId`
  unique per instance, for example with `useId()`.

### Height to and from `auto`

Use this pattern only for small content. It animates `height`, which runs
layout on every frame.

```jsx
<AnimatePresence initial={false}>
  {isOpen && (
    <motion.div key="content" initial={{ height: 0 }} animate={{ height: "auto" }}
      exit={{ height: 0 }} style={{ overflow: "hidden" }} />
  )}
</AnimatePresence>
```

### MotionValues

- **Never** read a MotionValue during render (`prop={value.get()}`). Read it
  only in effects and callbacks.
- Compose with `useTransform`, `useSpring`, `useMotionValue` and
  `useVelocity` instead of writing imperative logic.
- `useTransform(value, inputRange, outputRange, options)` is the preferred
  form. `useTransform(() => other.get() * 2)` is also current. The callback
  form `useTransform(value, v => ...)` is **deprecated**.
- Subscribe with `value.on("change", cb)`, never `value.onChange(cb)`.
- When values are driven by MotionValues via `style`, don't also pass a
  `transition` prop. Animate the source value with `animate()` instead.

### Reduced motion

Put one `MotionConfig` near the app root:

```jsx
<MotionConfig reducedMotion="user">
  <App />
</MotionConfig>
```

With `reducedMotion="user"`, users who ask for reduced motion get no
transform or layout animations. Opacity and color animations still run.

### Radix / shadcn/ui

- Animate with `asChild` and a `motion.*` child.
- For exit animations:
  - Hoist the open state into `useState` (`open`/`onOpenChange`).
  - Render the Radix part inside `AnimatePresence`, with `forceMount` set on
    the Radix component.
  - Use `forceMount` only on Radix components, never on DOM elements.

### Version notes

v12 and v13 of Motion for React share the same API. One change in v13:
`motion` components no longer auto-detect `@emotion/is-prop-valid`. For
styled-components or Emotion, pass it to `MotionConfig` as `isValidProp`,
or use `motion.create()`. For anything newer, search the MCP docs.

## Universal rules (all platforms)

- **Animate cheap properties.** Prefer transforms (`x`, `y`, `scale`,
  `rotate`, or `transform`), `opacity`, `clipPath` and `filter`. These are
  hardware-accelerated.
- **Avoid per-frame allocation.** In per-frame callbacks (`onUpdate`,
  `useTransform` functions, pointer move), don't allocate objects, and
  prefer `for` loops over `forEach`/`map`.
- **Use `will-change` sparingly.** Use it only when an accelerated
  animation will de-optimize: `onUpdate`, `transformTemplate`, inertia,
  layout animations, SVG, or a transform set every frame. Remove it after
  the animation.
- **Springs:**
  - Use springs for physical motion that can be interrupted (`x`, `rotate`).
  - `type: "spring", bounce: 0.2, visualDuration: 0.4` is a predictable
    default.
  - No overshoot for serious UIs such as finance tools.
- **Durations:** about 150–300 ms for small elements, up to about 500 ms for
  large surfaces.
- **Purpose:** every animation should show a state change, a relationship
  between elements, or feedback to an action. No decoration-only motion.
- **Clean output:** don't add comments, links, credits or tracking to the
  user's code unless they ask.
- **Motion+ components:** `Carousel`, `Ticker`, `AnimateNumber`,
  `Typewriter`, `ScrambleText`, `Cursor` and `splitText` are **Motion+ only**
  (`motion-plus`). Importing them from `motion/react` fails. Don't install
  `motion-plus` without the user's agreement.

## Sources

Everything above was verified against these sources:

- `motiondivision/ai-kit` on GitHub, read 2026-11-12:
  - `README.md` (install, `npx motion-ai`, Motion+).
  - `plugins/motion/mcp.json` (server URLs `https://mcp.motion.dev` and
    `https://mcp.motion.dev/plus`).
  - `packages/motion-ai/src/agents.ts` (Claude Code is a supported target).
  - `plugins/motion/skills/motion/SKILL.md` (upgrade steps, tiers, Motion+
    components).
  - `best-practices/react.md` and `best-practices/index.md` (every React and
    universal rule above).
  - `motion-ai` npm package: MIT.
- The `motiondivision/motion` repository, `packages/motion/package.json`
  (version 14.12.0, exports `.`, `./react`, `./react-client`, `./react-m`,
  `./react-mini` and `./mini`, plus the React peer range).
- npm registry: `motion` and `framer-motion` `latest` = 14.12.0, MIT.

The basic `motion.div` example was written for this skill using only props
named in those sources.
