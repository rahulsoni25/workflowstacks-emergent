/**
 * Hand-written Supabase types matching supabase/migrations/0001_init.sql.
 * Regenerate with `supabase gen types typescript --local > lib/db/types.ts`
 * once the schema is applied if you prefer the generated version.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      stores: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          currency: string;
          country: string;
          language: string;
          default_lead_time_days: number;
          default_target_cover_days: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          currency?: string;
          country?: string;
          language?: string;
          default_lead_time_days?: number;
          default_target_cover_days?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          currency?: string;
          country?: string;
          language?: string;
          default_lead_time_days?: number;
          default_target_cover_days?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      suppliers: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          whatsapp_number: string | null;
          default_lead_time_days: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          name: string;
          whatsapp_number?: string | null;
          default_lead_time_days?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          name?: string;
          whatsapp_number?: string | null;
          default_lead_time_days?: number;
          created_at?: string;
        };
        Relationships: [{ foreignKeyName: 'suppliers_store_id_fkey'; columns: ['store_id']; isOneToOne: false; referencedRelation: 'stores'; referencedColumns: ['id'] }];
      };
      products: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          normalized_name: string;
          sku: string | null;
          barcode: string | null;
          category: string | null;
          supplier_id: string | null;
          unit_cost: number | null;
          current_stock: number;
          lead_time_days: number;
          target_cover_days: number;
          safety_stock: number;
          stock_updated_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          name: string;
          normalized_name: string;
          sku?: string | null;
          barcode?: string | null;
          category?: string | null;
          supplier_id?: string | null;
          unit_cost?: number | null;
          current_stock?: number;
          lead_time_days?: number;
          target_cover_days?: number;
          safety_stock?: number;
          stock_updated_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          name?: string;
          normalized_name?: string;
          sku?: string | null;
          barcode?: string | null;
          category?: string | null;
          supplier_id?: string | null;
          unit_cost?: number | null;
          current_stock?: number;
          lead_time_days?: number;
          target_cover_days?: number;
          safety_stock?: number;
          stock_updated_at?: string | null;
          created_at?: string;
        };
        Relationships: [{ foreignKeyName: 'products_store_id_fkey'; columns: ['store_id']; isOneToOne: false; referencedRelation: 'stores'; referencedColumns: ['id'] }, { foreignKeyName: 'products_supplier_id_fkey'; columns: ['supplier_id']; isOneToOne: false; referencedRelation: 'suppliers'; referencedColumns: ['id'] }];
      };
      sales: {
        Row: {
          id: string;
          store_id: string;
          product_id: string;
          sale_date: string;
          quantity_sold: number;
          revenue: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          product_id: string;
          sale_date: string;
          quantity_sold?: number;
          revenue?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          product_id?: string;
          sale_date?: string;
          quantity_sold?: number;
          revenue?: number | null;
          created_at?: string;
        };
        Relationships: [{ foreignKeyName: 'sales_store_id_fkey'; columns: ['store_id']; isOneToOne: false; referencedRelation: 'stores'; referencedColumns: ['id'] }, { foreignKeyName: 'sales_product_id_fkey'; columns: ['product_id']; isOneToOne: false; referencedRelation: 'products'; referencedColumns: ['id'] }];
      };
      uploads: {
        Row: {
          id: string;
          store_id: string;
          file_url: string | null;
          file_name: string | null;
          status: string;
          row_count: number | null;
          column_mapping: Json | null;
          error_summary: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          file_url?: string | null;
          file_name?: string | null;
          status?: string;
          row_count?: number | null;
          column_mapping?: Json | null;
          error_summary?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          file_url?: string | null;
          file_name?: string | null;
          status?: string;
          row_count?: number | null;
          column_mapping?: Json | null;
          error_summary?: Json | null;
          created_at?: string;
        };
        Relationships: [{ foreignKeyName: 'uploads_store_id_fkey'; columns: ['store_id']; isOneToOne: false; referencedRelation: 'stores'; referencedColumns: ['id'] }];
      };
      purchase_orders: {
        Row: {
          id: string;
          store_id: string;
          supplier_id: string | null;
          status: string;
          total_estimated_cost: number;
          notes: string | null;
          created_at: string;
          sent_at: string | null;
        };
        Insert: {
          id?: string;
          store_id: string;
          supplier_id?: string | null;
          status?: string;
          total_estimated_cost?: number;
          notes?: string | null;
          created_at?: string;
          sent_at?: string | null;
        };
        Update: {
          id?: string;
          store_id?: string;
          supplier_id?: string | null;
          status?: string;
          total_estimated_cost?: number;
          notes?: string | null;
          created_at?: string;
          sent_at?: string | null;
        };
        Relationships: [{ foreignKeyName: 'purchase_orders_store_id_fkey'; columns: ['store_id']; isOneToOne: false; referencedRelation: 'stores'; referencedColumns: ['id'] }, { foreignKeyName: 'purchase_orders_supplier_id_fkey'; columns: ['supplier_id']; isOneToOne: false; referencedRelation: 'suppliers'; referencedColumns: ['id'] }];
      };
      purchase_order_items: {
        Row: {
          id: string;
          purchase_order_id: string;
          product_id: string;
          recommended_quantity: number;
          final_quantity: number;
          unit_cost: number | null;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          purchase_order_id: string;
          product_id: string;
          recommended_quantity?: number;
          final_quantity?: number;
          unit_cost?: number | null;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          purchase_order_id?: string;
          product_id?: string;
          recommended_quantity?: number;
          final_quantity?: number;
          unit_cost?: number | null;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [{ foreignKeyName: 'purchase_order_items_purchase_order_id_fkey'; columns: ['purchase_order_id']; isOneToOne: false; referencedRelation: 'purchase_orders'; referencedColumns: ['id'] }, { foreignKeyName: 'purchase_order_items_product_id_fkey'; columns: ['product_id']; isOneToOne: false; referencedRelation: 'products'; referencedColumns: ['id'] }];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_store_owner: { Args: { p_store_id: string }; Returns: boolean };
      sales_window: {
        Args: { p_store_id: string; p_days?: number };
        Returns: { product_id: string; sale_date: string; quantity_sold: number }[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
