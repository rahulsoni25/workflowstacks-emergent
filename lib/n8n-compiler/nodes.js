// Node-builder library — one factory per n8n node type we use, emitting the
// EXACT validated shape (type, typeVersion, parameter structure) taken from the
// hand-built, working templates. These are the only nodes the compiler can
// place, which is what guarantees structurally-valid output: the compiler never
// invents node JSON, it only assembles these.
//
// Each builder returns { name, type, typeVersion, parameters }. The compiler
// assigns id + position and wires connections.

const AI_MODEL = 'gpt-4o-mini'

export const nodes = {
  // ---- triggers ----
  manualTrigger(name = 'When clicking Execute') {
    return { name, type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, parameters: {} }
  },

  // every: 'day' | 'week'; hour 0-23; weekday 1-7 (Mon=1) for weekly
  scheduleTrigger({ name = 'On schedule', every = 'day', hour = 9, weekday = 1 } = {}) {
    const interval = every === 'week'
      ? [{ field: 'weeks', weeksInterval: 1, triggerAtDay: [weekday], triggerAtHour: hour }]
      : [{ field: 'days', triggerAtHour: hour }]
    return { name, type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.2, parameters: { rule: { interval } } }
  },

  // fields: [{ label, type?: 'text'|'textarea'|'email', required?: bool }]
  formTrigger({ name = 'Form', title, description = '', fields = [] }) {
    return {
      name, type: 'n8n-nodes-base.formTrigger', typeVersion: 2.2,
      parameters: {
        formTitle: title, formDescription: description,
        formFields: { values: fields.map((f) => ({
          fieldLabel: f.label,
          ...(f.type && f.type !== 'text' ? { fieldType: f.type } : {}),
          ...(f.required ? { requiredField: true } : {}),
        })) },
        options: {},
      },
    }
  },

  gmailTrigger({ name = 'New email' } = {}) {
    return {
      name, type: 'n8n-nodes-base.gmailTrigger', typeVersion: 1.2,
      parameters: { pollTimes: { item: [{ mode: 'everyMinute' }] }, simple: true, filters: {}, options: {} },
    }
  },

  // ---- data ----
  sheetRead({ name = 'Get rows' }) {
    return {
      name, type: 'n8n-nodes-base.googleSheets', typeVersion: 4.5,
      parameters: { documentId: rl(), sheetName: rl(), options: {} },
    }
  },

  sheetAppend({ name = 'Save rows' }) {
    return {
      name, type: 'n8n-nodes-base.googleSheets', typeVersion: 4.5,
      parameters: { operation: 'append', documentId: rl(), sheetName: rl(),
        columns: { mappingMode: 'autoMapInputData', value: {}, matchingColumns: [], schema: [] }, options: {} },
    }
  },

  // values: { ColName: '=expr' }; matchOn: ['ColName']
  sheetUpdate({ name = 'Update rows', values, matchOn }) {
    return {
      name, type: 'n8n-nodes-base.googleSheets', typeVersion: 4.5,
      parameters: { operation: 'update', documentId: rl(), sheetName: rl(),
        columns: { mappingMode: 'defineBelow', value: values, matchingColumns: matchOn, schema: [] }, options: {} },
    }
  },

  // query: [{ name, value }]
  http({ name = 'HTTP Request', url, query = null, asText = false }) {
    const parameters = { url }
    if (query) { parameters.sendQuery = true; parameters.queryParameters = { parameters: query } }
    parameters.options = asText ? { response: { response: { responseFormat: 'text' } } } : {}
    return { name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, parameters }
  },

  splitOut({ name = 'Split', field }) {
    return { name, type: 'n8n-nodes-base.splitOut', typeVersion: 1, parameters: { fieldToSplitOut: field, options: {} } }
  },

  aggregate({ name = 'Combine rows' } = {}) {
    return { name, type: 'n8n-nodes-base.aggregate', typeVersion: 1, parameters: { aggregate: 'aggregateAllItemData', options: {} } }
  },

  code({ name = 'Code', js }) {
    return { name, type: 'n8n-nodes-base.code', typeVersion: 2, parameters: { jsCode: js } }
  },

  // ---- AI ----
  ai({ name = 'AI', prompt, jsonOutput = false }) {
    const parameters = {
      modelId: { __rl: true, mode: 'list', value: AI_MODEL, cachedResultName: AI_MODEL },
      messages: { values: [{ content: prompt, role: 'user' }] },
      options: {},
    }
    if (jsonOutput) parameters.jsonOutput = true
    return { name, type: '@n8n/n8n-nodes-langchain.openAi', typeVersion: 1.8, parameters }
  },

  // ---- logic ----
  // assignments: [{ name, value: '=expr', type?: 'string'|'number' }]
  set({ name = 'Set', assignments }) {
    return {
      name, type: 'n8n-nodes-base.set', typeVersion: 3.4,
      parameters: { assignments: { assignments: assignments.map((a, i) => ({
        id: `a${i}`, name: a.name, value: a.value, type: a.type || 'string',
      })) }, options: {} },
    }
  },

  // conditions: [{ left: '=expr', op, right? }] ; op: 'empty'|'notEmpty'|'equals'|'notEquals'|'lte'|'gte'|'lt'|'gt'
  ifNode({ name = 'If', conditions, combinator = 'and' }) {
    return {
      name, type: 'n8n-nodes-base.if', typeVersion: 2.2,
      parameters: {
        conditions: {
          options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
          conditions: conditions.map((c, i) => buildCondition(c, i)),
          combinator,
        },
        options: {},
      },
    }
  },

  gmail({ name = 'Send email', to, subject, message }) {
    return {
      name, type: 'n8n-nodes-base.gmail', typeVersion: 2.1,
      parameters: { sendTo: to, subject, emailType: 'text', message, options: {} },
    }
  },

  note({ name = 'Setup instructions', content, height = 600, width = 460, color = 4 }) {
    return { name, type: 'n8n-nodes-base.stickyNote', typeVersion: 1, parameters: { content, height, width, color } }
  },
}

function rl() { return { __rl: true, mode: 'list', value: '' } }

const NUMERIC_OPS = new Set(['lte', 'gte', 'lt', 'gt'])
const SINGLE_OPS = { empty: 'empty', notEmpty: 'notEmpty' }

function buildCondition(c, i) {
  const single = SINGLE_OPS[c.op]
  if (single) {
    return { id: `c${i}`, leftValue: c.left, rightValue: '', operator: { type: 'string', operation: single, singleValue: true } }
  }
  const numeric = NUMERIC_OPS.has(c.op)
  const opMap = { equals: 'equals', notEquals: 'notEquals', lte: 'lte', gte: 'gte', lt: 'lt', gt: 'gt' }
  return {
    id: `c${i}`, leftValue: c.left, rightValue: c.right ?? '',
    operator: { type: numeric ? 'number' : 'string', operation: opMap[c.op] },
  }
}
