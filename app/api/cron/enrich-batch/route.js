// Autonomous enrichment cron — gradually fills explainer + best_with_tools
// across the catalog without needing my active session. Idempotent: skips
// skills that already have what it would generate. Safe to run on any cadence.
//
// Strategy each run: enrich up to 5 unenriched skills, then refill best_with_tools
// on up to 5 legacy-prompt skills. Stays well under the 60s Vercel timeout.

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.workflowstacks.com'

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET
  const provided = request.headers.get('authorization') || ''
  if (cronSecret && provided !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized — cron secret required' }, { status: 401 })
  }
  if (!process.env.ADMIN_SECRET) {
    return Response.json({ error: 'ADMIN_SECRET not set — cannot self-call enrich endpoint' }, { status: 500 })
  }

  // Pass 1: enrich 5 unenriched skills
  let pass1 = { attempted: 0, enriched: 0, errors: [] }
  try {
    const r = await fetch(`${BASE}/api/enrich-skills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': process.env.ADMIN_SECRET },
      body: JSON.stringify({ limit: 5 }),
    })
    pass1 = await r.json()
  } catch (e) {
    pass1 = { error: e.message }
  }

  // Pass 2: refill best_with_tools on 5 legacy-prompt skills
  let pass2 = { attempted: 0, enriched: 0, errors: [] }
  try {
    const r = await fetch(`${BASE}/api/enrich-skills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': process.env.ADMIN_SECRET },
      body: JSON.stringify({ limit: 5, needsBestWithTools: true }),
    })
    pass2 = await r.json()
  } catch (e) {
    pass2 = { error: e.message }
  }

  return Response.json({
    at: new Date().toISOString(),
    pass1_enrichNew: { attempted: pass1.attempted, enriched: pass1.enriched, errorCount: (pass1.errors || []).length },
    pass2_refillBestWith: { attempted: pass2.attempted, enriched: pass2.enriched, errorCount: (pass2.errors || []).length },
  })
}
