# film.json reference

Everything the engine reads, with defaults. Times are in seconds. Paths are relative to the project folder unless they start with `@skill/`, which means this skill's folder (for example `@skill/assets/workflowstacks-logo.svg`).

## Contents

1. Top level
2. brand
3. sources and claims
4. audio
5. shots
6. transitions
7. graphics: common fields, then each type
8. endCard
9. Layout, contrast and subtitles
10. Validation rules
11. A complete small example

## 1. Top level

| Key | Default | Meaning |
| --- | --- | --- |
| `title` | slug | Title used in the report |
| `slug` | folder name | Output file names: `<slug>-16x9-master.mp4` |
| `format` | `"16:9"` | `"16:9"` (1920×1080) or `"9:16"` (1080×1920); `--format` overrides it |
| `fps` | `24` | Output frame rate; clips are converted to it |
| `disclosure` | `"AI-generated film"` | Chip shown top right for the whole film; `null` or `""` hides it |
| `brand` | see below | Name, colours, logo, fonts |
| `sources` | `[]` | Product page snapshots that on-screen numbers are checked against |
| `claims` | `{}` | `{"ignore": ["2026"]}` lists numbers on screen that are not claims |
| `audio` | clip audio on | Clip audio, music, voice-over, loudness |
| `poster` | auto | Time of the poster frame; default is the middle of the first statement, else 40% in |
| `shots` | required | The film, in order |
| `endCard` | none | Closing card; leave it out for no end card |

Unknown keys are ignored, so notes such as `brand.note` or `shots[].label` are safe.

## 2. brand

```json
"brand": {
  "name": "Roster", "by": "by FluoDigital",
  "logo": "assets/logo.svg",
  "accent": "#8B7CFF", "ink": "#0B0B10", "paper": "#F5F3EE",
  "fonts": { "display": "Space Grotesk", "body": "Space Grotesk", "mono": "JetBrains Mono" },
  "fontFiles": [ { "family": "Brand Sans", "file": "assets/BrandSans-Bold.woff2", "weight": 700 } ],
  "note": "free text, ignored by the engine"
}
```

- `name` and `by` appear in the brand pill top left; `by` is hidden in 9:16.
- `logo` (SVG, PNG, WebP or JPEG) replaces the accent dot in the pill and on the end card. `null` keeps the dot.
- `accent` colours the highlights, ticks, bars and URL. `ink` is the end card background and text on accent. `paper` is the main text colour. All three must be `#RRGGBB`.
- `fonts` names Fontsource families (fontsource.org). Families that are not bundled are installed on first use; bundled ones are Space Grotesk, JetBrains Mono, Inter and Cormorant Garamond. `fontFiles` supplies your own files for a family name, and check reports any family that fails to load.
- `fonts.displayWeight` (default 700) is the weight of headlines, cards, statements and the end card title. Set it to a weight the display family has, such as 400 for Instrument Serif. Otherwise the browser fakes a bold, and check warns about it.

## 3. sources and claims

```json
"sources": [
  { "url": "https://collab.fluodigital.com/pricing", "file": "sources/collab-pricing.txt" }
]
```

`fetch` downloads each `url` and saves its text to `file`, with a `Source:` and a `Fetched:` header line. You can also write the file yourself; keep the same two header lines. The header is skipped when claims are checked, so a date in it never vouches for a number.

**What the claims check does.** It finds every number in the on-screen text of the graphics and the end card's title, tagline and sub. A number may carry a currency (AED, USD, INR, EUR, GBP, SAR, Rs, ₹, $, €, £) and a suffix (%, +, ×, x, K, M, B, L, Cr). It then looks for each one in the snapshots, ignoring spaces and thousands separators, treating Rs and INR as ₹ and USD as $, and refusing partial matches, so 10% does not match 100%. The report lists every number with the sentence it was found in.

What it does not do: check numbers written as words, check wording, or check the end card URL. Set `"verify": false` on a graphic that holds no claims, such as a dramatised in-app screen, or add a number to `claims.ignore`. `render` stops on an unsourced number unless you pass `--allow-unsourced`.

## 4. audio

```json
"audio": {
  "clipAudio": true,
  "music": { "file": "audio/bed.mp3", "gainDb": -18 },
  "voiceover": { "file": "audio/vo.wav", "at": 0.5 },
  "loudness": -16
}
```

- `clipAudio` (default `true`) keeps each clip's own sound. Shots crossfade their audio with their pictures. A clip without audio gets silence of the same length.
- `music` loops to the film's length, fades in over 1 s and out over 2.5 s, and sits at `gainDb` (default −18 dB).
- `voiceover` starts at `at` seconds into the film. Clip audio and music duck under it automatically.
- Clip audio fades out over the 1.4 s before the end card; music carries on under the card and fades over the last 2.5 s. The whole mix is normalised to `loudness` LUFS (default −16) with a −1.5 dB true-peak ceiling.

## 5. shots

```json
{
  "clip": "clips/01-render.mp4",
  "url": "https://example.com/01-render.mp4",
  "in": 0, "out": 10,
  "focus": 0.5, "focusY": 0.5,
  "gain": 1,
  "transition": { "type": "fade", "duration": 0.5 },
  "graphics": [ ],
  "label": "An AI creator fires the render",
  "prompt": "…", "startFrame": "frames/00-last.png", "ingredients": ["refs/founder.png"],
  "dialogue": "…", "continuity": "…"
}
```

| Key | Default | Meaning |
| --- | --- | --- |
| `clip` | required | Video file (any format ffmpeg reads) |
| `url` | none | Where `fetch` downloads the clip from. Dropbox links and Google Drive share links are rewritten as direct-download links. If a host answers with a web page instead of the video, `fetch` reports a failure; use a direct download link instead |
| `in`, `out` | `0`, clip end | The part of the clip used |
| `fit` | `"cover"` | How the clip fills the frame: `cover` crops to fill, `contain` shows the whole clip with bars in the brand ink colour, `blur` shows the whole clip over a blurred, darkened copy of itself |
| `focus`, `focusY` | `0.5` | Which part survives a cover crop: 0 keeps the left or top edge, 1 the right or bottom |
| `"16:9"`, `"9:16"` | none | Overrides of `fit`, `focus` and `focusY` for one format, for example `"9:16": { "fit": "blur" }` |
| `gain` | `1` | Clip audio level (0.5 is about −6 dB) |
| `transition` | see 6 | Transition into the next shot, or into the end card |
| `graphics` | `[]` | Graphics over this shot, timed from the shot's start |
| `prompt`, `startFrame`, `ingredients`, `dialogue`, `continuity` | none | Planning fields, used only by `prompts` |

Clips of any size or aspect ratio work; they are never stretched. A 16:9 clip in a 9:16 film keeps only about a third of its width under `cover`. That suits a single person, given the right `focus`. For two people side by side or a group, use `"9:16": { "fit": "blur" }`: the whole shot sits across the middle of the frame. Headlines and cards on such a shot start 40 px below the picture, or end 40 px above it while a lower third or captions show, so text never covers the footage. Statements stay centred on the picture.

## 6. transitions

A transition overlaps two shots: the next shot starts `duration` seconds before the current one ends. So the film is the sum of the shot lengths, minus the transitions, plus the end card. With five 10 s shots, transitions of 0.5, 0.4, 0.5, 0.5 and 0.6 s, and a 3.5 s end card, that is 50 − 2.5 + 3.5 = 51.0 s.

Defaults: `fade` 0.5 s between shots, `fadeblack` 0.6 s into the end card. `cut` gives a hard cut, rendered as a one-frame fade. A transition may not be longer than half of either shot.

Types (ffmpeg xfade): `fade`, `fadeblack`, `fadewhite`, `fadegrays`, `fadefast`, `fadeslow`, `dissolve`, `distance`, `hblur`, `smoothleft`, `smoothright`, `smoothup`, `smoothdown`, `slideleft`, `slideright`, `slideup`, `slidedown`, `wipeleft`, `wiperight`, `wipeup`, `wipedown`, `wipetl`, `wipetr`, `wipebl`, `wipebr`, `circleopen`, `circleclose`, `circlecrop`, `rectcrop`, `radial`, `pixelize`, `zoomin`, `squeezeh`, `squeezev`, `horzopen`, `horzclose`, `vertopen`, `vertclose`, `diagtl`, `diagtr`, `diagbl`, `diagbr`, `hlslice`, `hrslice`, `vuslice`, `vdslice`, `cut`.

Fades and dissolves suit most films; `smoothleft` or `slideleft` suit a change of place. More than two kinds of transition in one film looks busy.

## 7. graphics

### Common fields

| Key | Default | Meaning |
| --- | --- | --- |
| `type` | required | One of the types below |
| `at` | `0.4` | Seconds from the start of the shot |
| `until` | shot length − 0.2 | Seconds from the start of the shot; may not exceed the shot's length |
| `dim` | auto | `true` (0.8), `false`, or 0–1: a dark layer behind text. When unset, check measures the footage behind headline, card, statement and captions text, and adds a dim layer when it is bright |
| `verify` | `true` | `false` leaves this graphic's numbers out of the claims check |
| `formats` | all | `["16:9"]` shows the graphic only in that format, for example a side panel that would cover a face in 9:16 |
| `"16:9"`, `"9:16"` | none | Overrides of any field for one format, for example `"9:16": { "place": "bottom", "until": 5.8 }` |

Text fields take the markup `*accent*`, `_italic accent_`, and line breaks; `\*` and `\_` give literal characters. Anything in `[square brackets]` counts as a placeholder and fails `check`.

### headline (lower left)

```json
{ "type": "headline", "at": 0.8, "until": 9.6, "eyebrow": "For brands · free · no signup",
  "lines": [ { "at": 1.0, "text": "Post what you need." }, { "at": 5.3, "text": "AI creators pitch you." } ],
  "sub": "optional supporting line", "subAt": 2.0, "wordGap": 0.15 }
```

Use `text` for a single line, or `lines` to swap the headline mid-shot, each line with its own `at` (from the shot's start, in order, inside the window). Words rise in one by one, `wordGap` seconds apart (default 0.14). `eyebrow` is a small label above, in the mono font. `sub` fades in at `subAt` (default `at` + 0.6). Landscape size is 84 px.

### card (lower left, larger)

```json
{ "type": "card", "at": 3.1, "until": 5.4, "eyebrow": "Barter deals, built in",
  "text": "Ship product. *Creators post.*\nEveryone reviews everyone.", "sub": "No cash required to start." }
```

The whole card fades and rises in together; the text is 100 px in landscape. Use it for one feature with a label.

### statement (centre)

```json
{ "type": "statement", "at": 0.8, "until": 9.3, "text": "Post a brief.\nGet _pitches._", "dim": true }
```

Large centred text (118 px landscape, 100 px portrait), for the line the viewer should remember. It usually wants `"dim": true` over busy footage.

### checklist (side panel)

```json
{ "type": "checklist", "at": 0.8, "until": 6.4, "title": "Pitch accepted · rendering",
  "items": ["Brief read", "Pitch sent in one click", "Booked, payment escrowed", "Content delivered"],
  "fillFrom": 0.4, "fillTo": 3.8, "side": "right" }
```

A panel with a progress bar that fills between `fillFrom` and `fillTo` (seconds from the graphic's `at`); each item ticks as the bar passes its share. In landscape, `side` is `"right"` (default) or `"left"`. In portrait the panel spans the width, and `place` puts it near the `"top"` (default) or the `"bottom"`. Faces usually sit in the upper half of a vertical frame, so `"bottom"` is often the better choice. A bottom panel shares the screen area of lower thirds and captions, and headlines move up while it shows. Not included in subtitles.

### steps (side panel)

```json
{ "type": "steps", "at": 4.4, "until": 9.5, "items": ["Post a brief", "AI creators pitch", "Book, escrowed", "Delivered, released"], "side": "right" }
```

Numbered rows that slide in 0.3 s apart. Three to five items. `side` and `place` work as for checklist. Not included in subtitles.

### lowerThird (bottom left)

```json
{ "type": "lowerThird", "at": 2.2, "until": 9.4, "name": "A brand owner", "role": "AI avatar · shipping product for a barter deal" }
```

Who is on screen. With AI avatars, say so in `role`. While it shows, a headline or card in the same shot moves up automatically.

### chips (below centre)

```json
{ "type": "chips", "at": 4.3, "until": 9.4, "items": ["Free for brands", "10% only on paid deals", "First 30 creators: 0% for 6 months"] }
```

Pill-shaped proof points that rise in 0.22 s apart, usually under a statement. Keep them to two to four short items; they wrap onto more rows when long.

### captions (bottom centre)

```json
{ "type": "captions", "at": 0.5, "until": 6.0, "text": "We shipped the product and the creator posted in two days", "perPage": 4 }
```

Spoken words, shown `perPage` words at a time with the current word highlighted. Words are spread evenly across the window, so match the window to the speech. The engine does not transcribe audio. Take the words from the shot's `dialogue`, the line given to Flow, or from the user; without them, leave captions out rather than guess.

## 8. endCard

```json
"endCard": { "title": "Roster", "tagline": "The marketplace for AI creators and the brands who hire them.",
  "url": "collab.fluodigital.com", "sub": "Early access · built in India · by FluoDigital",
  "note": "Every person in this film is an AI avatar", "duration": 3.5 }
```

A brand-colour card after the last shot. Titles longer than 14 characters get a smaller size. `note` (default as shown) sits at the bottom in small type; set it to `""` to hide it, but only when no AI people appear. The brand pill and disclosure chip fade out as the card comes in.

## 9. Layout, contrast and subtitles

- **Slots.** Each type has a fixed slot (see SKILL.md), designed for 1920×1080 and 1080×1920 with a 72 px landscape margin and 64 px portrait margin. Two graphics in the same slot at the same time is an error. A lower third and captions also clash with each other.
- **Layout check.** `check` renders each graphic once it is fully on screen. It reports text that runs within 16 px of the frame edge, and text that overlaps other text, the brand pill or the disclosure chip.
- **Contrast.** For headline, card, statement and captions without an explicit `dim`, check measures the mean luminance of the footage behind the text in the middle of the graphic's window. It adds a dim layer above these thresholds: 0.6 for lower-left text, 0.5 for centre text, 0.58 for captions.
- **Subtitles.** The SRT and VTT files contain headline lines, cards, statements, lower thirds, chips, caption pages and the end card, timed as they appear on screen.

## 10. Validation rules

`check` fails when any of these is true:
- a clip is missing or unreadable (the rest of the plan is still checked, with missing clips timed at their `out` or 8 s, so a plan can be checked before Flow has made anything);
- `in` or `out` falls outside the clip;
- a transition is longer than half a shot, or has an unknown type;
- a graphic window falls outside its shot, or lacks required text;
- two graphics share a slot at the same time (a bottom panel in 9:16 also clashes with lower thirds and captions);
- `fit`, `focus`, `side`, `place`, `formats` or `displayWeight` has a value outside its allowed set;
- a `[placeholder]` is left in a graphic, the end card, the brand name or the disclosure;
- a brand colour is not `#RRGGBB`, or the logo file is missing;
- a font is not available;
- a number on screen is not found in any snapshot (unless `--allow-unsourced`).

It warns, without failing, about layout overlaps, auto-dimmed graphics, and fonts that fell back to Arial.

## 11. A complete small example

```json
{
  "title": "Spring launch", "slug": "spring-launch", "format": "16:9",
  "disclosure": "AI-generated film",
  "brand": { "name": "Acme", "accent": "#C6F24E", "ink": "#0A0C0D", "paper": "#F3F3EC" },
  "sources": [ { "url": "https://acme.example/pricing", "file": "sources/pricing.txt" } ],
  "shots": [
    { "clip": "clips/01-hook.mp4", "out": 6,
      "graphics": [ { "type": "headline", "at": 0.7, "until": 5.4, "eyebrow": "New", "text": "Invoices that *send themselves.*" } ] },
    { "clip": "clips/02-demo.mp4", "in": 1, "out": 8, "focus": 0.35,
      "graphics": [ { "type": "steps", "at": 0.8, "until": 6.4, "items": ["Connect your bank", "Pick a template", "Approve once"] } ] },
    { "clip": "clips/03-payoff.mp4", "out": 7,
      "graphics": [ { "type": "statement", "at": 0.8, "until": 6.4, "text": "Paid _faster._", "dim": true },
                    { "type": "chips", "at": 3.0, "until": 6.4, "items": ["Free for 30 days", "No card needed"] } ] }
  ],
  "endCard": { "title": "Acme", "tagline": "Invoicing for small teams.", "url": "acme.example" }
}
```

Here "30" must appear in `sources/pricing.txt`, or check fails.
