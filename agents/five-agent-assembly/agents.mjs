// The five agents. Each one reads the files it needs from the conductor and
// writes the files it owns; the conductor decides when each one starts.
import { MODELS, costOf } from './models.mjs'

const GROUNDING = `Do not invent facts, numbers, customers, testimonials, quotes or URLs. \
If you do not have a source for a claim, label it "hypothesis" or leave it out.`

function textOf(message) {
  return message.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
}

function check(agent, message) {
  if (message.stop_reason === 'refusal') {
    const cat = message.stop_details?.category ?? 'unspecified'
    throw new Error(`${agent}: model declined the request (category: ${cat})`)
  }
  if (message.stop_reason === 'max_tokens') {
    throw new Error(`${agent}: output hit max_tokens and is truncated; raise max_tokens and rerun`)
  }
}

// Files come back as:  === FILE: src/x.js ===\n...\n=== END FILE ===
export function parseFiles(text, allowedPrefix) {
  const files = []
  const re = /^=== FILE: (.+?) ===\n([\s\S]*?)\n=== END FILE ===$/gm
  let m
  while ((m = re.exec(text))) {
    const file = m[1].trim()
    if (!file.startsWith(allowedPrefix) || file.includes('..') || file.startsWith('/')) {
      throw new Error(`refusing to write ${file}: outside ${allowedPrefix}`)
    }
    files.push([file, m[2] + '\n'])
  }
  if (!files.length) throw new Error(`no "=== FILE:" blocks found in the response`)
  return files
}

const FILE_FORMAT = `Return every file in this exact format and nothing else:
=== FILE: <relative path> ===
<file contents>
=== END FILE ===`

// Scout — Haiku 4.5. Reads the market and writes brief.md.
export function scout({ client, idea, web }) {
  return {
    name: 'scout',
    needs: [],
    produces: ['brief.md'],
    async run(jev) {
      const model = MODELS.scout
      const tools = web ? [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }] : undefined
      const messages = [{
        role: 'user',
        content: `Product idea: ${idea}

Write a market brief in Markdown: target customer, the problem, existing alternatives, \
positioning, a pricing hypothesis, and open risks. ${web
  ? 'Use web search. Put the source URL next to every factual claim.'
  : 'You have no web access, so every market claim is a hypothesis to be validated; say so.'} ${GROUNDING}`,
      }]
      let message
      for (let turn = 0; turn < 5; turn++) {
        message = await client.messages.create({ model, max_tokens: 8000, tools, messages })
        jev.record({ agent: 'scout', model: message.model, usage: message.usage, usd: costOf(message.model, message.usage) })
        if (message.stop_reason !== 'pause_turn') break
        messages.push({ role: 'assistant', content: message.content })
      }
      check('scout', message)
      await jev.write('brief.md', textOf(message))
    },
  }
}

// Architect — Opus 5. Turns the brief into spec.md, including an exact
// interface so builder and tester can work from it at the same time.
export function architect({ client }) {
  return {
    name: 'architect',
    needs: ['brief.md'],
    produces: ['spec.md'],
    async run(jev) {
      const message = await client.beta.messages
        .stream({
          model: MODELS.architect,
          max_tokens: 32000,
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          thinking: { type: 'adaptive' },
          output_config: { effort: 'high' },
          messages: [{
            role: 'user',
            content: `<brief>\n${jev.read('brief.md')}\n</brief>

Write spec.md for the smallest shippable version of this product, as a Node.js (ESM, no \
dependencies beyond the standard library) module. Include:
- Scope and explicit non-goals
- "## Interface": every exported function, file path under src/, parameters, return \
values and thrown errors, precise enough that tests can be written without seeing the code
- Acceptance criteria as a numbered list
${GROUNDING}`,
          }],
        })
        .finalMessage()
      jev.record({ agent: 'architect', model: message.model, usage: message.usage, usd: costOf(message.model, message.usage) })
      check('architect', message)
      await jev.write('spec.md', textOf(message))
    },
  }
}

async function sonnetFiles(client, jev, agent, prompt, prefix) {
  const message = await client.messages
    .stream({
      model: MODELS[agent],
      max_tokens: 64000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      messages: [{ role: 'user', content: prompt }],
    })
    .finalMessage()
  jev.record({ agent, model: message.model, usage: message.usage, usd: costOf(message.model, message.usage) })
  check(agent, message)
  const files = parseFiles(textOf(message), prefix)
  // Write the manifest last: the conductor treats it as "this agent's output is complete".
  for (const [file, body] of files) await jev.write(file, body)
  await jev.write(`${prefix}MANIFEST.json`, JSON.stringify(files.map(([f]) => f), null, 2) + '\n')
}

// Builder — Sonnet 5. Implements the spec under src/.
export function builder({ client }) {
  return {
    name: 'builder',
    needs: ['spec.md'],
    produces: ['src/MANIFEST.json'],
    run: (jev) => sonnetFiles(client, jev, 'builder', `<spec>\n${jev.read('spec.md')}\n</spec>

Implement this spec exactly as its Interface section describes. Only write files under src/. \
${FILE_FORMAT}`, 'src/'),
  }
}

// Tester — Sonnet 5. Writes tests from the spec alone, in parallel with the builder.
export function tester({ client }) {
  return {
    name: 'tester',
    needs: ['spec.md'],
    produces: ['tests/MANIFEST.json'],
    run: (jev) => sonnetFiles(client, jev, 'tester', `<spec>\n${jev.read('spec.md')}\n</spec>

Write tests for this spec using node:test and node:assert/strict, importing from ../src/ \
paths exactly as the Interface section names them. You will not see the implementation: test \
the spec, one test per acceptance criterion plus edge cases. Only write files under tests/, \
named *.test.mjs. ${FILE_FORMAT}`, 'tests/'),
  }
}

// Shipper — Haiku 4.5 through the Message Batches API (50% price). Batches are
// asynchronous: most finish within an hour, the API allows up to 24 hours.
export function shipper({ client, batch = true, pollMs = 20_000, maxWaitMs = 60 * 60_000 }) {
  return {
    name: 'shipper',
    needs: ['brief.md', 'spec.md'],
    produces: ['launch.md'],
    async run(jev) {
      const params = {
        model: MODELS.shipper,
        max_tokens: 8000,
        messages: [{
          role: 'user',
          content: `<brief>\n${jev.read('brief.md')}\n</brief>\n<spec>\n${jev.read('spec.md')}\n</spec>

Write launch.md: landing-page copy (headline, subhead, three benefits taken from the spec), \
a launch-day checklist, and a first-100-customers outreach plan. The product has zero users \
today: no testimonials, logos, user counts or revenue figures. ${GROUNDING}`,
        }],
      }
      if (!batch) {
        const message = await client.messages.create(params)
        jev.record({ agent: 'shipper', model: message.model, usage: message.usage, usd: costOf(message.model, message.usage) })
        check('shipper', message)
        return jev.write('launch.md', textOf(message))
      }

      const created = await client.messages.batches.create({ requests: [{ custom_id: 'launch', params }] })
      jev.log(`  [shipper] batch ${created.id} submitted`)
      await jev.write('shipper-batch.json', JSON.stringify({ id: created.id }) + '\n')
      const deadline = Date.now() + maxWaitMs
      let status = created
      while (status.processing_status !== 'ended') {
        if (Date.now() > deadline) {
          throw new Error(`batch ${created.id} still ${status.processing_status} after ${maxWaitMs / 60000} min; ` +
            `collect it later with: node run.mjs collect <out-dir>`)
        }
        await new Promise((r) => setTimeout(r, pollMs))
        status = await client.messages.batches.retrieve(created.id)
      }
      await collectBatch(client, jev, created.id)
    },
  }
}

export async function collectBatch(client, jev, batchId) {
  for await (const entry of await client.messages.batches.results(batchId)) {
    if (entry.custom_id !== 'launch') continue
    if (entry.result.type !== 'succeeded') throw new Error(`shipper batch request ${entry.result.type}`)
    const message = entry.result.message
    jev.record({ agent: 'shipper', model: message.model, usage: message.usage, usd: costOf(message.model, message.usage, { batch: true }), batch: true })
    check('shipper', message)
    return jev.write('launch.md', textOf(message))
  }
  throw new Error(`batch ${batchId} has no "launch" result`)
}
