import Link from 'next/link';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/stat-card';
import { EmptyState } from '@/components/empty-state';
import { RecommendationTable } from '@/components/recommendation-table';
import { getStore } from '@/lib/supabase/server';
import { getRecommendations, lastUpload } from '@/lib/db/queries';
import { getServerDictionary } from '@/lib/i18n/server';
import { toClientRecommendation } from '@/lib/calculations/client';
import { fmtDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const store = (await getStore())!;
  const { d, locale } = getServerDictionary(store.language);
  const [{ recommendations, summary, suppliers, hasSales }, upload] = await Promise.all([getRecommendations(store.id), lastUpload(store.id)]);

  if (recommendations.length === 0 || !hasSales) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold">{d.dashboard.headline}</h1>
        <EmptyState
          icon={<Upload />}
          title={d.dashboard.noData}
          description={d.dashboard.uploadFirst}
          action={
            <Button size="lg" asChild>
              <Link href="/upload">
                <Upload />
                {d.dashboard.uploadReport}
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const supplierNumbers = Object.fromEntries(suppliers.map((s) => [s.id, s.whatsapp_number]));
  const urgent = summary.reorderNow; // includes stockout risks (a subset)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold">{d.dashboard.headline}</h1>
          <p className="text-sm text-muted-foreground">
            {d.dashboard.basedOn} <strong>{fmtDate(summary.asOf, locale)}</strong>
            {upload ? ` · ${d.dashboard.lastUpload}: ${fmtDate(upload.created_at, locale)}` : ''}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/upload">
            <Upload />
            {d.dashboard.uploadReport}
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={d.dashboard.reorderNow} value={urgent} tone="red" />
        <StatCard label={d.dashboard.stockoutRisk} value={summary.stockoutRisk} tone="amber" />
        <StatCard label={d.dashboard.overstocked} value={summary.overstocked} tone="blue" href="/products?tab=over" />
        <StatCard label={d.dashboard.deadStock} value={summary.deadStock} tone="grey" href="/products?tab=dead" />
      </div>

      <RecommendationTable recommendations={recommendations.map(toClientRecommendation)} currency={store.currency} supplierNumbers={supplierNumbers} />
    </div>
  );
}
