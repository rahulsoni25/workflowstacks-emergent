import { compile, validateWorkflow } from '../../../lib/n8n-compiler/index.js'

function requireAdmin(request) {
  const secret = process.env.ADMIN_SECRET
  const provided = request.headers.get('x-admin-secret')
  if (!secret || provided !== secret) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return null
}

// Admin: compile a high-level spec into a validated n8n workflow.
// The programmatic factory endpoint — structure is guaranteed by the compiler,
// then gated by the structural validator before anything is returned. (A
// headless-n8n import check is the intended second gate, run by the caller.)
export async function POST(request) {
  const denied = requireAdmin(request)
  if (denied) return denied

  let spec
  try { spec = await request.json() } catch { return Response.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  if (!spec?.name || !spec?.trigger || !Array.isArray(spec?.steps)) {
    return Response.json({ error: 'Spec needs name, trigger, and steps[]' }, { status: 400 })
  }

  let workflow
  try {
    workflow = compile(spec)
  } catch (e) {
    return Response.json({ ok: false, stage: 'compile', error: e.message }, { status: 400 })
  }

  const check = validateWorkflow(workflow)
  if (!check.ok) {
    return Response.json({ ok: false, stage: 'validate', errors: check.errors }, { status: 422 })
  }

  return Response.json({ ok: true, workflow, nodes: workflow.nodes.length })
}
