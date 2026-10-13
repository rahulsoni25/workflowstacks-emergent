import { cache } from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/db/types';

export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
  return { url, key };
}

/**
 * Server-side Supabase client bound to the request cookies. Use in server
 * components, server actions and route handlers.
 */
export function createClient() {
  const { url, key } = supabaseEnv();
  const cookieStore = cookies();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a server component: cookies are refreshed by middleware instead.
        }
      },
    },
  });
}

/**
 * Current user or null. Never throws: a missing session, or an unconfigured
 * Supabase, both read as "signed out" so pages redirect to /login (which
 * explains the configuration) and route handlers answer 401.
 * Deduped per request.
 */
export const getUser = cache(async () => {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
});

/** The signed-in owner's store (first store), or null. Deduped per request. */
export const getStore = cache(async () => {
  const user = await getUser();
  if (!user) return null;
  const supabase = createClient();
  const { data } = await supabase
    .from('stores')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ?? null;
});
