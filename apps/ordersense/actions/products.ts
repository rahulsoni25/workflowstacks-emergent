'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient, getStore } from '@/lib/supabase/server';
import type { ActionResult } from './store';
import type { Database } from '@/lib/db/types';

const ProductSettingsSchema = z.object({
  lead_time_days: z.coerce.number().int().min(0).max(90).optional(),
  target_cover_days: z.coerce.number().int().min(1).max(120).optional(),
  safety_stock: z.coerce.number().int().min(0).max(100000).optional(),
  current_stock: z.coerce.number().min(0).max(10_000_000).optional(),
  unit_cost: z.coerce.number().min(0).max(10_000_000).nullable().optional(),
  supplier_id: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1).max(200).optional(),
});

export async function updateProduct(id: string, input: unknown): Promise<ActionResult> {
  const store = await getStore();
  if (!store) return { ok: false, error: 'No store.' };
  const parsed = ProductSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  const patch: Database['public']['Tables']['products']['Update'] = { ...parsed.data };
  if (parsed.data.current_stock !== undefined) patch.stock_updated_at = new Date().toISOString().slice(0, 10);
  const supabase = createClient();
  const { error } = await supabase.from('products').update(patch).eq('id', id).eq('store_id', store.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/dashboard');
  revalidatePath('/products');
  return { ok: true };
}
