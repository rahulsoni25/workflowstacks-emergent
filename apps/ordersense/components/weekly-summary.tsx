'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useI18n } from '@/lib/i18n/context';
import type { WeeklySummaryOutput } from '@/lib/ai/schemas';

export function WeeklySummary() {
  const { d, locale } = useI18n();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<WeeklySummaryOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/weekly-summary', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || d.errors.aiUnavailable);
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : d.errors.aiUnavailable);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{d.settings.weeklySummary}</CardTitle>
        <p className="text-sm text-muted-foreground">{d.settings.summaryHint}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <Alert variant="warning">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {data ? (
          <div className="space-y-3">
            <p className="rounded-lg bg-primary/10 p-3 text-base font-bold">{data.headline[locale]}</p>
            <ul className="list-disc space-y-1 ps-5 text-sm">
              {data.insights.map((i, idx) => (
                <li key={idx}>{i[locale]}</li>
              ))}
            </ul>
            <ol className="list-decimal space-y-1 ps-5 text-sm font-semibold">
              {data.actions.map((a, idx) => (
                <li key={idx}>{a[locale]}</li>
              ))}
            </ol>
            <p className="text-xs text-muted-foreground">{d.dashboard.aiNote}</p>
          </div>
        ) : null}
        <Button variant={data ? 'ghost' : 'outline'} onClick={run} loading={loading} className="w-full">
          <Sparkles />
          {d.settings.generateSummary}
        </Button>
      </CardContent>
    </Card>
  );
}
