import type { Recommendation } from '@/lib/calculations/reorder';

/**
 * A short, deterministic reason string stored on each purchase-order line.
 * (Claude's longer explanations are generated on demand, not stored.)
 */
export function lineReason(r: Recommendation): string {
  const cover = Number.isFinite(r.daysOfCover) ? `${r.daysOfCover}d cover` : 'no recent sales';
  switch (r.status) {
    case 'stockout_risk':
      return `Stockout risk: ${r.currentStock} left, sells ${r.dailyVelocity}/day, ${cover} < ${r.leadTimeDays}d lead time`;
    case 'reorder_now':
      return `At reorder point: ${r.currentStock} left ≤ ${r.reorderPoint}, sells ${r.dailyVelocity}/day`;
    case 'order_soon':
      return `Below target: ${cover}, target ${r.targetCoverDays}d`;
    default:
      return `Top up to ${r.targetCoverDays} days: sells ${r.dailyVelocity}/day, ${r.currentStock} left`;
  }
}
