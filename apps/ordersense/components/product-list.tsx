'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/status-badge';
import { ProductDrawer } from '@/components/product-drawer';
import { EmptyState } from '@/components/empty-state';
import { useI18n } from '@/lib/i18n/context';
import { fmtDays, fmtQty } from '@/lib/utils';
import type { ClientRecommendation } from '@/lib/calculations/client';
import type { SupplierRow } from '@/lib/types';

type Tab = 'all' | 'fast' | 'slow' | 'dead' | 'over';
const ALL = '__all__';

interface Props {
  recommendations: ClientRecommendation[];
  suppliers: Pick<SupplierRow, 'id' | 'name'>[];
  currency: string;
  initialTab?: Tab;
}

export function ProductList({ recommendations, suppliers, currency, initialTab = 'all' }: Props) {
  const { d, locale } = useI18n();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [q, setQ] = useState('');
  const [supplier, setSupplier] = useState(ALL);
  const [openId, setOpenId] = useState<string | null>(null);

  // "Fast" = top third by velocity among products that sold; "slow" = bottom third (but not dead).
  const { fastCut, slowCut } = useMemo(() => {
    const vs = recommendations.filter((r) => r.dailyVelocity > 0).map((r) => r.dailyVelocity).sort((a, b) => a - b);
    if (vs.length === 0) return { fastCut: Infinity, slowCut: 0 };
    return { fastCut: vs[Math.floor((vs.length * 2) / 3)] ?? Infinity, slowCut: vs[Math.floor(vs.length / 3)] ?? 0 };
  }, [recommendations]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return recommendations
      .filter((r) => {
        if (tab === 'fast') return r.dailyVelocity > 0 && r.dailyVelocity >= fastCut;
        if (tab === 'slow') return !r.flags.deadStock && r.dailyVelocity > 0 && r.dailyVelocity <= slowCut;
        if (tab === 'dead') return r.flags.deadStock;
        if (tab === 'over') return r.flags.overstocked;
        return true;
      })
      .filter((r) => supplier === ALL || (supplier === 'none' ? !r.supplierId : r.supplierId === supplier))
      .filter((r) => !needle || r.name.toLowerCase().includes(needle) || (r.sku ?? '').toLowerCase().includes(needle) || (r.category ?? '').toLowerCase().includes(needle))
      .sort((a, b) => (tab === 'fast' ? b.dailyVelocity - a.dailyVelocity : tab === 'slow' ? a.dailyVelocity - b.dailyVelocity : a.name.localeCompare(b.name)));
  }, [recommendations, tab, q, supplier, fastCut, slowCut]);

  const open = openId ? recommendations.find((r) => r.productId === openId) ?? null : null;

  return (
    <div className="space-y-3">
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          {(['all', 'fast', 'slow', 'dead', 'over'] as Tab[]).map((t) => (
            <TabsTrigger key={t} value={t}>
              {d.products.tabs[t]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={d.products.searchPlaceholder} className="ps-10" />
        </div>
        <Select value={supplier} onValueChange={setSupplier}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{d.common.all}</SelectItem>
            <SelectItem value="none">{d.common.noSupplier}</SelectItem>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">
        {rows.length} {d.products.count}
      </p>

      {rows.length === 0 ? (
        <EmptyState title={d.products.empty} />
      ) : (
        <ul className="divide-y rounded-xl border">
          {rows.map((r) => (
            <li key={r.productId}>
              <button type="button" onClick={() => setOpenId(r.productId)} className="flex w-full items-center gap-3 p-3 text-start hover:bg-accent/40">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{r.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {r.supplierName ?? d.common.noSupplier}
                    {r.category ? ` · ${r.category}` : ''}
                  </div>
                </div>
                <div className="hidden w-20 text-end text-sm tabular-nums sm:block">
                  <div className="text-xs text-muted-foreground">{d.common.stock}</div>
                  {fmtQty(r.currentStock, locale)}
                </div>
                <div className="w-20 text-end text-sm tabular-nums">
                  <div className="text-xs text-muted-foreground">{d.common.velocity}</div>
                  {fmtQty(r.dailyVelocity, locale)}
                </div>
                <div className="w-16 text-end text-sm tabular-nums">
                  <div className="text-xs text-muted-foreground">{d.common.cover}</div>
                  {fmtDays(r.daysOfCover, locale)}
                </div>
                <StatusBadge status={r.status} className="hidden sm:inline-flex" />
                <span className={`h-3 w-3 shrink-0 rounded-full sm:hidden ${r.status === 'healthy' ? 'bg-status-green' : r.status === 'order_soon' ? 'bg-status-amber' : r.status === 'dead_stock' ? 'bg-status-grey' : r.status === 'overstocked' ? 'bg-status-blue' : 'bg-status-red'}`} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ProductDrawer rec={open} suppliers={suppliers} currency={currency} onClose={() => setOpenId(null)} />
    </div>
  );
}
