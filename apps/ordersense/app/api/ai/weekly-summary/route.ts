import { NextResponse } from 'next/server';
import { getStore } from '@/lib/supabase/server';
import { getRecommendations } from '@/lib/db/queries';
import { weeklySummary } from '@/lib/ai/explain';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** POST /api/ai/weekly-summary -> { headline, insights[], actions[] } in en + ar. */
export async function POST() {
  const store = await getStore();
  if (!store) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { recommendations, summary } = await getRecommendations(store.id);
  const { result, error } = await weeklySummary({ storeName: store.name, currency: store.currency, summary, recommendations });
  if (!result) return NextResponse.json({ error: error ?? 'AI unavailable.' }, { status: 503 });
  return NextResponse.json({ ...result, summary });
}
