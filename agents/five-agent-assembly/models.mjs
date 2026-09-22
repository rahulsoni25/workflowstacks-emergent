// Every agent is pinned to one exact model ID. No aliases, no "latest".
// Prices are USD per 1M tokens, Anthropic first-party API list prices as
// cached in the claude-api reference (2026-06-24). Re-check
// https://docs.claude.com/en/docs/about-claude/pricing before quoting costs.
export const MODELS = {
  scout: 'claude-haiku-4-5-20251001', // Haiku 4.5, dated snapshot
  architect: 'claude-opus-5',
  builder: 'claude-sonnet-5',
  tester: 'claude-sonnet-5',
  shipper: 'claude-haiku-4-5-20251001', // sent through the Message Batches API
}

export const PRICES = {
  'claude-haiku-4-5-20251001': { input: 1, output: 5 },
  'claude-haiku-4-5': { input: 1, output: 5 },
  'claude-sonnet-5': { input: 2, output: 10 },
  'claude-opus-5': { input: 5, output: 25 },
  'claude-opus-4-8': { input: 5, output: 25 }, // possible server-side fallback for the architect
}

export const BATCH_DISCOUNT = 0.5

// Cost of one response's usage. Cache writes/reads are billed at the input
// rate here (an upper bound for reads, a slight under-count for writes).
export function costOf(model, usage, { batch = false } = {}) {
  const p = PRICES[model]
  if (!p || !usage) return null
  const input = (usage.input_tokens || 0) + (usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0)
  const usd = (input * p.input + (usage.output_tokens || 0) * p.output) / 1e6
  return batch ? usd * BATCH_DISCOUNT : usd
}
