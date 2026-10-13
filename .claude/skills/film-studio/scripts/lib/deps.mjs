// Locates (and on first run installs) the engine's dependencies, and finds a Chromium.
//
// Dependencies live next to the skill when its folder is writable (Claude Code, a
// repo checkout), otherwise in STUDIO_HOME (~/.cache/film-studio), so an installed,
// read-only copy of the skill still works.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const STUDIO_HOME = process.env.STUDIO_HOME || path.join(os.homedir(), '.cache', 'film-studio');
const CORE = ['playwright-core', 'ffmpeg-static'];

const has = (base, id) => fs.existsSync(path.join(base, 'node_modules', ...id.split('/'), 'package.json'));
const writable = dir => { try { fs.accessSync(dir, fs.constants.W_OK); return true; } catch { return false; } };
export const fontPackage = family => String(family).trim().toLowerCase().replace(/\s+/g, '-');

function npm(args, cwd, quiet) {
  const bin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const r = spawnSync(bin, args, { cwd, stdio: quiet ? 'pipe' : 'inherit', encoding: 'utf8', shell: process.platform === 'win32' });
  if (r.status !== 0) throw new Error(`npm ${args.join(' ')} failed in ${cwd}${r.stderr ? ': ' + String(r.stderr).trim().slice(-500) : ''}`);
}

export function depBase() {
  for (const b of [SKILL_DIR, STUDIO_HOME]) if (CORE.every(id => has(b, id))) return b;
  return null;
}

export function setup({ quiet = false, force = false } = {}) {
  const found = depBase();
  if (found && !force) return found;
  const target = writable(SKILL_DIR) ? SKILL_DIR : STUDIO_HOME;
  if (target !== SKILL_DIR) {
    fs.mkdirSync(target, { recursive: true });
    for (const f of ['package.json', 'package-lock.json']) {
      const src = path.join(SKILL_DIR, f);
      if (fs.existsSync(src)) fs.copyFileSync(src, path.join(target, f));
    }
  }
  if (!quiet) console.log(`film-studio: installing dependencies into ${target} (first run only)`);
  const lock = fs.existsSync(path.join(target, 'package-lock.json'));
  npm([lock ? 'ci' : 'install', '--no-audit', '--no-fund'], target, quiet);
  return target;
}

// Brand fonts come from Fontsource (npm); a family that is not bundled is fetched on demand.
export function ensureFonts(base, families) {
  const missing = [...new Set(families.map(fontPackage))].filter(p => !has(base, `@fontsource/${p}`));
  if (missing.length) npm(['install', '--no-audit', '--no-fund', '--no-save', ...missing.map(p => `@fontsource/${p}@5`)], base, true);
}

export function load() {
  const base = setup();
  const req = createRequire(path.join(base, 'package.json'));
  const { chromium } = req('playwright-core');
  const ff = process.env.STUDIO_FFMPEG || req('ffmpeg-static');
  if (!ff || (!process.env.STUDIO_FFMPEG && !fs.existsSync(ff))) {
    throw new Error('ffmpeg binary is missing. Run: node scripts/studio.mjs setup --force');
  }
  return { base, chromium, ff };
}

// Chromium: STUDIO_CHROME, Playwright's own download, any Playwright cache, then an installed Chrome.
export function findChrome(chromium) {
  const env = process.env.STUDIO_CHROME;
  if (env && fs.existsSync(env)) return env;
  try { const p = chromium.executablePath(); if (p && fs.existsSync(p)) return p; } catch { /* not downloaded */ }
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, path.join(os.homedir(), '.cache', 'ms-playwright'),
    path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright'), path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright')].filter(Boolean);
  const rels = ['chrome-linux/chrome', 'chrome-linux64/chrome', 'chrome-linux/headless_shell', 'chrome-headless-shell-linux64/chrome-headless-shell',
    'chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium', 'chrome-win/chrome.exe', 'chrome-win64/chrome.exe'];
  for (const r of roots) {
    if (!fs.existsSync(r)) continue;
    const dirs = fs.readdirSync(r).filter(d => /^chromium(_headless_shell)?-\d+$/.test(d))
      .sort((a, b) => (a.includes('headless') - b.includes('headless')) || (+b.split('-').pop() - +a.split('-').pop()));
    for (const d of dirs) for (const rel of rels) { const p = path.join(r, d, rel); if (fs.existsSync(p)) return p; }
  }
  for (const p of ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe']) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export async function launchBrowser(chromium) {
  const executablePath = findChrome(chromium);
  if (!executablePath) {
    throw new Error('No Chromium found. Install one with:\n  ' + path.join(depBase() || SKILL_DIR, 'node_modules', '.bin', 'playwright-core') +
      ' install chromium\nor set STUDIO_CHROME to a Chrome executable.');
  }
  return chromium.launch({ executablePath, args: ['--allow-file-access-from-files', '--disable-gpu', '--font-render-hinting=none', '--hide-scrollbars'] });
}
