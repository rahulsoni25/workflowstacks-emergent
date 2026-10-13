import * as XLSX from 'xlsx';
import type { PurchaseOrderWithItems, StoreRow } from '@/lib/types';

/** Build an .xlsx purchase order as a Buffer (server side). */
export function purchaseOrderWorkbook(po: PurchaseOrderWithItems, store: StoreRow): Buffer {
  const header = [
    ['Purchase order', po.id.slice(0, 8).toUpperCase()],
    ['Store', store.name],
    ['Supplier', po.supplier?.name ?? 'No supplier'],
    ['Status', po.status],
    ['Created', po.created_at.slice(0, 10)],
    ['Currency', store.currency],
    po.notes ? ['Notes', po.notes] : [],
    [],
    ['Product', 'SKU', 'Order qty', 'Suggested qty', `Unit cost (${store.currency})`, `Line total (${store.currency})`, 'Reason'],
  ];
  const rows = po.items
    .filter((i) => Number(i.final_quantity) > 0)
    .map((i) => {
      const q = Number(i.final_quantity);
      const c = i.unit_cost == null ? null : Number(i.unit_cost);
      return [i.product?.name ?? '', i.product?.sku ?? '', q, Number(i.recommended_quantity), c ?? '', c == null ? '' : Math.round(q * c * 100) / 100, i.reason ?? ''];
    });
  const total = rows.reduce((sum, r) => sum + (typeof r[5] === 'number' ? r[5] : 0), 0);
  const sheet = XLSX.utils.aoa_to_sheet([...header, ...rows, [], ['', '', '', '', 'Total', Math.round(total * 100) / 100]]);
  sheet['!cols'] = [{ wch: 36 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 40 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Purchase order');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
