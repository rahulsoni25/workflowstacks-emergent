'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient, getStore } from '@/lib/supabase/server';
import type { ActionResult } from './store';

const SupplierSchema = z.object({
  name: z.string().trim().min(1).max(120),
  whatsapp_number: z
    .string()
    .trim()
    .transform((s) => s.replace(/[^\d+]/g, ''))
    .refine((s) => s === '' || /^\+?\d{7,15}$/.test(s), 'Enter the number with country code, digits only.')
    .nullable()
    .optional(),
  default_lead_time_days: z.coerce.number().int().min(0).max(90).default(2),
});

export async function addSupplier(input: unknown): Promise<ActionResult<{ id: string }>> {
  const store = await getStore();
  if (!store) return { ok: false, error: 'No store.' };
  const parsed = SupplierSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  const supabase = createClient();
  const { data, error } = await supabase
    .from('suppliers')
    .insert({ store_id: store.id, ...parsed.data, whatsapp_number: parsed.data.whatsapp_number || null })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message.includes('duplicate') ? 'A supplier with this name already exists.' : error.message };
  revalidatePath('/settings');
  return { ok: true, data: { id: data.id } };
}

export async function updateSupplier(id: string, input: unknown): Promise<ActionResult> {
  const store = await getStore();
  if (!store) return { ok: false, error: 'No store.' };
  const parsed = SupplierSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  const supabase = createClient();
  const patch = { ...parsed.data, ...(parsed.data.whatsapp_number !== undefined ? { whatsapp_number: parsed.data.whatsapp_number || null } : {}) };
  const { error } = await supabase.from('suppliers').update(patch).eq('id', id).eq('store_id', store.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/settings');
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function deleteSupplier(id: string): Promise<ActionResult> {
  const store = await getStore();
  if (!store) return { ok: false, error: 'No store.' };
  const supabase = createClient();
  const { error } = await supabase.from('suppliers').delete().eq('id', id).eq('store_id', store.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/settings');
  revalidatePath('/dashboard');
  return { ok: true };
}
