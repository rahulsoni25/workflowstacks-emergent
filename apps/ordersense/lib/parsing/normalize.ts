import type { ColumnMapping } from '@/lib/types';

/**
 * Turns mapped, dirty POS rows into clean product + sales records.
 * Never throws: bad cells become warnings, bad rows are skipped and counted.
 */

export interface NormalizedProduct {
  name: string;
  normalizedName: string;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  supplierName: string | null;
  unitCost: number | null;
  /** last non-empty stock value seen for this product in the file */
  currentStock: number | null;
  /** date the stock figure refers to (latest sale_date seen for the product, or report date) */
  stockAsOf: string;
}

export interface NormalizedSale {
  normalizedName: string;
  saleDate: string;
  quantitySold: number;
  revenue: number | null;
}

export interface NormalizeIssue {
  code: 'skipped_no_name' | 'bad_number' | 'bad_date' | 'negative_quantity' | 'dates_ambiguous' | 'no_stock_value' | 'excel_serial_date';
  count: number;
  example?: string;
}

export interface NormalizeResult {
  products: NormalizedProduct[];
  sales: NormalizedSale[];
  issues: NormalizeIssue[];
  rowsRead: number;
  rowsUsed: number;
  dateRange: { from: string; to: string } | null;
}

export interface NormalizeOptions {
  /** Used for every row when the file has no sale_date column, and for unparsable dates. */
  reportDate: string;
  /** Day-first (DD/MM/YYYY, the Gulf/European convention) or month-first. Default day-first. */
  dayFirst?: boolean;
}

// Arabic-Indic (٠١٢) and Eastern Arabic-Indic (۰۱۲) digits -> ASCII.
const ARABIC_DIGITS = /[٠-٩۰-۹]/g;
function asciiDigits(s: string): string {
  return s.replace(ARABIC_DIGITS, (ch) => {
    const code = ch.charCodeAt(0);
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });
}

/** Parse "1,234.50", "AED 12", "12.5 kg", "(3)" -> number; null when not a number. */
export function toNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  let s = asciiDigits(String(value)).trim();
  if (!s || s === '-' || s === '—') return null;
  const negative = /^\(.*\)$/.test(s) || s.startsWith('-') || s.endsWith('-');
  s = s.replace(/[^\d.,]/g, '');
  if (!s) return null;
  // Decide which of , and . is the decimal separator.
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (lastComma > -1) {
    // "1,234" is thousands; "12,5" is a decimal comma.
    const after = s.length - lastComma - 1;
    s = after === 3 && s.split(',').length <= 2 && s.length > 4 ? s.replace(/,/g, '') : s.replace(/,/g, '.');
    if (s.split('.').length > 2) s = s.replace(/\./g, '');
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function validDate(y: number, m: number, d: number): string | null {
  if (y < 1990 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

export interface DateParse {
  iso: string | null;
  ambiguous?: boolean;
  excelSerial?: boolean;
}

/** Parse many date shapes into YYYY-MM-DD. */
export function toIsoDate(value: unknown, dayFirst = true): DateParse {
  if (value == null) return { iso: null };
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? { iso: null } : { iso: value.toISOString().slice(0, 10) };
  }
  // Excel serial number (days since 1899-12-30).
  if (typeof value === 'number') {
    if (value > 20000 && value < 80000) {
      const dt = new Date(Math.round((value - 25569) * 86_400_000));
      return { iso: dt.toISOString().slice(0, 10), excelSerial: true };
    }
    return { iso: null };
  }
  let s = asciiDigits(String(value)).trim();
  if (!s) return { iso: null };
  s = s.replace(/[‎‏]/g, ''); // bidi marks from Arabic locales
  // Pure serial in a string cell.
  if (/^\d{5}$/.test(s)) return toIsoDate(Number(s), dayFirst);

  // ISO: 2026-10-12, 2026/10/12, 2026-10-12T10:00:00
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return { iso: validDate(+m[1], +m[2], +m[3]) };

  // 12/10/2026, 12-10-26, 12.10.2026
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    let y = +m[3];
    if (y < 100) y += 2000;
    const ambiguous = a <= 12 && b <= 12 && a !== b;
    if (a > 12 && b <= 12) return { iso: validDate(y, b, a), ambiguous: false };
    if (b > 12 && a <= 12) return { iso: validDate(y, a, b), ambiguous: false };
    return dayFirst ? { iso: validDate(y, b, a), ambiguous } : { iso: validDate(y, a, b), ambiguous };
  }

  // 12 Oct 2026, Oct 12, 2026, 12-Oct-26
  m = s.match(/^(\d{1,2})[\s\-]+([A-Za-z]{3,})\.?[\s\-,]+(\d{2,4})/);
  if (m) {
    const mon = MONTHS[m[2].slice(0, 4).toLowerCase()] ?? MONTHS[m[2].slice(0, 3).toLowerCase()];
    let y = +m[3];
    if (y < 100) y += 2000;
    return { iso: mon ? validDate(y, mon, +m[1]) : null };
  }
  m = s.match(/^([A-Za-z]{3,})\.?\s+(\d{1,2}),?\s+(\d{2,4})/);
  if (m) {
    const mon = MONTHS[m[1].slice(0, 4).toLowerCase()] ?? MONTHS[m[1].slice(0, 3).toLowerCase()];
    let y = +m[3];
    if (y < 100) y += 2000;
    return { iso: mon ? validDate(y, mon, +m[2]) : null };
  }

  const t = Date.parse(s);
  if (!Number.isNaN(t)) return { iso: new Date(t).toISOString().slice(0, 10) };
  return { iso: null };
}

/**
 * Normalise a product name for duplicate matching: lower-case, strip
 * punctuation, collapse spaces, and unify common Arabic letter variants.
 */
export function normalizeName(name: string): string {
  return asciiDigits(name)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '') // tashkeel + tatweel
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cell(row: Record<string, unknown>, col: string | null): unknown {
  if (!col) return undefined;
  return row[col];
}

function text(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).replace(/\s+/g, ' ').trim();
  return s ? s : null;
}

export function normalizeRows(rows: Record<string, unknown>[], mapping: ColumnMapping, options: NormalizeOptions): NormalizeResult {
  const dayFirst = options.dayFirst ?? true;
  const issues = new Map<NormalizeIssue['code'], NormalizeIssue>();
  const bump = (code: NormalizeIssue['code'], example?: string) => {
    const cur = issues.get(code) ?? { code, count: 0, example };
    cur.count++;
    if (!cur.example && example) cur.example = example;
    issues.set(code, cur);
  };

  const products = new Map<string, NormalizedProduct>();
  const sales = new Map<string, NormalizedSale>(); // key: name|date
  let rowsUsed = 0;
  let minDate: string | null = null;
  let maxDate: string | null = null;

  for (const row of rows) {
    const rawName = text(cell(row, mapping.item_name));
    if (!rawName) {
      bump('skipped_no_name');
      continue;
    }
    const normalizedName = normalizeName(rawName);
    if (!normalizedName) {
      bump('skipped_no_name', rawName);
      continue;
    }

    // Date
    let saleDate = options.reportDate;
    if (mapping.sale_date) {
      const raw = cell(row, mapping.sale_date);
      const parsed = toIsoDate(raw, dayFirst);
      if (parsed.iso) {
        saleDate = parsed.iso;
        if (parsed.ambiguous) bump('dates_ambiguous', String(raw));
        if (parsed.excelSerial) bump('excel_serial_date', String(raw));
      } else if (raw != null && String(raw).trim() !== '') {
        bump('bad_date', String(raw));
      }
    }
    if (!minDate || saleDate < minDate) minDate = saleDate;
    if (!maxDate || saleDate > maxDate) maxDate = saleDate;

    // Quantity sold
    let qty = 0;
    const rawQty = cell(row, mapping.quantity_sold);
    if (rawQty != null && String(rawQty).trim() !== '') {
      const n = toNumber(rawQty);
      if (n == null) bump('bad_number', String(rawQty));
      else if (n < 0) {
        bump('negative_quantity', String(rawQty)); // returns/refunds: ignored for velocity
        qty = 0;
      } else qty = n;
    }

    // Stock
    let stock: number | null = null;
    const rawStock = cell(row, mapping.current_stock);
    if (rawStock != null && String(rawStock).trim() !== '') {
      const n = toNumber(rawStock);
      if (n == null) bump('bad_number', String(rawStock));
      else stock = Math.max(0, n);
    }

    let unitCost: number | null = null;
    const rawCost = cell(row, mapping.unit_cost);
    if (rawCost != null && String(rawCost).trim() !== '') {
      const n = toNumber(rawCost);
      if (n == null) bump('bad_number', String(rawCost));
      else if (n >= 0) unitCost = n;
    }

    let revenue: number | null = null;
    const rawRev = cell(row, mapping.revenue);
    if (rawRev != null && String(rawRev).trim() !== '') revenue = toNumber(rawRev);

    const existing = products.get(normalizedName);
    const prod: NormalizedProduct = existing ?? {
      name: rawName,
      normalizedName,
      sku: null,
      barcode: null,
      category: null,
      supplierName: null,
      unitCost: null,
      currentStock: null,
      stockAsOf: saleDate,
    };
    prod.sku = prod.sku ?? text(cell(row, mapping.sku));
    prod.barcode = prod.barcode ?? text(cell(row, mapping.barcode));
    prod.category = prod.category ?? text(cell(row, mapping.category));
    prod.supplierName = prod.supplierName ?? text(cell(row, mapping.supplier));
    if (unitCost != null) prod.unitCost = unitCost;
    // The most recent row's stock value wins.
    if (stock != null && (prod.currentStock == null || saleDate >= prod.stockAsOf)) {
      prod.currentStock = stock;
      prod.stockAsOf = saleDate;
    }
    products.set(normalizedName, prod);

    const key = `${normalizedName}|${saleDate}`;
    const sale = sales.get(key);
    if (sale) {
      sale.quantitySold += qty;
      if (revenue != null) sale.revenue = (sale.revenue ?? 0) + revenue;
    } else {
      sales.set(key, { normalizedName, saleDate, quantitySold: qty, revenue });
    }
    rowsUsed++;
  }

  for (const p of products.values()) {
    if (p.currentStock == null) {
      bump('no_stock_value', p.name);
      p.currentStock = 0;
    }
  }

  return {
    products: [...products.values()],
    sales: [...sales.values()],
    issues: [...issues.values()],
    rowsRead: rows.length,
    rowsUsed,
    dateRange: minDate && maxDate ? { from: minDate, to: maxDate } : null,
  };
}
