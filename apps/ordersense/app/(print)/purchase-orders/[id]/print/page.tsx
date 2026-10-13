import { notFound } from 'next/navigation';
import { getStore } from '@/lib/supabase/server';
import { getPurchaseOrder } from '@/lib/db/queries';
import { getServerDictionary } from '@/lib/i18n/server';
import { fmtDate, fmtMoney, fmtQty, shortId } from '@/lib/utils';
import { PrintButton } from './print-button';

export const dynamic = 'force-dynamic';

/**
 * Print-ready purchase order. "Download PDF" opens this page and triggers the
 * browser's print dialog ("Save as PDF"), which renders Arabic and RTL text
 * correctly on every device without a server-side PDF font pipeline.
 */
export default async function PrintPurchaseOrder({ params }: { params: { id: string } }) {
  const store = await getStore();
  if (!store) notFound();
  const { d, locale } = getServerDictionary(store.language);
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const po = await getPurchaseOrder(store.id, params.id);
  if (!po) notFound();
  const lines = po.items.filter((i) => Number(i.final_quantity) > 0);
  const total = lines.reduce((s, i) => s + Number(i.final_quantity) * (i.unit_cost == null ? 0 : Number(i.unit_cost)), 0);

  return (
    <main className="mx-auto max-w-3xl bg-white p-6 text-black print:p-0">
      <div className="no-print mb-4 flex items-center justify-between rounded-lg border bg-muted p-3 text-sm">
        <span>{d.po.printHint}</span>
        <PrintButton label={d.po.print} />
      </div>

      <header className="flex items-start justify-between border-b-2 border-black pb-4">
        <div>
          <h1 className="text-2xl font-extrabold">{d.po.detail}</h1>
          <div className="text-sm">#{shortId(po.id)}</div>
        </div>
        <div className="text-end text-sm">
          <div className="text-lg font-bold">{store.name}</div>
          <div>
            {d.po.created}: {fmtDate(po.created_at, locale)}
          </div>
          <div>
            {d.common.status}: {d.po.status[po.status] ?? po.status}
          </div>
        </div>
      </header>

      <section className="my-4 text-sm">
        <div>
          <span className="font-bold">{d.common.supplier}:</span> {po.supplier?.name ?? d.common.noSupplier}
        </div>
        {po.supplier?.whatsapp_number ? (
          <div>
            <span className="font-bold">WhatsApp:</span> <span dir="ltr">{po.supplier.whatsapp_number}</span>
          </div>
        ) : null}
        {po.notes ? (
          <div className="mt-2">
            <span className="font-bold">{d.po.notes}:</span> {po.notes}
          </div>
        ) : null}
      </section>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-black text-start">
            <th className="py-2 text-start">#</th>
            <th className="py-2 text-start">{d.common.product}</th>
            <th className="py-2 text-start">SKU</th>
            <th className="py-2 text-end">{d.po.finalQty}</th>
            <th className="py-2 text-end">{d.common.unitCost}</th>
            <th className="py-2 text-end">{d.common.total}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((i, idx) => {
            const q = Number(i.final_quantity);
            const c = i.unit_cost == null ? null : Number(i.unit_cost);
            return (
              <tr key={i.id} className="border-b">
                <td className="py-2">{idx + 1}</td>
                <td className="py-2 font-semibold">{i.product?.name ?? '—'}</td>
                <td className="py-2 text-xs">{i.product?.sku ?? ''}</td>
                <td className="py-2 text-end text-base font-bold tabular-nums">{fmtQty(q, locale)}</td>
                <td className="py-2 text-end tabular-nums">{c == null ? '—' : fmtMoney(c, store.currency, locale)}</td>
                <td className="py-2 text-end tabular-nums">{c == null ? '—' : fmtMoney(q * c, store.currency, locale)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5} className="py-3 text-end font-bold">
              {d.po.totalEst}
            </td>
            <td className="py-3 text-end text-base font-extrabold tabular-nums">{fmtMoney(total, store.currency, locale)}</td>
          </tr>
        </tfoot>
      </table>

      <footer className="mt-8 grid grid-cols-2 gap-8 text-xs">
        <div className="border-t pt-2">{locale === 'ar' ? 'توقيع المتجر' : 'Store signature'}</div>
        <div className="border-t pt-2">{locale === 'ar' ? 'توقيع المورّد' : 'Supplier signature'}</div>
      </footer>
    </main>
  );
}
