// Loads film.json, validates it, and turns it into an absolute timeline:
// every shot gets its start time in the finished film, every graphic its absolute
// window, so graphics stay attached to their shot when clips are re-trimmed or reordered.
import fs from 'node:fs';
import path from 'node:path';
import { html, plain, words } from './text.mjs';

export const FORMATS = {
  '16:9': { w: 1920, h: 1080, tag: '16x9' },
  '9:16': { w: 1080, h: 1920, tag: '9x16' },
};

export const XFADES = new Set(['fade', 'fadeblack', 'fadewhite', 'fadegrays', 'fadefast', 'fadeslow', 'dissolve', 'distance', 'hblur',
  'smoothleft', 'smoothright', 'smoothup', 'smoothdown', 'slideleft', 'slideright', 'slideup', 'slidedown',
  'wipeleft', 'wiperight', 'wipeup', 'wipedown', 'wipetl', 'wipetr', 'wipebl', 'wipebr', 'circleopen', 'circleclose', 'circlecrop', 'rectcrop',
  'radial', 'pixelize', 'zoomin', 'squeezeh', 'squeezev', 'horzopen', 'horzclose', 'vertopen', 'vertclose', 'diagtl', 'diagtr', 'diagbl', 'diagbr',
  'hlslice', 'hrslice', 'vuslice', 'vdslice', 'cut']);

export const FITS = new Set(['cover', 'contain', 'blur']);

// Each graphic type has a screen slot; the layout check and auto-placement work per slot.
export const SLOTS = { headline: 'main', card: 'main', statement: 'center', checklist: 'panel', steps: 'panel', lowerThird: 'lower', chips: 'chips', captions: 'captions' };

const DEFAULT_BRAND = {
  name: 'Brand', by: '', logo: null, accent: '#C6F24E', ink: '#0A0C0D', paper: '#F3F3EC',
  fonts: { display: 'Space Grotesk', body: 'Space Grotesk', mono: 'JetBrains Mono' },
};

const r3 = n => Math.round(n * 1000) / 1000;
const tl_disclosure = spec => (typeof spec.disclosure === 'string' ? spec.disclosure : '');
const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const PLACEHOLDER = /\[[^\]]{2,}\]/;

export function loadSpec(dir) {
  const file = path.join(dir, 'film.json');
  if (!fs.existsSync(file)) throw new Error(`No film.json in ${dir}. Create one with: studio.mjs new ${dir}`);
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { throw new Error(`film.json is not valid JSON: ${e.message}`); }
}

export const clipPath = (dir, shot) => path.resolve(dir, shot.clip || '');

export function resolveAsset(dir, skillDir, p) {
  if (!p) return null;
  if (p.startsWith('@skill/')) return path.join(skillDir, p.slice(7));
  return path.resolve(dir, p);
}

function hexOk(c) { return typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c); }

// probes: one entry per shot ({duration, w, h, hasAudio} or {missing:true})
export function buildTimeline(spec, probes, { format, dir, skillDir } = {}) {
  const errors = [], warnings = [];
  const fmtKey = format || spec.format || '16:9';
  const fmt = FORMATS[fmtKey];
  if (!fmt) throw new Error(`Unknown format "${fmtKey}". Use 16:9 or 9:16.`);
  const fps = num(spec.fps, 24);
  if (!Array.isArray(spec.shots) || !spec.shots.length) throw new Error('film.json needs at least one entry in "shots".');

  const brand = { ...DEFAULT_BRAND, ...(spec.brand || {}), fonts: { ...DEFAULT_BRAND.fonts, ...((spec.brand || {}).fonts || {}) } };
  for (const k of ['accent', 'ink', 'paper']) if (!hexOk(brand[k])) errors.push(`brand.${k} must be a #RRGGBB colour (got ${JSON.stringify(brand[k])})`);
  const dw = brand.fonts.displayWeight;
  if (dw !== undefined && !(Number.isInteger(dw) && dw >= 100 && dw <= 900 && dw % 100 === 0)) errors.push(`brand.fonts.displayWeight must be 100, 200 … 900 (got ${JSON.stringify(dw)})`);
  brand.logoFile = resolveAsset(dir, skillDir, brand.logo);
  if (brand.logoFile && !fs.existsSync(brand.logoFile)) errors.push(`brand.logo not found: ${brand.logo}`);

  const hasEnd = !!spec.endCard;
  const shots = [];
  const missingClips = [];   // reported by check, blocking for stills and render
  let start = 0;
  spec.shots.forEach((s, i) => {
    const where = `shot ${i + 1}`;
    const pr = probes[i] || { missing: true };
    if (!s.clip) errors.push(`${where}: "clip" is required (path to the video, relative to the project folder)`);
    if (pr.missing) {
      const ready = s.startFrame && dir && fs.existsSync(path.resolve(dir, s.startFrame));
      const how = s.url ? ' (run fetch to download it)'
        : s.startFrame ? ` (Flow: Frames to Video from ${s.startFrame}, ${ready ? 'ready' : 'exported by frames once that shot is downloaded'})`
        : s.prompt ? ' (Flow: Text to Video; the prompt is in prompts.md)' : '';
      missingClips.push(pr.unreadable ? `${where}: ${s.clip} is not a readable video` : `${where}: clip not found: ${s.clip}${how}`);
    }
    const dur0 = pr.duration || 0;
    // A clip that does not exist yet (a planned Flow shot) is timed at its "out", or at 8 s,
    // Flow's longest single generation, so the rest of the plan can still be checked.
    const inn = num(s.in, 0), out = num(s.out, pr.missing ? inn + 8 : (dur0 || inn + 1));
    if (!pr.missing && (inn < 0 || out > dur0 + 0.05)) errors.push(`${where}: in/out ${inn}–${out}s is outside the clip (0–${dur0.toFixed(2)}s)`);
    if (!(out > inn)) errors.push(`${where}: "out" must be after "in"`);
    const dur = r3(Math.max(0.1, Math.min(out, dur0 || out) - inn));
    const isLast = i === spec.shots.length - 1;
    const hasNext = !isLast || hasEnd;
    const trIn = s.transition || {};
    let type = trIn.type || (isLast ? 'fadeblack' : 'fade');
    let d = num(trIn.duration, type === 'cut' ? 0 : isLast ? 0.6 : 0.5);
    if (!XFADES.has(type)) { errors.push(`${where}: unknown transition "${type}"`); type = 'fade'; }
    if (type === 'cut' || d < 1 / fps) { type = 'fade'; d = 1 / fps; }
    // Framing can differ per format: shot["9:16"] = { focus, focusY, fit } overrides the shot's own.
    const fo = (s[fmtKey] && typeof s[fmtKey] === 'object') ? s[fmtKey] : {};
    const fitMode = fo.fit || s.fit || 'cover';
    if (!FITS.has(fitMode)) errors.push(`${where}: "fit" must be ${[...FITS].join(', ')} (got ${JSON.stringify(fitMode)})`);
    const focus = num(fo.focus, num(s.focus, 0.5)), focusY = num(fo.focusY, num(s.focusY, 0.5));
    if (focus < 0 || focus > 1 || focusY < 0 || focusY > 1) errors.push(`${where}: "focus" and "focusY" must be between 0 and 1`);
    shots.push({
      i, clip: s.clip, file: dir ? clipPath(dir, s) : s.clip, url: s.url || null, in: inn, out: r3(inn + dur), dur, start: r3(start),
      transition: hasNext ? { type, duration: r3(d) } : null, focus, focusY, fit: FITS.has(fitMode) ? fitMode : 'cover',
      hasAudio: !!pr.hasAudio, gain: num(s.gain, 1), src: pr, label: s.label || `shot ${i + 1}`,
    });
    start = start + dur - (hasNext ? d : 0);
  });
  shots.forEach((s, i) => {
    const next = shots[i + 1];
    if (s.transition && s.transition.duration > s.dur / 2) errors.push(`shot ${i + 1}: transition ${s.transition.duration}s is longer than half the shot`);
    if (s.transition && next && s.transition.duration > next.dur / 2) errors.push(`shot ${i + 2}: incoming transition is longer than half the shot`);
  });

  let end = null, total = r3(start);
  if (hasEnd) {
    const e = spec.endCard;
    const duration = num(e.duration, 3.5);
    end = { start: r3(start), duration, title: e.title || brand.name, tagline: e.tagline || '', url: e.url || '', sub: e.sub || '', note: e.note ?? 'Every person in this film is an AI avatar' };
    total = r3(start + duration);
  }

  // Graphics
  const elements = [];
  shots.forEach(sh => {
    const list = (spec.shots[sh.i].graphics || []);
    list.forEach((g0, k) => {
      // "formats": ["16:9"] limits a graphic to some formats (a side panel that covers faces in 9:16).
      if (g0.formats !== undefined) {
        if (!Array.isArray(g0.formats) || !g0.formats.every(f => FORMATS[f])) { errors.push(`shot ${sh.i + 1} graphic #${k + 1}: "formats" must be a list of ${Object.keys(FORMATS).join(', ')}`); return; }
        if (!g0.formats.includes(fmtKey)) return;
      }
      // g["9:16"] = { ... } overrides any of the graphic's fields in that format.
      const g = (g0[fmtKey] && typeof g0[fmtKey] === 'object') ? { ...g0, ...g0[fmtKey] } : g0;
      const e = element(g, sh, k, errors, warnings);
      if (e) elements.push(e);
    });
  });
  // In 9:16 a panel can sit at the bottom ("place": "bottom"), where lower thirds and captions live.
  const portrait = fmt.h > fmt.w;
  const zone = e => (e.slot === 'panel' && portrait && e.place === 'bottom') ? 'bottom' : e.slot;
  const bottomish = z => z === 'lower' || z === 'captions' || z === 'bottom';
  // Main-slot text moves up while a lower third, captions or a bottom panel share the screen.
  for (const e of elements.filter(x => x.slot === 'main')) {
    e.high = elements.some(o => bottomish(zone(o)) && Math.min(o.until, e.until) - Math.max(o.at, e.at) > 0.05);
  }
  // Same-place overlaps are always a layout bug.
  for (let a = 0; a < elements.length; a++) for (let b = a + 1; b < elements.length; b++) {
    const x = elements[a], y = elements[b];
    const overlap = Math.min(x.until, y.until) - Math.max(x.at, y.at);
    const zx = zone(x), zy = zone(y);
    const clash = zx === zy || (bottomish(zx) && bottomish(zy));
    if (clash && overlap > 0.05) errors.push(`${x.where} and ${y.where} are on screen in the same place for ${overlap.toFixed(2)}s; move one of them`);
  }
  // Copy left as a [placeholder]
  for (const e of elements) for (const t of e.texts) if (PLACEHOLDER.test(t)) errors.push(`${e.where}: placeholder text left in: "${t}"`);
  if (end) for (const t of [end.title, end.tagline, end.url, end.sub]) if (PLACEHOLDER.test(t || '')) errors.push(`end card: placeholder text left in: "${t}"`);
  for (const t of [brand.name, brand.by, tl_disclosure(spec)]) if (PLACEHOLDER.test(t || '')) errors.push(`brand: placeholder text left in: "${t}"`);
  if (spec.disclosure === undefined) warnings.push('no "disclosure" set; using "AI-generated film"');

  return {
    format: fmtKey, tag: fmt.tag, w: fmt.w, h: fmt.h, fps, total, shots, elements, end, brand,
    disclosure: spec.disclosure === undefined ? 'AI-generated film' : spec.disclosure,
    slug: spec.slug || (dir ? path.basename(path.resolve(dir)) : 'film'), title: spec.title || spec.slug || 'Film',
    errors, warnings, missingClips,
  };
}

function element(g, sh, k, errors, warnings) {
  const where = `shot ${sh.i + 1} ${g.type || 'graphic'} #${k + 1}`;
  const slot = SLOTS[g.type];
  if (!slot) { errors.push(`${where}: unknown type "${g.type}" (use ${Object.keys(SLOTS).join(', ')})`); return null; }
  const at = num(g.at, 0.4), until = num(g.until, sh.dur - 0.2);
  if (!(until > at)) errors.push(`${where}: "until" must be after "at"`);
  if (at < 0 || until > sh.dur + 1e-6) errors.push(`${where}: window ${at}–${until}s is outside the shot (0–${sh.dur}s)`);
  const A = r3(sh.start + at), U = r3(sh.start + until);
  const e = { id: `s${sh.i + 1}g${k + 1}`, where, type: g.type, slot, shot: sh.i, at: A, until: U, verify: g.verify !== false, dim: g.dim, texts: [], cues: [] };
  if (slot === 'panel') {
    if (g.side !== undefined && g.side !== 'left' && g.side !== 'right') errors.push(`${where}: "side" must be "left" or "right"`);
    if (g.place !== undefined && g.place !== 'top' && g.place !== 'bottom') errors.push(`${where}: "place" must be "top" or "bottom"`);
    e.side = g.side === 'left' ? 'left' : 'right';     // landscape
    e.place = g.place === 'bottom' ? 'bottom' : 'top'; // portrait
  }
  const need = (v, name) => { if (typeof v !== 'string' || !v.trim()) errors.push(`${where}: "${name}" is required`); return v || ''; };
  const list = (v, name) => { if (!Array.isArray(v) || !v.length || !v.every(x => typeof x === 'string' && x.trim())) { errors.push(`${where}: "${name}" must be a list of text`); return []; } return v; };
  switch (g.type) {
    case 'headline': {
      const src = Array.isArray(g.lines) && g.lines.length ? g.lines : [{ at: at + 0.1, text: need(g.text, 'text') }];
      e.eyebrow = g.eyebrow ? html(g.eyebrow) : null;
      e.per = num(g.wordGap, 0.14);
      e.lines = src.map(l => ({ at: r3(sh.start + num(l.at, at + 0.1)), words: words(need(l.text, 'lines[].text')), text: l.text }));
      e.lines.forEach((l, j) => { l.end = j + 1 < e.lines.length ? e.lines[j + 1].at : U; });
      if (e.lines.some((l, j) => l.at < A || l.at >= l.end || (j && l.at <= e.lines[j - 1].at))) errors.push(`${where}: each line's "at" must be inside the headline window and in order`);
      e.sub = g.sub ? html(g.sub) : null;
      e.subAt = r3(sh.start + num(g.subAt, at + 0.6));
      e.texts = [g.eyebrow, ...src.map(l => l.text), g.sub].filter(Boolean);
      e.lines.forEach(l => e.cues.push({ at: l.at, until: l.end, text: plain(l.text) }));
      break;
    }
    case 'statement':
      e.html = html(need(g.text, 'text')); e.texts = [g.text];
      e.cues.push({ at: A, until: U, text: plain(g.text) });
      break;
    case 'card':
      e.eyebrow = g.eyebrow ? html(g.eyebrow) : null; e.html = html(need(g.text, 'text')); e.sub = g.sub ? html(g.sub) : null;
      e.texts = [g.eyebrow, g.text, g.sub].filter(Boolean);
      e.cues.push({ at: A, until: U, text: [plain(g.text), g.sub ? plain(g.sub) : ''].filter(Boolean).join('\n') });
      break;
    case 'checklist': {
      e.title = html(need(g.title, 'title')); e.items = list(g.items, 'items').map(html);
      const f0 = num(g.fillFrom, 0.4), f1 = num(g.fillTo, Math.max(f0 + 0.5, Math.min(3.8, until - at - 0.6)));
      e.fill = [r3(A + f0), r3(A + f1)];
      e.texts = [g.title, ...(g.items || [])];
      break;
    }
    case 'steps':
      e.items = list(g.items, 'items').map(html); e.texts = [...(g.items || [])];
      break;
    case 'lowerThird':
      e.name = html(need(g.name, 'name')); e.role = g.role ? html(g.role) : null; e.texts = [g.name, g.role].filter(Boolean);
      e.cues.push({ at: A, until: U, text: [plain(g.name), g.role ? plain(g.role) : ''].filter(Boolean).join(' · ') });
      break;
    case 'chips':
      e.items = list(g.items, 'items').map(html); e.texts = [...(g.items || [])];
      e.cues.push({ at: A, until: U, text: (g.items || []).map(plain).join(' · ') });
      break;
    case 'captions': {
      e.words = words(need(g.text, 'text')).filter(w => w !== null);
      e.perPage = Math.max(1, Math.round(num(g.perPage, 4)));
      e.texts = [g.text];
      // one cue per page, timed as the words are spread across the window
      const per = (U - A) / Math.max(1, e.words.length);
      const raw = plain(g.text).split(/\s+/);
      for (let p = 0; p < raw.length; p += e.perPage) e.cues.push({ at: r3(A + p * per), until: r3(A + Math.min(raw.length, p + e.perPage) * per), text: raw.slice(p, p + e.perPage).join(' ') });
      break;
    }
  }
  return e;
}

// Rough text-height planning lives in the browser (layout check); here only the cheap rules.
export function summarize(tl) {
  return `${tl.shots.length} shots · ${tl.total.toFixed(1)} s · ${tl.format} (${tl.w}×${tl.h}) · ${tl.fps} fps · ${tl.elements.length} graphics${tl.end ? ' + end card' : ''}`;
}
