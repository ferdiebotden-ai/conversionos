/**
 * Database types for Lead-to-Quote Engine v2
 *
 * These types match the schema in supabase/migrations/20260131000000_initial_schema.sql
 * Regenerate from Supabase CLI after schema changes:
 * npx supabase gen types typescript --project-id bwvrtypzcvuojfsyiwch > src/types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      leads: {
        Row: {
          id: string;
          site_id: string;
          created_at: string;
          updated_at: string;
          status: LeadStatus;
          name: string;
          email: string;
          phone: string | null;
          address: string | null;
          postal_code: string | null;
          city: string;
          province: string;
          project_type: ProjectType | null;
          area_sqft: number | null;
          timeline: Timeline | null;
          budget_band: BudgetBand | null;
          finish_level: FinishLevel | null;
          goals_text: string | null;
          chat_transcript: Json | null;
          scope_json: Json | null;
          quote_draft_json: Json | null;
          confidence_score: number | null;
          ai_notes: string | null;
          uploaded_photos: string[] | null;
          generated_concepts: string[] | null;
          quote_pdf_url: string | null;
          source: string;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          session_id: string | null;
          owner_notes: string | null;
          assigned_to: string | null;
          last_contacted_at: string | null;
          follow_up_date: string | null;
          created_by: string;
          intake_raw_input: string | null;
          intake_method: string | null;
        };
        Insert: {
          id?: string;
          site_id: string;
          created_at?: string;
          updated_at?: string;
          status?: LeadStatus;
          name: string;
          email: string;
          phone?: string | null;
          address?: string | null;
          postal_code?: string | null;
          city?: string;
          province?: string;
          project_type?: ProjectType | null;
          area_sqft?: number | null;
          timeline?: Timeline | null;
          budget_band?: BudgetBand | null;
          finish_level?: FinishLevel | null;
          goals_text?: string | null;
          chat_transcript?: Json | null;
          scope_json?: Json | null;
          quote_draft_json?: Json | null;
          confidence_score?: number | null;
          ai_notes?: string | null;
          uploaded_photos?: string[] | null;
          generated_concepts?: string[] | null;
          quote_pdf_url?: string | null;
          source?: string;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          session_id?: string | null;
          owner_notes?: string | null;
          assigned_to?: string | null;
          last_contacted_at?: string | null;
          follow_up_date?: string | null;
          created_by?: string;
          intake_raw_input?: string | null;
          intake_method?: string | null;
        };
        Update: {
          id?: string;
          site_id?: string;
          created_at?: string;
          updated_at?: string;
          status?: LeadStatus;
          name?: string;
          email?: string;
          phone?: string | null;
          address?: string | null;
          postal_code?: string | null;
          city?: string;
          province?: string;
          project_type?: ProjectType | null;
          area_sqft?: number | null;
          timeline?: Timeline | null;
          budget_band?: BudgetBand | null;
          finish_level?: FinishLevel | null;
          goals_text?: string | null;
          chat_transcript?: Json | null;
          scope_json?: Json | null;
          quote_draft_json?: Json | null;
          confidence_score?: number | null;
          ai_notes?: string | null;
          uploaded_photos?: string[] | null;
          generated_concepts?: string[] | null;
          quote_pdf_url?: string | null;
          source?: string;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          session_id?: string | null;
          owner_notes?: string | null;
          assigned_to?: string | null;
          last_contacted_at?: string | null;
          follow_up_date?: string | null;
          created_by?: string;
          intake_raw_input?: string | null;
          intake_method?: string | null;
        };
        Relationships: [];
      };
      quote_drafts: {
        Row: {
          id: string;
          site_id: string;
          lead_id: string;
          created_at: string;
          updated_at: string;
          version: number;
          line_items: Json;
          ai_draft_json: Json | null;
          tier_good: Json | null;
          tier_better: Json | null;
          tier_best: Json | null;
          assumptions: string[] | null;
          exclusions: string[] | null;
          special_notes: string | null;
          recommended_next_step: string | null;
          subtotal: number | null;
          contingency_percent: number;
          contingency_amount: number | null;
          hst_percent: number;
          hst_amount: number | null;
          total: number | null;
          deposit_percent: number;
          deposit_required: number | null;
          validity_days: number;
          expires_at: string | null;
          sent_at: string | null;
          sent_to_email: string | null;
          opened_at: string | null;
          pdf_url: string | null;
          acceptance_token: string | null;
          acceptance_status: string | null;
          accepted_at: string | null;
          accepted_by_name: string | null;
          accepted_by_ip: string | null;
        };
        Insert: {
          id?: string;
          site_id: string;
          lead_id: string;
          created_at?: string;
          updated_at?: string;
          version?: number;
          line_items: Json;
          ai_draft_json?: Json | null;
          tier_good?: Json | null;
          tier_better?: Json | null;
          tier_best?: Json | null;
          assumptions?: string[] | null;
          exclusions?: string[] | null;
          special_notes?: string | null;
          recommended_next_step?: string | null;
          subtotal?: number | null;
          contingency_percent?: number;
          contingency_amount?: number | null;
          hst_percent?: number;
          hst_amount?: number | null;
          total?: number | null;
          deposit_percent?: number;
          deposit_required?: number | null;
          validity_days?: number;
          expires_at?: string | null;
          sent_at?: string | null;
          sent_to_email?: string | null;
          opened_at?: string | null;
          pdf_url?: string | null;
          acceptance_token?: string | null;
          acceptance_status?: string | null;
          accepted_at?: string | null;
          accepted_by_name?: string | null;
          accepted_by_ip?: string | null;
        };
        Update: {
          id?: string;
          site_id?: string;
          lead_id?: string;
          created_at?: string;
          updated_at?: string;
          version?: number;
          line_items?: Json;
          ai_draft_json?: Json | null;
          tier_good?: Json | null;
          tier_better?: Json | null;
          tier_best?: Json | null;
          assumptions?: string[] | null;
          exclusions?: string[] | null;
          special_notes?: string | null;
          recommended_next_step?: string | null;
          subtotal?: number | null;
          contingency_percent?: number;
          contingency_amount?: number | null;
          hst_percent?: number;
          hst_amount?: number | null;
          total?: number | null;
          deposit_percent?: number;
          deposit_required?: number | null;
          validity_days?: number;
          expires_at?: string | null;
          sent_at?: string | null;
          sent_to_email?: string | null;
          opened_at?: string | null;
          pdf_url?: string | null;
          acceptance_token?: string | null;
          acceptance_status?: string | null;
          accepted_at?: string | null;
          accepted_by_name?: string | null;
          accepted_by_ip?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'quote_drafts_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id'];
          }
        ];
      };
      audit_log: {
        Row: {
          id: string;
          site_id: string;
          created_at: string;
          user_id: string | null;
          lead_id: string | null;
          action: string;
          old_values: Json | null;
          new_values: Json | null;
          ip_address: string | null;
          user_agent: string | null;
        };
        Insert: {
          id?: string;
          site_id: string;
          created_at?: string;
          user_id?: string | null;
          lead_id?: string | null;
          action: string;
          old_values?: Json | null;
          new_values?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Update: {
          id?: string;
          site_id?: string;
          created_at?: string;
          user_id?: string | null;
          lead_id?: string | null;
          action?: string;
          old_values?: Json | null;
          new_values?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      chat_sessions: {
        Row: {
          id: string;
          site_id: string;
          created_at: string;
          updated_at: string;
          expires_at: string;
          email: string | null;
          messages: Json;
          extracted_data: Json | null;
          state: ChatSessionState;
          device_type: string | null;
          started_from: string | null;
        };
        Insert: {
          id?: string;
          site_id: string;
          created_at?: string;
          updated_at?: string;
          expires_at?: string;
          email?: string | null;
          messages?: Json;
          extracted_data?: Json | null;
          state?: ChatSessionState;
          device_type?: string | null;
          started_from?: string | null;
        };
        Update: {
          id?: string;
          site_id?: string;
          created_at?: string;
          updated_at?: string;
          expires_at?: string;
          email?: string | null;
          messages?: Json;
          extracted_data?: Json | null;
          state?: ChatSessionState;
          device_type?: string | null;
          started_from?: string | null;
        };
        Relationships: [];
      };
      visualizations: {
        Row: {
          id: string;
          site_id: string;
          created_at: string;
          updated_at: string;
          email: string | null;
          original_photo_url: string;
          room_type: VisualizationRoomType;
          style: VisualizationStyle;
          constraints: string | null;
          generated_concepts: Json;
          generation_time_ms: number | null;
          lead_id: string | null;
          shared: boolean;
          share_token: string | null;
          downloaded: boolean;
          download_count: number;
          source: string;
          device_type: string | null;
          user_agent: string | null;
        };
        Insert: {
          id?: string;
          site_id: string;
          created_at?: string;
          updated_at?: string;
          email?: string | null;
          original_photo_url: string;
          room_type: VisualizationRoomType;
          style: VisualizationStyle;
          constraints?: string | null;
          generated_concepts?: Json;
          generation_time_ms?: number | null;
          lead_id?: string | null;
          shared?: boolean;
          share_token?: string | null;
          downloaded?: boolean;
          download_count?: number;
          source?: string;
          device_type?: string | null;
          user_agent?: string | null;
        };
        Update: {
          id?: string;
          site_id?: string;
          created_at?: string;
          updated_at?: string;
          email?: string | null;
          original_photo_url?: string;
          room_type?: VisualizationRoomType;
          style?: VisualizationStyle;
          constraints?: string | null;
          generated_concepts?: Json;
          generation_time_ms?: number | null;
          lead_id?: string | null;
          shared?: boolean;
          share_token?: string | null;
          downloaded?: boolean;
          download_count?: number;
          source?: string;
          device_type?: string | null;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'visualizations_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id'];
          }
        ];
      };
      admin_settings: {
        Row: {
          id: string;
          site_id: string;
          key: string;
          value: Json;
          description: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          site_id: string;
          key: string;
          value: Json;
          description?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          site_id?: string;
          key?: string;
          value?: Json;
          description?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          site_id: string;
          created_at: string;
          updated_at: string;
          invoice_number: string;
          lead_id: string | null;
          quote_draft_id: string | null;
          status: InvoiceStatus;
          line_items: Json;
          subtotal: number;
          contingency_percent: number;
          contingency_amount: number;
          hst_amount: number;
          total: number;
          amount_paid: number;
          balance_due: number;
          deposit_required: number;
          deposit_received: boolean;
          customer_name: string;
          customer_email: string;
          customer_phone: string | null;
          customer_address: string | null;
          customer_city: string;
          customer_province: string;
          customer_postal_code: string | null;
          issue_date: string;
          due_date: string;
          sent_at: string | null;
          pdf_url: string | null;
          notes: string | null;
          internal_notes: string | null;
        };
        Insert: {
          id?: string;
          site_id: string;
          created_at?: string;
          updated_at?: string;
          invoice_number: string;
          lead_id?: string | null;
          quote_draft_id?: string | null;
          status?: InvoiceStatus;
          line_items: Json;
          subtotal: number;
          contingency_percent?: number;
          contingency_amount?: number;
          hst_amount: number;
          total: number;
          amount_paid?: number;
          balance_due: number;
          deposit_required?: number;
          deposit_received?: boolean;
          customer_name: string;
          customer_email: string;
          customer_phone?: string | null;
          customer_address?: string | null;
          customer_city?: string;
          customer_province?: string;
          customer_postal_code?: string | null;
          issue_date?: string;
          due_date?: string;
          sent_at?: string | null;
          pdf_url?: string | null;
          notes?: string | null;
          internal_notes?: string | null;
        };
        Update: {
          id?: string;
          site_id?: string;
          created_at?: string;
          updated_at?: string;
          invoice_number?: string;
          lead_id?: string | null;
          quote_draft_id?: string | null;
          status?: InvoiceStatus;
          line_items?: Json;
          subtotal?: number;
          contingency_percent?: number;
          contingency_amount?: number;
          hst_amount?: number;
          total?: number;
          amount_paid?: number;
          balance_due?: number;
          deposit_required?: number;
          deposit_received?: boolean;
          customer_name?: string;
          customer_email?: string;
          customer_phone?: string | null;
          customer_address?: string | null;
          customer_city?: string;
          customer_province?: string;
          customer_postal_code?: string | null;
          issue_date?: string;
          due_date?: string;
          sent_at?: string | null;
          pdf_url?: string | null;
          notes?: string | null;
          internal_notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'invoices_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invoices_quote_draft_id_fkey';
            columns: ['quote_draft_id'];
            isOneToOne: false;
            referencedRelation: 'quote_drafts';
            referencedColumns: ['id'];
          }
        ];
      };
      payments: {
        Row: {
          id: string;
          site_id: string;
          created_at: string;
          invoice_id: string;
          amount: number;
          payment_method: PaymentMethod;
          payment_date: string;
          reference_number: string | null;
          recorded_by: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          site_id: string;
          created_at?: string;
          invoice_id: string;
          amount: number;
          payment_method: PaymentMethod;
          payment_date?: string;
          reference_number?: string | null;
          recorded_by?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          site_id?: string;
          created_at?: string;
          invoice_id?: string;
          amount?: number;
          payment_method?: PaymentMethod;
          payment_date?: string;
          reference_number?: string | null;
          recorded_by?: string | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_invoice_id_fkey';
            columns: ['invoice_id'];
            isOneToOne: false;
            referencedRelation: 'invoices';
            referencedColumns: ['id'];
          }
        ];
      };
      drawings: {
        Row: {
          id: string;
          site_id: string;
          created_at: string;
          updated_at: string;
          name: string;
          description: string | null;
          lead_id: string | null;
          drawing_data: Json;
          thumbnail_url: string | null;
          status: DrawingStatus;
          permit_number: string | null;
          pdf_url: string | null;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          site_id: string;
          created_at?: string;
          updated_at?: string;
          name: string;
          description?: string | null;
          lead_id?: string | null;
          drawing_data?: Json;
          thumbnail_url?: string | null;
          status?: DrawingStatus;
          permit_number?: string | null;
          pdf_url?: string | null;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          site_id?: string;
          created_at?: string;
          updated_at?: string;
          name?: string;
          description?: string | null;
          lead_id?: string | null;
          drawing_data?: Json;
          thumbnail_url?: string | null;
          status?: DrawingStatus;
          permit_number?: string | null;
          pdf_url?: string | null;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'drawings_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Enum types
export type LeadStatus = 'new' | 'draft_ready' | 'needs_clarification' | 'sent' | 'won' | 'lost';
export type ProjectType = 'kitchen' | 'bathroom' | 'basement' | 'flooring' | 'painting' | 'exterior' | 'other';
export type Timeline = 'asap' | '1_3_months' | '3_6_months' | '6_plus_months' | 'just_exploring';
export type BudgetBand = 'under_15k' | '15k_25k' | '25k_40k' | '40k_60k' | '60k_plus' | 'not_sure';
export type FinishLevel = 'economy' | 'standard' | 'premium';
export type ChatSessionState = 'active' | 'completed' | 'expired' | 'abandoned';
export type VisualizationRoomType = 'kitchen' | 'bathroom' | 'living_room' | 'bedroom' | 'basement' | 'dining_room' | 'exterior' | 'other';
export type VisualizationStyle = 'modern' | 'traditional' | 'farmhouse' | 'industrial' | 'minimalist' | 'contemporary';
export type InvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
export type PaymentMethod = 'cash' | 'cheque' | 'etransfer' | 'credit_card';
export type DrawingStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

// Helper types for convenience
export type Lead = Database['public']['Tables']['leads']['Row'];
export type LeadInsert = Database['public']['Tables']['leads']['Insert'];
export type LeadUpdate = Database['public']['Tables']['leads']['Update'];

export type QuoteDraft = Database['public']['Tables']['quote_drafts']['Row'];
export type QuoteDraftInsert = Database['public']['Tables']['quote_drafts']['Insert'];
export type QuoteDraftUpdate = Database['public']['Tables']['quote_drafts']['Update'];

export type ChatSession = Database['public']['Tables']['chat_sessions']['Row'];
export type ChatSessionInsert = Database['public']['Tables']['chat_sessions']['Insert'];
export type ChatSessionUpdate = Database['public']['Tables']['chat_sessions']['Update'];

export type AuditLog = Database['public']['Tables']['audit_log']['Row'];
export type AuditLogInsert = Database['public']['Tables']['audit_log']['Insert'];

export type Visualization = Database['public']['Tables']['visualizations']['Row'];
export type VisualizationInsert = Database['public']['Tables']['visualizations']['Insert'];
export type VisualizationUpdate = Database['public']['Tables']['visualizations']['Update'];

export type AdminSettings = Database['public']['Tables']['admin_settings']['Row'];
export type AdminSettingsInsert = Database['public']['Tables']['admin_settings']['Insert'];
export type AdminSettingsUpdate = Database['public']['Tables']['admin_settings']['Update'];

export type Invoice = Database['public']['Tables']['invoices']['Row'];
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert'];
export type InvoiceUpdate = Database['public']['Tables']['invoices']['Update'];

export type Payment = Database['public']['Tables']['payments']['Row'];
export type PaymentInsert = Database['public']['Tables']['payments']['Insert'];

export type Drawing = Database['public']['Tables']['drawings']['Row'];
export type DrawingInsert = Database['public']['Tables']['drawings']['Insert'];
export type DrawingUpdate = Database['public']['Tables']['drawings']['Update'];

// Quote line item type (used in quote_drafts.line_items and invoices.line_items)
export interface QuoteLineItem {
  description: string;
  category: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}
