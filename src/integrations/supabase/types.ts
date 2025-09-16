export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          accessed_fields: string[] | null
          created_at: string | null
          id: string
          ip_address: unknown | null
          operation: string
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          accessed_fields?: string[] | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          operation: string
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          accessed_fields?: string[] | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          operation?: string
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      backup_logs: {
        Row: {
          backup_date: string
          backup_type: string | null
          created_at: string | null
          created_by: string | null
          duration_seconds: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          size_mb: number | null
          status: string | null
          storage_location: string | null
          tables_backed_up: number | null
        }
        Insert: {
          backup_date: string
          backup_type?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          size_mb?: number | null
          status?: string | null
          storage_location?: string | null
          tables_backed_up?: number | null
        }
        Update: {
          backup_date?: string
          backup_type?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          size_mb?: number | null
          status?: string | null
          storage_location?: string | null
          tables_backed_up?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "backup_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_sheet_items: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          created_by: string | null
          date: string
          description: string
          id: string
          type: Database["public"]["Enums"]["balance_sheet_type"]
          updated_at: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          created_by?: string | null
          date: string
          description: string
          id?: string
          type: Database["public"]["Enums"]["balance_sheet_type"]
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string
          id?: string
          type?: Database["public"]["Enums"]["balance_sheet_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      cash_flow_categories: {
        Row: {
          created_at: string | null
          id: string
          is_financing: boolean | null
          is_investment: boolean | null
          is_operational: boolean | null
          name: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_financing?: boolean | null
          is_investment?: boolean | null
          is_operational?: boolean | null
          name: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_financing?: boolean | null
          is_investment?: boolean | null
          is_operational?: boolean | null
          name?: string
          type?: string
        }
        Relationships: []
      }
      company_costs: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          date: string
          description: string
          files: string[] | null
          id: string
          observations: string | null
          sub_category: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          date: string
          description: string
          files?: string[] | null
          id?: string
          observations?: string | null
          sub_category?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          files?: string[] | null
          id?: string
          observations?: string | null
          sub_category?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          assigned_to: string | null
          client_name: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          deadline: string | null
          document_name: string
          id: string
          notes: string | null
          pages: number | null
          payment_amount: number | null
          project_name: string | null
          status: Database["public"]["Enums"]["document_status"] | null
          updated_at: string | null
          urgent_document_count: number | null
          word_count: number | null
        }
        Insert: {
          assigned_to?: string | null
          client_name: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          document_name: string
          id?: string
          notes?: string | null
          pages?: number | null
          payment_amount?: number | null
          project_name?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          updated_at?: string | null
          urgent_document_count?: number | null
          word_count?: number | null
        }
        Update: {
          assigned_to?: string | null
          client_name?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          document_name?: string
          id?: string
          notes?: string | null
          pages?: number | null
          payment_amount?: number | null
          project_name?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          updated_at?: string | null
          urgent_document_count?: number | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_entries: {
        Row: {
          accounting_method: string | null
          amount: number
          category: string
          created_at: string | null
          created_by: string | null
          date: string
          description: string
          document_ref: string | null
          id: string
          is_fixed: boolean | null
          is_variable: boolean | null
          payment_method: string | null
          status: string | null
          subcategory: string | null
          tax_amount: number | null
          type: Database["public"]["Enums"]["financial_entry_type"]
          updated_at: string | null
        }
        Insert: {
          accounting_method?: string | null
          amount: number
          category: string
          created_at?: string | null
          created_by?: string | null
          date: string
          description: string
          document_ref?: string | null
          id?: string
          is_fixed?: boolean | null
          is_variable?: boolean | null
          payment_method?: string | null
          status?: string | null
          subcategory?: string | null
          tax_amount?: number | null
          type: Database["public"]["Enums"]["financial_entry_type"]
          updated_at?: string | null
        }
        Update: {
          accounting_method?: string | null
          amount?: number
          category?: string
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string
          document_ref?: string | null
          id?: string
          is_fixed?: boolean | null
          is_variable?: boolean | null
          payment_method?: string | null
          status?: string | null
          subcategory?: string | null
          tax_amount?: number | null
          type?: Database["public"]["Enums"]["financial_entry_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      financial_indicators: {
        Row: {
          category: string | null
          created_at: string | null
          date: string
          id: string
          indicator_name: string
          updated_at: string | null
          value: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          date: string
          id?: string
          indicator_name: string
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          date?: string
          id?: string
          indicator_name?: string
          updated_at?: string | null
          value?: number | null
        }
        Relationships: []
      }
      financial_projections: {
        Row: {
          actual_value: number | null
          created_at: string | null
          created_by: string | null
          id: string
          metric_type: string
          notes: string | null
          projected_value: number
          projection_date: string
          scenario: Database["public"]["Enums"]["scenario_type"]
          updated_at: string | null
          variance: number | null
        }
        Insert: {
          actual_value?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          metric_type: string
          notes?: string | null
          projected_value: number
          projection_date: string
          scenario: Database["public"]["Enums"]["scenario_type"]
          updated_at?: string | null
          variance?: number | null
        }
        Update: {
          actual_value?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          metric_type?: string
          notes?: string | null
          projected_value?: number
          projection_date?: string
          scenario?: Database["public"]["Enums"]["scenario_type"]
          updated_at?: string | null
          variance?: number | null
        }
        Relationships: []
      }
      financial_records: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          description: string | null
          document_id: string | null
          id: string
          payment_date: string
          payment_method: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_id?: string | null
          id?: string
          payment_date: string
          payment_method?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_id?: string | null
          id?: string
          payment_date?: string
          payment_method?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          attribution_date: string | null
          created_at: string
          created_by: string
          deadline: string
          delivered_at: string | null
          document_count: number
          has_attention: boolean | null
          has_delay: boolean | null
          id: string
          is_urgent: boolean | null
          order_number: string
          status_order: string
          updated_at: string
          urgent_document_count: number | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          attribution_date?: string | null
          created_at?: string
          created_by: string
          deadline: string
          delivered_at?: string | null
          document_count: number
          has_attention?: boolean | null
          has_delay?: boolean | null
          id?: string
          is_urgent?: boolean | null
          order_number: string
          status_order?: string
          updated_at?: string
          urgent_document_count?: number | null
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          attribution_date?: string | null
          created_at?: string
          created_by?: string
          deadline?: string
          delivered_at?: string | null
          document_count?: number
          has_attention?: boolean | null
          has_delay?: boolean | null
          id?: string
          is_urgent?: boolean | null
          order_number?: string
          status_order?: string
          updated_at?: string
          urgent_document_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pendencies: {
        Row: {
          c4u_id: string
          created_at: string
          created_by: string
          description: string
          error_document_count: number
          error_type: string
          has_delay: boolean | null
          id: string
          old_order_text_id: string | null
          order_id: string | null
          status: string
          treatment: string | null
          updated_at: string
        }
        Insert: {
          c4u_id: string
          created_at?: string
          created_by: string
          description: string
          error_document_count?: number
          error_type: string
          has_delay?: boolean | null
          id?: string
          old_order_text_id?: string | null
          order_id?: string | null
          status?: string
          treatment?: string | null
          updated_at?: string
        }
        Update: {
          c4u_id?: string
          created_at?: string
          created_by?: string
          description?: string
          error_document_count?: number
          error_type?: string
          has_delay?: boolean | null
          id?: string
          old_order_text_id?: string | null
          order_id?: string | null
          status?: string
          treatment?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pendencies_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      productivity: {
        Row: {
          created_at: string | null
          daily_earnings: number | null
          date: string
          documents_completed: number | null
          hours_worked: number | null
          id: string
          pages_translated: number | null
          updated_at: string | null
          user_id: string
          words_translated: number | null
        }
        Insert: {
          created_at?: string | null
          daily_earnings?: number | null
          date: string
          documents_completed?: number | null
          hours_worked?: number | null
          id?: string
          pages_translated?: number | null
          updated_at?: string | null
          user_id: string
          words_translated?: number | null
        }
        Update: {
          created_at?: string | null
          daily_earnings?: number | null
          date?: string
          documents_completed?: number | null
          hours_worked?: number | null
          id?: string
          pages_translated?: number | null
          updated_at?: string | null
          user_id?: string
          words_translated?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "productivity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          daily_rate: number | null
          email: string
          failed_access_attempts: number | null
          full_name: string
          hourly_rate: number | null
          id: string
          last_failed_access: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          daily_rate?: number | null
          email: string
          failed_access_attempts?: number | null
          full_name: string
          hourly_rate?: number | null
          id: string
          last_failed_access?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          daily_rate?: number | null
          email?: string
          failed_access_attempts?: number | null
          full_name?: string
          hourly_rate?: number | null
          id?: string
          last_failed_access?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          severity: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      service_provider_costs: {
        Row: {
          amount: number
          cnpj: string | null
          competence: string
          cpf: string | null
          created_at: string
          created_by: string | null
          days_worked: number | null
          email: string
          files: string[] | null
          id: string
          invoice_number: string | null
          last_sensitive_access: string | null
          name: string
          phone: string | null
          pix_key: string | null
          sensitive_access_count: number | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          cnpj?: string | null
          competence: string
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          days_worked?: number | null
          email: string
          files?: string[] | null
          id?: string
          invoice_number?: string | null
          last_sensitive_access?: string | null
          name: string
          phone?: string | null
          pix_key?: string | null
          sensitive_access_count?: number | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          cnpj?: string | null
          competence?: string
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          days_worked?: number | null
          email?: string
          files?: string[] | null
          id?: string
          invoice_number?: string | null
          last_sensitive_access?: string | null
          name?: string
          phone?: string | null
          pix_key?: string | null
          sensitive_access_count?: number | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      unit_economics: {
        Row: {
          arpu: number | null
          avg_ticket: number | null
          cac: number | null
          churn_rate: number | null
          created_at: string | null
          created_by: string | null
          customer_count: number | null
          id: string
          ltv: number | null
          marketing_spend: number | null
          month: string
          new_customers: number | null
          purchase_frequency: number | null
          retention_months: number | null
          sales_spend: number | null
          updated_at: string | null
        }
        Insert: {
          arpu?: number | null
          avg_ticket?: number | null
          cac?: number | null
          churn_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          customer_count?: number | null
          id?: string
          ltv?: number | null
          marketing_spend?: number | null
          month: string
          new_customers?: number | null
          purchase_frequency?: number | null
          retention_months?: number | null
          sales_spend?: number | null
          updated_at?: string | null
        }
        Update: {
          arpu?: number | null
          avg_ticket?: number | null
          cac?: number | null
          churn_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          customer_count?: number | null
          id?: string
          ltv?: number | null
          marketing_spend?: number | null
          month?: string
          new_customers?: number | null
          purchase_frequency?: number | null
          retention_months?: number | null
          sales_spend?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_document_limits: {
        Row: {
          concurrent_order_limit: number
          created_at: string
          created_by: string | null
          daily_limit: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          concurrent_order_limit?: number
          created_at?: string
          created_by?: string | null
          daily_limit?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          concurrent_order_limit?: number
          created_at?: string
          created_by?: string | null
          daily_limit?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_document_limits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_document_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      security_monitoring_dashboard: {
        Row: {
          access_count: number | null
          first_access: string | null
          last_access: string | null
          operation: string | null
          table_name: string | null
          user_id: string | null
          user_name: string | null
          user_role: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: []
      }
      service_provider_costs_masked: {
        Row: {
          amount: number | null
          cnpj_masked: string | null
          competence: string | null
          cpf_masked: string | null
          created_at: string | null
          created_by: string | null
          days_worked: number | null
          email: string | null
          files: string[] | null
          id: string | null
          invoice_number: string | null
          name: string | null
          phone: string | null
          pix_key_masked: string | null
          status: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          cnpj_masked?: never
          competence?: string | null
          cpf_masked?: never
          created_at?: string | null
          created_by?: string | null
          days_worked?: number | null
          email?: string | null
          files?: string[] | null
          id?: string | null
          invoice_number?: string | null
          name?: string | null
          phone?: string | null
          pix_key_masked?: never
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          cnpj_masked?: never
          competence?: string | null
          cpf_masked?: never
          created_at?: string | null
          created_by?: string | null
          days_worked?: number | null
          email?: string | null
          files?: string[] | null
          id?: string | null
          invoice_number?: string | null
          name?: string | null
          phone?: string | null
          pix_key_masked?: never
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_sensitive_data_rate_limit: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      cleanup_old_backups: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_backup_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          avg_duration_minutes: number
          failed_backups: number
          last_backup_date: string
          last_successful_backup: string
          successful_backups: number
          total_backups: number
          total_size_gb: number
        }[]
      }
      get_service_provider_sensitive_data: {
        Args: { p_id: string }
        Returns: {
          cnpj: string
          cpf: string
          pix_key: string
        }[]
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      log_security_event: {
        Args: { p_details?: Json; p_event_type: string; p_severity: string }
        Returns: undefined
      }
      log_sensitive_data_access: {
        Args: {
          p_fields?: string[]
          p_operation: string
          p_record_id?: string
          p_table_name: string
        }
        Returns: undefined
      }
      mask_sensitive_string: {
        Args: { input_text: string; mask_type?: string }
        Returns: string
      }
      reset_failed_attempts: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      test_backup: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      track_failed_access: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      validate_sensitive_access: {
        Args: { p_table_name: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      balance_sheet_type:
        | "current_asset"
        | "non_current_asset"
        | "current_liability"
        | "non_current_liability"
        | "equity"
      cash_flow_method: "direct" | "indirect"
      document_status:
        | "pending"
        | "in_progress"
        | "review"
        | "completed"
        | "delivered"
      financial_entry_type: "revenue" | "expense" | "tax" | "deduction"
      scenario_type: "pessimistic" | "realistic" | "optimistic"
      user_role: "master" | "admin" | "operation" | "owner"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      balance_sheet_type: [
        "current_asset",
        "non_current_asset",
        "current_liability",
        "non_current_liability",
        "equity",
      ],
      cash_flow_method: ["direct", "indirect"],
      document_status: [
        "pending",
        "in_progress",
        "review",
        "completed",
        "delivered",
      ],
      financial_entry_type: ["revenue", "expense", "tax", "deduction"],
      scenario_type: ["pessimistic", "realistic", "optimistic"],
      user_role: ["master", "admin", "operation", "owner"],
    },
  },
} as const
