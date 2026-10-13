'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/lib/i18n/context';
import { REQUIRED_FIELDS, STANDARD_FIELDS, type ColumnMapping, type StandardField } from '@/lib/types';
import { cn } from '@/lib/utils';

const NONE = '__none__';

interface Props {
  headers: string[];
  mapping: ColumnMapping;
  onChange: (next: ColumnMapping) => void;
  sample: Record<string, string>[];
}

export function ColumnMapper({ headers, mapping, onChange, sample }: Props) {
  const { d } = useI18n();
  const used = new Set(Object.values(mapping).filter(Boolean));

  function set(field: StandardField, header: string | null) {
    const next: ColumnMapping = { ...mapping, [field]: header };
    // A header can serve only one field.
    if (header) for (const f of STANDARD_FIELDS) if (f !== field && next[f] === header) next[f] = null;
    onChange(next);
  }

  const example = (header: string | null) => (header ? sample.map((r) => r[header]).find((v) => v && v.trim()) ?? '' : '');

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {STANDARD_FIELDS.map((field) => {
        const required = REQUIRED_FIELDS.includes(field);
        const missing = required && !mapping[field];
        return (
          <div key={field} className={cn('rounded-lg border p-3', missing && 'border-status-red bg-status-red/5')}>
            <Label htmlFor={`map-${field}`} className="flex items-center justify-between">
              <span>{d.upload.fields[field]}</span>
              <span className={cn('text-xs font-normal', required ? 'text-status-red' : 'text-muted-foreground')}>{required ? d.common.required : d.common.optional}</span>
            </Label>
            <Select value={mapping[field] ?? NONE} onValueChange={(v) => set(field, v === NONE ? null : v)}>
              <SelectTrigger id={`map-${field}`} className="mt-2">
                <SelectValue placeholder={d.upload.chooseColumn} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>
                  <span className="text-muted-foreground">{d.upload.notMapped}</span>
                </SelectItem>
                {headers.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                    {used.has(h) && mapping[field] !== h ? <span className="ms-2 text-xs text-muted-foreground">✓</span> : null}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {mapping[field] ? (
              <div className="mt-1 truncate text-xs text-muted-foreground">
                {d.upload.preview}: <span className="font-mono">{example(mapping[field])}</span>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
