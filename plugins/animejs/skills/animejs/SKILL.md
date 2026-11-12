---
name: animejs
description: Write animations with Anime.js v4 (the `animejs` npm package) — animate(), createTimeline(), stagger(), onScroll(), createDraggable(), createScope() for React, SVG line drawing and morphing, and splitText(). Use when the user mentions anime.js or animejs, asks for timeline, staggered, scroll-linked, draggable or SVG-drawing animations in vanilla JS or React, or is migrating anime.js v3 code (`anime({ targets })`) to v4.
---

# Anime.js v4

Anime.js is an MIT-licensed JavaScript animation engine for CSS properties,
SVG, DOM attributes and JS objects. This skill targets **v4** (4.5.0 was
the npm `latest` when this skill was written). v4 replaced the v3 global
`anime()` with named ES-module imports, so most v3 snippets from the web
won't run unchanged on v4.

There is no official Anime.js MCP server. The library's GitHub repository
does not ship one. Work from this file, and treat https://animejs.com/documentation
as the full reference.

## Workflow

1. **Check the installed version.** Read `package.json` for `animejs`.
   - Version 3.x or `anime({...})` calls in the code: you're migrating. See
     *Migrating from v3* below, and don't mix the two APIs.
   - Not installed: `npm install animejs`.
2. **Pick the smallest API that does the job.** Use `animate` for one-off
   tweens, `createTimeline` for sequences, `onScroll` for scroll-linked
   motion, `createDraggable` for drag, and `svg.*` for path work.
3. **In React, always wrap animations in `createScope`** and revert it on
   unmount (pattern below). Never leave animations running after the
   component is gone.
4. **Respect reduced motion.** Anime.js has no built-in switch for it, so use
   a scope media query (pattern below).
5. Animate `transform`-type props (`x`, `y`, `scale`, `rotate`) and `opacity`
   when you can. They are cheaper than `width`, `height`, `top` or `left`.

## Imports

Everything comes from the root package as named exports:

```js
import {
  animate, createTimeline, createTimer, createAnimatable,
  createDraggable, createScope, onScroll, stagger,
  createSpring, cubicBezier, steps, linear, eases,
  utils, svg, text, engine, waapi,
} from 'animejs';
```

- `svg` holds `createMotionPath`, `createDrawable` and `morphTo`. These are
  also exported at the root.
- `text` holds `splitText` and `scrambleText`.
- `utils` holds `$`, `get`, `set`, `remove`, `random`, `randomPick`,
  `shuffle`, `round`, `clamp`, `snap`, `wrap`, `mapRange`, `lerp`, `damp`,
  `degToRad`, `radToDeg`, `stagger`, `sync` and `keepTime`.
- Subpath entry points exist for tighter bundles: `animejs/animation`,
  `animejs/timeline`, `animejs/timer`, `animejs/animatable`,
  `animejs/draggable`, `animejs/scope`, `animejs/events`, `animejs/easings`,
  `animejs/svg`, `animejs/text`, `animejs/utils`, `animejs/waapi`,
  `animejs/layout` and `animejs/engine`.

## Core API

### `animate(targets, params)`

The official README example, verbatim:

```js
import { animate, stagger } from 'animejs';

animate('.square', {
  x: 320,
  rotate: { from: -180 },
  duration: 1250,
  delay: stagger(65, { from: 'center' }),
  ease: 'inOutQuint',
  loop: true,
  alternate: true
});
```

**Timing params:** `duration`, `delay`, `loop` (a number means repeat that
many times, `true` means forever), `loopDelay`, `alternate`, `reversed`,
`autoplay` (a boolean or an `onScroll(...)` observer), `playbackRate`,
`frameRate` and `ease`.

**Per-property params:** `to`, `from`, `duration`, `delay`, `ease`,
`modifier` and `composition`.

**Callbacks:** `onBegin`, `onUpdate`, `onRender`, `onLoop` and `onComplete`.
The returned animation is thenable: `animate(el, {...}).then(() => {})`.

**Instance methods:** `.play()`, `.pause()`, `.resume()`, `.reverse()`,
`.alternate()`, `.restart()`, `.seek()`, `.stretch()`, `.complete()`,
`.cancel()` and `.revert()`.

### Eases

Ease names are strings:

- Families: `in`, `out`, `inOut` and `outIn`, combined with `Quad`, `Cubic`,
  `Quart`, `Quint`, `Sine`, `Circ`, `Expo`, `Bounce`, `Back` or `Elastic`.
  Examples: `'outQuad'` and `'inOutSine'`.
- Power form: `'out(3)'` or `'inOut(4)'`.
- The default ease is `'out(2)'`.
- Springs: `ease: createSpring({ mass: 1, stiffness: 100, damping: 10, velocity: 0 })`.
  It also accepts `bounce` and `duration`.

### `createTimeline(params).add(targets, params, position)`

```js
import { createTimeline, stagger } from 'animejs';

createTimeline({ defaults: { ease: 'inOut(4)', duration: 600 } })
  .add('.title', { y: [-20, 0], opacity: [0, 1] })
  .add('.card', { y: [40, 0], opacity: [0, 1] }, stagger(80))
  .add('.cta', { scale: [0.9, 1] }, '-=200');
```

- `position` can be a number (absolute ms), `'+=N'`, `'-=N'` or `'*=N'`
  (relative), `'<'` (end of the previous child), `'<<'` (start of the
  previous child), `'<<+=N'`, a label name, or a `stagger(...)` function.
- Other timeline methods: `.set()`, `.call(fn, pos)`, `.label(name, pos)`,
  `.sync(animation, pos)`, `.remove()`, `.stretch(ms)`, `.refresh()`,
  `.revert()` and `.then()`.

### `stagger(value, options)`

`stagger(100)` or `stagger([0, 1000])` (a range). Options are `from` (an
index, `'first'`, `'center'`, `'last'`, `'random'` or `[x, y]`), `reversed`,
`ease`, `start`, `grid` (`[cols, rows]`), `axis`, `use`, `total`, `modifier`
and `jitter`.

### Scroll-linked: `onScroll(params)`

```js
import { animate, onScroll } from 'animejs';

const anim = animate('.card', { y: [80, 0], opacity: [0, 1] });
onScroll({ target: '.section', enter: 'bottom top', leave: 'top bottom', sync: true }).link(anim);
// or: animate('.card', { ..., autoplay: onScroll({ target: '.section' }) })
```

**Params:**

- `target`, `container` and `axis`.
- `enter` and `leave` take a string in the form `'<container edge> <target edge>'`.
  - An edge is `top`, `bottom`, `left`, `right`, `start`, `end`, `center`,
    a number or a CSS length.
  - The defaults are `enter: 'end start'` and `leave: 'start end'`.
  - The object form `{ container, target }` also works.
- `sync`:
  - The default is `'play pause'`: method names run on enter and on leave.
  - `true` links playback directly to scroll position.
  - A number smooths that link.
  - An ease name eases the scrub.
- `repeat` and `debug`.

**Callbacks:** `onEnter`, `onLeave`, `onEnterForward`, `onLeaveForward`,
`onEnterBackward` and `onLeaveBackward`. Use `debug: true` while tuning the
thresholds.

### Drag: `createDraggable(target, params)`

```js
createDraggable('.handle', {
  container: '.track',
  x: true, y: false,
  snap: 50,
  releaseStiffness: 200,
  releaseDamping: 8,
  onDrag: self => console.log(self.x),
});
```

### SVG

```js
import { animate, svg, stagger } from 'animejs';

animate(svg.createDrawable('path'), { draw: ['0 0', '0 1'], ease: 'inOutQuad', duration: 1500, delay: stagger(100) });
animate('#shape-a', { d: svg.morphTo('#shape-b') }); // <path>: animate `d`; <polygon>/<polyline>: animate `points`
const { translateX, translateY, rotate } = svg.createMotionPath('#track');
animate('.dot', { translateX, translateY, rotate, duration: 3000, loop: true, ease: 'linear' });
```

### Text: `splitText(target, { lines, words, chars })`

Returns an object with `.lines`, `.words` and `.chars` arrays, plus
`.addEffect(split => timeline)`. The splitter watches its element with a
`ResizeObserver` and re-applies effects when the element resizes. It also
accepts `accessible`, `includeSpaces` and `debug`.

```js
import { animate, stagger, splitText } from 'animejs';

const { chars } = splitText('h1', { chars: true });
animate(chars, { y: ['100%', '0%'], opacity: [0, 1], delay: stagger(20) });
```

## React (and Next.js App Router)

`createScope({ root })` accepts a React ref directly, because it reads
`ref.current`. Selectors inside `.add()` are then scoped to that element.
`scope.revert()` undoes every animation, observer and draggable the scope
created. In Next.js App Router the file needs `'use client'`.

```jsx
'use client';
import { useEffect, useRef } from 'react';
import { animate, createScope, stagger } from 'animejs';

export default function Hero() {
  const root = useRef(null);
  const scope = useRef(null);

  useEffect(() => {
    scope.current = createScope({
      root,
      mediaQueries: { reduceMotion: '(prefers-reduced-motion: reduce)' },
    }).add(self => {
      if (self.matches.reduceMotion) return; // leave content static
      animate('.word', { y: [24, 0], opacity: [0, 1], delay: stagger(60), ease: 'out(3)' });
    });
    return () => scope.current.revert();
  }, []);

  return <h1 ref={root}><span className="word">Hello</span> <span className="word">world</span></h1>;
}
```

A scope re-runs its `.add()` callbacks when a `mediaQueries` entry changes.
`self.matches.<key>` reflects the current state.

## Migrating from v3

These come from the official migration guide (see Sources):

| v3 | v4 |
|---|---|
| `anime({ targets: 'div', ... })` | `animate('div', { ... })` |
| `easing: 'easeOutQuad'` | `ease: 'outQuad'` |
| `easing: 'spring(1, 80, 10, 0)'` | `ease: createSpring({ mass: 1, stiffness: 80, damping: 10, velocity: 0 })` |
| `direction: 'reverse'` / `'alternate'` | `reversed: true` / `alternate: true` |
| `loop: 2` (total iterations) | `loop: 1` (number of **repeats**) |
| `endDelay` | `loopDelay` (not applied after the final iteration) |
| `{ value: x }` | `{ to: x }` |
| `round: 100` | `modifier: utils.round(2)` (decimal places) |
| `anime.timeline({ easing })` | `createTimeline({ defaults: { ease } })` |
| `loopBegin` / `loopComplete` | `onLoop` |
| `change` | `onRender` |
| `.finished.then()` | `.then()` |
| `anime.path()` | `svg.createMotionPath()` |
| `anime.setDashoffset` | `svg.createDrawable()` + `draw: '0 1'` |
| `anime.get` / `set` / `random` / `remove` | `utils.get` / `utils.set` / `utils.random` / `utils.remove` |
| `anime.suspendWhenDocumentHidden` | `engine.pauseOnDocumentHidden` |

In v4, `.play()` always plays forwards. Use `.resume()` to continue in the
previous direction.

## Guardrails

- Don't invent option names. If an option isn't listed here, check
  https://animejs.com/documentation or the type definitions in
  `node_modules/animejs/dist/modules/index.d.ts` before using it.
- If the project already uses Motion (`motion` or `framer-motion`) for React
  UI, ask before adding Anime.js too. Two animation engines on one page is
  usually unnecessary.

## Sources

Everything above was verified against these sources:

- The `juliangarnier/anime` GitHub repository, read 2026-11-12 at
  package version 4.5.0 (MIT): the `README.md` usage example, the
  `package.json` exports map, the root exports in `src/index.js`, the type
  definitions in `src/types/index.js` (`TimerOptions`,
  `ScrollObserverParams`, `TimelinePosition`, `SpringParams` and
  `TextSplitterParams`), `src/scope/scope.js` (the `root` ref and
  `mediaQueries`), and the `examples/` folder.
- The "Migrating from v3 to v4" page on the GitHub wiki:
  https://github.com/juliangarnier/anime/wiki/Migrating-from-v3-to-v4
- npm registry: `animejs` `latest` = 4.5.0.

The examples with no source listed above were written for this skill from
those verified APIs.
