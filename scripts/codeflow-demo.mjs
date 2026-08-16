// Quick local check of the deterministic Codeflow analysis against real repos.
// Usage: node scripts/codeflow-demo.mjs [owner/repo ...]
import { buildCodeflow } from '../lib/codeflow.js'

const targets = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['modelcontextprotocol/servers', 'anthropics/skills', 'browser-use/browser-use']

for (const t of targets) {
  const cf = await buildCodeflow(`https://github.com/${t}`, { fetchOpts: { cache: 'no-store' } })
  if (!cf) { console.log(`\n== ${t}: FAILED (rate limit or bad repo)`); continue }
  console.log(`\n== ${t}`)
  console.log(`  size: ${cf.size.label} · ${cf.size.loc_human} lines · ${cf.size.code_files} code files · ${cf.size.read_time || ''}`)
  console.log(`  setup: [${cf.setup.level}] ${cf.setup.label} — ${cf.setup.note}`)
  console.log(`  runtime: ${cf.runtime.join(', ') || '-'} · langs: ${cf.languages.map((l) => `${l.name} ${l.pct}%`).join(', ')}`)
  console.log(`  signals: ${Object.entries(cf.signals).filter(([, v]) => v).map(([k, v]) => (typeof v === 'string' ? `${k}=${v}` : k)).join(', ')}`)
  console.log(`  entry: ${cf.entry_points.join(', ') || '-'}`)
  console.log(`  folders: ${cf.folders.map((f) => `${f.path}/ (${f.files}, ${f.purpose || 'Module'})`).join(' | ')}`)
  console.log(`  read: ${cf.reading_order.map((r, i) => `${i + 1}. ${r.path} — ${r.why}`).join('\n        ')}`)
  console.log(`  truncated: ${cf.truncated}`)
}
