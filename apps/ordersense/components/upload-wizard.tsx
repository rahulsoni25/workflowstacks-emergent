'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, FileSpreadsheet, Sparkles, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ColumnMapper } from '@/components/column-mapper';
import { useI18n } from '@/lib/i18n/context';
import { REQUIRED_FIELDS, type ColumnMapping, type MappingIssue } from '@/lib/types';
import type { ImportResult } from '@/lib/imports/import-upload';
import { todayIso } from '@/lib/utils';

interface ParseResponse {
  uploadId: string | null;
  fileName: string;
  headers: string[];
  sample: Record<string, string>[];
  rowCount: number;
  truncated: boolean;
  mapping: { mapping: ColumnMapping; confidence: number; issues: MappingIssue[]; source: 'claude' | 'heuristic'; dateFormat: 'day_first' | 'month_first' | 'iso' | 'unknown'; aiError?: string };
}

type Step = 'pick' | 'parsing' | 'map' | 'importing' | 'done';

const ISSUE_TEXT: Record<string, { en: string; ar: string }> = {
  skipped_no_name: { en: 'rows skipped: no product name', ar: 'صفوف تم تخطيها: بدون اسم منتج' },
  bad_number: { en: 'cells that were not numbers were ignored', ar: 'خلايا ليست أرقاماً تم تجاهلها' },
  bad_date: { en: 'rows with an unreadable date used the report date', ar: 'صفوف بتاريخ غير مقروء استخدمت تاريخ التقرير' },
  negative_quantity: { en: 'negative quantities (returns) were ignored', ar: 'كميات سالبة (مرتجعات) تم تجاهلها' },
  dates_ambiguous: { en: 'dates like 05/06 were read day-first', ar: 'تواريخ مثل 05/06 قُرئت كيوم/شهر' },
  no_stock_value: { en: 'products with no stock figure were set to 0', ar: 'منتجات بدون رصيد مخزون ضُبطت على 0' },
  excel_serial_date: { en: 'Excel serial dates were converted', ar: 'تم تحويل تواريخ Excel الرقمية' },
};

export function UploadWizard({ onDone, compact = false }: { onDone?: () => void; compact?: boolean }) {
  const { d, locale } = useI18n();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('pick');
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParseResponse | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [reportDate, setReportDate] = useState(todayIso());
  const [dayFirst, setDayFirst] = useState(true);
  const [cleanNames, setCleanNames] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [drag, setDrag] = useState(false);

  function describeError(code: string): string {
    if (code === 'file_too_big') return d.upload.fileTooBig;
    if (code === 'unsupported_type') return d.upload.unsupportedType;
    if (code === 'no_rows') return d.upload.noRows;
    return code || d.errors.uploadFailed;
  }

  async function pick(f: File) {
    setFile(f);
    setError(null);
    setStep('parsing');
    try {
      const form = new FormData();
      form.append('file', f);
      const res = await fetch('/api/uploads/parse', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(describeError(json.error));
      const p = json as ParseResponse;
      setParsed(p);
      setMapping(p.mapping.mapping);
      setDayFirst(p.mapping.dateFormat !== 'month_first');
      setStep('map');
    } catch (e) {
      setError(e instanceof Error ? e.message : d.errors.uploadFailed);
      setStep('pick');
    }
  }

  async function commit() {
    if (!file || !parsed || !mapping) return;
    setError(null);
    setStep('importing');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('meta', JSON.stringify({ uploadId: parsed.uploadId, mapping, reportDate, dayFirst, cleanNames }));
      const res = await fetch('/api/uploads/commit', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error === 'missing_required' ? d.upload.missingRequired : describeError(json.error));
      setResult(json as ImportResult);
      setStep('done');
      router.refresh();
      onDone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : d.errors.uploadFailed);
      setStep('map');
    }
  }

  const missing = mapping ? REQUIRED_FIELDS.filter((f) => !mapping[f]) : [];

  if (step === 'pick' || step === 'parsing') {
    return (
      <div className="space-y-3">
        <button
          type="button"
          disabled={step === 'parsing'}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void pick(f);
          }}
          className={`flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${drag ? 'border-primary bg-primary/5' : 'border-input hover:bg-accent/40'} ${compact ? 'py-6' : 'py-12'}`}
        >
          {step === 'parsing' ? <FileSpreadsheet className="h-12 w-12 animate-pulse text-primary" /> : <UploadCloud className="h-12 w-12 text-primary" />}
          <div className="text-lg font-bold">{step === 'parsing' ? d.upload.parsing : d.upload.dropHint}</div>
          <div className="text-sm text-muted-foreground">{step === 'parsing' ? d.upload.mapping : `${d.upload.dropHintDesktop} · .csv .xlsx .xls`}</div>
          {step !== 'parsing' ? (
            <span className="mt-2 inline-flex h-12 items-center rounded-lg bg-primary px-5 font-semibold text-primary-foreground">{d.upload.chooseFile}</span>
          ) : null}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.txt,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void pick(f);
            e.target.value = '';
          }}
        />
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    );
  }

  if ((step === 'map' || step === 'importing') && parsed && mapping) {
    const m = parsed.mapping;
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <span className="truncate">{parsed.fileName}</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {parsed.rowCount.toLocaleString()} {d.upload.rows} · {m.source === 'claude' ? d.upload.aiMapped : d.upload.heuristicMapped} · {d.upload.confidence} {Math.round(m.confidence * 100)}%
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {m.aiError ? (
              <Alert variant="warning">
                <AlertDescription>
                  {d.errors.aiUnavailable} ({m.aiError})
                </AlertDescription>
              </Alert>
            ) : null}
            {missing.length ? (
              <Alert variant="destructive">
                <AlertTitle>{d.upload.missingRequired}</AlertTitle>
                <AlertDescription>{missing.map((f) => d.upload.fields[f]).join(', ')}</AlertDescription>
              </Alert>
            ) : null}
            {m.issues.filter((i) => i.severity !== 'error').length ? (
              <Alert variant="info">
                <AlertTitle>{d.upload.warnings}</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc ps-5">
                    {m.issues
                      .filter((i) => i.severity !== 'error')
                      .map((i, idx) => (
                        <li key={idx}>{i.message}</li>
                      ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : null}

            <div>
              <h3 className="font-bold">{d.upload.mapTitle}</h3>
              <p className="text-sm text-muted-foreground">{d.upload.mapHint}</p>
            </div>
            <ColumnMapper headers={parsed.headers} mapping={mapping} onChange={setMapping} sample={parsed.sample} />

            <div className="grid gap-4 sm:grid-cols-2">
              {!mapping.sale_date ? (
                <div>
                  <Label htmlFor="report-date">{d.upload.reportDate}</Label>
                  <Input id="report-date" type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="mt-2" max={todayIso()} />
                  <p className="mt-1 text-xs text-muted-foreground">{d.upload.reportDateHint}</p>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label htmlFor="day-first">{locale === 'ar' ? 'التواريخ بصيغة يوم/شهر/سنة' : 'Dates are day/month/year'}</Label>
                  <Switch id="day-first" checked={dayFirst} onCheckedChange={setDayFirst} />
                </div>
              )}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="clean-names" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {locale === 'ar' ? 'تنظيف أسماء المنتجات بالذكاء الاصطناعي' : 'Tidy product names with AI'}
                </Label>
                <Switch id="clean-names" checked={cleanNames} onCheckedChange={setCleanNames} />
              </div>
            </div>

            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" size="lg" onClick={() => setStep('pick')} disabled={step === 'importing'}>
                {d.common.back}
              </Button>
              <Button size="lg" onClick={commit} loading={step === 'importing'} disabled={missing.length > 0}>
                {step === 'importing' ? (cleanNames ? d.upload.cleaning : d.upload.importing) : d.upload.import}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'done' && result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-status-green">
            <CheckCircle2 className="h-6 w-6" />
            {d.upload.imported}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-muted p-3">
              <div className="text-2xl font-extrabold">{result.products}</div>
              <div className="text-xs text-muted-foreground">{d.upload.products}</div>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <div className="text-2xl font-extrabold">{result.salesRows}</div>
              <div className="text-xs text-muted-foreground">{d.upload.salesRows}</div>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <div className="text-2xl font-extrabold">{result.suppliers}</div>
              <div className="text-xs text-muted-foreground">{d.settings.suppliers}</div>
            </div>
          </div>
          {result.dateRange ? (
            <p className="text-sm text-muted-foreground">
              {result.dateRange.from} → {result.dateRange.to}
              {result.mergedDuplicates ? ` · ${result.mergedDuplicates} ${locale === 'ar' ? 'منتجات مكررة تم دمجها' : 'duplicate products merged'}` : ''}
            </p>
          ) : null}
          {result.issues.length ? (
            <Alert variant="info">
              <AlertTitle>{d.upload.warnings}</AlertTitle>
              <AlertDescription>
                <ul className="list-disc ps-5">
                  {result.issues.map((i) => (
                    <li key={i.code}>
                      {i.count} {ISSUE_TEXT[i.code]?.[locale] ?? i.code}
                      {i.example ? <span className="text-muted-foreground"> (e.g. “{i.example}”)</span> : null}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}
          {result.aiError ? (
            <Alert variant="warning">
              <AlertDescription>{result.aiError}</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button size="lg" className="flex-1" onClick={() => router.push('/dashboard')}>
              {d.upload.viewDashboard}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                setStep('pick');
                setResult(null);
                setParsed(null);
                setFile(null);
              }}
            >
              {d.upload.uploadAnother}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  return null;
}
