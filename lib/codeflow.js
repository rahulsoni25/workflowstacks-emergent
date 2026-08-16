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

export const CODEFLOW_VERSION = 2

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
export async function fetchRepoFacts(owner, repo, fetchOpts = {}, { maxSizeKB } = {}) {
  const base = `https://api.github.com/repos/${owner}/${repo}`
  const opts = (ms) => ({ headers: ghHeaders(), signal: AbortSignal.timeout(ms), ...fetchOpts })
  const metaRes = await fetch(base, opts(8000))
  if (!metaRes.ok) {
    // 403/429 = GitHub rate limit (esp. when GITHUB_TOKEN is unset: 60 req/h).
    const rateLimited = metaRes.status === 429 || metaRes.status === 403
    return { error: `meta ${metaRes.status}`, status: metaRes.status, rateLimited }
  }
  const meta = await metaRes.json()
  if (maxSizeKB && (meta.size || 0) > maxSizeKB) return { error: 'too-large', status: 200, rateLimited: false, tooLarge: true, meta }
  const branch = meta.default_branch || 'main'
  const [langRes, treeRes] = await Promise.all([
    fetch(`${base}/languages`, opts(8000)),
    fetch(`${base}/git/trees/${encodeURIComponent(branch)}?recursive=1`, opts(15000)),
  ])
  // A failed tree must NOT be analysed as an empty repo ("Documents only").
  if (!treeRes.ok) {
    return { error: `tree ${treeRes.status}`, status: treeRes.status, rateLimited: treeRes.status === 429 || treeRes.status === 403, meta }
  }
  const languages = langRes.ok ? await langRes.json() : {}
  const t = await treeRes.json()
  const tree = { entries: Array.isArray(t.tree) ? t.tree : [], truncated: !!t.truncated }
  if (tree.entries.length === 0 && !tree.truncated) return { error: 'tree empty', status: 200, rateLimited: false, meta }
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
  if (!n) return '0'
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
  guide: 'Mostly documents',
  tiny: 'Tiny codebase',
  small: 'Small codebase',
  medium: 'Medium codebase',
  large: 'Large codebase',
  huge: 'Very large codebase',
}

function readTime(loc, tier, docLines = 0) {
  // ~120 lines/min skim-read pace; cap so numbers stay honest and useful.
  const lines = tier === 'docs' || tier === 'guide' ? docLines : loc
  if (!lines) return null
  const mins = Math.max(2, Math.round(lines / 120))
  if (mins < 60) return `${mins} min skim`
  const h = Math.round(mins / 60)
  return h <= 8 ? `~${h} h to skim` : 'days to read — use, don\'t read'
}

// One-command installers we recognise in a skill's use_guide.install. If the
// tool ships as a package, "Developer setup" is the wrong verdict no matter
// how big the repo is.
const ONE_LINE_INSTALL = /^\s*(pip3?|pipx|uv|uvx|npm (i|install)( -g)?|npx|pnpm (add|dlx)|yarn (add|dlx)|bunx|brew (install|tap)|cargo install|go install|gem install|docker (run|pull|compose)|winget install|choco install|scoop install|curl [^|]*\|\s*(ba|z)?sh)\b/i

const ENTRY_EXCLUDE = /^(infra|infrastructure|docs?|website|www|site|examples?|samples?|demos?|tests?|__tests__|spec|scripts?|tools?|\.github|\.claude|benchmarks?|evals?|notebooks?)\//i

export function analyzeRepo({ meta, languages, tree, category, installHint }) {
  const entries = (tree?.entries || []).filter((e) => e.type === 'blob' || e.type === 'tree')
  if (entries.length === 0 && !tree?.truncated) return null
  const blobs = entries.filter((e) => e.type === 'blob' && !SKIP_DIR.test(e.path) && !SKIP_FILE.test(e.path))
  const dirs = entries.filter((e) => e.type === 'tree' && !SKIP_DIR.test(e.path))
  const truncated = !!tree?.truncated

  // Files that shouldn't inflate the "how much code" number.
  const TEST_PATH = /(^|\/)(tests?|__tests__|spec|specs|e2e|testing|fixtures?)\//i
  const GENERATED_MAX_BYTES = 250_000 // >250 KB single "source" file = generated / data / vendored
  let codeBytes = 0, docBytes = 0, codeFiles = 0, docFiles = 0, configFiles = 0, otherFiles = 0, notebookFiles = 0, testFiles = 0
  const topLevel = new Map() // folder → { files, bytes, children:Map }
  const paths = new Set()
  for (const b of blobs) {
    paths.add(b.path)
    const e = ext(b.path)
    const size = b.size || 0
    const inTests = TEST_PATH.test(b.path)
    if (e === 'ipynb') notebookFiles++
    else if (CODE_EXT.has(e)) {
      if (inTests) testFiles++
      else { codeFiles++; if (size <= GENERATED_MAX_BYTES) codeBytes += size }
    }
    else if (DOC_EXT.has(e)) { docBytes += size; docFiles++ }
    else if (CONFIG_EXT.has(e) || CONFIG_FILES.test(b.path.split('/').pop())) configFiles++
    else if (!BINARY_EXT.has(e)) otherFiles++
    const slash = b.path.indexOf('/')
    if (slash > 0) {
      const top = b.path.slice(0, slash)
      const cur = topLevel.get(top) || { files: 0, bytes: 0, children: new Map() }
      cur.files++
      cur.bytes += size
      const rest = b.path.slice(slash + 1)
      const slash2 = rest.indexOf('/')
      if (slash2 > 0) {
        const child = rest.slice(0, slash2)
        cur.children.set(child, (cur.children.get(child) || 0) + 1)
      }
      topLevel.set(top, cur)
    }
  }

  const loc = Math.round(codeBytes / BYTES_PER_LINE)
  const docLines = Math.round(docBytes / BYTES_PER_LINE)
  let tier = sizeTier(loc, codeFiles)
  // Doc-dominant repos with a few helper scripts (996.ICU, awesome-* with a
  // linter, tutorials): call them what they are.
  const notebookHeavy = notebookFiles > 0 && notebookFiles >= codeFiles
  if (tier !== 'docs' && (docLines > 5 * loc || (docFiles > 3 * codeFiles && loc < 3000) || notebookHeavy)) tier = 'guide'
  const isDocs = tier === 'docs' || tier === 'guide'

  // Language mix — from GitHub's byte counts (excludes vendored by default).
  const langTotal = Object.values(languages || {}).reduce((a, b) => a + b, 0)
  const langs = Object.entries(languages || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, bytes]) => ({ name, pct: langTotal ? Math.round((bytes / langTotal) * 100) : 0 }))
    .filter((l) => l.pct > 0)
  const langPct = (name) => langs.find((l) => l.name === name)?.pct || 0

  // Folder map — top-level dirs, with a plain-English purpose.
  // A folder named like the repo (browser-use → browser_use/) is the package
  // itself — but dot-dirs (.opencode/) are settings, never core.
  const norm = (s) => String(s || '').toLowerCase().replace(/[-_\s]/g, '')
  const repoNorm = norm(meta?.name)
  const PROMPT_RE = FOLDER_PURPOSE.find(([, p]) => /^Prompts/.test(p))[0]
  const purposeOf = (name) => {
    if (PROMPT_RE.test(name) || /skills?$/i.test(name)) return 'Prompts, skills & agent definitions'
    if (repoNorm && !name.startsWith('.') && norm(name) === repoNorm) return 'Core code — the actual logic'
    const hit = (FOLDER_PURPOSE.find(([re]) => re.test(name)) || [null, null])[1]
    if (hit) return hit
    if (/^(website|landing|blog|homepage)$/i.test(name)) return 'Project website'
    if (/^(themes?|styles?|css|scss)$/i.test(name)) return 'Themes & styling'
    if (/^(sdks?|clients?|bindings?)$/i.test(name)) return 'SDKs / client libraries'
    if (/^patches$/i.test(name)) return 'Patches'
    if (/^(archived?|legacy|old|deprecated)$/i.test(name)) return 'Archived / older material'
    if (/^(black|white|allow|block)lists?$/i.test(name)) return 'Lists'
    if (/^(externals?|contrib|community)$/i.test(name)) return 'Community contributions'
    if (/^(proposals?|rfcs?|specs?|design)$/i.test(name)) return 'Proposals & design notes'
    if (/^\.[a-z0-9_-]+$/i.test(name)) return 'Tool / agent settings'
    return null
  }
  const PURPOSE_RANK = (p) => (/Core code|Prompts/.test(p || '') ? 0 : /Backend|Frontend|Sub-packages|Command-line|Workflows/.test(p || '') ? 1 : /Examples|Templates|Documentation/.test(p || '') ? 2 : /Tests|CI|settings|assets|Images/.test(p || '') ? 4 : 3)
  let folders = [...topLevel.entries()]
    .map(([name, v]) => ({ path: name, files: v.files, purpose: purposeOf(name), _children: v.children }))
  // Monorepo: when one folder holds >70% of files, show its children instead
  // of a single useless "packages/ 26,000 files" line.
  // (Not for skill/prompt libraries, tests, docs or examples — there the
  // children are just many siblings of the same kind.)
  const dominant = folders.find((f) => blobs.length > 20 && f.files / blobs.length > 0.7 && f._children.size >= 2 && !/Prompts|Tests|Documentation|Examples|Translations|Core code/.test(f.purpose || ''))
  if (dominant) {
    const children = [...dominant._children.entries()]
      .map(([name, files]) => ({ path: `${dominant.path}/${name}`, files, purpose: purposeOf(name) || (dominant.purpose && /Sub-packages/.test(dominant.purpose) ? 'Package' : null), _children: new Map() }))
    folders = [...children, ...folders.filter((f) => f !== dominant)]
  }
  folders = folders
    .sort((a, b) => PURPOSE_RANK(a.purpose) - PURPOSE_RANK(b.purpose) || b.files - a.files)
    .slice(0, 8)
    .map(({ _children, ...f }) => f)
  const promptFiles = [...topLevel.entries()].filter(([name]) => /Prompts/.test(purposeOf(name) || '')).reduce((a, [, v]) => a + v.files, 0)
  const promptShare = blobs.length ? promptFiles / blobs.length : 0

  // Entry points — where execution starts. Never in infra/docs/examples/tests.
  const rootFiles = blobs.filter((b) => !b.path.includes('/')).map((b) => b.path)
  const entryPoints = []
  for (const p of paths) {
    if (ENTRY_EXCLUDE.test(p)) continue
    if (ENTRY_PATTERNS.some((re) => re.test(p))) entryPoints.push(p)
  }
  // Prefer root / src / cmd / repo-named package, then shallowest, then shortest.
  const entryRank = (p) => (!p.includes('/') ? 0 : /^(src|cmd|app|bin)\//i.test(p) ? 1 : repoNorm && norm(p.split('/')[0]) === repoNorm ? 1 : 2)
  entryPoints.sort((a, b) => entryRank(a) - entryRank(b) || a.split('/').length - b.split('/').length || a.length - b.length)
  entryPoints.splice(4)

  const has = (re) => [...paths].some((p) => re.test(p))
  const signals = {
    readme: rootFiles.some((f) => /^readme(\.|$)/i.test(f)),
    tests: dirs.some((d) => /(^|\/)(tests?|__tests__|spec|specs|e2e)$/i.test(d.path)) || has(/(^|\/)[^/]*(\.test|\.spec|_test)\.[a-z]+$/i) || has(/(^|\/)test_[^/]+\.py$/i),
    docs: dirs.some((d) => /^(docs?|documentation)$/i.test(d.path)) || docFiles > 3,
    ci: dirs.some((d) => /^\.github\/workflows$/i.test(d.path)) || has(/^\.(gitlab-ci|circleci|travis)/i),
    // Only a root-level (or docker/) Dockerfile means "runs with Docker" — a
    // .devcontainer or example Dockerfile does not.
    docker: has(/^(docker\/)?(Dockerfile|docker-compose\.ya?ml|compose\.ya?ml)$/i),
    env_example: has(/^\.?env(\.example|\.sample|\.template|example)$/i) || has(/^(src|app|config)\/\.?env\.(example|sample|template)$/i),
    examples: dirs.some((d) => /^(examples?|samples?|demos?|cookbook)$/i.test(d.path)),
    license: meta?.license?.spdx_id && meta.license.spdx_id !== 'NOASSERTION' ? meta.license.spdx_id : meta?.license?.name || null,
  }

  const configList = rootFiles.filter((f) => CONFIG_FILES.test(f)).slice(0, 8)

  // Runtime / how you'd run it. Root manifests, ranked by language share so a
  // Python project with a package.json for its docs site isn't "Node.js".
  const runtimeCandidates = []
  if (rootFiles.some((f) => /^package\.json$/i.test(f))) runtimeCandidates.push(['Node.js', langPct('JavaScript') + langPct('TypeScript')])
  if (rootFiles.some((f) => /^(pyproject\.toml|setup\.py|requirements(-[a-z]+)?\.txt|Pipfile)$/i.test(f))) runtimeCandidates.push(['Python', langPct('Python') + langPct('Jupyter Notebook')])
  if (rootFiles.some((f) => /^go\.mod$/i.test(f))) runtimeCandidates.push(['Go', langPct('Go')])
  if (rootFiles.some((f) => /^Cargo\.toml$/i.test(f))) runtimeCandidates.push(['Rust', langPct('Rust')])
  if (rootFiles.some((f) => /^Gemfile$/i.test(f))) runtimeCandidates.push(['Ruby', langPct('Ruby')])
  if (rootFiles.some((f) => /^composer\.json$/i.test(f))) runtimeCandidates.push(['PHP', langPct('PHP')])
  if (rootFiles.some((f) => /^(pom\.xml|build\.gradle(\.kts)?)$/i.test(f))) runtimeCandidates.push(['Java/JVM', langPct('Java') + langPct('Kotlin')])
  const maxShare = Math.max(0, ...runtimeCandidates.map(([, s]) => s))
  const runtime = runtimeCandidates
    .filter(([, s]) => runtimeCandidates.length === 1 || s >= 10 || s >= maxShare)
    .sort((a, b) => b[1] - a[1])
    .map(([n]) => n)
  if (signals.docker) runtime.push('Docker')

  // Setup verdict — the line a non-coder actually needs.
  const skillFiles = [...paths].filter((p) => /(^|\/)SKILL\.md$/i.test(p)).length
  // SKILL.md files alone don't make a plugin — n8n ships 37 of them inside a
  // 2M-line app. Either a plugin manifest, or skills dominate a small repo,
  // or a large skill library where prompt files are a big share.
  const hasPluginManifest = dirs.some((d) => /^\.[a-z0-9-]+-plugin$/i.test(d.path)) || rootFiles.some((f) => /^(plugin|\.claude-plugin|marketplace)\.json$/i.test(f))
  const isPlugin = hasPluginManifest || (skillFiles >= 2 && (tier === 'docs' || tier === 'guide' || tier === 'tiny' || tier === 'small' || promptShare >= 0.3))
  const isPromptish = isDocs || /^(prompt|claude-skill)$/i.test(category || '') || promptShare >= 0.6 || isPlugin
  const oneLineInstall = typeof installHint === 'string' && ONE_LINE_INSTALL.test(installHint) && !/^\s*git clone/i.test(installHint)
  let setup
  if (isPlugin) {
    setup = { level: 'no-code', label: 'Install as a skill / plugin', note: `Add it to Claude Code (or your AI tool) with one command${skillFiles ? ` — ${skillFiles} skill${skillFiles === 1 ? '' : 's'} inside` : ''}. Nothing to run yourself.` }
  } else if (isPromptish && (codeFiles === 0 || tier === 'guide')) {
    setup = /^(prompt|claude-skill)$/i.test(category || '') || promptShare > 0
      ? { level: 'no-code', label: 'No code to run', note: 'It\'s prompts / instructions. Copy them into your AI tool.' }
      : { level: 'no-code', label: 'Nothing to install', note: notebookHeavy ? 'A course / notebook collection. Read it; run cells if you like.' : 'A guide / curated list. Just read it and follow the links.' }
  } else if (isPromptish && codeFiles > 0 && loc < 1500) {
    setup = { level: 'no-code', label: 'Mostly no-code', note: 'Prompt files plus a few small helper scripts.' }
  } else if (isPromptish && promptShare >= 0.6) {
    setup = { level: 'no-code', label: 'Install as a skill', note: 'A library of prompts/skills; helper scripts run inside your AI tool, not by you.' }
  } else if (oneLineInstall) {
    setup = { level: 'light', label: 'One-command install', note: `Installs like a normal app${signals.env_example ? ' — add your API keys' : ''}. Reading the code is optional.` }
  } else if (signals.docker && tier !== 'huge') {
    setup = { level: 'light', label: 'Light setup', note: `Runs with Docker${signals.env_example ? ' — add your API keys to .env' : ''}.` }
  } else if ((tier === 'tiny' || tier === 'small') && runtime.length <= 2) {
    setup = runtime.length
      ? { level: 'light', label: 'Light setup', note: `Install ${runtime[0]}${signals.env_example ? ', add API keys' : ''}, run one command.` }
      : { level: 'light', label: 'Light setup', note: 'Small project — see the README for how to run it.' }
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
  if (!isDocs) push(entryPoints.find((p) => !/\.md$/i.test(p)), 'Where the program starts running')
  if (setup.level !== 'no-code') push(rootFiles.find((f) => /^(package\.json|pyproject\.toml|Cargo\.toml|go\.mod|requirements\.txt|composer\.json)$/i.test(f)), 'Dependencies and the commands it exposes')
  push(rootFiles.find((f) => /^\.?env\.(example|sample|template)$/i.test(f)), 'The API keys and settings you must provide')
  if (reading.length < 5) {
    const core = folders.find((f) => /Core code|Prompts/.test(f.purpose || ''))
    if (core) {
      const inCore = [...paths].filter((p) => p.startsWith(core.path + '/') && !NOISE_FILE.test(p) && (CODE_EXT.has(ext(p)) || DOC_EXT.has(ext(p))))
      const depth = (p) => p.split('/').length
      const named = inCore.filter((p) => /(^|\/)(SKILL|README|index|main|app|cli|__init__|__main__)\.[a-z]+$/i.test(p)).sort((a, b) => depth(a) - depth(b) || a.localeCompare(b))[0]
      const first = named || inCore.filter((p) => CODE_EXT.has(ext(p))).sort((a, b) => depth(a) - depth(b) || a.localeCompare(b))[0]
      if (first) push(first, /Prompts/.test(core.purpose) ? `Inside ${core.path}/ — an example of what the AI is told to do` : `Inside ${core.path}/ — the main logic begins here`)
    }
  }
  if (reading.length < 5 && signals.examples) {
    const ex = [...paths].filter((p) => /^(examples?|samples?|demos?|cookbook)\//i.test(p) && !NOISE_FILE.test(p)).sort()[0]
    push(ex, 'A worked example — copy this to get going')
  }

  const locHuman = humanLines(loc) + (truncated ? '+' : '')

  const result = {
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
      loc_human: locHuman,
      doc_lines: docLines,
      code_files: codeFiles,
      test_files: testFiles,
      notebook_files: notebookFiles,
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
    truncated,
    flow: null,
  }
  result.summary = summarize(result)
  return result
}

// Deterministic 2-3 sentence verdict in natural language — unique per page,
// answers "what language is X / is X hard to install / is X maintained".
export function summarize(cf, displayName) {
  if (!cf?.size) return null
  const raw = displayName || cf.repo?.name || 'This project'
  const name = raw.charAt(0).toUpperCase() + raw.slice(1)
  const lang = cf.languages?.[0]?.name
  const isDocs = cf.size.tier === 'docs' || cf.size.tier === 'guide'
  const s1 = isDocs
    ? `${name} is ${cf.size.tier === 'docs' ? 'a documents-only repository' : 'mostly documents'} (${cf.size.doc_files} doc file${cf.size.doc_files === 1 ? '' : 's'}${cf.size.code_files ? `, ${cf.size.code_files} small script${cf.size.code_files === 1 ? '' : 's'}` : ''}) — something you read, not something you run.`
    : `${name} is a ${TIER_LABEL[cf.size.tier].toLowerCase().replace(' codebase', '')} ${lang ? lang + ' ' : ''}project (${cf.size.loc_human} lines across ${cf.size.code_files} code files${cf.size.test_files ? `, plus ${cf.size.test_files} test files` : ''}).`
  const setupSentence = cf.setup?.level === 'no-code'
    ? cf.setup.label === 'Install as a skill / plugin' ? 'You install it into your AI tool with one command; there is nothing to run yourself.' : 'There is nothing to install.'
    : cf.setup?.level === 'light'
      ? `Setup is light: ${cf.setup.note.charAt(0).toLowerCase()}${cf.setup.note.slice(1).replace(/\.$/, '')}.`
      : cf.size.tier === 'medium' ? 'Expect some technical setup — comfortable with a terminal, or ask a developer.' : 'It is a full software project: use it through its install path rather than reading it end to end.'
  const pushed = cf.repo?.pushed_at ? new Date(cf.repo.pushed_at) : null
  const months = pushed && cf.computed_at ? Math.max(0, Math.round((new Date(cf.computed_at) - pushed) / (30 * 86400000))) : null
  const maint = months === null ? '' : months === 0 ? 'Last commit this month' : months === 1 ? 'Last commit a month ago' : `Last commit ${months} months ago`
  const parts = []
  if (maint) parts.push(maint)
  parts.push(cf.signals?.license ? `${cf.signals.license} license` : 'no license file')
  if (!isDocs) parts.push(cf.signals?.tests ? 'has a test suite' : 'no tests found')
  const s3 = parts.length ? parts.join(', ').replace(/^./, (c) => c.toUpperCase()) + '.' : ''
  return [s1, setupSentence, s3].filter(Boolean).join(' ')
}

// One-shot: url → codeflow (deterministic only). Returns null on any failure.
export async function buildCodeflow(githubUrl, { category, installHint, fetchOpts, maxSizeKB } = {}) {
  const parsed = parseGithubUrl(githubUrl)
  if (!parsed) return null
  try {
    const facts = await fetchRepoFacts(parsed.owner, parsed.repo, fetchOpts, { maxSizeKB })
    if (!facts || facts.error || !facts.meta || !facts.tree) return null
    return analyzeRepo({ ...facts, category, installHint })
  } catch {
    return null
  }
}

// Sanitize an LLM-produced flow against the real file list. Anything that
// isn't shaped exactly right, references a file that doesn't exist, or smells
// like injected/marketing text is dropped — we never show an invented path or
// a URL the LLM chose.
const SUSPICIOUS = /https?:\/\/|www\.|@[a-z0-9]|ignore (all|any|previous|prior)|as an ai|system prompt|click here|sign up|discount|% off|\$\d/i
export function validateFlow(raw, pathSet) {
  if (!raw || typeof raw !== 'object') return null
  if (raw.confident !== true) return null
  const clean = (s, max) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, max) : '')
  const steps = Array.isArray(raw.steps) ? raw.steps : []
  const out = []
  let withFile = 0
  for (const s of steps) {
    const title = clean(s?.title, 40)
    const detail = clean(s?.detail, 140)
    if (!title || !detail) continue
    if (SUSPICIOUS.test(title) || SUSPICIOUS.test(detail)) return null
    let file = typeof s?.file === 'string' ? s.file.trim().replace(/^\.?\//, '') : null
    if (file && !pathSet.has(file)) file = null
    if (file) withFile++
    out.push({ title, detail, file })
    if (out.length >= 6) break
  }
  if (out.length < 3) return null
  if (withFile < 1) return null // not grounded in a single real file → don't show
  const summary = clean(raw.summary, 200)
  const input = clean(raw.input, 80)
  const output = clean(raw.output, 80)
  if ([summary, input, output].some((v) => SUSPICIOUS.test(v))) return null
  if (input && output && input.toLowerCase() === output.toLowerCase()) return null
  return { summary: summary || null, input: input || null, output: output || null, steps: out }
}
