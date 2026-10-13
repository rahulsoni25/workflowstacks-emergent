import type { Database } from './db/types';

export type Locale = 'en' | 'ar';

export type StoreRow = Database['public']['Tables']['stores']['Row'];
export type ProductRow = Database['public']['Tables']['products']['Row'];
export type SaleRow = Database['public']['Tables']['sales']['Row'];
export type SupplierRow = Database['public']['Tables']['suppliers']['Row'];
export type UploadRow = Database['public']['Tables']['uploads']['Row'];
export type PurchaseOrderRow = Database['public']['Tables']['purchase_orders']['Row'];
export type PurchaseOrderItemRow = Database['public']['Tables']['purchase_order_items']['Row'];

/** Standard fields a POS export is mapped onto. */
export const STANDARD_FIELDS = [
  'item_name',
  'sku',
  'barcode',
  'sale_date',
  'quantity_sold',
  'current_stock',
  'unit_cost',
  'supplier',
  'category',
  'revenue',
] as const;

export type StandardField = (typeof STANDARD_FIELDS)[number];

export const REQUIRED_FIELDS: StandardField[] = ['item_name', 'quantity_sold', 'current_stock'];

/** Maps each standard field to a source column header, or null when absent. */
export type ColumnMapping = Record<StandardField, string | null>;

export interface MappingIssue {
  field?: StandardField;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ColumnMappingResult {
  mapping: ColumnMapping;
  confidence: number;
  issues: MappingIssue[];
  /** 'claude' when the mapping came from the model, 'heuristic' for the fallback */
  source: 'claude' | 'heuristic';
}

export interface ParsedFile {
  headers: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  sheetName?: string;
  truncated: boolean;
}

export type PurchaseOrderStatus = 'draft' | 'sent' | 'received' | 'cancelled';

export interface PurchaseOrderWithItems extends PurchaseOrderRow {
  supplier: SupplierRow | null;
  items: (PurchaseOrderItemRow & { product: Pick<ProductRow, 'id' | 'name' | 'sku' | 'current_stock'> | null })[];
}
