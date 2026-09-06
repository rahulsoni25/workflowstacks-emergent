// Topical relevance for catalog skill pages.
//
// The catalog is ingested from GitHub, and the stored `category` field is not
// trustworthy: the Linux kernel, Vue, Flutter, oh-my-zsh, yt-dlp and a Windows
// license-activation toolkit are all filed as `ai-agent`. Anything that ranks
// or orders skills by stars alone therefore surfaces general-purpose software
// as though it were a quality-gated AI skill.
//
// That costs us twice:
//   - Sitemap. We were submitting /skills/linux, /skills/flutter,
//     /skills/youtube-dl and /skills/immich to Google as top-tier pages. They
//     cannot outrank kernel.org or flutter.dev, and on a domain with little
//     authority they blur what the site is topically about — which is one of
//     the few levers that still moves rankings at this size.
//   - llms.txt. Answer engines read that file to decide what this site is an
//     authority on. Handing them the Linux kernel as an installable "AI skill
//     for founders" undercuts every accurate claim in the same file.
//
// So relevance is judged from evidence the ingest cannot mangle: the upstream
// repo's own topics, plus its name and description. Deliberately generous —
// the job is to drop obvious general-purpose software, not to adjudicate
// borderline cases.

// Upstream topic slugs that indicate the repo is genuinely about AI/agents.
// Model family names count: a repo tagged `llama` or `qwen` is about LLMs even
// when it never says "AI".
const AI_TOPICS = new Set([
  'ai', 'ai-agent', 'ai-agents', 'ai-tools', 'ai-assistant', 'aiops', 'ai-art',
  'agent', 'agents', 'agentic', 'agentic-ai', 'agentic-workflow', 'autonomous-agents',
  'llm', 'llms', 'llmops', 'large-language-models', 'language-model',
  'mcp', 'model-context-protocol', 'mcp-server', 'mcp-client',
  'claude', 'claude-code', 'claude-skills', 'ai-skills', 'anthropic',
  'openai', 'chatgpt', 'gpt', 'gpt-4', 'gemini', 'copilot',
  'llama', 'llama2', 'llama3', 'mistral', 'qwen', 'deepseek', 'gemma', 'phi',
  'machine-learning', 'deep-learning', 'neural-network', 'transformers',
  'generative-ai', 'genai', 'prompt', 'prompt-engineering', 'prompts',
  'rag', 'retrieval-augmented-generation', 'embeddings', 'vector-database',
  'langchain', 'llamaindex', 'autogen', 'crewai', 'semantic-kernel',
  'chatbot', 'conversational-ai', 'nlp', 'speech-to-text', 'text-to-speech',
  'stable-diffusion', 'diffusion', 'text-to-image', 'computer-vision',
  'automation', 'workflow-automation', 'no-code', 'low-code',
])

// Same vocabulary as free text, for repos that carry no topics at all.
// Word-bounded so "ai" does not match "chain" and "gpt" does not match a hash.
const AI_TEXT = new RegExp(
  '(?:^|[^a-z0-9])(?:' +
  [
    'ai', 'a\.i', 'llm', 'llms', 'mcp', 'agent', 'agents', 'agentic',
    'claude', 'anthropic', 'openai', 'chatgpt', 'gpt', 'gemini', 'copilot',
    'llama', 'mistral', 'qwen', 'deepseek', 'gemma',
    'machine learning', 'deep learning', 'neural', 'transformer', 'transformers',
    'generative', 'prompt', 'prompts', 'rag', 'embedding', 'embeddings',
    'langchain', 'llamaindex', 'autogen', 'chatbot',
    'stable diffusion', 'text-to-image', 'speech-to-text',
    'automation', 'automate', 'workflow', 'workflows', 'no-code', 'low-code',
  ].join('|') +
  ')(?:[^a-z0-9]|$)', 'i'
)

export function isAiRelevant(skill) {
  if (!skill) return false

  const topics = Array.isArray(skill.github_topics) ? skill.github_topics : []
  for (const t of topics) {
    if (AI_TOPICS.has(String(t).toLowerCase())) return true
  }

  // Fall back to the repo's own words. Our rewritten description is excluded
  // on purpose: it is generated against a founder-facing template that says
  // "ideal for founders seeking AI-driven support" about almost anything, so
  // matching on it would let every entry through.
  const text = [skill.name, skill.slug, skill.title_human, skill.description]
    .filter((x) => typeof x === 'string')
    .join(' ')
  return AI_TEXT.test(text)
}

// Chars of guidance WE wrote, used by both the sitemap gate and llms.txt.
// `install` is excluded: it is generic boilerplate ("git clone ...") on most
// entries, so counting it would inflate thin pages.
export function guideRichness(g) {
  if (!g || typeof g !== 'object') return 0
  const text = [g.whatItDoes, g.quickStart, g.examplePrompt, g.gotcha]
    .filter((x) => typeof x === 'string')
    .join(' ')
  const whenToUse = Array.isArray(g.whenToUse) ? g.whenToUse.join(' ') : ''
  return text.length + whenToUse.length
}

// Ordering for "show our best first". Our own rewrite quality and the depth of
// our guide lead; upstream stars only break ties. Stars alone put the Linux
// kernel at the top of a list of AI skills.
export function qualityRank(skill) {
  const score = typeof skill.rewrite_score === 'number' ? skill.rewrite_score : 0
  const richness = Math.min(guideRichness(skill.use_guide), 3000)
  const stars = typeof skill.github_stars === 'number' ? skill.github_stars : 0
  return score * 10000 + (richness / 3000) * 1000 + Math.log10(stars + 1) * 100
}
