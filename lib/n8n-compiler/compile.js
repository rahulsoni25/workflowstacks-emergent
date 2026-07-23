// The compiler: a spec → a complete, valid n8n workflow JSON.
//
// It never writes node JSON by hand — it calls the validated builders in
// nodes.js and mechanically assigns ids, positions, and connections. Structure
// is therefore correct by construction; only the *content* (prompts, field
// names, sheet columns) comes from the spec.
//
// Spec:
// {
//   name, note?,                        // note → setup sticky note (markdown)
//   trigger: { op, ...params },         // manual | schedule | form | gmail-trigger
//   steps: Step[]                       // chain after the trigger
// }
// Step = a normal op, OR
//   { op: 'filterEmpty', field }        // IF <field> empty; matches continue on the true output
//   { op: 'ifBranch', name, conditions, combinator?, onTrue?: Step[], onFalse?: Step[], then?: Step[] }

import { nodes } from './nodes.js'

function jsonRef(field) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(field) ? `$json.${field}` : `$json['${field}']`
}

// One spec op → one builder call → one node object (no id/position yet).
function buildNode(step) {
  switch (step.op) {
    case 'manual': return nodes.manualTrigger(step.name)
    case 'schedule': return nodes.scheduleTrigger(step)
    case 'form': return nodes.formTrigger(step)
    case 'gmail-trigger': return nodes.gmailTrigger(step)
    case 'sheetRead': return nodes.sheetRead(step)
    case 'sheetAppend': return nodes.sheetAppend(step)
    case 'sheetUpdate': return nodes.sheetUpdate(step)
    case 'http': return nodes.http(step)
    case 'splitOut': return nodes.splitOut(step)
    case 'aggregate': return nodes.aggregate(step)
    case 'code': return nodes.code(step)
    case 'ai': return nodes.ai(step)
    case 'set': return nodes.set(step)
    case 'gmail': return nodes.gmail(step)
    case 'filterEmpty':
      return nodes.ifNode({ name: step.name || `Only rows without ${step.field}`, conditions: [{ left: `={{ ${jsonRef(step.field)} }}`, op: 'empty' }] })
    case 'ifBranch':
      return nodes.ifNode({ name: step.name || 'Branch', conditions: step.conditions, combinator: step.combinator })
    default:
      throw new Error(`Unknown op: ${step.op}`)
  }
}

export function compile(spec) {
  const placed = []                 // { name, type, typeVersion, parameters }
  const connections = {}
  let order = 0                     // build order → x position

  const emit = (node, depth = 0) => {
    node.__x = 460 + order * 240
    node.__y = 120 + depth * 190
    order += 1
    placed.push(node)
    return node.name
  }
  const link = (from, to, out = 0) => {
    if (!from || !to) return
    connections[from] = connections[from] || { main: [] }
    while (connections[from].main.length <= out) connections[from].main.push([])
    connections[from].main[out].push({ node: to, type: 'main', index: 0 })
  }

  // Compile a linear list of steps starting from `entry` (the upstream node name
  // that should connect into the first step). Returns the tail node name.
  const chain = (steps, entry, depth = 0) => {
    let prev = entry
    for (const step of steps) {
      if (step.op === 'ifBranch') {
        const ifName = emit(buildNode(step), depth)
        link(prev, ifName)
        // Compile each branch DETACHED (entry=null → no internal link from IF),
        // then wire the IF's two outputs to the branch heads explicitly.
        const trueTail = step.onTrue?.length ? chain(step.onTrue, null, depth) : null
        if (step.onTrue?.length) link(ifName, firstName(step.onTrue), 0)
        const falseTail = step.onFalse?.length ? chain(step.onFalse, null, depth + 1) : null
        if (step.onFalse?.length) link(ifName, firstName(step.onFalse), 1)
        if (step.then?.length) {
          const thenHead = firstName(step.then)
          // both branch tails (or the IF outputs directly) feed the join
          if (trueTail) link(trueTail, thenHead); else link(ifName, thenHead, 0)
          if (falseTail) link(falseTail, thenHead); else link(ifName, thenHead, 1)
          prev = chain(step.then, null, depth)
        } else {
          prev = ifName
        }
      } else {
        const name = emit(buildNode(step), depth)
        link(prev, name)
        prev = name
      }
    }
    return prev
  }

  // Trigger
  const trigger = buildNode({ ...spec.trigger })
  const triggerName = emit(trigger)

  // Steps
  chain(spec.steps, triggerName)

  // Sticky note (unconnected)
  if (spec.note) {
    const note = nodes.note({ content: spec.note, height: 660, width: 470 })
    note.__x = -80; note.__y = -240
    placed.push(note)
  }

  const finalNodes = placed.map((n, i) => {
    const { __x, __y, ...rest } = n
    return { ...rest, id: uid(i), position: [__x, __y] }
  })

  return {
    name: spec.name,
    nodes: finalNodes,
    connections,
    settings: { executionOrder: 'v1' },
    pinData: {},
    meta: { templateCredsSetupCompleted: false },
  }
}

// The first node's name for a step list — computed from the builder so it
// matches what chain() emits (names are deterministic from the step).
function firstName(steps) {
  return buildNode(steps[0]).name
}

function uid(i) {
  const h = (i + 1).toString(16).padStart(4, '0')
  return `c0de${h}-0000-4000-8000-00000000${h}`
}
