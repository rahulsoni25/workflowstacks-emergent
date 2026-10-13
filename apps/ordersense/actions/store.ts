'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient, getStore, getUser } from '@/lib/supabase/server';
import { LOCALE_COOKIE, isLocale } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/lib/types';

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const StoreSchema = z.object({
  name: z.string().trim().min(1).max(120),
  currency: z.string().trim().toUpperCase().length(3),
  country: z.string().trim().toUpperCase().length(2).default('AE'),
  language: z.enum(['en', 'ar']),
  default_lead_time_days: z.coerce.number().int().min(0).max(90),
  default_target_cover_days: z.coerce.number().int().min(1).max(120),
});

function setLocaleCookie(locale: Locale) {
  cookies().set(LOCALE_COOKIE, locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
}

export async function createStore(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };
  const parsed = StoreSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const supabase = createClient();
  const { data, error } = await supabase
    .from('stores')
    .insert({ owner_id: user.id, ...parsed.data })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  setLocaleCookie(parsed.data.language);
  revalidatePath('/', 'layout');
  return { ok: true, data: { id: data.id } };
}

export async function updateStore(input: unknown): Promise<ActionResult> {
  const store = await getStore();
  if (!store) return { ok: false, error: 'No store.' };
  const parsed = StoreSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const supabase = createClient();
  const { error } = await supabase.from('stores').update(parsed.data).eq('id', store.id);
  if (error) return { ok: false, error: error.message };
  if (parsed.data.language) setLocaleCookie(parsed.data.language);
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Switch UI language (persisted on the store when one exists). */
export async function setLanguage(locale: unknown): Promise<ActionResult> {
  if (!isLocale(locale)) return { ok: false, error: 'Unknown language.' };
  setLocaleCookie(locale);
  const store = await getStore();
  if (store) {
    const supabase = createClient();
    await supabase.from('stores').update({ language: locale }).eq('id', store.id);
  }
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Push the store's default lead time / cover days onto every product. */
export async function applyDefaultsToAllProducts(): Promise<ActionResult<{ updated: number }>> {
  const store = await getStore();
  if (!store) return { ok: false, error: 'No store.' };
  const supabase = createClient();
  const { data, error } = await supabase
    .from('products')
    .update({ lead_time_days: store.default_lead_time_days, target_cover_days: store.default_target_cover_days })
    .eq('store_id', store.id)
    .select('id');
  if (error) return { ok: false, error: error.message };
  revalidatePath('/dashboard');
  revalidatePath('/products');
  return { ok: true, data: { updated: data?.length ?? 0 } };
}
