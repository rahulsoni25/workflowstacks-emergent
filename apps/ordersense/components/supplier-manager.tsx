'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { addSupplier, deleteSupplier, updateSupplier } from '@/actions/suppliers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n/context';
import type { SupplierRow } from '@/lib/types';

export function SupplierManager({ suppliers }: { suppliers: SupplierRow[] }) {
  const { d } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [lead, setLead] = useState('2');

  function add() {
    start(async () => {
      const res = await addSupplier({ name, whatsapp_number: number, default_lead_time_days: lead });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setName('');
      setNumber('');
      router.refresh();
    });
  }

  function patch(id: string, input: Record<string, unknown>) {
    start(async () => {
      const res = await updateSupplier(id, input);
      if (!res.ok) toast.error(res.error);
      else router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{d.settings.suppliers}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {suppliers.length === 0 ? <p className="text-sm text-muted-foreground">{d.settings.noSuppliers}</p> : null}
        <ul className="divide-y rounded-lg border">
          {suppliers.map((s) => (
            <li key={s.id} className="grid gap-2 p-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
              <div>
                <Label className="text-xs text-muted-foreground">{d.settings.supplierName}</Label>
                <Input defaultValue={s.name} onBlur={(e) => e.target.value.trim() && e.target.value !== s.name && patch(s.id, { name: e.target.value })} className="mt-1 h-10" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{d.settings.whatsapp}</Label>
                <Input defaultValue={s.whatsapp_number ?? ''} inputMode="tel" placeholder="9715XXXXXXXX" dir="ltr" onBlur={(e) => (e.target.value || '') !== (s.whatsapp_number || '') && patch(s.id, { whatsapp_number: e.target.value })} className="mt-1 h-10" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{d.settings.leadTime}</Label>
                <Input type="number" min={0} max={90} defaultValue={s.default_lead_time_days} onBlur={(e) => Number(e.target.value) !== s.default_lead_time_days && patch(s.id, { default_lead_time_days: e.target.value })} className="mt-1 h-10 w-20" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                aria-label={d.common.delete}
                onClick={() =>
                  start(async () => {
                    const res = await deleteSupplier(s.id);
                    if (!res.ok) toast.error(res.error);
                    else router.refresh();
                  })
                }
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>

        <div className="grid gap-2 rounded-lg border-2 border-dashed p-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
          <div>
            <Label htmlFor="new-sup">{d.settings.supplierName}</Label>
            <Input id="new-sup" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-10" />
          </div>
          <div>
            <Label htmlFor="new-num">{d.settings.whatsapp}</Label>
            <Input id="new-num" value={number} onChange={(e) => setNumber(e.target.value)} inputMode="tel" placeholder="9715XXXXXXXX" dir="ltr" className="mt-1 h-10" />
          </div>
          <div>
            <Label htmlFor="new-lead">{d.settings.leadTime}</Label>
            <Input id="new-lead" type="number" min={0} max={90} value={lead} onChange={(e) => setLead(e.target.value)} className="mt-1 h-10 w-20" />
          </div>
          <Button onClick={add} loading={pending} disabled={!name.trim()} size="sm" className="h-10">
            <Plus />
            {d.settings.addSupplier}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{d.settings.whatsappHint}</p>
      </CardContent>
    </Card>
  );
}
