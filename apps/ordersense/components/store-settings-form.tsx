'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { applyDefaultsToAllProducts, updateStore } from '@/actions/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n/context';
import type { StoreRow } from '@/lib/types';

export const CURRENCIES = ['AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'EGP', 'JOD', 'USD', 'EUR', 'GBP', 'INR', 'PKR'];

export function StoreSettingsForm({ store }: { store: StoreRow }) {
  const { d } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    name: store.name,
    currency: store.currency,
    country: store.country,
    language: store.language,
    default_lead_time_days: String(store.default_lead_time_days),
    default_target_cover_days: String(store.default_target_cover_days),
  });

  function save() {
    start(async () => {
      const res = await updateStore(form);
      if (!res.ok) toast.error(res.error);
      else {
        toast.success(d.products.saved);
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{d.settings.store}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="s-name">{d.settings.storeName}</Label>
            <Input id="s-name" className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="s-currency">{d.settings.currency}</Label>
            <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
              <SelectTrigger id="s-currency" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="s-language">{d.settings.language}</Label>
            <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
              <SelectTrigger id="s-language" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{d.common.english}</SelectItem>
                <SelectItem value="ar">{d.common.arabic}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="s-lead">{d.settings.leadTimeDefault}</Label>
            <Input id="s-lead" type="number" inputMode="numeric" min={0} max={90} className="mt-1" value={form.default_lead_time_days} onChange={(e) => setForm({ ...form, default_lead_time_days: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="s-cover">{d.settings.coverDefault}</Label>
            <Input id="s-cover" type="number" inputMode="numeric" min={1} max={120} className="mt-1" value={form.default_target_cover_days} onChange={(e) => setForm({ ...form, default_target_cover_days: e.target.value })} />
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button size="lg" onClick={save} loading={pending} className="sm:flex-1">
            {d.common.save}
          </Button>
          <Button
            size="lg"
            variant="outline"
            loading={pending}
            onClick={() =>
              start(async () => {
                const saved = await updateStore(form);
                if (!saved.ok) {
                  toast.error(saved.error);
                  return;
                }
                const res = await applyDefaultsToAllProducts();
                if (!res.ok) toast.error(res.error);
                else {
                  toast.success(`${res.data?.updated ?? 0} ${d.products.count}`);
                  router.refresh();
                }
              })
            }
          >
            {d.settings.applyToAll}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
