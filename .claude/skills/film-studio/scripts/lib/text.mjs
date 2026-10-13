// Light markup for on-screen copy:
//   *words*   accent colour
//   _words_   italic accent
//   \n        line break
//   \* \_     literal characters
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);

export function parse(src) {
  const s = String(src ?? '');
  const out = [];
  let acc = false, ital = false, buf = '';
  const flush = () => { if (buf) { out.push({ text: buf, acc, ital }); buf = ''; } };
  for (let i = 0; i < s.length; i++) {
    const c = s[i], prev = i ? s[i - 1] : ' ', next = i + 1 < s.length ? s[i + 1] : ' ';
    if (c === '\\' && (next === '*' || next === '_')) { buf += next; i++; continue; }
    if (c === '*') { flush(); acc = !acc; continue; }
    if (c === '_') {
      const opens = !ital && /[\s([{"'“‘]/.test(prev);
      const closes = ital && /[\s.,;:!?)\]}"'”’]/.test(next);
      if (opens || closes) { flush(); ital = !ital; continue; }
    }
    if (c === '\n') { flush(); out.push({ br: true }); continue; }
    buf += c;
  }
  flush();
  return out;
}

const wrap = (html, t) => (t.ital ? `<i class="acc">${html}</i>` : t.acc ? `<span class="acc">${html}</span>` : html);

export const html = src => parse(src).map(t => (t.br ? '<br>' : wrap(esc(t.text), t))).join('');

export const plain = src => parse(src).map(t => (t.br ? '\n' : t.text)).join('')
  .split('\n').map(l => l.replace(/[ \t]+/g, ' ').trim()).filter(Boolean).join('\n');

// Kinetic text: one HTML string per word (styled pieces kept), null where a line break goes.
export function words(src) {
  const ws = [];
  let cur = '';
  const push = () => { if (cur) { ws.push(cur); cur = ''; } };
  for (const t of parse(src)) {
    if (t.br) { push(); ws.push(null); continue; }
    for (const p of t.text.split(/(\s+)/)) {
      if (!p) continue;
      if (/^\s+$/.test(p)) { push(); continue; }
      cur += wrap(esc(p), t);
    }
  }
  push();
  return ws;
}
