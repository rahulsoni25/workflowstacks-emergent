import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getStore } from '@/lib/supabase/server';
import { getRecommendations } from '@/lib/db/queries';
import { explainRecommendations } from '@/lib/ai/explain';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const Body = z.object({ productIds: z.array(z.string().uuid()).max(200).optional() });

/**
 * POST /api/ai/explain-recommendations
 * Body: { productIds?: string[] }  - defaults to every product that needs ordering,
 * plus overstocked / dead-stock items.
 *
 * The numbers are recomputed server-side from the database so Claude only
 * ever sees deterministic figures; it returns English + Arabic explanations
 * and one WhatsApp-ready message per supplier.
 */
export async function POST(request: Request) {
  const store = await getStore();
  if (!store) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });

  const { recommendations, asOf } = await getRecommendations(store.id);
  const ids = parsed.data.productIds ? new Set(parsed.data.productIds) : null;
  const subset = ids ? recommendations.filter((r) => ids.has(r.productId)) : recommendations;

  const { result, error } = await explainRecommendations({ storeName: store.name, currency: store.currency, asOf, recommendations: subset });
  if (!result) return NextResponse.json({ error: error ?? 'AI unavailable.' }, { status: 503 });
  return NextResponse.json(result);
}
