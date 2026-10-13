import { ProductList } from '@/components/product-list';
import { getStore } from '@/lib/supabase/server';
import { getRecommendations } from '@/lib/db/queries';
import { getServerDictionary } from '@/lib/i18n/server';
import { toClientRecommendation } from '@/lib/calculations/client';

export const dynamic = 'force-dynamic';

const TABS = new Set(['all', 'fast', 'slow', 'dead', 'over']);

export default async function ProductsPage({ searchParams }: { searchParams: { tab?: string } }) {
  const store = (await getStore())!;
  const { d } = getServerDictionary(store.language);
  const { recommendations, suppliers } = await getRecommendations(store.id);
  const tab = searchParams.tab && TABS.has(searchParams.tab) ? (searchParams.tab as 'all' | 'fast' | 'slow' | 'dead' | 'over') : 'all';
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{d.products.title}</h1>
      <ProductList recommendations={recommendations.map(toClientRecommendation)} suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))} currency={store.currency} initialTab={tab} />
    </div>
  );
}
