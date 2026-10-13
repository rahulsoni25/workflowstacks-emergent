// ffmpeg helpers: probing, frames, contact sheets, luminance sampling, the single-pass
// film render (trim, fit, transitions, overlay, audio) and the web encode.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export function run(ff, args) {
  const r = spawnSync(ff, ['-hide_banner', '-loglevel', 'error', ...args], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) {
    const tail = String(r.stderr || '').split('\n').filter(Boolean).slice(-8).join('\n  ');
    throw new Error(`ffmpeg failed:\n  ${tail || 'exit ' + r.status}`);
  }
  return r;
}

export function probe(ff, file) {
  if (!fs.existsSync(file)) return { missing: true };
  const r = spawnSync(ff, ['-hide_banner', '-i', file], { encoding: 'utf8' });
  const s = String(r.stderr || '');
  const d = s.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);
  const v = s.match(/Stream #\d+:\d+[^\n]*?Video: ([^\s,]+)[^\n]*?, (\d{2,5})x(\d{2,5})/);
  if (!d || !v) return { missing: false, unreadable: true, error: 'not a readable video' };
  const fps = s.match(/, (\d+(?:\.\d+)?) fps/);
  return {
    missing: false, duration: +d[1] * 3600 + +d[2] * 60 + +d[3], codec: v[1], w: +v[2], h: +v[3],
    fps: fps ? +fps[1] : null, hasAudio: /Stream #\d+:\d+[^\n]*?Audio:/.test(s), bytes: fs.statSync(file).size,
  };
}

// Exact number of video frames, by decoding the stream (container durations include audio).
export function countFrames(ff, file) {
  const r = spawnSync(ff, ['-hide_banner', '-i', file, '-map', '0:v:0', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const m = String(r.stderr || '').split(/[\r\n]/).filter(l => l.startsWith('frame=')).pop();
  const k = m && m.match(/frame=\s*(\d+)/);
  return k ? +k[1] : null;
}

// Cover-fit any source into the target frame; focus picks which part of a crop is kept.
export const fit = (w, h, fx = 0.5, fy = 0.5) =>
  `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}:(iw-${w})*${fx}:(ih-${h})*${fy},setsar=1`;

// Filter graph from [src] to [dst] that puts a clip into the w×h frame:
//   cover    fill the frame and crop (focus picks the part kept)
//   contain  show the whole clip, bars in the brand ink colour
//   blur     show the whole clip over a blurred, darkened copy of itself (wide shots in 9:16)
export function fitGraph(src, dst, w, h, { fit: mode = 'cover', fx = 0.5, fy = 0.5, bg = '#000000', id = 'fit' } = {}) {
  if (mode === 'contain') {
    return `[${src}]scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=${bg.replace('#', '0x')},setsar=1[${dst}]`;
  }
  if (mode === 'blur') {
    const sw = 2 * Math.round(w / 16), sh = 2 * Math.round(h / 16);
    return `[${src}]split=2[${id}a][${id}b];` +
      `[${id}a]scale=${sw}:${sh}:force_original_aspect_ratio=increase,crop=${sw}:${sh},boxblur=6:2,scale=${w}:${h},eq=brightness=-0.1:saturation=0.85,setsar=1[${id}bg];` +
      `[${id}b]scale=${w}:${h}:force_original_aspect_ratio=decrease,setsar=1[${id}fg];` +
      `[${id}bg][${id}fg]overlay=(W-w)/2:(H-h)/2:format=auto,setsar=1[${dst}]`;
  }
  return `[${src}]${fit(w, h, fx, fy)}[${dst}]`;
}

export function frame(ff, file, t, out) {
  run(ff, ['-y', '-ss', String(Math.max(0, t)), '-i', file, '-frames:v', '1', out]);
}

export function contactSheet(ff, file, duration, out) {
  const rate = (10 / Math.max(0.5, duration)).toFixed(5);
  run(ff, ['-y', '-i', file, '-vf', `fps=${rate},scale=384:-2,tile=5x2`, '-frames:v', '1', '-q:v', '3', out]);
}

// Mean luminance (0..1) of a region of the fitted frame; region in fractions {x0,y0,x1,y1}.
// fitOpts: {w, h, fit, fx, fy, bg}
export function luma(ff, file, t, fitOpts, region) {
  const gw = fitOpts.w >= fitOpts.h ? 96 : 54, gh = fitOpts.w >= fitOpts.h ? 54 : 96;
  const graph = `${fitGraph('0:v', 'f', fitOpts.w, fitOpts.h, fitOpts)};[f]scale=${gw}:${gh},format=gray[o]`;
  const r = spawnSync(ff, ['-hide_banner', '-loglevel', 'error', '-ss', String(Math.max(0, t)), '-i', file,
    '-filter_complex', graph, '-map', '[o]', '-frames:v', '1', '-f', 'rawvideo', '-'], { maxBuffer: 8 * 1024 * 1024 });
  if (r.status !== 0 || !r.stdout || r.stdout.length < gw * gh) return null;
  const buf = r.stdout;
  const x0 = Math.floor(region.x0 * gw), x1 = Math.ceil(region.x1 * gw), y0 = Math.floor(region.y0 * gh), y1 = Math.ceil(region.y1 * gh);
  let sum = 0, n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { sum += buf[y * gw + x]; n++; }
  return n ? sum / n / 255 : null;
}

// One QA still: the fitted source frame (or black for the end card) with an overlay PNG on top.
export function composite(ff, { file, t, overlay, out, w, h, black = false, ...fitOpts }) {
  const inputs = black ? ['-f', 'lavfi', '-i', `color=c=black:s=${w}x${h}:d=1`] : ['-ss', String(Math.max(0, t)), '-i', file];
  const base = black ? '[0:v]format=yuv420p[b]' : fitGraph('0:v', 'b', w, h, fitOpts);
  run(ff, ['-y', ...inputs, '-i', overlay, '-filter_complex', `${base};[b][1:v]overlay=0:0:format=auto`, '-frames:v', '1', '-q:v', '3', out]);
}

// Grid of stills (in order) as one JPEG. Each still is first scaled to the same size and
// pixel format: ffmpeg restarts the tile filter when the format changes mid-sequence
// (end-card stills are 4:2:0, stills over footage can be 4:4:4), which loses the grid.
export function sheet(ff, images, out, cols = 3) {
  if (!images.length) return;
  const tmp = fs.mkdtempSync(path.join(path.dirname(out), '.sheet-'));
  try {
    images.forEach((f, i) => run(ff, ['-y', '-i', f, '-vf', 'scale=640:-2,format=rgb24', path.join(tmp, `${String(i).padStart(4, '0')}.png`)]));
    const rows = Math.ceil(images.length / cols);
    run(ff, ['-y', '-framerate', '1', '-i', path.join(tmp, '%04d.png'),
      '-vf', `tile=${cols}x${rows}:padding=8:color=0x111111`, '-frames:v', '1', '-update', '1', '-q:v', '3', out]);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

const AFMT = 'aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo';

// Chromium writes a fully opaque frame (an end card) as a PNG without alpha. Fed straight into
// the film graph, that pixel-format change makes ffmpeg re-initialise the whole graph mid-film:
// timestamps restart at zero and the film is cut short (or ffmpeg 7.0 aborts on an assertion).
// Packing the frames into one RGBA video first keeps the format constant; the re-initialisation
// is harmless in this simple pass because nothing in it keeps state.
export function packOverlay(ff, pattern, fps, out) {
  run(ff, ['-y', '-framerate', String(fps), '-i', pattern, '-vf', 'format=rgba', '-c:v', 'png', '-pix_fmt', 'rgba', '-f', 'mov', out]);
  return out;
}

// One ffmpeg pass: trims, fits, crossfades, end card, overlay frames, mixed and normalised audio.
export function renderFilm(ff, tl, { overlayFile, out, audio = {}, crf = 18, preset = 'medium', dry = false }) {
  const args = ['-y'];
  const f = [];
  tl.shots.forEach(s => args.push('-i', s.file));
  let n = tl.shots.length;
  const ov = n++; args.push('-i', overlayFile);
  let mus = -1, vo = -1;
  if (audio.music && audio.music.file) { mus = n++; args.push('-stream_loop', '-1', '-i', audio.music.file); }
  if (audio.voiceover && audio.voiceover.file) { vo = n++; args.push('-i', audio.voiceover.file); }
  const clipAudio = audio.clipAudio !== false;

  // Every clip is padded by a second before it is trimmed, so the trim always ends the stream
  // itself: each shot is exactly its planned length even when a clip's picture or sound is a
  // little shorter than the container says, and the audio never drifts against the picture.
  tl.shots.forEach((s, i) => {
    f.push(`[${i}:v]tpad=stop_mode=clone:stop_duration=1,trim=start=${s.in}:end=${s.out},setpts=PTS-STARTPTS,fps=${tl.fps}[p${i}]`);
    f.push(fitGraph(`p${i}`, `q${i}`, tl.w, tl.h, { fit: s.fit, fx: s.focus, fy: s.focusY, bg: tl.brand.ink, id: `fit${i}` }));
    f.push(`[q${i}]format=yuv420p[v${i}]`);
    if (clipAudio && s.hasAudio) f.push(`[${i}:a]${AFMT},apad=pad_dur=1,atrim=start=${s.in}:end=${s.out},asetpts=PTS-STARTPTS,volume=${s.gain}[a${i}]`);
    else f.push(`aevalsrc=0:c=stereo:s=48000:d=${s.dur},${AFMT}[a${i}]`);
  });
  let v = 'v0', a = 'a0';
  for (let i = 1; i < tl.shots.length; i++) {
    const tr = tl.shots[i - 1].transition;
    f.push(`[${v}][v${i}]xfade=transition=${tr.type}:duration=${tr.duration}:offset=${tl.shots[i].start}[xv${i}]`); v = `xv${i}`;
    f.push(`[${a}][a${i}]acrossfade=d=${tr.duration}[xa${i}]`); a = `xa${i}`;
  }
  if (tl.end) {
    const tr = tl.shots[tl.shots.length - 1].transition;
    f.push(`color=c=black:s=${tl.w}x${tl.h}:r=${tl.fps}:d=${tl.end.duration + tr.duration},format=yuv420p[blk]`);
    f.push(`[${v}][blk]xfade=transition=${tr.type}:duration=${tr.duration}:offset=${tl.end.start}[xvend]`); v = 'xvend';
  }
  f.push(`[${v}][${ov}:v]overlay=0:0:format=auto:eof_action=pass,format=yuv420p[vout]`);

  const total = tl.total;
  const fadeAt = Math.max(0, (tl.end ? tl.end.start : total) - 1.4);
  f.push(`[${a}]afade=t=out:st=${fadeAt.toFixed(3)}:d=1.4,apad=whole_dur=${total}[bed]`);
  let mix = 'bed';
  if (mus >= 0) {
    const g = typeof audio.music.gainDb === 'number' ? audio.music.gainDb : -18;
    f.push(`[${mus}:a]atrim=0:${total},asetpts=PTS-STARTPTS,${AFMT},volume=${g}dB,afade=t=in:d=1,afade=t=out:st=${Math.max(0, total - 2.5).toFixed(3)}:d=2.5[mus]`);
    f.push(`[${mix}][mus]amix=inputs=2:duration=first:normalize=0[bm]`); mix = 'bm';
  }
  if (vo >= 0) {
    const ms = Math.round(1000 * (audio.voiceover.at || 0));
    f.push(`[${vo}:a]${AFMT},adelay=${ms}|${ms},apad=whole_dur=${total},atrim=0:${total}[vo]`, '[vo]asplit=2[vo1][vo2]');
    f.push(`[${mix}][vo1]sidechaincompress=threshold=0.015:ratio=8:attack=15:release=350[duck]`, '[duck][vo2]amix=inputs=2:duration=first:normalize=0[vm]'); mix = 'vm';
  }
  f.push(`[${mix}]loudnorm=I=${typeof audio.loudness === 'number' ? audio.loudness : -16}:TP=-1.5:LRA=11,aresample=48000[aout]`);

  args.push('-filter_complex', f.join(';'), '-map', '[vout]', '-map', '[aout]', '-t', String(total), '-r', String(tl.fps),
    '-c:v', 'libx264', '-crf', String(crf), '-preset', preset, '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-ar', '48000', '-b:a', '192k', '-movflags', '+faststart', out);
  if (dry) return args;
  run(ff, args);
  return args;
}

// Re-encode to a target size (default 25 MB) so the file can be sent in chat or uploaded anywhere.
// A master already under the limit is copied as it is; otherwise the bitrate is chosen to fit,
// and never above 8 Mbps, which is plenty for 1080p on the web.
export function encodeWeb(ff, master, out, total, maxMb = 25) {
  if (fs.statSync(master).size <= maxMb * 1048576) { fs.copyFileSync(master, out); return 'copy'; }
  let factor = 0.92;
  for (let attempt = 0; attempt < 3; attempt++) {
    const vk = Math.min(8000, Math.max(700, Math.floor((maxMb * 1048576 * 8 * factor / total - 160000) / 1000)));
    run(ff, ['-y', '-i', master, '-c:v', 'libx264', '-b:v', `${vk}k`, '-maxrate', `${Math.floor(vk * 1.2)}k`, '-bufsize', `${vk * 2}k`,
      '-preset', 'slow', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', out]);
    if (fs.statSync(out).size <= maxMb * 1048576) return vk;
    factor *= 0.85;
  }
  return null;
}
