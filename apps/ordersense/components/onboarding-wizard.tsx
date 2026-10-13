'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createStore } from '@/actions/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadWizard } from '@/components/upload-wizard';
import { CURRENCIES } from '@/components/store-settings-form';
import { useI18n } from '@/lib/i18n/context';

export function OnboardingWizard({ defaultLanguage }: { defaultLanguage: 'en' | 'ar' }) {
  const { d } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState({ name: '', currency: 'AED', country: 'AE', language: defaultLanguage, default_lead_time_days: '2', default_target_cover_days: '10' });

  function create() {
    start(async () => {
      const res = await createStore(form);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setStep(3);
      router.refresh();
    });
  }

  const Steps = () => (
    <p className="text-sm font-semibold text-muted-foreground">
      {d.onboarding.step} {step} {d.onboarding.of} 3
    </p>
  );

  if (step === 1) {
    return (
      <Card>
        <CardHeader>
          <Steps />
          <CardTitle>{d.onboarding.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="o-name">{d.onboarding.storeName}</Label>
            <Input id="o-name" className="mt-1" placeholder={d.onboarding.storeNamePlaceholder} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="o-currency">{d.onboarding.currency}</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger id="o-currency" className="mt-1">
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
              <Label htmlFor="o-lang">{d.onboarding.language}</Label>
              <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v as 'en' | 'ar' })}>
                <SelectTrigger id="o-lang" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{d.common.english}</SelectItem>
                  <SelectItem value="ar">{d.common.arabic}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button size="lg" className="w-full" onClick={() => setStep(2)} disabled={!form.name.trim()}>
            {d.common.next}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === 2) {
    return (
      <Card>
        <CardHeader>
          <Steps />
          <CardTitle>{d.onboarding.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label htmlFor="o-lead">{d.onboarding.leadTime}</Label>
            <Input id="o-lead" type="number" inputMode="numeric" min={0} max={90} className="mt-1 text-xl font-bold" value={form.default_lead_time_days} onChange={(e) => setForm({ ...form, default_lead_time_days: e.target.value })} />
            <p className="mt-1 text-xs text-muted-foreground">{d.onboarding.leadTimeHint}</p>
          </div>
          <div>
            <Label htmlFor="o-cover">{d.onboarding.coverDays}</Label>
            <Input id="o-cover" type="number" inputMode="numeric" min={1} max={120} className="mt-1 text-xl font-bold" value={form.default_target_cover_days} onChange={(e) => setForm({ ...form, default_target_cover_days: e.target.value })} />
            <p className="mt-1 text-xs text-muted-foreground">{d.onboarding.coverDaysHint}</p>
          </div>
          <div className="flex gap-2">
            <Button size="lg" variant="outline" onClick={() => setStep(1)}>
              {d.common.back}
            </Button>
            <Button size="lg" className="flex-1" onClick={create} loading={pending}>
              {d.onboarding.createStore}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Steps />
        <h1 className="text-2xl font-extrabold">{d.onboarding.uploadTitle}</h1>
        <p className="text-sm text-muted-foreground">{d.onboarding.uploadHint}</p>
      </div>
      <UploadWizard compact />
      <Button variant="ghost" className="w-full" onClick={() => router.push('/dashboard')}>
        {d.onboarding.skipUpload}
      </Button>
    </div>
  );
}
