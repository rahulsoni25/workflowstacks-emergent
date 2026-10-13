// SubRip (.srt) and WebVTT (.vtt) files of everything the film says on screen,
// for platforms that take a captions file and for accessibility.
const stamp = (t, sep) => {
  const ms = Math.max(0, Math.round(t * 1000));
  const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60, r = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${sep}${String(r).padStart(3, '0')}`;
};

export function cues(tl) {
  const list = [];
  for (const e of tl.elements) for (const c of e.cues) if (c.text && c.until > c.at) list.push(c);
  if (tl.end) list.push({ at: tl.end.start + 0.4, until: tl.total, text: [tl.end.title, tl.end.tagline, tl.end.url].filter(Boolean).join('\n') });
  return list.sort((a, b) => a.at - b.at || a.until - b.until);
}

export const srt = tl => cues(tl).map((c, i) => `${i + 1}\n${stamp(c.at, ',')} --> ${stamp(c.until, ',')}\n${c.text}\n`).join('\n');
export const vtt = tl => 'WEBVTT\n\n' + cues(tl).map(c => `${stamp(c.at, '.')} --> ${stamp(c.until, '.')}\n${c.text}\n`).join('\n');
