import { NextResponse } from 'next/server';
import { getStore } from '@/lib/supabase/server';
import { getPurchaseOrder } from '@/lib/db/queries';
import { purchaseOrderWorkbook } from '@/lib/po/excel';

export const dynamic = 'force-dynamic';

/** GET /api/purchase-orders/:id/xlsx -> Excel download */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const store = await getStore();
  if (!store) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const po = await getPurchaseOrder(store.id, params.id);
  if (!po) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  const buffer = purchaseOrderWorkbook(po, store);
  const name = `PO-${po.id.slice(0, 8).toUpperCase()}-${(po.supplier?.name ?? 'order').replace(/[^\w؀-ۿ]+/g, '_')}.xlsx`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(name)}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      'Cache-Control': 'no-store',
    },
  });
}
