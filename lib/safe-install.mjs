// Safe-install allowlist for the verification pipeline.
//
// SECURITY: use_guide.install strings originate from third-party READMEs (via
// LLM extraction) — running them is arbitrary code execution. The verifier
// therefore refuses everything except a single, exactly-shaped package
// install from a public registry, parsed into argv (never a shell string).
// Anything with flags we don't expect, URLs, shell metacharacters, or
// multiple commands parses to null and is skipped.

const PIP_PKG = /^[A-Za-z0-9][A-Za-z0-9._-]*(\[[A-Za-z0-9._,-]+\])?$/
const NPM_PKG = /^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/

// Returns { kind: 'pip'|'npm', pkg } or null when the command is not a plain
// single-package install we're willing to run.
export function parseSafeInstall(command) {
  const cmd = String(command || '').trim()
  if (!cmd || /[;&|<>`$\\'"\n\r]/.test(cmd)) return null

  let m = cmd.match(/^(?:pip3?|python3? -m pip) install ([^\s]+)$/)
  if (m && PIP_PKG.test(m[1])) return { kind: 'pip', pkg: m[1] }

  m = cmd.match(/^npm install (?:-g )?([^\s]+)$/)
  if (m && NPM_PKG.test(m[1])) return { kind: 'npm', pkg: m[1] }

  return null
}
