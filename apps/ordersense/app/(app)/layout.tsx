import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { getStore, getUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login');
  const store = await getStore();
  if (!store) redirect('/onboarding');
  return <AppShell storeName={store.name}>{children}</AppShell>;
}
