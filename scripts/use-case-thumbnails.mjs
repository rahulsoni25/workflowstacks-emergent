// Renders the "AI Digital Twin" thumbnails (video posters) for /ai-avatar/use-cases.
// Usage: node scripts/use-case-thumbnails.mjs <dir holding win-<slug>.jpg crops>
// Writes public/sites/founder-avatar-studio/use-cases/<slug>.jpg and prints each photo
// window's centre (%), which the page uses as --px/--py for the Play button.
// Every word on a poster is copied from the video's own on-screen text.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
// Playwright is not a project dependency: require() finds a global install via NODE_PATH,
// which a static ESM import would ignore.
const { chromium } = createRequire(import.meta.url)('playwright');
const DIR = path.resolve(process.argv[2] || '.');
const OUT = path.resolve('public/sites/founder-avatar-studio/use-cases');

const posters = [
  { slug: 'al-meeraj-why-choose', shape: 'v', win: '16/9', pos: '50% 50%', glow: 'rgba(255,74,28,.45)', dur: '1:12',
    eyebrow: 'Al Meeraj · Al Quoz, Dubai', name: 'D.K. Singh', role: 'Founder, Al Meeraj Auto Repairing Workshop',
    title: 'Why people choose Al Meeraj', chips: ['Experience', 'Honest repairs', 'Warranty', 'Courtesy car'] },
  { slug: 'al-meeraj-car-care-centre', shape: 'v', win: '16/9', pos: '50% 50%', glow: 'rgba(255,74,28,.45)', dur: '1:10',
    eyebrow: 'Al Meeraj · Al Quoz, Dubai', name: 'D.K. Singh', role: 'Founder, Al Meeraj Auto Repairing Workshop',
    title: 'Your complete car care centre', chips: ['All makes & models', 'Body & paint', 'Detailing & coatings', 'Wheels & upholstery'] },
  { slug: 'anil-sureen-birthday', shape: 'v', win: '1/1', pos: '50% 50%', glow: 'rgba(242,166,90,.45)', dur: '0:18',
    eyebrow: 'Birthday greeting', name: 'Dr. Anil Sureen', role: 'Happy Birthday',
    title: 'Here’s to a year of greater impact' },
  { slug: 'bougie-bloom', shape: 'h', win: '3/4', pos: '83% 50%', glow: 'rgba(229,143,176,.42)', dur: '0:13',
    eyebrow: 'Handcrafted edible blooms · Dubai', name: 'Bougie Bloom', role: '100% Belgian couverture chocolate',
    title: 'Beautifully crafted. Thoughtfully gifted.', site: 'bougiebloom.ae' },
  // HM360°: one film, two cuts (widescreen and the WhatsApp 9:16), same close-up at 0:44.
  { slug: 'hm360-film-16x9', shape: 'h', win: '3/4', pos: '50% 50%', glow: 'rgba(127,209,185,.40)', dur: '0:57',
    eyebrow: 'Insurance · Investments · Will', name: 'Hermith Mana', role: 'Founder, HM360°',
    title: 'Are there gaps between your policies?', site: 'hm360degree.com' },
  { slug: 'hm360-film-9x16', shape: 'v', win: '16/9', pos: '50% 50%', glow: 'rgba(127,209,185,.40)', dur: '0:57',
    eyebrow: 'Insurance · Investments · Will', name: 'Hermith Mana', role: 'Founder, HM360°',
    title: 'Are there gaps between your policies?', chips: ['Protection', 'Wealth & future', 'Group cover', 'Will & legacy planning'] },
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const css = `
*{box-sizing:border-box;margin:0}
body{background:#000}
.poster{position:relative;overflow:hidden;color:#F4EEE6;font-family:Archivo,Arial,sans-serif;
  background-color:#14111C;background-image:radial-gradient(110% 60% at 90% 0%,var(--glow),transparent 60%),linear-gradient(172deg,#2A2236 0%,#14111C 70%)}
.v{width:720px;height:1280px;padding:52px 48px;display:flex;flex-direction:column}
.h{width:1280px;height:720px;padding:48px 52px;display:grid;grid-template-columns:1fr auto;gap:48px}
.top{display:flex;justify-content:space-between;align-items:center}
.mark{display:flex;align-items:center;gap:14px;font-weight:600;font-size:30px;letter-spacing:-.01em}
.mark i{width:16px;height:16px;border-radius:50%;background:#FF4A1C;box-shadow:0 0 0 7px rgba(255,74,28,.2)}
.dur{font-family:"IBM Plex Mono",monospace;font-size:24px;letter-spacing:.08em;border:2px solid rgba(244,238,230,.4);border-radius:4px;padding:6px 12px}
.eyebrow{font-family:"IBM Plex Mono",monospace;font-size:24px;letter-spacing:.16em;text-transform:uppercase;color:#F2A65A;margin-top:52px}
.head{font-family:"Instrument Serif",Georgia,serif;font-weight:400;font-size:104px;line-height:1;letter-spacing:-.015em;margin-top:14px;white-space:nowrap}
.head em{color:#F2A65A}
.win{border-radius:20px;overflow:hidden;border:2px solid rgba(244,238,230,.22);background:#000}
.win img{display:block;width:100%;height:100%;object-fit:cover}
.v .win{width:100%;margin-top:44px}
.chips{display:flex;flex-wrap:wrap;gap:12px;margin-top:26px}
.chips span{font-family:"IBM Plex Mono",monospace;font-size:22px;letter-spacing:.08em;text-transform:uppercase;border:2px solid rgba(244,238,230,.3);border-radius:4px;padding:8px 14px;color:#E4DCEC}
.v .who{margin-top:auto}
.name{font-weight:600;font-size:56px;letter-spacing:-.015em;line-height:1.05}
.role{font-size:32px;color:#C9BFD3;margin-top:10px}
.rule{height:3px;width:72px;background:#FF4A1C;margin:30px 0 22px}
.title{font-family:"Instrument Serif",Georgia,serif;font-style:italic;font-size:46px;line-height:1.08}
.site{font-family:"IBM Plex Mono",monospace;font-size:24px;letter-spacing:.14em;text-transform:uppercase;color:#A99DB4;margin-top:18px}
.h .col{display:flex;flex-direction:column}
.h .eyebrow{margin-top:40px}
.h .head{font-size:112px}
.h .name{margin-top:auto}
.h .win{height:624px;aspect-ratio:3/4}
`;

function html(p) {
  const brand = `<div class="top"><span class="mark"><i></i>FluoDigital</span><span class="dur">▶ ${p.dur}</span></div>
    <p class="eyebrow">${esc(p.eyebrow)}</p>
    <h1 class="head">AI Digital <em>Twin</em></h1>`;
  const who = `<p class="name">${esc(p.name)}</p><p class="role">${esc(p.role)}</p><div class="rule"></div><p class="title">${esc(p.title)}</p>${p.site ? `<p class="site">${esc(p.site)}</p>` : ''}`;
  const win = `<div class="win" style="aspect-ratio:${p.win}"><img src="win-${p.slug}.jpg" style="object-position:${p.pos}"></div>`;
  const chips = p.chips ? `<div class="chips">${p.chips.map(c => `<span>${esc(c)}</span>`).join('')}</div>` : '';
  const body = p.shape === 'v'
    ? `<div class="poster v" style="--glow:${p.glow}">${brand}${win}${chips}<div class="who">${who}</div></div>`
    : `<div class="poster h" style="--glow:${p.glow}"><div class="col">${brand}${who}</div>${win}</div>`;
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=block">
<style>${css}</style></head><body>${body}</body></html>`;
}

(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1400, height: 1400 }, deviceScaleFactor: 1 });
  const centers = {};
  for (const p of posters) {
    const file = path.join(DIR, `poster-${p.slug}.html`);
    fs.writeFileSync(file, html(p));
    await page.goto('file://' + file, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const fam = await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family).join(','));
    const el = await page.$('.poster');
    const box = await el.boundingBox();
    const w = await (await page.$('.win')).boundingBox();
    centers[p.slug] = { x: +(((w.x - box.x) + w.width / 2) / box.width * 100).toFixed(1), y: +(((w.y - box.y) + w.height / 2) / box.height * 100).toFixed(1) };
    await el.screenshot({ path: path.join(OUT, `${p.slug}.jpg`), type: 'jpeg', quality: 82 });
    console.log(p.slug, `${box.width}x${box.height}`, 'fonts:', fam);
  }
  console.log('window centres (%):', JSON.stringify(centers));
  await b.close();
})();
