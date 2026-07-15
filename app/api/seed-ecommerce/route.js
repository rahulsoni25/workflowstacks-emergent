// RETIRED (2026-07-15). This endpoint seeded fictional skills — invented
// products with fabricated ratings/installs and no real source. That directly
// contradicts the site's "real tools, real numbers" promise, so it is gone
// for good (same treatment as /api/rewrite-titles). Git history has the old code.
export async function POST() {
  return Response.json(
    { error: 'Gone. seed-ecommerce seeded fictional data and has been permanently retired.' },
    { status: 410 }
  );
}

export async function GET() {
  return POST();
}
