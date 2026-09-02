// Install readiness: how close is "one click" to "a working product" for this
// listing? Derived from data the catalog already has — the Codeflow repo
// analysis (setup verdict, runtimes, env/docker signals) plus the enrichment
// text (gotchas, install hints). Pure and dependency-free so both the browser
// (readiness badge) and the server (setup-prompt requirements) can use it.

const KEY_RE = /api[- ]?key|access[- ]?token|client[- ]?secret|credential|auth token|\.env\b/i
const DESKTOP_RE = /desktop app|locally installed app|headless (server|environment)s? (are |is )?not supported|requires? (microsoft )?(office|excel|word|photoshop)/i
const GPU_RE = /\bgpu\b|\bcuda\b|\bvram\b/i

const LEVELS = {
  instant: {
    label: '⚡ Runs out of the box',
    detail: 'A prompt/skill package — nothing to install beyond adding it to your AI tool.',
    tone: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  light: {
    label: '✅ Light setup',
    detail: 'Installs with a command or two; your AI agent can do it for you.',
    tone: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  },
  'needs-key': {
    label: '🔑 Needs an API key',
    detail: 'Works after you add credentials — the setup agent will ask you for them.',
    tone: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  'needs-app': {
    label: '🖥️ Needs desktop apps',
    detail: 'Drives software that must already be installed on your computer.',
    tone: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  },
  dev: {
    label: '🛠️ Technical setup',
    detail: 'Expect 20–40 minutes in a terminal — or let your AI agent drive it.',
    tone: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  },
  unknown: {
    label: '🔍 Setup not yet analyzed',
    detail: 'We haven’t analyzed this repo’s setup — your AI agent will work it out from the README and ask you if anything is missing.',
    tone: 'bg-slate-500/15 text-slate-300 border-slate-600/50',
  },
}

// skill: catalog doc. codeflowOverride: the page's (possibly live-built)
// codeflow when the stored one is missing/stale.
export function installReadiness(skill, codeflowOverride = null) {
  const cf = codeflowOverride || skill.codeflow || null
  const text = [skill.use_guide?.gotcha, skill.use_guide?.install, skill.explainer?.common_confusions, skill.readme_preview]
    .filter(Boolean)
    .join(' ')

  const needsKey = Boolean(cf?.signals?.env_example) || KEY_RE.test(text)
  const needsDesktop = DESKTOP_RE.test(text)
  const needsGpu = GPU_RE.test(text)
  const setupLevel = cf?.setup?.level || null
  const isPromptLike = /^(prompt|claude-skill)$/i.test(skill.category || '') || setupLevel === 'no-code'

  // Never overclaim: with no repo analysis, no documented install command and
  // no textual signals, we genuinely don't know — say so instead of guessing
  // "light". A wrong badge costs more trust than an honest unknown.
  const hasEvidence = Boolean(cf?.setup || cf?.runtime?.length || skill.use_guide?.install || needsKey || needsDesktop || needsGpu)

  let level = 'light'
  if (isPromptLike) level = 'instant'
  else if (needsDesktop) level = 'needs-app'
  else if (setupLevel === 'dev') level = 'dev'
  else if (needsKey) level = 'needs-key'
  else if (!hasEvidence) level = 'unknown'

  // Everything the setup agent should know before it starts. Kept as plain
  // sentences so setupPrompt can print them verbatim.
  const requirements = []
  const verified = skill.verified_install?.ok ? skill.verified_install : null
  if (verified) {
    const when = verified.at ? new Date(verified.at).toLocaleDateString('en-US') : ''
    requirements.push(`WorkflowStacks verified this install${when ? ` on ${when}` : ''} — ${verified.method || 'the documented command'} completed successfully in CI.`)
  }
  if (cf?.runtime?.length) requirements.push(`Runtime: ${cf.runtime.join(', ')}.`)
  if (skill.use_guide?.install) requirements.push(`Documented install command: ${skill.use_guide.install}`)
  if (needsKey) requirements.push('Configuration: expect to provide API keys / a .env file before it fully runs.')
  if (needsDesktop) requirements.push('Needs desktop applications already installed on the machine — headless servers will not work.')
  if (needsGpu) requirements.push('Mentions GPU/CUDA — check hardware requirements before installing.')
  if (cf?.signals?.docker) requirements.push('Ships Docker support — a container is an alternative to local installs.')
  if (cf?.setup?.label) requirements.push(`Setup effort (from repo analysis): ${cf.setup.label}${cf.setup.note ? ` — ${cf.setup.note}` : ''}`)
  if (skill.explainer?.time_to_setup) requirements.push(`Typical setup time: ${skill.explainer.time_to_setup}.`)
  if (cf?.signals?.license) requirements.push(`License: ${cf.signals.license}.`)

  return { level, ...LEVELS[level], requirements, verified }
}
