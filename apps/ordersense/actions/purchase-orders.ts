'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient, getStore } from '@/lib/supabase/server';
import { getRecommendations } from '@/lib/db/queries';
import { groupBySupplier } from '@/lib/calculations/reorder';
import { lineReason } from '@/lib/po/reasons';
import type { ActionResult } from './store';
import type { Database } from '@/lib/db/types';

/**
 * Create one draft purchase order per supplier from the selected products,
 * using the deterministic recommended quantities as both recommended and
 * initial final quantity.
 */
export async function createPurchaseOrders(productIds: string[]): Promise<ActionResult<{ ids: string[] }>> {
  const store = await getStore();
  if (!store) return { ok: false, error: 'No store.' };
  const ids = z.array(z.string().uuid()).min(1).safeParse(productIds);
  if (!ids.success) return { ok: false, error: 'Select at least one product.' };

  const { recommendations } = await getRecommendations(store.id);
  const selected = new Set(ids.data);
  const lines = recommendations.filter((r) => selected.has(r.productId) && r.recommendedQuantity > 0);
  if (lines.length === 0) return { ok: false, error: 'None of the selected products needs ordering.' };

  const supabase = createClient();
  const created: string[] = [];
  for (const [supplierId, group] of groupBySupplier(lines)) {
    const total = group.reduce((s, r) => s + (r.estimatedCost ?? 0), 0);
    const { data: po, error } = await supabase
      .from('purchase_orders')
      .insert({ store_id: store.id, supplier_id: supplierId, status: 'draft', total_estimated_cost: Math.round(total * 100) / 100 })
      .select('id')
      .single();
    if (error) return { ok: false, error: error.message };
    const { error: itemErr } = await supabase.from('purchase_order_items').insert(
      group.map((r) => ({
        purchase_order_id: po.id,
        product_id: r.productId,
        recommended_quantity: r.recommendedQuantity,
        final_quantity: r.recommendedQuantity,
        unit_cost: r.unitCost,
        reason: lineReason(r),
      })),
    );
    if (itemErr) return { ok: false, error: itemErr.message };
    created.push(po.id);
  }
  revalidatePath('/purchase-orders');
  return { ok: true, data: { ids: created } };
}

async function recomputeTotal(poId: string) {
  const supabase = createClient();
  const { data } = await supabase.from('purchase_order_items').select('final_quantity, unit_cost').eq('purchase_order_id', poId);
  const total = (data ?? []).reduce((s, i) => s + Number(i.final_quantity) * (i.unit_cost == null ? 0 : Number(i.unit_cost)), 0);
  await supabase.from('purchase_orders').update({ total_estimated_cost: Math.round(total * 100) / 100 }).eq('id', poId);
}

export async function updateItemQuantity(itemId: string, quantity: unknown): Promise<ActionResult> {
  const store = await getStore();
  if (!store) return { ok: false, error: 'No store.' };
  const q = z.coerce.number().min(0).max(1_000_000).safeParse(quantity);
  if (!q.success) return { ok: false, error: 'Enter a quantity of 0 or more.' };
  const supabase = createClient();
  const { data: item, error } = await supabase
    .from('purchase_order_items')
    .update({ final_quantity: q.data })
    .eq('id', itemId)
    .select('purchase_order_id')
    .single();
  if (error) return { ok: false, error: error.message };
  await recomputeTotal(item.purchase_order_id);
  revalidatePath(`/purchase-orders/${item.purchase_order_id}`);
  return { ok: true };
}

const StatusSchema = z.enum(['draft', 'sent', 'received', 'cancelled']);

export async function updatePurchaseOrder(id: string, input: { status?: unknown; notes?: unknown }): Promise<ActionResult> {
  const store = await getStore();
  if (!store) return { ok: false, error: 'No store.' };
  const patch: Database['public']['Tables']['purchase_orders']['Update'] = {};
  if (input.status !== undefined) {
    const s = StatusSchema.safeParse(input.status);
    if (!s.success) return { ok: false, error: 'Unknown status.' };
    patch.status = s.data;
    patch.sent_at = s.data === 'sent' ? new Date().toISOString() : null;
  }
  if (input.notes !== undefined) {
    const n = z.string().max(500).safeParse(input.notes);
    if (!n.success) return { ok: false, error: 'Notes are too long.' };
    patch.notes = n.data.trim() || null;
  }
  const supabase = createClient();
  const { error } = await supabase.from('purchase_orders').update(patch).eq('id', id).eq('store_id', store.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/purchase-orders');
  revalidatePath(`/purchase-orders/${id}`);
  return { ok: true };
}

export async function deletePurchaseOrder(id: string): Promise<ActionResult> {
  const store = await getStore();
  if (!store) return { ok: false, error: 'No store.' };
  const supabase = createClient();
  const { error } = await supabase.from('purchase_orders').delete().eq('id', id).eq('store_id', store.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/purchase-orders');
  return { ok: true };
}
