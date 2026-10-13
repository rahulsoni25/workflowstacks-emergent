'use client';

import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n/context';
import type { ProductStatus } from '@/lib/calculations/reorder';

const VARIANT: Record<ProductStatus, 'red' | 'amber' | 'green' | 'grey' | 'blue'> = {
  stockout_risk: 'red',
  reorder_now: 'red',
  order_soon: 'amber',
  healthy: 'green',
  overstocked: 'blue',
  dead_stock: 'grey',
};

export function StatusBadge({ status, className }: { status: ProductStatus; className?: string }) {
  const { d } = useI18n();
  return (
    <Badge variant={VARIANT[status]} className={className}>
      {d.status[status]}
    </Badge>
  );
}

export const STATUS_DOT: Record<ProductStatus, string> = {
  stockout_risk: 'bg-status-red',
  reorder_now: 'bg-status-red',
  order_soon: 'bg-status-amber',
  healthy: 'bg-status-green',
  overstocked: 'bg-status-blue',
  dead_stock: 'bg-status-grey',
};
