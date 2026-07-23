// Structural validator — the gate that replaces "I never tested it". This
// checks everything that must be true for n8n to import a workflow cleanly.
// (The headless-n8n import check runs separately, as the second gate.)

const KNOWN_TYPES = new Set([
  'n8n-nodes-base.manualTrigger',
  'n8n-nodes-base.scheduleTrigger',
  'n8n-nodes-base.formTrigger',
  'n8n-nodes-base.gmailTrigger',
  'n8n-nodes-base.googleSheets',
  'n8n-nodes-base.httpRequest',
  'n8n-nodes-base.splitOut',
  'n8n-nodes-base.aggregate',
  'n8n-nodes-base.code',
  'n8n-nodes-base.if',
  'n8n-nodes-base.set',
  'n8n-nodes-base.gmail',
  'n8n-nodes-base.stickyNote',
  '@n8n/n8n-nodes-langchain.openAi',
])

export function validateWorkflow(wf) {
  const errors = []
  if (!wf || typeof wf !== 'object') return { ok: false, errors: ['workflow is not an object'] }
  if (!wf.name) errors.push('missing name')
  if (!Array.isArray(wf.nodes) || wf.nodes.length === 0) errors.push('no nodes')
  if (!wf.connections || typeof wf.connections !== 'object') errors.push('missing connections')

  const names = new Set()
  const ids = new Set()
  let triggers = 0
  for (const n of wf.nodes || []) {
    if (!n.name) errors.push('a node has no name')
    if (names.has(n.name)) errors.push(`duplicate node name: ${n.name}`)
    names.add(n.name)
    if (!n.id) errors.push(`node ${n.name} has no id`)
    if (ids.has(n.id)) errors.push(`duplicate node id on ${n.name}`)
    ids.add(n.id)
    if (!KNOWN_TYPES.has(n.type)) errors.push(`unknown node type: ${n.type} (${n.name})`)
    if (typeof n.typeVersion !== 'number') errors.push(`${n.name} has no numeric typeVersion`)
    if (!Array.isArray(n.position) || n.position.length !== 2) errors.push(`${n.name} has a bad position`)
    if (/Trigger$/.test(n.type) || n.type.endsWith('manualTrigger')) triggers += 1
  }
  if (triggers === 0) errors.push('no trigger node')

  // Every connection endpoint must reference a real, non-sticky node.
  for (const [from, conn] of Object.entries(wf.connections || {})) {
    if (!names.has(from)) errors.push(`connection from unknown node: ${from}`)
    for (const out of conn.main || []) {
      for (const c of out || []) {
        if (!names.has(c.node)) errors.push(`connection to unknown node: ${c.node}`)
      }
    }
  }

  // Every non-trigger, non-sticky node should be reachable (has an inbound link).
  const hasInbound = new Set()
  for (const conn of Object.values(wf.connections || {})) {
    for (const out of conn.main || []) for (const c of out || []) hasInbound.add(c.node)
  }
  for (const n of wf.nodes || []) {
    const isTrigger = /Trigger$/.test(n.type) || n.type.endsWith('manualTrigger')
    const isSticky = n.type === 'n8n-nodes-base.stickyNote'
    if (!isTrigger && !isSticky && !hasInbound.has(n.name)) {
      errors.push(`unreachable node (no inbound connection): ${n.name}`)
    }
  }

  return { ok: errors.length === 0, errors }
}
