// Proof-of-correctness: compile two real specs (one linear sheet-pattern, one
// branching) and run the structural validator on the output. If both pass, the
// compiler produces import-ready n8n JSON from a high-level spec.
import { compile, validateWorkflow } from '../lib/n8n-compiler/index.js'
import { writeFileSync } from 'fs'

// Spec 1 — reproduces the "AI Product Descriptions" pattern (linear: sheet →
// filter → AI → set → append). This is the whole Pattern A in ~20 lines.
const productDescriptions = {
  name: 'AI Product Descriptions (compiled)',
  note: '## AI Product Descriptions\n\nSheet `Products` with columns Product Name, Features, Description (empty). Connect Google + OpenAI, run.',
  trigger: { op: 'manual' },
  steps: [
    { op: 'sheetRead', name: 'Get products' },
    { op: 'filterEmpty', field: 'Description', name: 'Only products without a description' },
    { op: 'ai', name: 'Write description (AI)', prompt: "=Write a 60-110 word product description.\nProduct: {{ $json['Product Name'] }}\nFeatures: {{ $json.Features }}\nReturn ONLY the description." },
    { op: 'set', name: 'Shape the result', assignments: [
      { name: 'Product Name', value: "={{ $('Only products without a description').item.json['Product Name'] }}" },
      { name: 'AI Description', value: '={{ $json.message.content }}' },
    ] },
    { op: 'sheetAppend', name: 'Save to Generated tab' },
  ],
}

// Spec 2 — reproduces the "Competitor Watch" pattern (branching: schedule →
// sheet → http → ai → set → IF changed → [email] + join on update).
const competitorWatch = {
  name: 'Competitor Watch (compiled)',
  trigger: { op: 'schedule', name: 'Every day 8:00', every: 'day', hour: 8 },
  steps: [
    { op: 'sheetRead', name: 'Get watch list' },
    { op: 'http', name: 'Fetch the page', url: '={{ $json.URL }}', asText: true },
    { op: 'ai', name: 'Read the value (AI)', prompt: '=Extract {{ $json.WatchFor }} from the page.' },
    { op: 'set', name: 'Shape the check', assignments: [
      { name: 'URL', value: "={{ $('Get watch list').item.json.URL }}" },
      { name: 'Last Value', value: '={{ $json.message.content.trim() }}' },
    ] },
    { op: 'ifBranch', name: 'Did it change?',
      conditions: [{ left: "={{ $json['Last Value'] }}", op: 'notEquals', right: "={{ $json['Old Value'] }}" }],
      onTrue: [{ op: 'gmail', name: 'Email the change', to: 'you@example.com', subject: '=Changed', message: '=New: {{ $json["Last Value"] }}' }],
      onFalse: [],
      then: [{ op: 'sheetUpdate', name: 'Update Last Value', values: { URL: '={{ $json.URL }}', 'Last Value': "={{ $json['Last Value'] }}" }, matchOn: ['URL'] }],
    },
  ],
}

let failed = 0
for (const spec of [productDescriptions, competitorWatch]) {
  const wf = compile(spec)
  const res = validateWorkflow(wf)
  const nodeCount = wf.nodes.length
  const connCount = Object.keys(wf.connections).length
  console.log(`\n=== ${spec.name} ===`)
  console.log(`nodes: ${nodeCount} | connection-sources: ${connCount} | valid: ${res.ok}`)
  if (!res.ok) { failed++; console.log('ERRORS:', res.errors) }
  // Also confirm it's serializable + parseable (import round-trip)
  try { JSON.parse(JSON.stringify(wf)) } catch (e) { failed++; console.log('SERIALIZE FAIL:', e.message) }
  writeFileSync(`./scripts/out-${spec.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`, JSON.stringify(wf, null, 2))
}
console.log(failed === 0 ? '\n✅ ALL SPECS COMPILED TO VALID WORKFLOWS' : `\n❌ ${failed} failure(s)`)
process.exit(failed === 0 ? 0 : 1)
