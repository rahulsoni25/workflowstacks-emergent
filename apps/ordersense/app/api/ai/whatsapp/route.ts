import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getStore } from '@/lib/supabase/server';
import { getPurchaseOrder } from '@/lib/db/queries';
import { whatsappMessage } from '@/lib/ai/explain';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const Body = z.object({ purchaseOrderId: z.string().uuid() });

/**
 * POST /api/ai/whatsapp  { purchaseOrderId }
 * Returns { message: { en, ar } } written from the order's final quantities.
 */
export async function POST(request: Request) {
  const store = await getStore();
  if (!store) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });

  const po = await getPurchaseOrder(store.id, parsed.data.purchaseOrderId);
  if (!po) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const { result, error } = await whatsappMessage({
    storeName: store.name,
    supplierName: po.supplier?.name ?? 'Supplier',
    notes: po.notes,
    lines: po.items.filter((i) => Number(i.final_quantity) > 0).map((i) => ({ product: i.product?.name ?? 'Item', quantity: Number(i.final_quantity) })),
  });
  if (!result) return NextResponse.json({ error: error ?? 'AI unavailable.' }, { status: 503 });
  return NextResponse.json(result);
}
