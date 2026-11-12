# YouTube agent skills (vendored)

The `yt-*` folders in `.claude/skills/` are copied unchanged from
https://github.com/Jakeschincariol/youtube-agent-skill
at commit `a2feb2104981a375ffd4f87ee04f4f5344ac43c6` (MIT, see `LICENSE` here).

They are Claude Code skills only. Nothing in the Next.js app imports them, and
they do not deploy with the site.

`voice.md` is the blank voice-profile template. The skills read it from
`~/.claude/youtube/voice.md`, so copy it there and fill it in.

To update, re-copy `skills/yt-*` from the upstream repo and change the commit above.
