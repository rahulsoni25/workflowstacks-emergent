---
name: film-studio
description: Turn video clips (Google Flow or Veo generations, phone footage, stock) plus a product page into a finished branded film or ad. It joins shots in order with transitions and adds motion graphics (kinetic headlines, cards, checklists, steps, lower thirds, chips, word-by-word captions) and an end card. It keeps the clips' own audio or mixes music and voice-over, writes SRT and VTT subtitles, renders 16:9 and 9:16 versions, and checks that every number on screen appears on the product page. Use this skill whenever someone wants to combine, stitch, cut or assemble clips into one video, add motion graphics, text, captions or subtitles to footage, or make an ad, promo, launch film, reel or short from generated clips. Also use it to plan or write Google Flow or Veo shot prompts for a film, or to set up an automatic video pipeline, even if they never say "film-studio".
---

# Film Studio

Clips and a product page go in; a finished, branded, fact-checked film comes out. Google Flow makes the footage by hand in the browser, because Flow has no public API. This skill does everything after that, the same way every time.

```
plan shots ─► Google Flow (the user) ─► clips/ ─► film.json ─► check ─► stills ─► render
prompts.md    Frames to Video, Ingredients   probe      you write   claims,    look at   MP4s, SRT/VTT,
                                                         the edit    layout     them      poster, report
```

The engine is `scripts/studio.mjs` (Node 18 or later). It draws the graphics in headless Chromium from `template/overlay.html`, then assembles clips, transitions, graphics and audio with ffmpeg in one pass. Its dependencies (playwright-core, ffmpeg-static, Fontsource fonts, about 100 MB) install themselves on first run.

```bash
S=.claude/skills/film-studio/scripts/studio.mjs   # wherever this skill lives
node $S setup                                     # installs dependencies, reports the Chromium it found
```

## Workflow

### 1. Collect the inputs

You need the clips (or a brief to plan them from), their order, the product page URL or its text, the brand (name, colours, logo, fonts), the format (16:9, 9:16 or both) and the sound (the clips' own audio, music, a voice-over).

Do not stall on optional items. Use the defaults, list them as assumptions in your reply, and carry on. If the brand palette is unknown, keep the default palette or a clearly labelled placeholder (`brand.note`) rather than guessing colours from memory.

### 2. Create the project

```bash
node $S new films/<slug> [--format 9:16]
```

This creates `films/<slug>/film.json` (a starter full of `[placeholders]`; `check` refuses to pass while any remain), `clips/` and `sources/`. Put the clips in `clips/` with names that sort in film order, for example `01-hook.mp4`. A clip with a public URL can instead be listed as the shot's `url` and downloaded with `fetch`.

### 3. Snapshot the product page

The page is the only source of facts. Every number on screen must appear in a snapshot, and `check` enforces this. Set `sources` in film.json and run:

```bash
node $S fetch films/<slug>
```

If the page cannot be fetched (sandboxed network, login wall, JavaScript-only page), get the text another way: a web-fetch tool, the user pasting it, or a CI job. Save it as `sources/<name>.txt` starting with a `Source: <url>` line and a `Fetched: <date and how>` line. Never write product facts from memory, and do not let wording drift beyond what the page says.

### 4. Watch the footage before writing a word

```bash
node $S probe films/<slug>
```

This prints each clip's length, size, frame rate and audio, and writes `out/sheets/NN.jpg` with 10 evenly spaced frames per clip. Open every sheet. For each shot, note:

- **What happens and when.** A glass raised to camera or a laptop turned round is a beat for a graphic to land on.
- **Where faces and the subject are.** Text goes where they are not; panels can sit `"side": "left"` when the subject is on the right.
- **Bright areas behind text.** `check` measures them and adds a dim layer, but busy bright backgrounds are better avoided.
- **For 9:16, which part of the frame must survive the crop.** That becomes the shot's `focus`.

### 5. Write film.json

`references/spec.md` is the full reference; read it the first time. The essentials:

- `shots` are in film order. Each has a `clip`, `in` and `out` points, the `transition` into the next shot, and its `graphics`.
- Graphic times (`at`, `until`) are seconds from the start of their own shot. Graphics therefore stay attached to the footage when shots are re-trimmed or reordered.
- Text markup: `*accent colour*`, `_italic accent_`, and a real line break (`\n` in JSON) for a new line.

| Type | Screen slot | Use it for |
| --- | --- | --- |
| headline | lower left | the main message of a shot; words animate in; `lines` swaps text mid-shot |
| card | lower left, bigger | one feature, with an eyebrow label and a supporting line |
| statement | centre | the line people should remember; the payoff shot |
| checklist | side panel | a process completing: a progress bar ticks items off |
| steps | side panel | how it works, three to five numbered steps |
| lowerThird | bottom left | who is on screen, labelled honestly ("A brand owner · AI avatar") |
| chips | below centre | two to four short proof points under a statement |
| captions | bottom centre | spoken words, highlighted word by word |

**Copy rules.** These exist because a viewer reads on-screen text once, at speed, often without sound.
- One idea per graphic. Headlines of about seven words or fewer; chips of two to six words.
- Say only what the sources say. Rephrase for length, never for substance. Numbers must match the page exactly; `check` will catch a 15% that the page states as 10%.
- Keep the AI disclosure. Flow footage shows AI-generated people, so keep the `disclosure` chip and the end-card `note` unless the user confirms real, consented footage. Do not present avatars as real customers or testimonials.

**Subtitles.** Every render writes SRT and VTT files of the on-screen text. That covers "subtitles" or "subtitles based on the product", which in practice means the product's lines on screen.
- **Spoken words.** Flow clips often contain speech, and captioning it needs the exact words. Take them from each shot's `dialogue`, meaning the line written into the Flow prompt, or from the user, then use a `captions` graphic.
- **No transcript.** Do not guess the words, and do not install a speech-recognition model to find them. In this skill's first test that detour took most of an hour, and the models still disagreed on an amount (₹4,200 against ₹42). Deliver the on-screen subtitles and say that spoken lines can be captioned once someone supplies them.

**Timing rules.** These come from what reads comfortably at 24 fps.
- Start a graphic 0.6–0.8 s into its shot so it lands after the transition, and end it before the next transition starts.
- Hold text at least 2.5 s, plus roughly 0.3 s per word. Use `lines` rather than cramming two ideas into one headline.
- One graphic per slot at a time. `check` reports same-slot overlaps as errors, and a headline moves up automatically while a lower third or captions are showing.

### 6. Check, look, fix

```bash
node $S check films/<slug>     # spec errors, claims, contrast, fonts, layout
node $S stills films/<slug>    # out/qa-16x9/sheet.jpg plus one still per graphic
```

Open `sheet.jpg`, and any doubtful still at full size. Fix and repeat until `check` passes and the stills look right. Typical fixes:
- **Text over a face.** Move the graphic to another beat, use `"side": "left"`, or swap a headline for a statement.
- **Text hard to read.** Set `"dim": true` on the graphic, or shorten it.
- **Graphic cut off by a transition.** Pull `until` earlier.
- **Wrong part of the frame in 9:16.** Change the shot's `focus`.

### 7. Render and deliver

```bash
node $S render films/<slug> [--format 16:9,9:16] [--workers 3]
```

`--format` takes one format, a list, or `all`; `check` and `stills` take the same.

| Output in `out/` | What it is |
| --- | --- |
| `<slug>-<format>-master.mp4` | full quality H.264 and AAC, for uploading to platforms |
| `<slug>-<format>-web.mp4` | re-encoded to 25 MB or less (`--max-mb`), for chat apps and email |
| `<slug>-<format>.srt` and `.vtt` | every on-screen line as subtitles |
| `<slug>-<format>-poster.jpg` | a thumbnail frame |
| `report-<format>.md` | timeline, graphics, the claims table with page context, contrast notes, QA sheet |
| `qa-<format>/sheet.jpg` | stills taken from the finished master |

Rendering takes a few minutes. The 51-second Roster example took about 4.5 minutes in either format on a 4-CPU machine; the 9-second smoke test took 35 seconds on a GitHub runner. Open the QA sheet from the finished master before you hand the film over.

When delivering, send the web MP4 and summarise the report. For client-facing films, ask the user to have someone check the claims table against the live page before publishing, because pages change after the snapshot.

### 8. Vertical (9:16) version

Run `stills` and `render` with `--format 9:16`; the same spec renders both formats, and graphic positions switch to the vertical layout automatically. A 16:9 clip cropped to 1080×1920 keeps only about a third of its width, so frame every shot for vertical:

- **One person in the shot.** Keep the default cover crop and set `"9:16": { "focus": 0.45 }`, from 0 (keep the left edge) to 1 (keep the right edge).
- **Two people side by side, or a group.** Use `"9:16": { "fit": "blur" }`. The whole shot sits across the middle of the frame over a blurred copy. Headlines and cards move below the picture, or above it while a lower third shows, so they never cover it.
- **A side panel covers a face.** Faces sit in the upper half of a vertical frame, where panels go by default. Move the panel down with `"9:16": { "place": "bottom" }`, or keep it in 16:9 only with `"formats": ["16:9"]`.
- **A headline jumps up over a face.** It moves up while a lower third, captions or a bottom panel overlaps it. Shorten the other graphic in 9:16 only, for example `"9:16": { "until": 5.8 }`.

Any graphic field can be overridden per format this way. Always confirm the vertical framing in `stills --format 9:16` before rendering.

## Planning shots for Google Flow

When the clips do not exist yet, plan them in film.json first. Give each shot a `prompt`, plus optional `startFrame`, `ingredients`, `dialogue` and `continuity`. Then run `node $S prompts films/<slug>` to write `prompts.md`, the shot list the user works through in Flow.

Run `check` on the plan before any clip exists. Missing clips are timed at their `out`, or 8 seconds, and everything else is verified: claims, placeholders and layout. The check ends with "plan checked" and lists each missing clip with how to make it in Flow. `stills` and `render` wait until the clips exist.

Then preview the plan with `node $S animatic films/<slug> --format all`. It renders the film with a labelled stand-in plate for every missing clip, carrying the real graphics, timing and transitions, as `out/<slug>-<format>-animatic-web.mp4` with a QA sheet. The user can approve the words and pacing before spending Flow credits. Plates cannot show faces or bright areas, so check those again on the real clips.

After each download, `node $S frames films/<slug>` exports each shot's first and last frames into `frames/`. The next shot can then start from the previous shot's last frame (Flow's Frames to Video) for a seamless join.

Read `references/flow-prompting.md` before writing prompts. It covers the prompt structure, continuity tactics, and sourced facts about Flow: clip lengths, credits, and what an AI Pro plan does and does not include.

## Running it elsewhere

- **Claude session.** Run the commands above.
- **Own computer.** Install Node 18 or later and run the same commands. Chromium is found automatically in a Playwright cache or an installed Chrome. Otherwise run `npx playwright-core install chromium` in the skill folder, or point `STUDIO_CHROME` at a Chrome executable.
- **GitHub Actions.** Copy `assets/render-film.yml` to `.github/workflows/`. Run it from the Actions tab with the project path. It downloads clips by URL, renders, and uploads the outputs as an artifact. Clips must be reachable through each shot's `url`, or committed.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `No Chromium found` | `npx playwright-core install chromium` in the skill folder, or set `STUDIO_CHROME` |
| `font "X" is not available from Fontsource` | pick a Fontsource family, or set `brand.fontFiles` to the font files |
| `claim "N" is not in any source snapshot` | correct the number, add the page that states it to `sources`, or remove it |
| `placeholder text left in` | replace every `[...]` from the starter |
| ffmpeg error during render | rerun with `--keep-frames`, then read the error tail; out/.work-*/ keeps the drawn graphics |
| `fetch` fails for a page | save the text by hand as described in step 3 |
| render too slow | `--workers 3` or 4 on a 4-CPU machine; graphics drawing is the slow part |

`--allow-unsourced` renders even when numbers are unverified. Use it only for internal drafts, and say so whenever you use it.
