'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { createPurchaseOrders } from '@/actions/purchase-orders';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/status-badge';
import { ExplainPanel } from '@/components/explain-panel';
import { useI18n } from '@/lib/i18n/context';
import { fmtDays, fmtMoney, fmtQty } from '@/lib/utils';
import type { ClientRecommendation } from '@/lib/calculations/client';

interface Props {
  recommendations: ClientRecommendation[];
  currency: string;
  supplierNumbers: Record<string, string | null>;
}

export function RecommendationTable({ recommendations, currency, supplierNumbers }: Props) {
  const { d, locale } = useI18n();
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);
  const [pending, start] = useTransition();

  const toOrder = useMemo(() => recommendations.filter((r) => r.recommendedQuantity > 0), [recommendations]);
  const rows = showAll ? recommendations : toOrder;
  const [selected, setSelected] = useState<Set<string>>(() => new Set(toOrder.map((r) => r.productId)));
  const byId = useMemo(() => Object.fromEntries(recommendations.map((r) => [r.productId, r])), [recommendations]);

  const selectedRows = toOrder.filter((r) => selected.has(r.productId));
  const estTotal = selectedRows.reduce((s, r) => s + (r.estimatedCost ?? 0), 0);
  const missingCost = selectedRows.filter((r) => r.estimatedCost == null).length;
  const allSelected = toOrder.length > 0 && selectedRows.length === toOrder.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function create() {
    start(async () => {
      const res = await createPurchaseOrders([...selected]);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const ids = res.data?.ids ?? [];
      toast.success(`${ids.length} ${d.po.title.toLowerCase()}`);
      router.push(ids.length === 1 ? `/purchase-orders/${ids[0]}` : '/purchase-orders');
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">
          {d.dashboard.tableTitle} <span className="text-muted-foreground">({toOrder.length})</span>
        </h2>
        <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
          {showAll ? d.dashboard.tableTitle : d.dashboard.showAll}
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border-2 border-status-green/40 bg-status-green/5 p-6 text-center">
          <div className="text-lg font-bold text-status-green">{d.dashboard.nothingToOrder}</div>
          <div className="text-sm text-muted-foreground">{d.dashboard.allOk}</div>
        </div>
      ) : (
        <>
          {/* Phone: card list */}
          <ul className="space-y-2 md:hidden">
            {rows.map((r) => {
              const orderable = r.recommendedQuantity > 0;
              return (
                <li key={r.productId} className="flex items-start gap-3 rounded-xl border p-3">
                  {orderable ? (
                    <Checkbox className="mt-1" checked={selected.has(r.productId)} onChange={() => toggle(r.productId)} aria-label={r.name} />
                  ) : (
                    <span className="mt-1 h-6 w-6" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-bold">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.supplierName ?? d.common.noSupplier}</div>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-1 text-center text-xs">
                      <div>
                        <div className="text-muted-foreground">{d.common.stock}</div>
                        <div className="font-bold tabular-nums">{fmtQty(r.currentStock, locale)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">{d.common.velocity}</div>
                        <div className="font-bold tabular-nums">{fmtQty(r.dailyVelocity, locale)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">{d.common.cover}</div>
                        <div className="font-bold tabular-nums">{fmtDays(r.daysOfCover, locale)}</div>
                      </div>
                      <div className={orderable ? 'rounded-md bg-primary/10' : ''}>
                        <div className="text-muted-foreground">{d.common.suggested}</div>
                        <div className="text-base font-extrabold tabular-nums text-primary">{fmtQty(r.recommendedQuantity, locale)}</div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Tablet / desktop: table */}
          <div className="hidden rounded-xl border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onChange={() => setSelected(allSelected ? new Set() : new Set(toOrder.map((r) => r.productId)))}
                      aria-label={d.dashboard.selectAll}
                    />
                  </TableHead>
                  <TableHead>{d.common.product}</TableHead>
                  <TableHead className="text-end">{d.common.stock}</TableHead>
                  <TableHead className="text-end">{d.common.velocity}</TableHead>
                  <TableHead className="text-end">{d.common.cover}</TableHead>
                  <TableHead className="text-end">{d.common.suggested}</TableHead>
                  <TableHead className="text-end">{d.common.estCost}</TableHead>
                  <TableHead>{d.common.supplier}</TableHead>
                  <TableHead>{d.common.status}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const orderable = r.recommendedQuantity > 0;
                  return (
                    <TableRow key={r.productId} data-state={selected.has(r.productId) && orderable ? 'selected' : undefined}>
                      <TableCell>{orderable ? <Checkbox checked={selected.has(r.productId)} onChange={() => toggle(r.productId)} aria-label={r.name} /> : null}</TableCell>
                      <TableCell>
                        <div className="font-semibold">{r.name}</div>
                        {r.sku ? <div className="text-xs text-muted-foreground">{r.sku}</div> : null}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">{fmtQty(r.currentStock, locale)}</TableCell>
                      <TableCell className="text-end tabular-nums">{fmtQty(r.dailyVelocity, locale)}</TableCell>
                      <TableCell className="text-end tabular-nums">{fmtDays(r.daysOfCover, locale)}</TableCell>
                      <TableCell className="text-end text-base font-extrabold tabular-nums text-primary">{fmtQty(r.recommendedQuantity, locale)}</TableCell>
                      <TableCell className="text-end tabular-nums">{fmtMoney(r.estimatedCost, currency, locale)}</TableCell>
                      <TableCell className="text-sm">{r.supplierName ?? <span className="text-muted-foreground">{d.common.noSupplier}</span>}</TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {toOrder.length > 0 ? (
        <div className="sticky bottom-20 z-30 rounded-xl border bg-background p-3 shadow-lg md:bottom-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span>
              <strong>{selectedRows.length}</strong> {d.common.items} {d.dashboard.selected}
            </span>
            <span>
              {d.dashboard.estOrder}: <strong>{fmtMoney(estTotal, currency, locale)}</strong>
              {missingCost ? <span className="text-muted-foreground"> · {missingCost} {d.dashboard.missingCost}</span> : null}
            </span>
          </div>
          <Button size="lg" className="w-full" onClick={create} loading={pending} disabled={selectedRows.length === 0}>
            <ClipboardList />
            {pending ? d.dashboard.creatingPO : d.dashboard.createPO}
          </Button>
        </div>
      ) : null}

      <ExplainPanel
        productIds={recommendations
          .filter((r) => r.recommendedQuantity > 0 || r.status === 'overstocked' || r.status === 'dead_stock')
          .map((r) => r.productId)
          .slice(0, 200)}
        byId={byId}
        supplierNumbers={supplierNumbers}
      />
    </div>
  );
}
