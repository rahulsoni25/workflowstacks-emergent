import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Locale } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a quantity: whole numbers without decimals, otherwise up to 2. */
export function fmtQty(n: number | null | undefined, locale: Locale = 'en'): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-AE' : 'en-AE', { maximumFractionDigits: 2 }).format(n);
}

export function fmtMoney(n: number | null | undefined, currency = 'AED', locale: Locale = 'en'): string {
  if (n == null || !Number.isFinite(n)) return '—';
  try {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-AE' : 'en-AE', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

/** Days of cover: "∞" for no sales, one decimal otherwise. */
export function fmtDays(n: number | null | undefined, locale: Locale = 'en'): string {
  if (n == null) return '—';
  if (!Number.isFinite(n)) return '∞';
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-AE' : 'en-AE', { maximumFractionDigits: 1 }).format(n);
}

export function fmtDate(iso: string | null | undefined, locale: Locale = 'en'): string {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00Z' : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Short id for display (first 8 chars of a uuid). */
export function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}
