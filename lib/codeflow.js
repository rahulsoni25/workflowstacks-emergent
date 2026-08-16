// Codeflow — "How it works" for a GitHub repo, built for non-coders first.
//
// Deterministic part (this file): fetch repo meta + languages + recursive tree
// from the GitHub API and derive size verdict, LOC estimate, language mix,
// folder map, entry points, trust signals and a suggested reading order.
// Nothing here is LLM-generated, so nothing here can be hallucinated.
//
// The optional plain-English "flow" (input → steps → output) is produced by
// /api/codeflow (Groq, path-validated) and stored alongside this on the skill
// doc as `codeflow.flow`. Pages render whatever is present.

export const CODEFLOW_VERSION = 1

const CODE_EXT = new Set(['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'py', 'go', 'rs', 'java', 'kt', 'kts', 'rb', 'php', 'cs', 'cpp', 'cc', 'c', 'h', 'hpp', 'swift', 'scala', 'sh', 'bash', 'zsh', 'ps1', 'lua', 'dart', 'ex', 'exs', 'sql', 'vue', 'svelte', 'r', 'jl', 'zig', 'nim', 'clj', 'hs', 'elm', 'ml', 'pl', 'm', 'mm', 'groovy', 'gradle', 'tf', 'proto', 'graphql', 'sol'])
const DOC_EXT = new Set(['md', 'mdx', 'markdown', 'txt', 'rst', 'adoc', 'org'])
const CONFIG_EXT = new Set(['json', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'env', 'xml', 'properties'])
const SKIP_DIR = /(^|\/)(node_modules|vendor|dist|build|out|target|\.git|\.next|__pycache__|\.venv|venv|coverage|\.cache|bower_components|third_party|thirdparty)(\/|$)/i
const SKIP_FILE = /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|poetry\.lock|Cargo\.lock|go\.sum|composer\.lock|Gemfile\.lock|\.min\.(js|css))$/i
const BINARY_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'pdf', 'zip', 'gz', 'tar', 'woff', 'woff2', 'ttf', 'eot', 'mp3', 'mp4', 'mov', 'wav', 'bin', 'exe', 'dll', 'so', 'dylib', 'pyc', 'class', 'jar', 'wasm', 'onnx', 'pt', 'safetensors', 'parquet', 'sqlite', 'db'])

// Rough bytes-per-line for source text. Deliberately conservative — we label
// the number "~" everywhere it is shown.
const BYTES_PER_LINE = 38

const FOLDER_PURPOSE = [
  [/^(src|lib|core|app|pkg|internal|source)$/i, 'Core code — the actual logic'],
  [/^(cmd|bin|cli)$/i, 'Command-line entry points'],
  [/^(tests?|__tests__|spec|specs|e2e|testing)$/i, 'Tests — proof it works'],
  [/^(docs?|documentation|wiki|guides?)$/i, 'Documentation'],
  [/^(examples?|samples?|demos?|cookbook|recipes|tutorials?|playground)$/i, 'Examples you can copy'],
  [/^(scripts?|tools?|utils?|hack|automation)$/i, 'Helper scripts'],
  [/^\.github$/i, 'CI / automation (GitHub Actions)'],
  [/^(assets?|static|public|images?|img|media|icons?|fonts?)$/i, 'Images & static assets'],
  [/^(skills?|prompts?|agents?|commands?|personas?|instructions?|rules?)$/i, 'Prompts, skills & agent definitions'],
  [/^(config|configs?|settings|\.config)$/i, 'Configuration'],
  [/^(templates?|boilerplates?|starters?|scaffolds?)$/i, 'Templates'],
  [/^(api|server|backend|services?|functions?|workers?)$/i, 'Backend / API'],
  [/^(web|frontend|client|ui|components?|pages?|views?|www|site)$/i, 'Frontend / UI'],
  [/^(data|datasets?|fixtures?|seeds?)$/i, 'Data files'],
  [/^(models?|schemas?|types?|proto|protos)$/i, 'Data models & types'],
  [/^(packages?|apps?|modules?|plugins?|extensions?|integrations?|adapters?|providers?|connectors?)$/i, 'Sub-packages / plugins'],
  [/^(deploy|deployment|infra|infrastructure|k8s|helm|terraform|docker|ops)$/i, 'Deployment / infrastructure'],
  [/^(locales?|i18n|translations?|lang)$/i, 'Translations'],
  [/^(notebooks?|research|experiments?|papers?)$/i, 'Research & notebooks'],
  [/^\.(vscode|idea|devcontainer|cursor|claude)$/i, 'Editor / agent settings'],
  [/^\.[a-z0-9-]+-plugin$/i, 'Plugin manifest — what gets installed'],
  [/^hooks?$/i, 'Hooks — scripts that auto-run on events'],
  [/^(workflows?|flows?|pipelines?)$/i, 'Workflows / pipelines'],
  [/^(evals?|benchmarks?)$/i, 'Evaluations & benchmarks'],
]

// Where execution starts. Ordered by confidence; .md instruction files are
// handled separately in the reading order (they are not "entry points").
const ENTRY_PATTERNS = [
  /^(src\/|app\/|cmd\/[^/]+\/|[a-z0-9_-]+\/)?(main|index|app|server|cli|run|start|bot|agent|__main__)\.(py|js|mjs|cjs|ts|tsx|go|rs|rb|php|java|kt|swift|dart|ex|exs)$/i,
  /^main\.[a-z]+$/i,
  /^(src\/)?bin\/(?!(lint|format|fmt|setup|install|test|build|release|publish|check|ci|deploy|dev|clean)[^/]*$)[^/]+$/i,
  /^manifest\.json$/i,
  /^action\.ya?ml$/i,
]
const NOISE_FILE = /(^|\/)(LICENSE|LICENCE|COPYING|CHANGELOG|CONTRIBUTING|CODE_OF_CONDUCT|SECURITY|NOTICE|AUTHORS|PATENTS)(\.[a-z]+)?$/i

const CONFIG_FILES = /^(package\.json|pyproject\.toml|setup\.py|setup\.cfg|requirements(-[a-z]+)?\.txt|Pipfile|poetry\.lock|Cargo\.toml|go\.mod|composer\.json|Gemfile|pom\.xml|build\.gradle(\.kts)?|Makefile|justfile|Taskfile\.ya?ml|Dockerfile|docker-compose\.ya?ml|compose\.ya?ml|\.env\.example|\.env\.sample|\.env\.template|env\.example|manifest\.json|smithery\.ya?ml|mcp\.json|claude_desktop_config\.json|action\.ya?ml|vercel\.json|netlify\.toml|fly\.toml|Procfile|tsconfig\.json|next\.config\.[cm]?js|vite\.config\.[cm]?[jt]s|SKILL\.md|CLAUDE\.md|AGENTS\.md|\.cursorrules|\.clinerules)$/i

export function parseGithubUrl(url) {
  const m = String(url || '').match(/github\.com\/([^/]+)\/([^/#?]+)/i)
  if (!m) return null
  return { owner: m[1], repo: m[2].replace(/\.git$/, '') }
}

export function ghHeaders(accept = 'application/vnd.github+json') {
  const h = { Accept: accept, 'User-Agent': 'WorkflowStacks-Codeflow' }
  if (process.env.GITHUB_TOKEN) h.Authorization = `token ${process.env.GITHUB_TOKEN}`
  return h
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

// fetchOpts lets the caller pick Next caching (page render) vs none (admin job).
export async function fetchRepoFacts(owner, repo, fetchOpts = {}) {
  const base = `https://api.github.com/repos/${owner}/${repo}`
  const metaRes = await fetch(base, { headers: ghHeaders(), ...fetchOpts })
  if (!metaRes.ok) return { error: `meta ${metaRes.status}` }
  const meta = await metaRes.json()
  const branch = meta.default_branch || 'main'
  const [langRes, treeRes] = await Promise.all([
    fetch(`${base}/languages`, { headers: ghHeaders(), ...fetchOpts }),
    fetch(`${base}/git/trees/${encodeURIComponent(branch)}?recursive=1`, { headers: ghHeaders(), ...fetchOpts }),
  ])
  const languages = langRes.ok ? await langRes.json() : {}
  let tree = null
  if (treeRes.ok) {
    const t = await treeRes.json()
    tree = { entries: Array.isArray(t.tree) ? t.tree : [], truncated: !!t.truncated }
  }
  return { meta, languages, tree }
}

// ---------------------------------------------------------------------------
// Analyse
// ---------------------------------------------------------------------------

function ext(path) {
  const base = path.split('/').pop()
  const i = base.lastIndexOf('.')
  return i > 0 ? base.slice(i + 1).toLowerCase() : ''
}

function humanLines(n) {
  if (n < 100) return `~${Math.max(10, Math.round(n / 10) * 10)}`
  if (n < 1000) return `~${Math.round(n / 50) * 50}`
  if (n < 10000) return `~${(Math.round(n / 100) / 10).toFixed(1).replace(/\.0$/, '')}k`
  if (n < 1000000) return `~${Math.round(n / 1000)}k`
  return `~${(Math.round(n / 100000) / 10).toFixed(1).replace(/\.0$/, '')}M`
}

function sizeTier(loc, codeFiles) {
  if (codeFiles === 0) return 'docs'
  if (loc < 500) return 'tiny'
  if (loc < 3000) return 'small'
  if (loc < 15000) return 'medium'
  if (loc < 60000) return 'large'
  return 'huge'
}

const TIER_LABEL = {
  docs: 'Documents only',
  tiny: 'Tiny codebase',
  small: 'Small codebase',
  medium: 'Medium codebase',
  large: 'Large codebase',
  huge: 'Very large codebase',
}

function readTime(loc, tier, docLines = 0) {
  // ~120 lines/min skim-read pace; cap so numbers stay honest and useful.
  const lines = tier === 'docs' ? docLines : loc
  if (!lines) return null
  const mins = Math.max(2, Math.round(lines / 120))
  if (mins < 60) return `${mins} min skim`
  const h = Math.round(mins / 60)
  return h <= 8 ? `~${h} h to skim` : 'days to read — use, don\'t read'
}

export function analyzeRepo({ meta, languages, tree, category }) {
  const entries = (tree?.entries || []).filter((e) => e.type === 'blob' || e.type === 'tree')
  const blobs = entries.filter((e) => e.type === 'blob' && !SKIP_DIR.test(e.path) && !SKIP_FILE.test(e.path))
  const dirs = entries.filter((e) => e.type === 'tree' && !SKIP_DIR.test(e.path))

  let codeBytes = 0, docBytes = 0, codeFiles = 0, docFiles = 0, configFiles = 0, otherFiles = 0
  const topLevel = new Map() // folder → { files, bytes }
  const paths = new Set()
  for (const b of blobs) {
    paths.add(b.path)
    const e = ext(b.path)
    const size = b.size || 0
    if (CODE_EXT.has(e)) { codeBytes += size; codeFiles++ }
    else if (DOC_EXT.has(e)) { docBytes += size; docFiles++ }
    else if (CONFIG_EXT.has(e) || CONFIG_FILES.test(b.path.split('/').pop())) configFiles++
    else if (!BINARY_EXT.has(e)) otherFiles++
    const slash = b.path.indexOf('/')
    if (slash > 0) {
      const top = b.path.slice(0, slash)
      const cur = topLevel.get(top) || { files: 0, bytes: 0 }
      cur.files++
      cur.bytes += size
      topLevel.set(top, cur)
    }
  }

  const loc = Math.round(codeBytes / BYTES_PER_LINE)
  const docLines = Math.round(docBytes / BYTES_PER_LINE)
  const tier = sizeTier(loc, codeFiles)

  // Language mix — from GitHub's byte counts (excludes vendored by default).
  const langTotal = Object.values(languages || {}).reduce((a, b) => a + b, 0)
  const langs = Object.entries(languages || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, bytes]) => ({ name, pct: langTotal ? Math.round((bytes / langTotal) * 100) : 0 }))
    .filter((l) => l.pct > 0)

  // Folder map — top-level dirs by file count, with a plain-English purpose.
  // A folder named like the repo (browser-use → browser_use/) is the package itself.
  const norm = (s) => String(s || '').toLowerCase().replace(/[-_.\s]/g, '')
  const repoNorm = norm(meta?.name)
  const PROMPT_RE = FOLDER_PURPOSE.find(([, p]) => /^Prompts/.test(p))[0]
  const purposeOf = (name) => {
    if (PROMPT_RE.test(name)) return 'Prompts, skills & agent definitions'
    if (repoNorm && norm(name) === repoNorm) return 'Core code — the actual logic'
    return (FOLDER_PURPOSE.find(([re]) => re.test(name)) || [null, null])[1] || null
  }
  const folders = [...topLevel.entries()]
    .map(([name, v]) => ({ path: name, files: v.files, purpose: purposeOf(name) }))
    .sort((a, b) => b.files - a.files)
    .slice(0, 8)
  const promptFiles = [...topLevel.entries()].filter(([name]) => /Prompts/.test(purposeOf(name) || '')).reduce((a, [, v]) => a + v.files, 0)
  const promptShare = blobs.length ? promptFiles / blobs.length : 0

  // Entry points — where execution starts.
  const rootFiles = blobs.filter((b) => !b.path.includes('/')).map((b) => b.path)
  const entryPoints = []
  for (const p of paths) {
    if (entryPoints.length >= 4) break
    if (ENTRY_PATTERNS.some((re) => re.test(p))) entryPoints.push(p)
  }
  // package.json "main"/"bin" style hint without reading the file: prefer root/ src.
  entryPoints.sort((a, b) => a.split('/').length - b.split('/').length || a.length - b.length)

  const has = (re) => [...paths].some((p) => re.test(p))
  const signals = {
    readme: rootFiles.some((f) => /^readme(\.|$)/i.test(f)),
    tests: dirs.some((d) => /(^|\/)(tests?|__tests__|spec|specs|e2e)$/i.test(d.path)) || has(/(^|\/)[^/]*(\.test|\.spec|_test)\.[a-z]+$/i) || has(/(^|\/)test_[^/]+\.py$/i),
    docs: dirs.some((d) => /^(docs?|documentation)$/i.test(d.path)) || docFiles > 3,
    ci: dirs.some((d) => /^\.github\/workflows$/i.test(d.path)) || has(/^\.(gitlab-ci|circleci|travis)/i),
    docker: has(/(^|\/)(Dockerfile|docker-compose\.ya?ml|compose\.ya?ml)$/i),
    env_example: has(/(^|\/)\.?env(\.example|\.sample|\.template|example)$/i),
    examples: dirs.some((d) => /^(examples?|samples?|demos?|cookbook)$/i.test(d.path)),
    license: meta?.license?.spdx_id && meta.license.spdx_id !== 'NOASSERTION' ? meta.license.spdx_id : meta?.license?.name || null,
  }

  const configList = rootFiles.filter((f) => CONFIG_FILES.test(f)).slice(0, 8)

  // Runtime / how you'd run it (heuristics on well-known files).
  const runtime = []
  if (rootFiles.some((f) => /^package\.json$/i.test(f))) runtime.push('Node.js')
  if (rootFiles.some((f) => /^(pyproject\.toml|setup\.py|requirements(-[a-z]+)?\.txt|Pipfile)$/i.test(f))) runtime.push('Python')
  if (rootFiles.some((f) => /^go\.mod$/i.test(f))) runtime.push('Go')
  if (rootFiles.some((f) => /^Cargo\.toml$/i.test(f))) runtime.push('Rust')
  if (rootFiles.some((f) => /^(Gemfile)$/i.test(f))) runtime.push('Ruby')
  if (rootFiles.some((f) => /^(composer\.json)$/i.test(f))) runtime.push('PHP')
  if (rootFiles.some((f) => /^(pom\.xml|build\.gradle(\.kts)?)$/i.test(f))) runtime.push('Java/JVM')
  if (signals.docker) runtime.push('Docker')

  // Setup verdict — the line a non-coder actually needs.
  // Skill / plugin libraries: installed into an AI tool, never "run" by the user.
  const skillFiles = [...paths].filter((p) => /(^|\/)SKILL\.md$/i.test(p)).length
  const isPlugin = dirs.some((d) => /^\.[a-z0-9-]+-plugin$/i.test(d.path)) || rootFiles.some((f) => /^(plugin|\.claude-plugin|marketplace)\.json$/i.test(f)) || skillFiles >= 2
  const isPromptish = tier === 'docs' || /^(prompt|claude-skill)$/i.test(category || '') || promptShare >= 0.6 || isPlugin
  let setup
  if (isPlugin && tier !== 'huge') {
    setup = { level: 'no-code', label: 'Install as a skill / plugin', note: `Add it to Claude Code (or your AI tool) with one command${skillFiles ? ` — ${skillFiles} skill${skillFiles === 1 ? '' : 's'} inside` : ''}. Nothing to run yourself.` }
  } else if (isPromptish && codeFiles === 0) {
    setup = /^(prompt|claude-skill)$/i.test(category || '') || promptShare > 0
      ? { level: 'no-code', label: 'No code to run', note: 'It\'s prompts / instructions. Copy them into your AI tool.' }
      : { level: 'no-code', label: 'Nothing to install', note: 'A guide / curated list. Just read it and follow the links.' }
  } else if (isPromptish && codeFiles > 0 && loc < 1500) {
    setup = { level: 'no-code', label: 'Mostly no-code', note: 'Prompt files plus a few small helper scripts.' }
  } else if (isPromptish && promptShare >= 0.6) {
    setup = { level: 'no-code', label: 'Install as a skill', note: 'A library of prompts/skills; helper scripts run inside your AI tool, not by you.' }
  } else if (signals.docker && tier !== 'huge') {
    setup = { level: 'light', label: 'Light setup', note: `Runs with Docker${signals.env_example ? ' — add your API keys to .env' : ''}.` }
  } else if ((tier === 'tiny' || tier === 'small') && runtime.length <= 2) {
    setup = { level: 'light', label: 'Light setup', note: `Install ${runtime[0] || 'the runtime'}${signals.env_example ? ', add API keys' : ''}, run one command.` }
  } else if (tier === 'medium') {
    setup = { level: 'dev', label: 'Some technical setup', note: 'Comfortable with a terminal? 20–40 min. Otherwise ask a dev.' }
  } else {
    setup = { level: 'dev', label: 'Developer setup', note: 'A real software project. Use it via its install path; don\'t expect to read it all.' }
  }
  if (signals.env_example && !/api key/i.test(setup.note)) setup.needs_keys = true

  // Reading order — deterministic, always real paths.
  const reading = []
  const push = (path, why) => { if (path && !reading.some((r) => r.path === path) && reading.length < 5) reading.push({ path, why }) }
  const readmeFile = rootFiles.find((f) => /^readme\.md$/i.test(f)) || rootFiles.find((f) => /^readme(\.(rst|txt|markdown|mdx))?$/i.test(f)) || rootFiles.find((f) => /^readme(\.|$)/i.test(f))
  push(readmeFile, 'Start here — what it does and how to install it')
  push(rootFiles.find((f) => /^(SKILL|CLAUDE|AGENTS|AGENT|PROMPT)\.md$/i.test(f)), 'The instructions the AI actually follows')
  push(entryPoints.find((p) => !/\.md$/i.test(p)), 'Where the program starts running')
  push(rootFiles.find((f) => /^(package\.json|pyproject\.toml|Cargo\.toml|go\.mod|requirements\.txt|composer\.json)$/i.test(f)), 'Dependencies and the commands it exposes')
  push(rootFiles.find((f) => /^\.?env\.(example|sample|template)$/i.test(f)), 'The API keys and settings you must provide')
  if (reading.length < 5) {
    const core = folders.find((f) => /Core code|Prompts/.test(f.purpose || ''))
    if (core) {
      const inCore = [...paths].filter((p) => p.startsWith(core.path + '/') && !NOISE_FILE.test(p) && (CODE_EXT.has(ext(p)) || DOC_EXT.has(ext(p))))
      const depth = (p) => p.split('/').length
      // Prefer a well-known "start" file at the shallowest depth, else the shallowest code file.
      const named = inCore.filter((p) => /(^|\/)(SKILL|README|index|main|app|cli|__init__|__main__)\.[a-z]+$/i.test(p)).sort((a, b) => depth(a) - depth(b) || a.localeCompare(b))[0]
      const first = named || inCore.filter((p) => CODE_EXT.has(ext(p))).sort((a, b) => depth(a) - depth(b) || a.localeCompare(b))[0]
      if (first) push(first, /Prompts/.test(core.purpose) ? `Inside ${core.path}/ — an example of what the AI is told to do` : `Inside ${core.path}/ — the main logic begins here`)
    }
  }
  if (reading.length < 5 && signals.examples) {
    const ex = [...paths].filter((p) => /^(examples?|samples?|demos?|cookbook)\//i.test(p)).sort()[0]
    push(ex, 'A worked example — copy this to get going')
  }

  return {
    version: CODEFLOW_VERSION,
    computed_at: new Date().toISOString(),
    repo: {
      owner: meta?.owner?.login || null,
      name: meta?.name || null,
      html_url: meta?.html_url || null,
      default_branch: meta?.default_branch || 'main',
      pushed_at: meta?.pushed_at || null,
      open_issues: meta?.open_issues_count ?? null,
      archived: !!meta?.archived,
      size_kb: meta?.size || 0,
    },
    size: {
      tier,
      label: TIER_LABEL[tier],
      loc,
      loc_human: humanLines(loc),
      doc_lines: docLines,
      code_files: codeFiles,
      doc_files: docFiles,
      config_files: configFiles,
      other_files: otherFiles,
      skill_files: skillFiles,
      files: blobs.length,
      dirs: dirs.length,
      read_time: readTime(loc, tier, docLines),
    },
    languages: langs,
    runtime,
    setup,
    signals,
    entry_points: entryPoints,
    config_files: configList,
    folders,
    root_files: rootFiles.slice(0, 40),
    reading_order: reading,
    truncated: !!tree?.truncated,
    flow: null,
  }
}

// One-shot: url → codeflow (deterministic only). Returns null on any failure.
export async function buildCodeflow(githubUrl, { category, fetchOpts } = {}) {
  const parsed = parseGithubUrl(githubUrl)
  if (!parsed) return null
  try {
    const facts = await fetchRepoFacts(parsed.owner, parsed.repo, fetchOpts)
    if (!facts || facts.error || !facts.meta) return null
    return analyzeRepo({ ...facts, category })
  } catch {
    return null
  }
}

// Sanitize an LLM-produced flow against the real file list. Anything that
// isn't shaped exactly right, or references a file that doesn't exist, is
// dropped — we never show an invented path.
export function validateFlow(raw, pathSet) {
  if (!raw || typeof raw !== 'object') return null
  if (raw.confident === false) return null
  const clean = (s, max) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, max) : '')
  const steps = Array.isArray(raw.steps) ? raw.steps : []
  const out = []
  for (const s of steps) {
    const title = clean(s?.title, 40)
    const detail = clean(s?.detail, 140)
    if (!title || !detail) continue
    let file = typeof s?.file === 'string' ? s.file.trim().replace(/^\.?\//, '') : null
    if (file && !pathSet.has(file)) file = null
    out.push({ title, detail, file })
    if (out.length >= 6) break
  }
  if (out.length < 3) return null
  const summary = clean(raw.summary, 200)
  const input = clean(raw.input, 80)
  const output = clean(raw.output, 80)
  return { summary: summary || null, input: input || null, output: output || null, steps: out }
}
