# films

Film projects for the film-studio skill (`.claude/skills/film-studio`). Each folder is one film: Google Flow clips plus a product page in, a finished branded film out.

| Folder | What it is |
| --- | --- |
| `roster-launch/` | The Roster launch film for collab.fluodigital.com, 51 s, 16:9 and 9:16. Its clips stay on the machine that has them, so CI skips it. |
| `smoke-test/` | An 8.8 s vertical test built from the Founder Avatar Studio hero clip. CI renders it whenever the engine changes. |

## Make a film

1. Plan the shots in `film.json` and run `prompts` to get the shot list for Google Flow.
2. Generate the clips in Flow by hand; Flow has no public API. Download them into `clips/` under the names in `prompts.md`.
3. Run `check`, look at `stills`, then `render`.

```bash
S=.claude/skills/film-studio/scripts/studio.mjs
node $S new films/my-launch            # starter film.json, clips/, sources/
node $S fetch films/my-launch          # page snapshots (and clips that have a url)
node $S prompts films/my-launch        # prompts.md, the Google Flow shot list
node $S probe films/my-launch          # after downloading: clip facts and contact sheets
node $S check films/my-launch          # spec, claims, layout, contrast
node $S stills films/my-launch --format 9:16
node $S render films/my-launch --format 9:16
```

The outputs land in `films/<slug>/out/`: master and web MP4s, SRT and VTT subtitles, a poster, a QA sheet and a report with the claims table. `out/`, `clips/` and `frames/` are not committed.

## Render on GitHub instead

Give each shot a `url` the runner can download, push, or run the `render-film` workflow from the Actions tab with the project path. The finished files come back as an artifact on the run. The full guide is in `.claude/skills/film-studio/SKILL.md`, and the `film.json` reference is in `references/spec.md` next to it.
