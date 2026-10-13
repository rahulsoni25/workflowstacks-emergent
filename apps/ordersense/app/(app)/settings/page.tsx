import { StoreSettingsForm } from '@/components/store-settings-form';
import { SupplierManager } from '@/components/supplier-manager';
import { WeeklySummary } from '@/components/weekly-summary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getStore, getUser } from '@/lib/supabase/server';
import { loadSuppliers } from '@/lib/db/queries';
import { getServerDictionary } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const store = (await getStore())!;
  const [user, suppliers] = await Promise.all([getUser(), loadSuppliers(store.id)]);
  const { d } = getServerDictionary(store.language);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-extrabold">{d.settings.title}</h1>
      <StoreSettingsForm store={store} />
      <SupplierManager suppliers={suppliers} />
      <WeeklySummary />
      <Card>
        <CardHeader>
          <CardTitle>{d.settings.account}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <p className="truncate text-sm text-muted-foreground">
            {d.settings.signedInAs} <span dir="ltr">{user?.email}</span>
          </p>
          <form action="/auth/signout" method="post">
            <button type="submit" className="h-11 rounded-lg border-2 px-4 text-sm font-bold hover:bg-accent">
              {d.common.signOut}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
