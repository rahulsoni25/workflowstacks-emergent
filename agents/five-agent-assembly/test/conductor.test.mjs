import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Conductor } from '../conductor.mjs'
import { parseFiles } from '../agents.mjs'
import { costOf } from '../models.mjs'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const fake = (name, needs, produces, ms) => ({
  name, needs, produces,
  async run(jev) { await sleep(ms); for (const f of produces) await jev.write(f, name) },
})

async function conductor() {
  return new Conductor(await mkdtemp(path.join(tmpdir(), 'jev-')), { log: () => {} })
}

test('agents start as soon as their files exist and run side by side', async () => {
  const jev = await conductor()
  jev.add(fake('scout', [], ['brief.md'], 30))
    .add(fake('architect', ['brief.md'], ['spec.md'], 30))
    .add(fake('builder', ['spec.md'], ['src/MANIFEST.json'], 80))
    .add(fake('tester', ['spec.md'], ['tests/MANIFEST.json'], 80))
    .add(fake('shipper', ['brief.md', 'spec.md'], ['launch.md'], 80))
  const s = await jev.run()
  const t = s.timings
  // each agent starts once its input file exists, not later than the next tick
  assert.ok(t.architect.start >= s.fileTimes['brief.md'])
  for (const a of ['builder', 'tester', 'shipper']) {
    assert.ok(t[a].start >= s.fileTimes['spec.md'])
    assert.ok(t[a].start - s.fileTimes['spec.md'] < 20)
  }
  // the three downstream agents overlap instead of queuing
  assert.ok(t.tester.start < t.builder.end && t.shipper.start < t.builder.end)
  assert.ok(s.wallMs < s.serialMs * 0.75, `wall ${s.wallMs}ms vs serial ${s.serialMs}ms`)
})

test('a missing producer is rejected before anything runs', async () => {
  const jev = await conductor()
  jev.add(fake('builder', ['spec.md'], ['src/x'], 1))
  await assert.rejects(() => jev.run(), /needs spec.md/)
})

test('an agent that fails to produce its file fails the run', async () => {
  const jev = await conductor()
  jev.add({ name: 'lazy', needs: [], produces: ['a.md'], run: async () => {} })
  await assert.rejects(() => jev.run(), /without producing a.md/)
})

test('parseFiles extracts blocks and blocks path escapes', () => {
  const text = '=== FILE: src/a.js ===\nexport const a = 1\n=== END FILE ===\n'
  assert.deepEqual(parseFiles(text, 'src/'), [['src/a.js', 'export const a = 1\n']])
  assert.throws(() => parseFiles(text.replace('src/a.js', 'src/../x.js'), 'src/'), /refusing/)
  assert.throws(() => parseFiles(text, 'tests/'), /refusing/)
  assert.throws(() => parseFiles('nothing', 'src/'), /no "=== FILE:"/)
})

test('costOf applies list price and the batch discount', () => {
  const usage = { input_tokens: 1_000_000, output_tokens: 1_000_000 }
  assert.equal(costOf('claude-sonnet-5', usage), 12)
  assert.equal(costOf('claude-haiku-4-5-20251001', usage, { batch: true }), 3)
  assert.equal(costOf('unknown-model', usage), null)
})
