'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/db/types';

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** Browser Supabase client (singleton). Only used for auth on the login page. */
export function createClient() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase is not configured.');
  client = createBrowserClient<Database>(url, key);
  return client;
}
