import Link from 'next/link';
import { ChevronRight, ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { getStore } from '@/lib/supabase/server';
import { listPurchaseOrders } from '@/lib/db/queries';
import { getServerDictionary } from '@/lib/i18n/server';
import { fmtDate, fmtMoney, shortId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const VARIANT: Record<string, 'amber' | 'blue' | 'green' | 'grey'> = { draft: 'amber', sent: 'blue', received: 'green', cancelled: 'grey' };

export default async function PurchaseOrdersPage() {
  const store = (await getStore())!;
  const { d, locale } = getServerDictionary(store.language);
  const orders = await listPurchaseOrders(store.id);
  const drafts = orders.filter((o) => o.status === 'draft');
  const others = orders.filter((o) => o.status !== 'draft');

  const List = ({ title, items }: { title: string; items: typeof orders }) =>
    items.length ? (
      <section className="space-y-2">
        <h2 className="text-lg font-bold">
          {title} <span className="text-muted-foreground">({items.length})</span>
        </h2>
        <ul className="divide-y rounded-xl border">
          {items.map((o) => (
            <li key={o.id}>
              <Link href={`/purchase-orders/${o.id}`} className="flex items-center gap-3 p-3 hover:bg-accent/40">
                <div className="min-w-0 flex-1">
                  <div className="font-bold">
                    #{shortId(o.id)} · {o.supplier?.name ?? d.common.noSupplier}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {fmtDate(o.created_at, locale)} · {o.itemCount} {d.po.itemsCount} · {fmtMoney(Number(o.total_estimated_cost), store.currency, locale)}
                  </div>
                </div>
                <Badge variant={VARIANT[o.status] ?? 'grey'}>{d.po.status[o.status] ?? o.status}</Badge>
                <ChevronRight className="h-5 w-5 text-muted-foreground rtl:rotate-180" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    ) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">{d.po.title}</h1>
      {orders.length === 0 ? (
        <EmptyState
          icon={<ClipboardList />}
          title={d.po.noOrders}
          description={d.po.createFromDashboard}
          action={
            <Button asChild>
              <Link href="/dashboard">{d.nav.dashboard}</Link>
            </Button>
          }
        />
      ) : (
        <>
          <List title={d.po.drafts} items={drafts} />
          <List title={d.po.sent} items={others} />
        </>
      )}
    </div>
  );
}
