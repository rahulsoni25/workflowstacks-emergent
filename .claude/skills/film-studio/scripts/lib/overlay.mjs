// Builds the overlay page (brand tokens, fonts, logo, timeline) from the template and
// renders it with headless Chromium: transparent PNG frames for the film, single frames
// for QA stills, and a layout probe that flags off-frame or colliding text.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { esc, html } from './text.mjs';
import { SKILL_DIR, fontPackage, ensureFonts, launchBrowser } from './deps.mjs';

const TEMPLATE = path.join(SKILL_DIR, 'template', 'overlay.html');
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => '#' + hexRgb(a).map((v, i) => Math.round(v + (hexRgb(b)[i] - v) * t).toString(16).padStart(2, '0')).join('');
const rgba = (h, a) => `rgba(${hexRgb(h).join(',')},${a})`;

function dataUri(file) {
  const ext = path.extname(file).toLowerCase();
  const type = ext === '.svg' ? 'image/svg+xml' : ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  return `data:${type};base64,${fs.readFileSync(file).toString('base64')}`;
}

export function fontCss(base, brand, dir) {
  const custom = new Map((brand.fontFiles || []).map(f => [f.family, f]));
  const fams = [...new Set([brand.fonts.display, brand.fonts.body, brand.fonts.mono])];
  const fromNpm = fams.filter(f => !custom.has(f));
  const missing = [];
  const weights = {};   // family -> upright weights available
  const addW = (fam, w) => { (weights[fam] = weights[fam] || new Set()).add(+w); };
  try { ensureFonts(base, fromNpm); } catch (e) { /* reported per family below */ }
  const rules = [];
  for (const fam of fromNpm) {
    const pdir = path.join(base, 'node_modules', '@fontsource', fontPackage(fam), 'files');
    if (!fs.existsSync(pdir)) { missing.push(fam); continue; }
    for (const f of fs.readdirSync(pdir)) {
      const m = f.match(/-latin-(\d{3})-(normal|italic)\.woff2$/);
      if (!m) continue;
      rules.push(`@font-face{font-family:"${fam}";font-weight:${m[1]};font-style:${m[2]};font-display:block;src:url("${pathToFileURL(path.join(pdir, f)).href}") format("woff2")}`);
      if (m[2] === 'normal') addW(fam, m[1]);
    }
  }
  for (const f of brand.fontFiles || []) {
    const file = path.resolve(dir, f.file);
    if (!fs.existsSync(file)) { missing.push(f.family); continue; }
    rules.push(`@font-face{font-family:"${f.family}";font-weight:${f.weight || 400};font-style:${f.style || 'normal'};font-display:block;src:url("${pathToFileURL(file).href}")}`);
    if ((f.style || 'normal') === 'normal') addW(f.family, f.weight || 400);
  }
  // The display font is drawn at brand.fonts.displayWeight (default 700); without that weight
  // the browser fakes a bold, which looks smeared on serif display faces.
  const notes = [];
  const dfam = brand.fonts.display, dw = brand.fonts.displayWeight || 700;
  if (weights[dfam] && !weights[dfam].has(dw)) {
    notes.push(`display font "${dfam}" has no weight ${dw}; the browser will fake it. Set brand.fonts.displayWeight to one of: ${[...weights[dfam]].sort((a, b) => a - b).join(', ')}`);
  }
  return { css: rules.join('\n'), missing, notes };
}

function endHtml(e, logo) {
  const long = e.title.length > 14 ? ' long' : '';
  const mark = logo
    ? `<img class="elogo" src="${logo}" alt=""><div class="et${long}">${html(e.title)}</div>`
    : `<div class="mark"><span class="dot"></span><div class="et${long}">${html(e.title)}</div></div>`;
  return `<div class="inner">${mark}${e.tagline ? `<div class="tag">${html(e.tagline)}</div>` : ''}${e.url ? `<div class="url">${esc(e.url)}</div>` : ''}${e.sub ? `<div class="sub2 mono">${html(e.sub)}</div>` : ''}</div>` +
    (e.note ? `<div class="note mono">${html(e.note)}</div>` : '');
}

const PICK = ['id', 'type', 'slot', 'at', 'until', 'dim', 'high', 'band', 'side', 'place', 'eyebrow', 'lines', 'per', 'sub', 'subAt', 'html', 'title', 'items', 'fill', 'name', 'role', 'words', 'perPage'];

export function buildOverlay({ tl, base, dir, outFile }) {
  const b = tl.brand;
  const { css, missing, notes } = fontCss(base, b, dir);
  const logo = b.logoFile ? dataUri(b.logoFile) : null;
  const brandHtml = (logo ? `<img class="logo" src="${logo}" alt="">` : '<span class="dot"></span>') +
    `<span class="bn">${esc(b.name)}</span>` + (b.by ? `<span class="by mono">${esc(b.by)}</span>` : '');
  const vars = `--ink:${b.ink};--paper:${b.paper};--accent:${b.accent};--accent-soft:${mix(b.accent, '#ffffff', 0.5)};--muted:${rgba(b.paper, 0.76)};` +
    `--fd:"${b.fonts.display}",Arial,sans-serif;--fb:"${b.fonts.body}",Arial,sans-serif;--fm:"${b.fonts.mono}",Menlo,Consolas,monospace;` +
    `--fdw:${b.fonts.displayWeight || 700};`;
  const film = {
    w: tl.w, h: tl.h, portrait: tl.h > tl.w, brandHtml, disclosure: tl.disclosure ? esc(tl.disclosure) : null,
    end: tl.end ? { start: tl.end.start, duration: tl.end.duration, html: endHtml(tl.end, logo) } : null,
    elements: tl.elements.map(e => Object.fromEntries(PICK.filter(k => e[k] !== undefined).map(k => [k, e[k]]))),
  };
  const page = fs.readFileSync(TEMPLATE, 'utf8')
    .replace('/*FONTS*/', css).replace('/*VARS*/', vars)
    .replace('/*FILM*/', `window.FILM=${JSON.stringify(film).replace(/</g, '\\u003c')};`);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, page);
  return { missingFonts: missing, fontNotes: notes };
}

async function openPage(browser, htmlFile, w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e)));
  await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'load' });
  // Browsers fetch a font face only when visible text uses it; graphics that appear later in
  // the film would otherwise be drawn before their font arrives. Load every face up front.
  await page.evaluate(async () => { await Promise.all([...document.fonts].map(f => f.load().catch(() => null))); await document.fonts.ready; });
  const ready = await page.evaluate(() => window.READY === true);
  if (!ready) throw new Error('overlay page failed to start: ' + (errors.join('; ') || 'unknown error'));
  return page;
}

export async function fontsLoaded(browser, htmlFile, tl) {
  const page = await openPage(browser, htmlFile, tl.w, tl.h);
  const fams = [...new Set([tl.brand.fonts.display, tl.brand.fonts.body, tl.brand.fonts.mono])];
  const res = await page.evaluate(f => f.map(x => [x, [...document.fonts].some(ff => ff.family.replace(/^["']|["']$/g, '') === x && ff.status === 'loaded')]), fams);
  await page.close();
  return res.filter(([, ok]) => !ok).map(([f]) => f);
}

export async function renderFrames({ chromium, htmlFile, tl, outDir, workers = 2, log = () => {} }) {
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(outDir)) if (f.endsWith('.png')) fs.rmSync(path.join(outDir, f));
  const n = Math.round(tl.total * tl.fps);
  const browser = await launchBrowser(chromium);
  try {
    const W = Math.max(1, Math.min(workers, n));
    const chunk = Math.ceil(n / W);
    let done = 0, nextLog = 0.1;
    await Promise.all(Array.from({ length: W }, async (_, k) => {
      const page = await openPage(browser, htmlFile, tl.w, tl.h);
      for (let i = k * chunk; i < Math.min(n, (k + 1) * chunk); i++) {
        await page.evaluate(t => window.setTime(t), i / tl.fps);
        await page.screenshot({ path: path.join(outDir, `${String(i).padStart(5, '0')}.png`), omitBackground: true, clip: { x: 0, y: 0, width: tl.w, height: tl.h } });
        done++;
        if (done / n >= nextLog) { log(`  graphics ${Math.round(100 * done / n)}% (${done}/${n} frames)`); nextLog += 0.1; }
      }
      await page.close();
    }));
  } finally { await browser.close(); }
  return n;
}

export async function renderOverlayStills({ chromium, htmlFile, tl, times, outDir }) {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await launchBrowser(chromium);
  const files = [];
  try {
    const page = await openPage(browser, htmlFile, tl.w, tl.h);
    for (const [k, t] of times.entries()) {
      await page.evaluate(x => window.setTime(x), t);
      const f = path.join(outDir, `ov-${String(k).padStart(2, '0')}.png`);
      await page.screenshot({ path: f, omitBackground: true, clip: { x: 0, y: 0, width: tl.w, height: tl.h } });
      files.push(f);
    }
  } finally { await browser.close(); }
  return files;
}

// Samples each graphic once it is fully on screen and reports text that leaves the safe
// frame or collides with other text, the brand pill or the AI disclosure.
export async function layoutCheck({ chromium, htmlFile, tl }) {
  const browser = await launchBrowser(chromium);
  const warnings = new Set();
  try {
    const page = await openPage(browser, htmlFile, tl.w, tl.h);
    const times = [];
    for (const e of tl.elements) {
      if (e.lines) for (const l of e.lines) times.push(Math.min(l.end - 0.05, l.at + 0.6 + 0.14 * 12));
      times.push(Math.min(e.until - 0.05, e.at + 1.2));
    }
    const M = 16;
    const name = id => (id === 'brand' ? 'the brand pill' : id === 'disclosure' ? 'the AI disclosure chip' : (tl.elements.find(e => e.id === id) || {}).where || id);
    for (const t of times) {
      const boxes = await page.evaluate(x => window.layout(x), t);
      for (const b of boxes) {
        if (b.x < M || b.y < M || b.x + b.w > tl.w - M || b.y + b.h > tl.h - M) warnings.add(`${name(b.id)} runs outside the frame at ${t.toFixed(1)}s`);
      }
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], c = boxes[j];
        const ix = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x), iy = Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y);
        if (ix > 4 && iy > 4) warnings.add(`${name(a.id)} overlaps ${name(c.id)} at ${t.toFixed(1)}s`);
      }
    }
  } finally { await browser.close(); }
  return [...warnings];
}
