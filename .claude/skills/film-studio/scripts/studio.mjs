#!/usr/bin/env node
// film-studio: clips + a product page -> a finished, branded film.
// Usage: node studio.mjs <command> <project-folder> [options]   (run with no arguments for help)
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { load, setup, SKILL_DIR, findChrome, launchBrowser } from './lib/deps.mjs';
import { loadSpec, buildTimeline, summarize, FORMATS } from './lib/spec.mjs';
import * as media from './lib/media.mjs';
import { buildOverlay, renderFrames, renderOverlayStills, layoutCheck, fontsLoaded } from './lib/overlay.mjs';
import { loadSources, checkClaims } from './lib/claims.mjs';
import { srt, vtt } from './lib/subtitles.mjs';
import { plain } from './lib/text.mjs';

const HELP = `film-studio — Google Flow clips + a product page -> a finished branded film

  node studio.mjs <command> <project-folder> [options]

  new <dir> [--format 9:16]   create a project: film.json, clips/, sources/
  fetch <dir> [--refresh]     download clips that have a "url"; save product-page snapshots for "sources"
  probe <dir>                 list the clips and write contact sheets to out/sheets/ (look at them before writing copy)
  frames <dir>                export each shot's first and last frame to frames/ (Flow: Frames to Video, Ingredients)
  prompts <dir>               write prompts.md, the Google Flow shot list for this film
  check <dir> [--format F]    validate the spec, verify every number against the sources, test layout and contrast
  stills <dir> [--format F]   QA stills at every graphic, plus out/qa-<format>/sheet.jpg
  render <dir> [--format F]   master MP4, web MP4 (<= --max-mb, default 25), SRT, VTT, poster, QA sheet, report
  animatic <dir> [--format F] preview the plan before Flow has made the clips: labelled stand-in plates for
                              missing clips, the real graphics on top (out/<slug>-<format>-animatic-web.mp4)
  setup [--force]             install dependencies (done automatically on first use)

  --format takes 16:9, 9:16, a list such as 16:9,9:16, or all (check, stills, render and animatic)
  render options: --workers N (default 2)  --max-mb 25  --crf 18  --keep-frames  --allow-unsourced
`;

const log = (...a) => console.log(...a);
const fail = msg => { const e = new Error(msg); e.userFacing = true; throw e; };

function flags(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { o._.push(a); continue; }
    const [k, v] = a.slice(2).split('=');
    if (v !== undefined) o[k] = v;
    else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) o[k] = argv[++i];
    else o[k] = true;
  }
  return o;
}

const mb = n => (n / 1048576).toFixed(1) + ' MB';
const show = p => { const r = path.relative(process.cwd(), p); return !r ? '.' : r.startsWith('..') ? p : r; };
const sec = n => n.toFixed(2).replace(/\.?0+$/, '') + 's';

async function prepare(dir, o, { plates = false } = {}) {
  if (!dir) fail('Give the project folder, e.g. films/my-launch');
  const deps = load();
  const spec = loadSpec(dir);
  const probes = (spec.shots || []).map(s => (s.clip ? media.probe(deps.ff, path.resolve(dir, s.clip)) : { missing: true }));
  probes.forEach(p => { if (p.unreadable) p.missing = true; });
  const stand = plates ? await makePlates(dir, spec, probes, o.format || spec.format || '16:9', deps) : {};
  const tl = buildTimeline(spec, probes, { format: o.format, dir, skillDir: SKILL_DIR });
  for (const [i, file] of Object.entries(stand)) tl.shots[+i].file = file;
  tl.animatic = plates;
  tl.standIns = Object.keys(stand).map(i => +i + 1);
  return { deps, spec, tl };
}

// Stand-in plates for clips Flow has not made yet: a dark card in the brand colours with the shot
// number, its label and how to make it, held for the shot's planned length. The real graphics,
// timing and transitions run on top, so the plan can be watched before any credits are spent.
async function makePlates(dir, spec, probes, fmtKey, deps) {
  const fmt = FORMATS[fmtKey] || FORMATS['16:9'];
  const tag = fmt.tag, W = fmt.w, H = fmt.h;
  const pdir = path.join(outDir(dir), `.animatic-${tag}`);
  fs.rmSync(pdir, { recursive: true, force: true }); fs.mkdirSync(pdir, { recursive: true });
  const brand = { ink: '#0A0C0D', paper: '#F3F3EC', accent: '#C6F24E', ...(spec.brand || {}) };
  const fps = typeof spec.fps === 'number' ? spec.fps : 24;
  const todo = (spec.shots || []).map((s, i) => ({ s, i })).filter(({ i }) => probes[i].missing);
  const made = {};
  if (!todo.length) return made;
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const browser = await launchBrowser(deps.chromium);
  try {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    for (const { s, i } of todo) {
      // exactly the planned length, so the animatic is timed like check times the plan
      const len = typeof s.out === 'number' ? s.out : (typeof s.in === 'number' ? s.in : 0) + 8;
      const how = s.startFrame ? `Frames to Video from ${s.startFrame}` : s.ingredients ? 'Ingredients to Video' : 'Text to Video';
      const about = s.label || (s.prompt ? String(s.prompt).slice(0, 110) + (String(s.prompt).length > 110 ? '…' : '') : '');
      const grid = [1, 2].map(k => `<div style="position:absolute;left:${k * 33.333}%;top:0;bottom:0;width:1px;background:rgba(255,255,255,.07)"></div><div style="position:absolute;top:${k * 33.333}%;left:0;right:0;height:1px;background:rgba(255,255,255,.07)"></div>`).join('');
      await page.setContent(`<html><body style="margin:0"><div style="position:relative;width:${W}px;height:${H}px;overflow:hidden;background:linear-gradient(160deg,${brand.ink} 0%,#26262e 100%);font-family:Arial,sans-serif;color:${brand.paper}">${grid}
        <div style="position:absolute;left:0;right:0;top:${Math.round(H * 0.36)}px;text-align:center;font-size:${Math.round(W * 0.11)}px;font-weight:700;opacity:.13;letter-spacing:.04em">SHOT ${i + 1}</div>
        <div style="position:absolute;left:8%;right:8%;top:${Math.round(H * 0.17)}px;text-align:center;opacity:.55">
          <div style="font-size:${Math.round(W * 0.0125) + 8}px;letter-spacing:.22em;color:${brand.accent}">STAND-IN · MAKE IN GOOGLE FLOW · ${esc(how).toUpperCase()}</div>
          <div style="margin-top:14px;font-size:${Math.round(W * 0.012) + 12}px;line-height:1.35">${esc(about)}</div>
          <div style="margin-top:10px;font-size:${Math.round(W * 0.01) + 8}px;opacity:.8">${esc(s.clip)} · ${len.toFixed(1)} s</div>
        </div></div></body></html>`);
      const png = path.join(pdir, `${String(i + 1).padStart(2, '0')}.png`), mp4 = png.replace(/\.png$/, '.mp4');
      await page.screenshot({ path: png, clip: { x: 0, y: 0, width: W, height: H } });
      media.run(deps.ff, ['-y', '-loop', '1', '-framerate', String(fps), '-t', len.toFixed(2), '-i', png, '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'stillimage', '-pix_fmt', 'yuv420p', mp4]);
      probes[i] = media.probe(deps.ff, mp4);
      made[i] = mp4;
    }
  } finally { await browser.close(); }
  return made;
}

const workDir = (dir, tl) => path.join(dir, 'out', `.work-${tl.tag}`);
const outDir = dir => path.join(dir, 'out');

// Contrast guard: text without its own box gets a dim layer when the footage behind it is bright.
const REGION = {
  landscape: { main: { x0: .03, y0: .56, x1: .80, y1: .86 }, high: { x0: .03, y0: .44, x1: .80, y1: .73 }, center: { x0: .12, y0: .32, x1: .88, y1: .68 }, captions: { x0: .1, y0: .80, x1: .9, y1: .93 } },
  portrait: { main: { x0: .05, y0: .52, x1: .95, y1: .71 }, high: { x0: .05, y0: .44, x1: .95, y1: .63 }, center: { x0: .05, y0: .38, x1: .95, y1: .62 }, captions: { x0: .05, y0: .70, x1: .95, y1: .79 } },
};
const THRESH = { main: 0.6, center: 0.5, captions: 0.58, chips: 0.5 };
function contrast(ff, tl) {
  const notes = [];
  const orient = tl.h > tl.w ? 'portrait' : 'landscape';
  for (const e of tl.elements) {
    if (e.dim === true) { e.dim = 0.8; continue; }
    if (tl.shots[e.shot].src && tl.shots[e.shot].src.missing) { e.dim = typeof e.dim === 'number' ? Math.max(0, Math.min(1, e.dim)) : 0; continue; }
    if (e.dim === false) { e.dim = 0; continue; }
    if (typeof e.dim === 'number') { e.dim = Math.max(0, Math.min(1, e.dim)); continue; }
    if (!['main', 'center', 'captions'].includes(e.slot)) { e.dim = 0; continue; }
    const sh = tl.shots[e.shot];
    const mid = (e.at + e.until) / 2;
    let region = REGION[orient][e.slot === 'main' && e.high ? 'high' : e.slot];
    if (e.band) region = e.high ? { x0: .05, y0: Math.max(0, (e.band.top - 340) / tl.h), x1: .95, y1: Math.max(.05, (e.band.top - 40) / tl.h) }
      : { x0: .05, y0: Math.min(.95, (e.band.bottom + 40) / tl.h), x1: .95, y1: Math.min(1, (e.band.bottom + 340) / tl.h) };
    const L = media.luma(ff, sh.file, sh.in + (mid - sh.start), { w: tl.w, h: tl.h, fit: sh.fit, fx: sh.focus, fy: sh.focusY, bg: tl.brand.ink, id: 'l' }, region);
    e.luma = L;
    if (L !== null && L > THRESH[e.slot]) {
      e.dim = Math.max(0.3, Math.min(0.85, (L - 0.35) / 0.35));
      notes.push(`${e.where}: footage behind the text is bright (luminance ${L.toFixed(2)}), added a dim layer ${e.dim.toFixed(2)}`);
    } else e.dim = 0;
  }
  return notes;
}

function sampleTimes(tl) {
  const pts = [];
  for (const e of tl.elements) {
    if (e.lines && e.lines.length > 1) for (const l of e.lines) pts.push({ t: Math.min(l.end - 0.05, l.at + 0.25 + 0.14 * 10), label: `${e.where} · "${plain(l.text).slice(0, 40)}"` });
    else pts.push({ t: Math.min(e.until - 0.1, Math.max((e.at + e.until) / 2, e.at + 1.4)), label: e.where });
  }
  if (tl.end) pts.push({ t: tl.end.start + Math.min(tl.end.duration - 0.2, 1.6), label: 'end card' });
  pts.sort((a, b) => a.t - b.t);
  const out = [];
  for (const p of pts) if (!out.length || p.t - out[out.length - 1].t > 0.3) out.push(p);
  return out;
}

function shotAt(tl, t) {
  if (tl.end && t >= tl.end.start + tl.shots[tl.shots.length - 1].transition.duration) return null;
  let s = tl.shots[0];
  for (const x of tl.shots) if (t >= x.start) s = x;
  return s;
}

function printIssues(tl) {
  for (const e of tl.errors) log(`  error  ${e}`);
  for (const e of tl.missingClips) log(`  error  ${e}`);
  for (const w of tl.warnings) log(`  note   ${w}`);
}

function claimsBlock(dir, spec, tl) {
  const sources = loadSources(dir, spec);
  const c = checkClaims(tl, sources, spec);
  const bad = c.results.filter(r => !r.found);
  return { ...c, bad };
}

function printClaims(c) {
  if (!c.results.length) { log(`  ok     claims: no numbers on screen${c.sources ? '' : ' (and no source snapshots)'}`); return; }
  if (!c.sources) log('  error  claims: no source snapshot found; add "sources" and run fetch, or save the page text to sources/');
  for (const m of c.missingSources) log(`  note   source snapshot missing: ${m}`);
  if (!c.bad.length) log(`  ok     claims: ${c.results.length} number(s) on screen, all found in the sources`);
  for (const r of c.bad) log(`  error  claim "${r.claim}" (${r.where}) is not in any source snapshot`);
}

async function cmdCheck(dir, o, { quiet = false } = {}) {
  const { deps, spec, tl } = await prepare(dir, o, { plates: !!o.animatic });
  log(`${o.animatic ? 'animatic' : 'check'} ${show(dir)}: ${summarize(tl)}`);
  if (tl.standIns && tl.standIns.length) log(`  note   stand-in plates for shot${tl.standIns.length > 1 ? 's' : ''} ${tl.standIns.join(', ')} (no clip yet)`);
  printIssues(tl);
  if (tl.errors.length) return { ok: false, tl };
  const c = claimsBlock(dir, spec, tl);
  printClaims(c);
  const dims = contrast(deps.ff, tl);
  for (const d of dims) log(`  note   ${d}`);
  const html = path.join(workDir(dir, tl), 'overlay.html');
  const { missingFonts, fontNotes } = buildOverlay({ tl, base: deps.base, dir, outFile: html });
  for (const f of missingFonts) log(`  error  font "${f}" is not available from Fontsource; set brand.fontFiles or pick another family`);
  for (const n of fontNotes) log(`  warn   ${n}`);
  const browser = await launchBrowser(deps.chromium);
  let notLoaded = [];
  try { notLoaded = await fontsLoaded(browser, html, tl); } finally { await browser.close(); }
  for (const f of notLoaded) log(`  note   font "${f}" did not load in the browser; text will fall back to Arial`);
  const layout = await layoutCheck({ chromium: deps.chromium, htmlFile: html, tl });
  for (const w of layout) log(`  warn   ${w}`);
  if (!layout.length) log('  ok     layout: no text off-frame or overlapping');
  const unsourced = c.bad.length > 0 || (c.results.length > 0 && !c.sources);
  const planOk = !missingFonts.length && (!unsourced || o['allow-unsourced']);
  const ok = planOk && !tl.missingClips.length;
  if (!quiet) {
    if (ok) log('check passed');
    else if (planOk) log(`plan checked: everything else passes; ${tl.missingClips.length} clip(s) still to generate or download, then run probe and check again`);
    else log('check failed');
  }
  return { ok, tl, spec, deps, claims: c, dims, layout: [...fontNotes, ...layout], html };
}

async function cmdStills(dir, o) {
  const r = await cmdCheck(dir, o, { quiet: true });
  if (!r.tl || r.tl.errors.length) fail('Fix the errors above first.');
  if (r.tl.missingClips.length) fail(`${r.tl.missingClips.length} clip(s) missing: generate them in Flow, save them in clips/, then run stills again.`);
  const { tl, deps, html } = r;
  const qa = path.join(outDir(dir), `qa-${tl.tag}`);
  fs.rmSync(qa, { recursive: true, force: true }); fs.mkdirSync(qa, { recursive: true });
  const pts = o.at ? String(o.at).split(',').map(Number).filter(Number.isFinite).map(t => ({ t, label: `t=${t}` })) : sampleTimes(tl);
  const ovs = await renderOverlayStills({ chromium: deps.chromium, htmlFile: html, tl, times: pts.map(p => p.t), outDir: path.join(workDir(dir, tl), 'stills') });
  const files = [];
  pts.forEach((p, k) => {
    const sh = shotAt(tl, p.t);
    const out = path.join(qa, `still-${String(k + 1).padStart(2, '0')}.jpg`);
    if (sh) media.composite(deps.ff, { file: sh.file, t: sh.in + (p.t - sh.start), overlay: ovs[k], out, w: tl.w, h: tl.h, fit: sh.fit, fx: sh.focus, fy: sh.focusY, bg: tl.brand.ink, id: 'c' });
    else media.composite(deps.ff, { overlay: ovs[k], out, w: tl.w, h: tl.h, black: true });
    files.push(out);
    log(`  still-${String(k + 1).padStart(2, '0')}.jpg  ${p.t.toFixed(2)}s  ${p.label}`);
  });
  media.sheet(deps.ff, files, path.join(qa, 'sheet.jpg'), tl.h > tl.w ? 4 : 3);
  log(`stills: ${files.length} in ${show(qa)}/ (sheet.jpg shows them all)`);
}

async function cmdRender(dir, o) {
  const t0 = Date.now();
  const r = await cmdCheck(dir, o, { quiet: true });
  if (!r.tl || r.tl.errors.length) fail('Fix the errors above before rendering.');
  if (r.tl.missingClips.length) fail(`Render stopped: ${r.tl.missingClips.length} clip(s) missing. Generate them in Flow, save them in clips/, then render again.`);
  if (!r.ok) fail(r.claims.bad.length || !r.claims.sources ? 'Render stopped: numbers on screen must come from the source snapshots (or pass --allow-unsourced).' : 'Render stopped: fix the font errors above.');
  const { tl, deps, spec, html } = r;
  const work = workDir(dir, tl), out = outDir(dir);
  fs.mkdirSync(out, { recursive: true });
  const kind = tl.animatic ? `${tl.tag}-animatic` : tl.tag;
  const base = `${tl.slug}-${kind}`;
  const files = { master: path.join(out, `${base}-master.mp4`), web: path.join(out, `${base}-web.mp4`), srt: path.join(out, `${base}.srt`), vtt: path.join(out, `${base}.vtt`), poster: path.join(out, `${base}-poster.jpg`), report: path.join(out, `report-${kind}.md`) };
  if (tl.animatic) { delete files.srt; delete files.vtt; }
  const workers = Math.max(1, Math.min(8, parseInt(o.workers || '2', 10) || 2));
  log(`render: ${summarize(tl)}`);
  log(`  drawing graphics with ${workers} worker(s)`);
  const n = await renderFrames({ chromium: deps.chromium, htmlFile: html, tl, outDir: path.join(work, 'ov'), workers, log });
  log('  packing graphics');
  const overlayFile = media.packOverlay(deps.ff, path.join(work, 'ov', '%05d.png'), tl.fps, path.join(work, 'overlay.mov'));
  log(`  assembling ${tl.shots.length} shots + graphics + audio`);
  media.renderFilm(deps.ff, tl, { overlayFile, out: files.master, audio: resolveAudio(dir, spec.audio), crf: parseInt(o.crf || '18', 10) });
  const frames = media.countFrames(deps.ff, files.master);
  if (frames !== null && Math.abs(frames - n) > 2) fail(`the master has ${frames} video frames, the timeline needs ${n}; rerun with --keep-frames and report this`);
  log('  web version');
  const maxMb = parseFloat(o['max-mb'] || '25');
  media.encodeWeb(deps.ff, files.master, files.web, tl.total, maxMb);
  if (files.srt) { fs.writeFileSync(files.srt, srt(tl)); fs.writeFileSync(files.vtt, vtt(tl)); }
  const posterT = spec.poster ?? (tl.elements.find(e => e.type === 'statement') ? (e => (e.at + e.until) / 2)(tl.elements.find(e => e.type === 'statement')) : tl.total * 0.4);
  media.frame(deps.ff, files.master, posterT, files.poster);
  // QA sheet from the finished master, so it shows exactly what ships
  const qa = path.join(out, `qa-${kind}`);
  fs.rmSync(qa, { recursive: true, force: true }); fs.mkdirSync(qa, { recursive: true });
  const pts = sampleTimes(tl), stills = [];
  pts.forEach((p, k) => { const f = path.join(qa, `still-${String(k + 1).padStart(2, '0')}.jpg`); media.frame(deps.ff, files.master, p.t, f); stills.push(f); });
  media.sheet(deps.ff, stills, path.join(qa, 'sheet.jpg'), tl.h > tl.w ? 4 : 3);
  const pr = media.probe(deps.ff, files.master);
  report(files, tl, spec, r, pr, pts, maxMb, dir, kind);
  if (!o['keep-frames']) { fs.rmSync(work, { recursive: true, force: true }); if (tl.animatic) fs.rmSync(path.join(out, `.animatic-${tl.tag}`), { recursive: true, force: true }); }
  log(`done in ${Math.round((Date.now() - t0) / 1000)}s`);
  for (const [k, f] of Object.entries(files)) if (f && fs.existsSync(f)) log(`  ${k.padEnd(6)} ${show(f)}  ${mb(fs.statSync(f).size)}`);
  log(`  qa     ${show(path.join(qa, 'sheet.jpg'))}`);
  if (pr.duration && Math.abs(pr.duration - tl.total) > 0.15) log(`  warn   master is ${pr.duration.toFixed(2)}s, timeline says ${tl.total}s`);
  log(`  frames ${n} at ${tl.fps} fps`);
}

function resolveAudio(dir, a = {}) {
  const r = { ...a };
  for (const k of ['music', 'voiceover']) if (a[k] && a[k].file) {
    const f = path.resolve(dir, a[k].file);
    if (!fs.existsSync(f)) fail(`audio.${k}.file not found: ${a[k].file}`);
    r[k] = { ...a[k], file: f };
  }
  return r;
}

function report(files, tl, spec, r, pr, pts, maxMb, dir, kind = tl.tag) {
  const rel = f => path.relative(path.dirname(files.report), f);
  const L = [];
  L.push(`# ${tl.title} (${tl.format}${tl.animatic ? ', animatic' : ''})`, '', `Rendered ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC · ${tl.total.toFixed(2)} s · ${tl.w}×${tl.h} · ${tl.fps} fps`, '');
  if (tl.animatic && tl.standIns.length) L.push(`Animatic: shots ${tl.standIns.join(', ')} are stand-in plates until their clips exist. Faces and bright areas cannot be judged on a plate; check them again on the real clips.`, '');
  L.push('## Files', '', '| File | Size |', '| --- | --- |');
  for (const k of ['master', 'web', 'srt', 'vtt', 'poster']) if (files[k] && fs.existsSync(files[k])) L.push(`| ${rel(files[k])} | ${mb(fs.statSync(files[k]).size)} |`);
  L.push('', `The web file is encoded to stay under ${maxMb} MB.`, '');
  L.push('## Timeline', '', '| # | Clip | Used | Starts at | Into next |', '| --- | --- | --- | --- | --- |');
  tl.shots.forEach(s => L.push(`| ${s.i + 1} | ${s.clip} | ${sec(s.in)}–${sec(s.out)} | ${sec(s.start)} | ${s.transition ? `${s.transition.type} ${sec(s.transition.duration)}` : '—'} |`));
  if (tl.end) L.push(`| end | end card | ${sec(tl.end.duration)} | ${sec(tl.end.start)} | — |`);
  L.push('', '## Graphics', '', '| On screen | Type | Text |', '| --- | --- | --- |');
  for (const e of tl.elements) L.push(`| ${sec(e.at)}–${sec(e.until)} | ${e.type}${e.dim ? ' (dimmed)' : ''} | ${e.texts.map(plain).join(' / ').replace(/\n/g, ' ').replace(/\|/g, '\\|')} |`);
  L.push('', '## Claims check', '');
  const c = r.claims;
  L.push(c.results.length ? `${c.results.length} number(s) on screen checked against ${c.sources} source snapshot(s); ${c.bad.length} not found.` : 'No numbers on screen.', '');
  if (c.results.length) {
    L.push('| Claim | Where | Found in | Context |', '| --- | --- | --- | --- |');
    for (const x of c.results) L.push(`| ${x.claim} | ${x.where} | ${x.found ? x.source : '**not found**'} | ${x.found ? x.context.replace(/\|/g, '\\|') : ''} |`);
    L.push('');
  }
  L.push('Numbers written as words are not checked.', '');
  L.push('## Layout and contrast', '');
  if (!r.dims.length && !r.layout.length) L.push('No text off-frame or overlapping; no automatic dimming needed.');
  for (const d of r.dims) L.push(`- ${d}`);
  for (const w of r.layout) L.push(`- warning: ${w}`);
  L.push('', '## Sources', '');
  for (const s of spec.sources || []) L.push(`- ${s.url || '(no url)'} → ${s.file || '(no snapshot)'}`);
  L.push('', '## QA stills', '', `![QA sheet](${rel(path.join(path.dirname(files.report), `qa-${kind}`, 'sheet.jpg'))})`, '');
  pts.forEach((p, k) => L.push(`${k + 1}. ${p.t.toFixed(2)}s · ${p.label}`));
  fs.writeFileSync(files.report, L.join('\n') + '\n');
}

function cmdProbe(dir) {
  const { deps, spec } = { deps: load(), spec: loadSpec(dir) };
  const sheets = path.join(outDir(dir), 'sheets');
  fs.mkdirSync(sheets, { recursive: true });
  log('| # | Clip | Length | Size | fps | Audio | Used |');
  log('| --- | --- | --- | --- | --- | --- | --- |');
  spec.shots.forEach((s, i) => {
    const f = path.resolve(dir, s.clip || '');
    const p = media.probe(deps.ff, f);
    if (p.missing || p.unreadable) { log(`| ${i + 1} | ${s.clip} | missing${s.url ? ' (has url: run fetch)' : ''} | | | | |`); return; }
    const sheet = path.join(sheets, `${String(i + 1).padStart(2, '0')}.jpg`);
    media.contactSheet(deps.ff, f, p.duration, sheet);
    log(`| ${i + 1} | ${s.clip} | ${sec(p.duration)} | ${p.w}×${p.h} | ${p.fps ?? '?'} | ${p.hasAudio ? 'yes' : 'no'} | ${sec(s.in ?? 0)}–${sec(s.out ?? p.duration)} |`);
  });
  log(`contact sheets: ${show(sheets)}/NN.jpg (10 frames per clip, evenly spaced, left to right then the second row)`);
}

function cmdFrames(dir) {
  const { ff } = load();
  const spec = loadSpec(dir);
  const fr = path.join(dir, 'frames');
  fs.mkdirSync(fr, { recursive: true });
  spec.shots.forEach((s, i) => {
    const f = path.resolve(dir, s.clip || '');
    const p = media.probe(ff, f);
    if (p.missing || p.unreadable) { log(`  shot ${i + 1}: clip missing, skipped`); return; }
    const nn = String(i + 1).padStart(2, '0');
    const a = s.in ?? 0, b = Math.max(0, Math.min(p.duration, s.out ?? p.duration) - 0.06);
    media.frame(ff, f, a, path.join(fr, `${nn}-first.png`));
    media.frame(ff, f, b, path.join(fr, `${nn}-last.png`));
    log(`  ${nn}-first.png (${sec(a)})  ${nn}-last.png (${sec(b)})`);
  });
  log(`frames in ${show(fr)}/: use NN-last.png as the start frame of the next shot in Flow (Frames to Video) for a seamless join`);
}

function cmdPrompts(dir) {
  const spec = loadSpec(dir);
  const fmt = spec.format || '16:9';
  const L = [`# Google Flow shot list: ${spec.title || spec.slug || path.basename(dir)}`, '',
    `Format ${fmt}. Generate each shot in Flow, download it at the highest resolution offered, and save it under the file name shown.`,
    'For a seamless join, start a shot from the previous shot\'s last frame (Frames to Video); run `frames` after each download to export it.', ''];
  spec.shots.forEach((s, i) => {
    const nn = String(i + 1).padStart(2, '0');
    L.push(`## Shot ${i + 1} → ${s.clip || `clips/${nn}.mp4`}`, '');
    L.push(s.prompt ? `> ${String(s.prompt).replace(/\n/g, '\n> ')}` : '> (no prompt written yet)', '');
    const meta = [`aspect ${fmt}`];
    if (s.in !== undefined || s.out !== undefined) meta.push(`the film uses ${sec(s.in ?? 0)}–${s.out !== undefined ? sec(s.out) : 'end'}`);
    if (s.startFrame) meta.push(`start frame: ${s.startFrame}`);
    if (s.ingredients) meta.push(`ingredients: ${[].concat(s.ingredients).join(', ')}`);
    L.push(`- ${meta.join(' · ')}`);
    if (s.dialogue) L.push(`- spoken line: "${s.dialogue}"`);
    if (s.continuity) L.push(`- continuity: ${s.continuity}`);
    const g = (s.graphics || []).map(x => x.type).join(', ');
    if (g) L.push(`- graphics over this shot: ${g}; keep the ${fmt === '9:16' ? 'middle third' : 'lower third and the centre'} free of busy detail`);
    if (s.transition) L.push(`- joins the next shot with: ${s.transition.type || 'fade'} ${s.transition.duration ?? 0.5}s`);
    L.push('');
  });
  const out = path.join(dir, 'prompts.md');
  fs.writeFileSync(out, L.join('\n'));
  log(`wrote ${show(out)} (${spec.shots.length} shots)`);
}

function directUrl(u) {
  const d = u.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (d) return `https://drive.google.com/uc?export=download&id=${d[1]}`;
  if (/dropbox\.com/.test(u)) return u.replace(/([?&])dl=0/, '$1dl=1');
  return u;
}

function htmlToText(h) {
  return h.replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h\d|section|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}

async function cmdFetch(dir, o) {
  const spec = loadSpec(dir);
  let missing = 0;
  const seen = new Set();
  for (const [i, s] of spec.shots.entries()) {
    const f = path.resolve(dir, s.clip || '');
    if (!s.clip || seen.has(f)) continue;
    seen.add(f);
    if (fs.existsSync(f) && !o.refresh) continue;
    if (!s.url) { log(`  missing  shot ${i + 1}: ${s.clip} (no url to download from)`); missing++; continue; }
    fs.mkdirSync(path.dirname(f), { recursive: true });
    const res = await fetch(directUrl(s.url), { redirect: 'follow', headers: { 'user-agent': 'film-studio/1.0' } });
    const type = res.headers.get('content-type') || '';
    if (!res.ok || /text\/html/.test(type)) { log(`  failed   shot ${i + 1}: ${s.url} → HTTP ${res.status} ${type}`); missing++; continue; }
    await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(f));
    log(`  fetched  ${s.clip} (${mb(fs.statSync(f).size)})`);
  }
  for (const src of spec.sources || []) {
    if (!src.url || !src.file) continue;
    if (/^\[/.test(src.url)) { log(`  skipped  source ${src.file}: replace the placeholder url in film.json`); continue; }
    const f = path.resolve(dir, src.file);
    if (fs.existsSync(f) && !o.refresh) { log(`  source   ${src.file} (kept; --refresh to re-fetch)`); continue; }
    try {
      const res = await fetch(src.url, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 film-studio/1.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = htmlToText(await res.text());
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, `Source: ${src.url}\nFetched: ${new Date().toISOString()}\n\n${text}\n`);
      log(`  source   ${src.file} ← ${src.url} (${text.length} chars)`);
    } catch (e) { log(`  failed   source ${src.url}: ${e.message}${fs.existsSync(f) ? ' (keeping the old snapshot)' : ''}`); }
  }
  if (missing) fail(`${missing} clip(s) could not be found or downloaded.`);
  log('fetch done');
}

function cmdNew(dir, o) {
  if (!dir) fail('Give a folder for the new project, e.g. films/my-launch');
  if (fs.existsSync(path.join(dir, 'film.json'))) fail(`${dir}/film.json already exists`);
  const format = FORMATS[o.format] ? o.format : '16:9';
  for (const d of ['clips', 'sources']) fs.mkdirSync(path.join(dir, d), { recursive: true });
  const slug = path.basename(path.resolve(dir));
  const spec = JSON.parse(fs.readFileSync(path.join(SKILL_DIR, 'references', 'starter-film.json'), 'utf8'));
  spec.slug = slug; spec.format = format;
  fs.writeFileSync(path.join(dir, 'film.json'), JSON.stringify(spec, null, 2) + '\n');
  log(`created ${dir}/film.json (${format}), clips/ and sources/`);
  log('next: put clips in clips/, save the product page text in sources/ (or set sources[].url and run fetch), then probe');
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const o = flags(rest);
  const dir = o._[0] ? path.resolve(o._[0]) : null;
  switch (cmd) {
    case 'setup': {
      const base = setup({ force: !!o.force });
      const { chromium } = load();
      const chrome = findChrome(chromium);
      log(`dependencies: ${base}`);
      log(chrome ? `chromium: ${chrome}` : `chromium: not found. Run: ${path.join(base, 'node_modules', '.bin', 'playwright-core')} install chromium`);
      return;
    }
    case 'new': return cmdNew(dir, o);
    case 'fetch': return cmdFetch(dir, o);
    case 'probe': return cmdProbe(dir);
    case 'frames': return cmdFrames(dir);
    case 'prompts': return cmdPrompts(dir);
    case 'check': case 'stills': case 'render': case 'animatic': {
      // --format may list several formats (16:9,9:16) or say all; each runs in turn
      const list = o.format === 'all' ? Object.keys(FORMATS) : String(o.format || '').split(',').map(x => x.trim()).filter(Boolean);
      for (const f of list) if (!FORMATS[f]) fail(`Unknown format "${f}". Use 16:9, 9:16, a list such as 16:9,9:16, or all.`);
      let ok = true;
      for (const f of (list.length ? list : [undefined])) {
        const oo = { ...o, format: f, animatic: cmd === 'animatic' };
        if (list.length > 1) log(`\n=== ${f}`);
        if (cmd === 'check') { const r = await cmdCheck(dir, oo); ok = r.ok && ok; }
        else if (cmd === 'stills') await cmdStills(dir, oo);
        else await cmdRender(dir, oo);
      }
      if (cmd === 'check') process.exitCode = ok ? 0 : 1;
      return;
    }
    default: log(HELP); if (cmd && cmd !== 'help' && cmd !== '--help') process.exitCode = 1;
  }
}

main().catch(e => { console.error(e.userFacing ? `film-studio: ${e.message}` : e.stack || String(e)); process.exitCode = 1; });
