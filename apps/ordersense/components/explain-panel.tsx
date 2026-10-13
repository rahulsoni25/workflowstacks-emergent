'use client';

import { useState } from 'react';
import { Copy, MessageCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useI18n } from '@/lib/i18n/context';
import type { ExplainOutput } from '@/lib/ai/schemas';
import type { ClientRecommendation } from '@/lib/calculations/client';
import { whatsappLink } from '@/lib/po/whatsapp';

interface Props {
  productIds: string[];
  byId: Record<string, ClientRecommendation>;
  supplierNumbers: Record<string, string | null>;
}

/** "Explain in plain words": calls Claude with the deterministic numbers and renders the bilingual answer. */
export function ExplainPanel({ productIds, byId, supplierNumbers }: Props) {
  const { d, locale } = useI18n();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExplainOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const other = locale === 'ar' ? 'en' : 'ar';
  const [showOther, setShowOther] = useState(false);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/explain-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || d.errors.aiUnavailable);
      setResult(json as ExplainOutput);
    } catch (e) {
      setError(e instanceof Error ? e.message : d.errors.aiUnavailable);
    } finally {
      setLoading(false);
    }
  }

  const pick = (t: { en: string; ar: string }) => (showOther ? t[other] : t[locale]);

  return (
    <div className="space-y-3">
      {!result ? (
        <Button onClick={run} loading={loading} variant="outline" size="lg" className="w-full">
          <Sparkles />
          {loading ? d.dashboard.explaining : d.dashboard.explain}
        </Button>
      ) : null}
      {error ? (
        <Alert variant="warning">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {result ? (
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>{d.dashboard.whyTitle}</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">{d.dashboard.aiNote}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowOther((v) => !v)}>
              {showOther ? (locale === 'ar' ? d.common.arabic : d.common.english) : other === 'ar' ? d.common.arabic : d.common.english}
            </Button>
          </CardHeader>
          <CardContent className="space-y-5" dir={showOther ? (other === 'ar' ? 'rtl' : 'ltr') : undefined}>
            <p className="text-base leading-relaxed">{pick(result.summary)}</p>

            {result.reorder.length ? (
              <ul className="space-y-3">
                {result.reorder.map((r) => {
                  const rec = byId[r.product_id];
                  return (
                    <li key={r.product_id} className="rounded-lg border-s-4 border-status-red bg-status-red/5 p-3">
                      <div className="font-bold">
                        {rec?.name ?? r.product_id} · {rec ? rec.recommendedQuantity : ''} {d.common.units}
                      </div>
                      <div className="mt-1 text-sm">{pick(r.why)}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        <span className="font-semibold">{d.dashboard.whatIfNot}:</span> {pick(r.if_not)}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {result.do_not_order.length ? (
              <div>
                <h4 className="mb-2 font-bold">{d.dashboard.dontOrder}</h4>
                <ul className="space-y-2">
                  {result.do_not_order.map((r) => (
                    <li key={r.product_id} className="rounded-lg border-s-4 border-status-grey bg-muted p-3 text-sm">
                      <span className="font-semibold">{byId[r.product_id]?.name ?? r.product_id}:</span> {pick(r.why)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {result.supplier_messages.length ? (
              <div className="space-y-3">
                {result.supplier_messages.map((m, i) => {
                  const text = pick(m.message);
                  const number = m.supplier_id ? supplierNumbers[m.supplier_id] ?? null : null;
                  return (
                    <div key={i} className="rounded-lg border p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="font-bold">{m.supplier_name}</span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              await navigator.clipboard.writeText(text);
                              toast.success(d.common.copied);
                            }}
                          >
                            <Copy />
                            {d.common.copy}
                          </Button>
                          <Button size="sm" variant="whatsapp" asChild>
                            <a href={whatsappLink(number, text)} target="_blank" rel="noopener noreferrer">
                              <MessageCircle />
                              WhatsApp
                            </a>
                          </Button>
                        </div>
                      </div>
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{text}</pre>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
