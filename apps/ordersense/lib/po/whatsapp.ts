import type { Locale } from '@/lib/types';

export interface WhatsAppLine {
  product: string;
  quantity: number;
  sku?: string | null;
}

export interface WhatsAppDraft {
  storeName: string;
  supplierName: string | null;
  lines: WhatsAppLine[];
  notes?: string | null;
  orderRef?: string;
}

function qty(n: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-AE' : 'en-AE', { maximumFractionDigits: 2 }).format(n);
}

/**
 * Deterministic WhatsApp order message. This is what "Copy" uses by default;
 * the AI-written version is an optional nicety that lists the same quantities.
 */
export function buildWhatsAppMessage(draft: WhatsAppDraft, locale: Locale): string {
  const lines = draft.lines.filter((l) => l.quantity > 0);
  if (locale === 'ar') {
    const parts = [
      `🛒 طلب شراء من ${draft.storeName}` + (draft.orderRef ? ` (رقم ${draft.orderRef})` : ''),
      draft.supplierName ? `إلى: ${draft.supplierName}` : '',
      '',
      'الرجاء إرسال:',
      ...lines.map((l) => `• ${l.product} — ${qty(l.quantity, 'ar')}`),
      '',
      draft.notes ? `ملاحظات: ${draft.notes}` : '',
      'شكراً لكم 🙏',
    ];
    return parts.filter((p, i, arr) => !(p === '' && arr[i - 1] === '')).join('\n').trim();
  }
  const parts = [
    `🛒 Purchase order from ${draft.storeName}` + (draft.orderRef ? ` (#${draft.orderRef})` : ''),
    draft.supplierName ? `To: ${draft.supplierName}` : '',
    '',
    'Please send:',
    ...lines.map((l) => `• ${l.product} — ${qty(l.quantity, 'en')}`),
    '',
    draft.notes ? `Notes: ${draft.notes}` : '',
    'Thank you 🙏',
  ];
  return parts.filter((p, i, arr) => !(p === '' && arr[i - 1] === '')).join('\n').trim();
}

/** wa.me deep link; number must be digits with country code. */
export function whatsappLink(number: string | null | undefined, message: string): string {
  const digits = (number ?? '').replace(/\D/g, '');
  const base = digits ? `https://wa.me/${digits}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(message)}`;
}
