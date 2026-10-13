import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/supabase/server';
import { mapColumns } from '@/lib/ai/map-columns';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const Body = z.object({
  headers: z.array(z.string()).min(1).max(100),
  rows: z.array(z.record(z.string(), z.unknown())).max(20).default([]),
});

/**
 * POST /api/ai/map-columns
 * Body: { headers: string[], rows: Record<string, unknown>[] }  (first 20 rows)
 * Returns: { mapping, confidence, issues, source, dateFormat, aiError? }
 */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Send { headers, rows }.' }, { status: 400 });

  const sampleRows = parsed.data.rows.map((r) => {
    const o: Record<string, string> = {};
    for (const h of parsed.data.headers) o[h] = String(r[h] ?? '').slice(0, 80);
    return o;
  });
  const result = await mapColumns({ headers: parsed.data.headers, sampleRows });
  return NextResponse.json(result);
}
