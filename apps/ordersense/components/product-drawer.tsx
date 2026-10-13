'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { updateProduct } from '@/actions/products';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { StatusBadge } from '@/components/status-badge';
import { useI18n } from '@/lib/i18n/context';
import { fmtDate, fmtDays, fmtMoney, fmtQty } from '@/lib/utils';
import type { ClientRecommendation } from '@/lib/calculations/client';
import type { SupplierRow } from '@/lib/types';

const NONE = '__none__';

interface Props {
  rec: ClientRecommendation | null;
  suppliers: Pick<SupplierRow, 'id' | 'name'>[];
  currency: string;
  onClose: () => void;
}

export function ProductDrawer({ rec, suppliers, currency, onClose }: Props) {
  const { d, locale } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState<Record<string, string>>({});

  if (!rec) return null;
  const v = (k: string, fallback: string | number | null) => (form[k] !== undefined ? form[k] : fallback == null ? '' : String(fallback));

  function save() {
    if (!rec) return;
    start(async () => {
      const payload: Record<string, unknown> = {};
      if (form.lead_time_days !== undefined) payload.lead_time_days = form.lead_time_days;
      if (form.target_cover_days !== undefined) payload.target_cover_days = form.target_cover_days;
      if (form.safety_stock !== undefined) payload.safety_stock = form.safety_stock;
      if (form.current_stock !== undefined) payload.current_stock = form.current_stock;
      if (form.unit_cost !== undefined) payload.unit_cost = form.unit_cost === '' ? null : form.unit_cost;
      if (form.supplier_id !== undefined) payload.supplier_id = form.supplier_id === NONE ? null : form.supplier_id;
      if (Object.keys(payload).length === 0) {
        onClose();
        return;
      }
      const res = await updateProduct(rec.productId, payload);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(d.products.saved);
      setForm({});
      router.refresh();
      onClose();
    });
  }

  const Stat = ({ label, value }: { label: string; value: string }) => (
    <div className="rounded-lg bg-muted p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
    </div>
  );

  return (
    <Sheet open={Boolean(rec)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent title={rec.name}>
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={rec.status} />
            {rec.sku ? <span className="text-xs text-muted-foreground">SKU {rec.sku}</span> : null}
            {rec.category ? <span className="text-xs text-muted-foreground">· {rec.category}</span> : null}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Stat label={d.common.stock} value={fmtQty(rec.currentStock, locale)} />
            <Stat label={d.common.velocity} value={fmtQty(rec.dailyVelocity, locale)} />
            <Stat label={d.common.cover} value={fmtDays(rec.daysOfCover, locale)} />
            <Stat label={d.products.reorderPoint} value={fmtQty(rec.reorderPoint, locale)} />
            <Stat label={d.products.sold14} value={fmtQty(rec.sold14d, locale)} />
            <Stat label={d.products.sold30} value={fmtQty(rec.sold30d, locale)} />
            <Stat label={d.products.lastSale} value={fmtDate(rec.lastSaleDate, locale)} />
            <Stat label={d.common.suggested} value={`${fmtQty(rec.recommendedQuantity, locale)} ${rec.estimatedCost != null ? `· ${fmtMoney(rec.estimatedCost, currency, locale)}` : ''}`} />
          </div>

          <div className="space-y-3">
            <h4 className="font-bold">{d.products.settings}</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="p-stock">{d.common.stock}</Label>
                <Input id="p-stock" type="number" inputMode="decimal" min={0} className="mt-1" value={v('current_stock', rec.currentStock)} onChange={(e) => setForm({ ...form, current_stock: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="p-cost">{d.common.unitCost}</Label>
                <Input id="p-cost" type="number" inputMode="decimal" min={0} step="0.01" className="mt-1" value={v('unit_cost', rec.unitCost)} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="p-lead">{d.products.leadTime}</Label>
                <Input id="p-lead" type="number" inputMode="numeric" min={0} max={90} className="mt-1" value={v('lead_time_days', rec.leadTimeDays)} onChange={(e) => setForm({ ...form, lead_time_days: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="p-cover">{d.products.coverTarget}</Label>
                <Input id="p-cover" type="number" inputMode="numeric" min={1} max={120} className="mt-1" value={v('target_cover_days', rec.targetCoverDays)} onChange={(e) => setForm({ ...form, target_cover_days: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="p-safety">{d.products.safetyStock}</Label>
                <Input id="p-safety" type="number" inputMode="numeric" min={0} className="mt-1" value={v('safety_stock', rec.safetyStock)} onChange={(e) => setForm({ ...form, safety_stock: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="p-supplier">{d.common.supplier}</Label>
                <Select value={v('supplier_id', rec.supplierId ?? NONE) || NONE} onValueChange={(val) => setForm({ ...form, supplier_id: val })}>
                  <SelectTrigger id="p-supplier" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{d.common.noSupplier}</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button size="lg" className="w-full" onClick={save} loading={pending}>
              {d.common.save}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
