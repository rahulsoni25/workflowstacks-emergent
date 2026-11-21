# Lemo-Opuscar skill (vendored)

`.claude/skills/lemo-opuscar/` is copied unchanged from
https://github.com/lemomo-ai/lemo-opuscar (path `plugin/skills/lemo-opuscar/`)
at commit `f9e204293930952b61ba921cd8944d05f121beee` (2026-11-20).

Licence: `LICENSE` here is the upstream file, unchanged, and `LICENSES/` holds
the full texts it refers to. The skill's Markdown (`SKILL.md`) is CC BY-NC 4.0;
its code (`scripts/setup.sh`) is MIT. Credit: "Lemo-Opuscar by Lemomo (LemoLab)",
https://github.com/lemomo-ai/lemo-opuscar. Films made with it are yours,
commercial films included (see "Films you make" in `LICENSE`).

It is a Claude Code skill only. Nothing in the Next.js app imports it, it does
not deploy with the site, and it is not an entry of the WorkflowStacks plugin
marketplace in `.claude-plugin/marketplace.json`.

On first use the skill runs `scripts/setup.sh`, which clones the style library
(guides, tools and every `STYLE.md`) into `~/lemo-opuscar`, then installs the
library's packages with `sh scripts/setup.sh deps`. It needs Node 20+,
ffmpeg 7+ and Python 3.11+ (or uv). The script only reports missing system
tools; it installs none itself. The cloud image this repo's sessions ran on in
November 2026 shipped ffmpeg 6.1, which the script reports as too old.

The same skill is published as a plugin for a local Claude Code:

    claude plugin marketplace add lemomo-ai/lemo-opuscar
    claude plugin install lemo-opuscar@lemolab

To update, re-copy `plugin/skills/lemo-opuscar/`, `LICENSE` and `LICENSES/`
from the upstream repo and change the commit above.
