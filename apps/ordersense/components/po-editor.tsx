'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, FileSpreadsheet, MessageCircle, Printer, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deletePurchaseOrder, updateItemQuantity, updatePurchaseOrder } from '@/actions/purchase-orders';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useI18n } from '@/lib/i18n/context';
import { buildWhatsAppMessage, whatsappLink } from '@/lib/po/whatsapp';
import { fmtDate, fmtMoney, fmtQty, shortId } from '@/lib/utils';
import type { PurchaseOrderWithItems } from '@/lib/types';

const STATUS_VARIANT: Record<string, 'amber' | 'blue' | 'green' | 'grey'> = { draft: 'amber', sent: 'blue', received: 'green', cancelled: 'grey' };

export function PoEditor({ po, storeName, currency }: { po: PurchaseOrderWithItems; storeName: string; currency: string }) {
  const { d, locale } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [qty, setQty] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState(po.notes ?? '');
  const [aiMsg, setAiMsg] = useState<{ en: string; ar: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const editable = po.status === 'draft';

  const lines = useMemo(
    () =>
      po.items.map((i) => ({
        id: i.id,
        product: i.product?.name ?? '—',
        sku: i.product?.sku ?? null,
        recommended: Number(i.recommended_quantity),
        quantity: qty[i.id] !== undefined ? Number(qty[i.id]) || 0 : Number(i.final_quantity),
        unitCost: i.unit_cost == null ? null : Number(i.unit_cost),
        reason: i.reason,
      })),
    [po.items, qty],
  );
  const total = lines.reduce((s, l) => s + (l.unitCost == null ? 0 : l.unitCost * l.quantity), 0);

  const message = aiMsg
    ? aiMsg[locale]
    : buildWhatsAppMessage(
        { storeName, supplierName: po.supplier?.name ?? null, lines: lines.map((l) => ({ product: l.product, quantity: l.quantity, sku: l.sku })), notes, orderRef: shortId(po.id) },
        locale,
      );

  function saveQty(itemId: string, value: string) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return;
    start(async () => {
      const res = await updateItemQuantity(itemId, n);
      if (!res.ok) toast.error(res.error);
      else router.refresh();
    });
  }

  function setStatus(status: 'draft' | 'sent' | 'received') {
    start(async () => {
      const res = await updatePurchaseOrder(po.id, { status, notes });
      if (!res.ok) toast.error(res.error);
      else {
        toast.success(d.po.status[status]);
        router.refresh();
      }
    });
  }

  function saveNotes() {
    if ((po.notes ?? '') === notes) return;
    start(async () => {
      const res = await updatePurchaseOrder(po.id, { notes });
      if (!res.ok) toast.error(res.error);
      else router.refresh();
    });
  }

  async function copy() {
    await navigator.clipboard.writeText(message);
    toast.success(d.common.copied);
  }

  async function writeWithAi() {
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/whatsapp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ purchaseOrderId: po.id }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || d.errors.aiUnavailable);
      setAiMsg(json.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : d.errors.aiUnavailable);
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold">
            {d.po.detail} #{shortId(po.id)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {po.supplier?.name ?? d.common.noSupplier} · {d.po.created} {fmtDate(po.created_at, locale)}
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[po.status] ?? 'grey'} className="text-sm">
          {d.po.status[po.status] ?? po.status}
        </Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y">
            {lines.map((l) => (
              <li key={l.id} className={`flex items-center gap-3 p-3 ${l.quantity === 0 ? 'opacity-50' : ''}`}>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{l.product}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {d.po.recommended}: {fmtQty(l.recommended, locale)}
                    {l.unitCost != null ? ` · ${fmtMoney(l.unitCost, currency, locale)}` : ''}
                  </div>
                  {l.reason ? <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{l.reason}</div> : null}
                </div>
                <div className="w-24">
                  <Label htmlFor={`q-${l.id}`} className="sr-only">
                    {d.po.finalQty}
                  </Label>
                  <Input
                    id={`q-${l.id}`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    disabled={!editable}
                    className="text-center text-lg font-bold"
                    value={qty[l.id] ?? String(l.quantity)}
                    onChange={(e) => setQty({ ...qty, [l.id]: e.target.value })}
                    onBlur={(e) => saveQty(l.id, e.target.value)}
                  />
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t p-3 text-sm">
            <span className="text-muted-foreground">{editable ? d.po.lineRemoved : ''}</span>
            <span>
              {d.po.totalEst}: <strong className="text-base">{fmtMoney(total, currency, locale)}</strong>
            </span>
          </div>
        </CardContent>
      </Card>

      <div>
        <Label htmlFor="notes">{d.po.notes}</Label>
        <Textarea id="notes" className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} placeholder={d.po.notesPlaceholder} disabled={!editable} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-[#25D366]" />
            WhatsApp
          </CardTitle>
          <p className="text-xs text-muted-foreground">{d.po.whatsappHint}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="whitespace-pre-wrap rounded-lg bg-muted p-3 font-sans text-sm leading-relaxed">{message}</pre>
          {!po.supplier?.whatsapp_number ? <p className="text-xs text-muted-foreground">{d.po.noWhatsapp}</p> : null}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={copy}>
              <Copy />
              {d.common.copy}
            </Button>
            <Button variant="whatsapp" asChild>
              <a href={whatsappLink(po.supplier?.whatsapp_number, message)} target="_blank" rel="noopener noreferrer">
                <MessageCircle />
                {d.po.openWhatsapp}
              </a>
            </Button>
            <Button variant="ghost" className="col-span-2" onClick={writeWithAi} loading={aiLoading}>
              <Sparkles />
              {d.po.generateMsg}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" asChild>
          <a href={`/purchase-orders/${po.id}/print`} target="_blank" rel="noopener">
            <Printer />
            {d.po.downloadPdf}
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href={`/api/purchase-orders/${po.id}/xlsx`}>
            <FileSpreadsheet />
            {d.po.downloadExcel}
          </a>
        </Button>
        {po.status === 'draft' ? (
          <Button size="lg" className="col-span-2" onClick={() => setStatus('sent')} loading={pending}>
            {d.po.markSent}
          </Button>
        ) : po.status === 'sent' ? (
          <>
            <Button variant="secondary" onClick={() => setStatus('draft')} loading={pending}>
              {d.po.markDraft}
            </Button>
            <Button onClick={() => setStatus('received')} loading={pending}>
              {d.po.markReceived}
            </Button>
          </>
        ) : null}
        <Button variant="ghost" className="col-span-2 text-destructive" onClick={() => setConfirmDelete(true)}>
          <Trash2 />
          {d.po.deleteOrder}
        </Button>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{d.po.confirmDelete}</DialogTitle>
            <DialogDescription>#{shortId(po.id)}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              {d.common.cancel}
            </Button>
            <Button
              variant="destructive"
              loading={pending}
              onClick={() =>
                start(async () => {
                  const res = await deletePurchaseOrder(po.id);
                  if (!res.ok) toast.error(res.error);
                  else router.push('/purchase-orders');
                })
              }
            >
              {d.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
