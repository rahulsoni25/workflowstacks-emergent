import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ParsedFile } from '@/lib/types';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_ROWS = 50_000;

const CSV_TYPES = new Set(['text/csv', 'text/plain', 'application/csv']);
const XLSX_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);

export type FileKind = 'csv' | 'xlsx';

export function detectKind(fileName: string, mimeType?: string | null): FileKind | null {
  const ext = fileName.toLowerCase().split('.').pop() ?? '';
  if (ext === 'csv' || ext === 'txt' || ext === 'tsv') return 'csv';
  if (ext === 'xlsx' || ext === 'xls' || ext === 'xlsm') return 'xlsx';
  if (mimeType && CSV_TYPES.has(mimeType)) return 'csv';
  if (mimeType && XLSX_TYPES.has(mimeType)) return 'xlsx';
  return null;
}

/** Strip BOM, trim, collapse whitespace; make duplicates unique. */
function cleanHeaders(raw: unknown[]): string[] {
  const seen = new Map<string, number>();
  return raw.map((h, i) => {
    let name = String(h ?? '')
      .replace(/^﻿/, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!name) name = `Column ${i + 1}`;
    const n = seen.get(name) ?? 0;
    seen.set(name, n + 1);
    return n === 0 ? name : `${name} (${n + 1})`;
  });
}

function isEmptyRow(row: unknown[]): boolean {
  return row.every((c) => c == null || String(c).trim() === '');
}

function rowsToObjects(headers: string[], rows: unknown[][]): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const r of rows) {
    if (isEmptyRow(r)) continue;
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      obj[h] = r[i] ?? '';
    });
    out.push(obj);
    if (out.length >= MAX_ROWS) break;
  }
  return out;
}

export function parseCsv(buffer: Buffer): ParsedFile {
  // Decode as UTF-8, falling back to latin1 when the file is not valid UTF-8
  // (older Windows POS exports).
  let text = buffer.toString('utf8');
  if (text.includes('�')) text = buffer.toString('latin1');
  text = text.replace(/^﻿/, '');

  const result = Papa.parse<string[]>(text, {
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
    delimitersToGuess: [',', ';', '\t', '|'],
  });

  const data = (result.data ?? []).filter((r) => Array.isArray(r) && !isEmptyRow(r));
  if (data.length === 0) return { headers: [], rows: [], rowCount: 0, truncated: false };

  // Header row = first row with at least two non-empty cells. Some POS
  // systems put a title line ("Sales Report - Oct 2026") above the table.
  let headerIdx = data.findIndex((r) => r.filter((c) => String(c ?? '').trim()).length >= 2);
  if (headerIdx < 0) headerIdx = 0;
  const headers = cleanHeaders(data[headerIdx]);
  const body = data.slice(headerIdx + 1);
  const rows = rowsToObjects(headers, body);
  return { headers, rows, rowCount: body.length, truncated: body.length > MAX_ROWS };
}

export function parseXlsx(buffer: Buffer): ParsedFile {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true, raw: false });
  // Pick the first sheet with data.
  let sheetName = wb.SheetNames[0];
  let matrix: unknown[][] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const m = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, defval: '' });
    if (m.length > 1) {
      sheetName = name;
      matrix = m;
      break;
    }
  }
  if (matrix.length === 0) return { headers: [], rows: [], rowCount: 0, sheetName, truncated: false };

  let headerIdx = matrix.findIndex((r) => r.filter((c) => String(c ?? '').trim()).length >= 2);
  if (headerIdx < 0) headerIdx = 0;
  const headers = cleanHeaders(matrix[headerIdx]);
  const body = matrix.slice(headerIdx + 1).map((r) =>
    r.map((c) => (c instanceof Date ? c.toISOString().slice(0, 10) : c)),
  );
  const rows = rowsToObjects(headers, body);
  return { headers, rows, rowCount: body.length, sheetName, truncated: body.length > MAX_ROWS };
}

/** Parse a CSV or Excel upload into headers + row objects. Never throws on dirty data. */
export function parseFile(buffer: Buffer, fileName: string, mimeType?: string | null): ParsedFile {
  const kind = detectKind(fileName, mimeType);
  if (kind === 'xlsx') return parseXlsx(buffer);
  if (kind === 'csv') return parseCsv(buffer);
  // Unknown extension: sniff. XLSX files are zip archives starting with "PK".
  if (buffer.length > 2 && buffer[0] === 0x50 && buffer[1] === 0x4b) return parseXlsx(buffer);
  return parseCsv(buffer);
}

/** First N rows, with values coerced to short strings for the AI prompt. */
export function sampleRows(file: ParsedFile, n = 20): Record<string, string>[] {
  return file.rows.slice(0, n).map((r) => {
    const o: Record<string, string> = {};
    for (const h of file.headers) o[h] = String(r[h] ?? '').slice(0, 80);
    return o;
  });
}
