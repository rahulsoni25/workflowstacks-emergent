import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PoEditor } from '@/components/po-editor';
import { getStore } from '@/lib/supabase/server';
import { getPurchaseOrder } from '@/lib/db/queries';
import { getServerDictionary } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export default async function PurchaseOrderPage({ params }: { params: { id: string } }) {
  const store = (await getStore())!;
  const { d } = getServerDictionary(store.language);
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const po = await getPurchaseOrder(store.id, params.id);
  if (!po) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/purchase-orders" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {d.po.title}
      </Link>
      <PoEditor po={po} storeName={store.name} currency={store.currency} />
    </div>
  );
}
