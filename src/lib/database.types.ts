export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          document: string | null;
          phone: string | null;
          email: string | null;
          address: Json | null;
          settings: Json | null;
          niche: string | null;
          is_active: boolean;
          subscription_tier: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          document?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: Json | null;
          settings?: Json | null;
          niche?: string | null;
          is_active?: boolean;
          subscription_tier?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          document?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: Json | null;
          settings?: Json | null;
          niche?: string | null;
          is_active?: boolean;
          subscription_tier?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          tenant_id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: 'owner' | 'admin' | 'operator' | 'viewer';
          is_active: boolean;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          tenant_id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: string;
          is_active?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: string;
          is_active?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          description: string | null;
          color: string;
          parent_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          description?: string | null;
          color?: string;
          parent_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          description?: string | null;
          color?: string;
          parent_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          tenant_id: string;
          sku: string;
          name: string;
          description: string | null;
          category_id: string | null;
          cost_price: number;
          sale_price: number;
          stock_quantity: number;
          min_stock: number;
          unit: string;
          barcode: string | null;
          is_active: boolean;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string;
          sku: string;
          name: string;
          description?: string | null;
          category_id?: string | null;
          cost_price?: number;
          sale_price?: number;
          stock_quantity?: number;
          min_stock?: number;
          unit?: string;
          barcode?: string | null;
          is_active?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          sku?: string;
          name?: string;
          description?: string | null;
          category_id?: string | null;
          cost_price?: number;
          sale_price?: number;
          stock_quantity?: number;
          min_stock?: number;
          unit?: string;
          barcode?: string | null;
          is_active?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          document: string | null;
          email: string | null;
          phone: string | null;
          address: Json | null;
          birthday: string | null;
          notes: string | null;
          credit_limit: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string;
          name: string;
          document?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: Json | null;
          birthday?: string | null;
          notes?: string | null;
          credit_limit?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          document?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: Json | null;
          birthday?: string | null;
          notes?: string | null;
          credit_limit?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      sales: {
        Row: {
          id: string;
          tenant_id: string;
          customer_id: string | null;
          user_id: string | null;
          sale_number: string | null;
          sale_date: string;
          subtotal: number;
          discount: number;
          total: number;
          status: string;
          payment_method: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string;
          customer_id?: string | null;
          user_id?: string | null;
          sale_number?: string | null;
          sale_date?: string;
          subtotal?: number;
          discount?: number;
          total?: number;
          status?: string;
          payment_method?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          customer_id?: string | null;
          user_id?: string | null;
          sale_number?: string | null;
          sale_date?: string;
          subtotal?: number;
          discount?: number;
          total?: number;
          status?: string;
          payment_method?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      sale_items: {
        Row: {
          id: string;
          tenant_id: string;
          sale_id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          unit_price: number;
          discount: number;
          total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string;
          sale_id: string;
          product_id?: string | null;
          product_name: string;
          quantity: number;
          unit_price: number;
          discount?: number;
          total: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          sale_id?: string;
          product_id?: string | null;
          product_name?: string;
          quantity?: number;
          unit_price?: number;
          discount?: number;
          total?: number;
          created_at?: string;
        };
      };
      financial_transactions: {
        Row: {
          id: string;
          tenant_id: string;
          type: string;
          category: string;
          description: string;
          amount: number;
          due_date: string;
          payment_date: string | null;
          status: string;
          payment_method: string | null;
          customer_id: string | null;
          sale_id: string | null;
          is_recurring: boolean;
          recurrence_pattern: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string;
          type: string;
          category: string;
          description: string;
          amount: number;
          due_date: string;
          payment_date?: string | null;
          status?: string;
          payment_method?: string | null;
          customer_id?: string | null;
          sale_id?: string | null;
          is_recurring?: boolean;
          recurrence_pattern?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          type?: string;
          category?: string;
          description?: string;
          amount?: number;
          due_date?: string;
          payment_date?: string | null;
          status?: string;
          payment_method?: string | null;
          customer_id?: string | null;
          sale_id?: string | null;
          is_recurring?: boolean;
          recurrence_pattern?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      bank_accounts: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          bank_name: string | null;
          agency: string | null;
          account_number: string | null;
          account_type: string | null;
          initial_balance: number;
          current_balance: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          bank_name?: string | null;
          agency?: string | null;
          account_number?: string | null;
          account_type?: string | null;
          initial_balance?: number;
          current_balance?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          bank_name?: string | null;
          agency?: string | null;
          account_number?: string | null;
          account_type?: string | null;
          initial_balance?: number;
          current_balance?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      cash_movements: {
        Row: {
          id: string;
          tenant_id: string;
          bank_account_id: string | null;
          type: string;
          amount: number;
          description: string | null;
          transaction_id: string | null;
          sale_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          bank_account_id?: string | null;
          type: string;
          amount: number;
          description?: string | null;
          transaction_id?: string | null;
          sale_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          bank_account_id?: string | null;
          type?: string;
          amount?: number;
          description?: string | null;
          transaction_id?: string | null;
          sale_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string | null;
          user_email: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          old_data: Json | null;
          new_data: Json | null;
          changed_fields: string[] | null;
          ip_address: unknown | null;
          user_agent: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id?: string | null;
          user_email?: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          old_data?: Json | null;
          new_data?: Json | null;
          changed_fields?: string[] | null;
          ip_address?: unknown | null;
          user_agent?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string | null;
          user_email?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string;
          old_data?: Json | null;
          new_data?: Json | null;
          changed_fields?: string[] | null;
          ip_address?: unknown | null;
          user_agent?: string | null;
          metadata?: Json;
          created_at?: string;
        };
      };
    };
    Functions: {
      get_entity_audit_history: {
        Args: {
          p_tenant_id: string;
          p_entity_type: string;
          p_entity_id: string;
        };
        Returns: Database['public']['Tables']['audit_logs']['Row'][];
      };
      get_user_audit_history: {
        Args: {
          p_tenant_id: string;
          p_user_id: string;
          p_start_date?: string;
          p_end_date?: string;
        };
        Returns: Database['public']['Tables']['audit_logs']['Row'][];
      };
      get_suspicious_changes: {
        Args: {
          p_tenant_id: string;
          p_start_date?: string;
        };
        Returns: Database['public']['Tables']['audit_logs']['Row'][];
      };
      get_current_tenant_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      get_current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      get_financial_summary: {
        Args: {
          start_date: string;
          end_date: string;
        };
        Returns: Json;
      };
    };
  };
}
