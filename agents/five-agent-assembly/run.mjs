#!/usr/bin/env node
// Usage:
//   node run.mjs "<product idea>" [--out ./out] [--web] [--no-batch] [--verify]
//   node run.mjs collect <out-dir>     # fetch a shipper batch that outlived the run
import Anthropic from '@anthropic-ai/sdk'
import { spawnSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Conductor } from './conductor.mjs'
import { scout, architect, builder, tester, shipper, collectBatch } from './agents.mjs'
import { MODELS } from './models.mjs'

const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const opt = (name, fallback) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : fallback
}

const client = new Anthropic()

if (args[0] === 'collect') {
  const out = path.resolve(args[1] || './out')
  const { id } = JSON.parse(await readFile(path.join(out, 'shipper-batch.json'), 'utf8'))
  await collectBatch(client, new Conductor(out), id)
  console.log(`launch.md written to ${out}`)
  process.exit(0)
}

const idea = args.find((a, i) => !a.startsWith('--') && !['--out'].includes(args[i - 1]))
if (!idea) {
  console.error('Usage: node run.mjs "<product idea>" [--out ./out] [--web] [--no-batch] [--verify]')
  process.exit(1)
}
const out = path.resolve(opt('--out', './out'))

const jev = new Conductor(out)
jev
  .add(scout({ client, idea, web: flag('--web') }))
  .add(architect({ client }))
  .add(builder({ client }))
  .add(tester({ client }))
  .add(shipper({ client, batch: !flag('--no-batch') }))

console.log(`JEV Engineering: 5 agents, output in ${out}`)
for (const [agent, model] of Object.entries(MODELS)) console.log(`  ${agent.padEnd(9)} ${model}`)

let summary
try {
  summary = await jev.run()
} catch (err) {
  console.error(`\n✖ ${err.agent || 'conductor'}: ${err.message}`)
  process.exit(1)
}

let testLine = 'not run (pass --verify)'
if (flag('--verify')) {
  const r = spawnSync(process.execPath, ['--test'], { cwd: out, encoding: 'utf8' })
  const pass = /# pass (\d+)/.exec(r.stdout)?.[1]
  const fail = /# fail (\d+)/.exec(r.stdout)?.[1]
  testLine = r.status === 0 ? `passed (${pass} tests)` : `FAILED (${fail ?? '?'} failing, see output below)`
  if (r.status !== 0) console.log(r.stdout.slice(-4000), r.stderr.slice(-2000))
}

const s = (ms) => `${(ms / 1000).toFixed(1)}s`
const usd = (n) => (n == null ? 'unknown (model not in price table)' : `$${n.toFixed(4)}`)
const report = `# Five-agent run

Idea: ${idea}

| Deliverable | Status |
|---|---|
| Brief (brief.md) | done |
| Spec (spec.md) | done |
| Code (src/) | done |
| Tests (tests/) | written; ${testLine} |
| Launch plan (launch.md) | done |
| Paying customers | 0 (the agents do not produce these) |

## Time (measured this run)

| Agent | Model | Start | End |
|---|---|---|---|
${Object.entries(summary.timings).map(([a, t]) => `| ${a} | ${MODELS[a]} | ${s(t.start)} | ${s(t.end)} |`).join('\n')}

Wall clock: ${s(summary.wallMs)}. Same agent durations run back to back: ${s(summary.serialMs)}.

## API cost (measured from response usage)

| Agent | Served by | Input tok | Output tok | Batch | USD |
|---|---|---|---|---|---|
${summary.ledger.map((e) => `| ${e.agent} | ${e.model} | ${e.usage.input_tokens} | ${e.usage.output_tokens} | ${e.batch ? 'yes' : 'no'} | ${usd(e.usd)} |`).join('\n')}

Total: ${usd(summary.totalUsd)} at list prices in models.mjs. Your Anthropic invoice is the source of truth.
`
await writeFile(path.join(out, 'report.md'), report)
console.log(`\nWall ${s(summary.wallMs)} vs back-to-back ${s(summary.serialMs)} · API cost ${usd(summary.totalUsd)} · tests ${testLine}`)
console.log(`Report: ${path.join(out, 'report.md')}`)
