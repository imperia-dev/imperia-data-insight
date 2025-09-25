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
    PostgrestVersion: "13.0.5"
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
      bank_batches: {
        Row: {
          agreement_id: string | null
          batch_id: string | null
          btg_response: Json | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          payments_count: number | null
          processed_at: string | null
          status: Database["public"]["Enums"]["batch_status"] | null
          total_amount: number
        }
        Insert: {
          agreement_id?: string | null
          batch_id?: string | null
          btg_response?: Json | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          payments_count?: number | null
          processed_at?: string | null
          status?: Database["public"]["Enums"]["batch_status"] | null
          total_amount: number
        }
        Update: {
          agreement_id?: string | null
          batch_id?: string | null
          btg_response?: Json | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          payments_count?: number | null
          processed_at?: string | null
          status?: Database["public"]["Enums"]["batch_status"] | null
          total_amount?: number
        }
        Relationships: []
      }
      bank_payments: {
        Row: {
          amount: number
          batch_id: string | null
          btg_payment_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          payment_data: Json
          protocol_id: string | null
          status: Database["public"]["Enums"]["payment_status_enum"] | null
          supplier_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          batch_id?: string | null
          btg_payment_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          payment_data: Json
          protocol_id?: string | null
          status?: Database["public"]["Enums"]["payment_status_enum"] | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          batch_id?: string | null
          btg_payment_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          payment_data?: Json
          protocol_id?: string | null
          status?: Database["public"]["Enums"]["payment_status_enum"] | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_payments_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "bank_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_payments_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "closing_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
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
      chart_of_accounts: {
        Row: {
          code: string
          created_at: string | null
          dfc_activity: Database["public"]["Enums"]["dfc_activity_type"] | null
          dre_section: Database["public"]["Enums"]["dre_section_type"] | null
          id: string
          is_active: boolean | null
          is_cac: boolean | null
          name: string
          org_id: string | null
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          dfc_activity?: Database["public"]["Enums"]["dfc_activity_type"] | null
          dre_section?: Database["public"]["Enums"]["dre_section_type"] | null
          id?: string
          is_active?: boolean | null
          is_cac?: boolean | null
          name: string
          org_id?: string | null
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          dfc_activity?: Database["public"]["Enums"]["dfc_activity_type"] | null
          dre_section?: Database["public"]["Enums"]["dre_section_type"] | null
          id?: string
          is_active?: boolean | null
          is_cac?: boolean | null
          name?: string
          org_id?: string | null
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      closing_protocols: {
        Row: {
          approval_notes: string | null
          approved_at: string | null
          approved_by: string | null
          avg_value_per_document: number
          bank_batch_id: string | null
          competence_month: string
          created_at: string | null
          created_by: string | null
          document_data: Json
          id: string
          payment_amount: number | null
          payment_notes: string | null
          payment_received_at: string | null
          payment_requested_at: string | null
          payment_status: string | null
          product_1_count: number
          product_2_count: number
          protocol_number: string
          protocol_type: Database["public"]["Enums"]["protocol_type"] | null
          receipt_url: string | null
          status: string
          total_ids: number
          total_pages: number
          total_value: number
          updated_at: string | null
          workflow_steps: Json | null
        }
        Insert: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          avg_value_per_document: number
          bank_batch_id?: string | null
          competence_month: string
          created_at?: string | null
          created_by?: string | null
          document_data: Json
          id?: string
          payment_amount?: number | null
          payment_notes?: string | null
          payment_received_at?: string | null
          payment_requested_at?: string | null
          payment_status?: string | null
          product_1_count: number
          product_2_count: number
          protocol_number: string
          protocol_type?: Database["public"]["Enums"]["protocol_type"] | null
          receipt_url?: string | null
          status?: string
          total_ids: number
          total_pages: number
          total_value: number
          updated_at?: string | null
          workflow_steps?: Json | null
        }
        Update: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          avg_value_per_document?: number
          bank_batch_id?: string | null
          competence_month?: string
          created_at?: string | null
          created_by?: string | null
          document_data?: Json
          id?: string
          payment_amount?: number | null
          payment_notes?: string | null
          payment_received_at?: string | null
          payment_requested_at?: string | null
          payment_status?: string | null
          product_1_count?: number
          product_2_count?: number
          protocol_number?: string
          protocol_type?: Database["public"]["Enums"]["protocol_type"] | null
          receipt_url?: string | null
          status?: string
          total_ids?: number
          total_pages?: number
          total_value?: number
          updated_at?: string | null
          workflow_steps?: Json | null
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
      cost_centers: {
        Row: {
          code: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          org_id: string | null
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          org_id?: string | null
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          org_id?: string | null
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
        ]
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
      expense_allocations: {
        Row: {
          amount_allocated: number | null
          centro_custo_id: string | null
          created_at: string | null
          driver: string | null
          driver_value: number | null
          expense_id: string
          id: string
          percent: number
          projeto_cliente_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount_allocated?: number | null
          centro_custo_id?: string | null
          created_at?: string | null
          driver?: string | null
          driver_value?: number | null
          expense_id: string
          id?: string
          percent: number
          projeto_cliente_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_allocated?: number | null
          centro_custo_id?: string | null
          created_at?: string | null
          driver?: string | null
          driver_value?: number | null
          expense_id?: string
          id?: string
          percent?: number
          projeto_cliente_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_allocations_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_allocations_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_allocations_projeto_cliente_id_fkey"
            columns: ["projeto_cliente_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_closing_protocols: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          closing_data: Json | null
          competence_month: string
          created_at: string | null
          created_by: string | null
          expense_count: number
          id: string
          notes: string | null
          protocol_number: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["expense_closing_status"]
          total_amount: number
          total_company_expenses: number
          total_service_provider_expenses: number
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          closing_data?: Json | null
          competence_month: string
          created_at?: string | null
          created_by?: string | null
          expense_count?: number
          id?: string
          notes?: string | null
          protocol_number: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["expense_closing_status"]
          total_amount?: number
          total_company_expenses?: number
          total_service_provider_expenses?: number
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          closing_data?: Json | null
          competence_month?: string
          created_at?: string | null
          created_by?: string | null
          expense_count?: number
          id?: string
          notes?: string | null
          protocol_number?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["expense_closing_status"]
          total_amount?: number
          total_company_expenses?: number
          total_service_provider_expenses?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount_base: number | null
          amount_original: number
          capex_opex: Database["public"]["Enums"]["expense_nature"] | null
          centro_custo_id: string | null
          closing_protocol_id: string | null
          conta_contabil_id: string
          created_at: string | null
          created_by: string | null
          currency: string
          data_competencia: string
          data_emissao: string | null
          data_pagamento: string | null
          data_vencimento: string | null
          description: string
          document_ref: string | null
          exchange_rate: number
          files: string[] | null
          fixo_variavel:
            | Database["public"]["Enums"]["expense_classification"]
            | null
          fornecedor_id: string | null
          id: string
          invoice_number: string | null
          notes: string | null
          org_id: string | null
          payment_method: string | null
          projeto_cliente_id: string | null
          status: Database["public"]["Enums"]["expense_status"]
          tipo_fornecedor: string | null
          tipo_lancamento: Database["public"]["Enums"]["expense_type"]
          updated_at: string | null
        }
        Insert: {
          amount_base?: number | null
          amount_original: number
          capex_opex?: Database["public"]["Enums"]["expense_nature"] | null
          centro_custo_id?: string | null
          closing_protocol_id?: string | null
          conta_contabil_id: string
          created_at?: string | null
          created_by?: string | null
          currency?: string
          data_competencia: string
          data_emissao?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          description: string
          document_ref?: string | null
          exchange_rate?: number
          files?: string[] | null
          fixo_variavel?:
            | Database["public"]["Enums"]["expense_classification"]
            | null
          fornecedor_id?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          org_id?: string | null
          payment_method?: string | null
          projeto_cliente_id?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          tipo_fornecedor?: string | null
          tipo_lancamento: Database["public"]["Enums"]["expense_type"]
          updated_at?: string | null
        }
        Update: {
          amount_base?: number | null
          amount_original?: number
          capex_opex?: Database["public"]["Enums"]["expense_nature"] | null
          centro_custo_id?: string | null
          closing_protocol_id?: string | null
          conta_contabil_id?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string
          data_competencia?: string
          data_emissao?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          description?: string
          document_ref?: string | null
          exchange_rate?: number
          files?: string[] | null
          fixo_variavel?:
            | Database["public"]["Enums"]["expense_classification"]
            | null
          fornecedor_id?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          org_id?: string | null
          payment_method?: string | null
          projeto_cliente_id?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          tipo_fornecedor?: string | null
          tipo_lancamento?: Database["public"]["Enums"]["expense_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_closing_protocol_id_fkey"
            columns: ["closing_protocol_id"]
            isOneToOne: false
            referencedRelation: "expense_closing_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_conta_contabil_id_fkey"
            columns: ["conta_contabil_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_projeto_cliente_id_fkey"
            columns: ["projeto_cliente_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
          protocol_id: string | null
          status: string | null
          subcategory: string | null
          supplier_id: string | null
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
          protocol_id?: string | null
          status?: string | null
          subcategory?: string | null
          supplier_id?: string | null
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
          protocol_id?: string | null
          status?: string | null
          subcategory?: string | null
          supplier_id?: string | null
          tax_amount?: number | null
          type?: Database["public"]["Enums"]["financial_entry_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "closing_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
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
      mfa_audit_logs: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mfa_backup_codes: {
        Row: {
          code_hash: string
          created_at: string | null
          id: string
          used: boolean | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string | null
          id?: string
          used?: boolean | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string | null
          id?: string
          used?: boolean | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mfa_backup_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          created_at: string
          id: string
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          account_ID: string | null
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
          service_order_link: string | null
          status_order: string
          updated_at: string
          urgent_document_count: number | null
        }
        Insert: {
          account_ID?: string | null
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
          service_order_link?: string | null
          status_order?: string
          updated_at?: string
          urgent_document_count?: number | null
        }
        Update: {
          account_ID?: string | null
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
          service_order_link?: string | null
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
      password_reset_tokens: {
        Row: {
          created_at: string | null
          email_token: string
          email_verified: boolean | null
          expires_at: string
          id: string
          ip_address: unknown | null
          sms_token: string
          sms_verified: boolean | null
          used: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_token?: string
          email_verified?: boolean | null
          expires_at: string
          id?: string
          ip_address?: unknown | null
          sms_token: string
          sms_verified?: boolean | null
          used?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_token?: string
          email_verified?: boolean | null
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          sms_token?: string
          sms_verified?: boolean | null
          used?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "password_reset_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_receipts: {
        Row: {
          amount: number
          bank_reference: string | null
          created_at: string | null
          created_by: string | null
          file_url: string
          id: string
          notes: string | null
          payment_method: string | null
          payment_request_id: string | null
          protocol_id: string | null
          receipt_date: string
          receipt_number: string | null
          updated_at: string | null
          validated: boolean | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          amount: number
          bank_reference?: string | null
          created_at?: string | null
          created_by?: string | null
          file_url: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_request_id?: string | null
          protocol_id?: string | null
          receipt_date: string
          receipt_number?: string | null
          updated_at?: string | null
          validated?: boolean | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          amount?: number
          bank_reference?: string | null
          created_at?: string | null
          created_by?: string | null
          file_url?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_request_id?: string | null
          protocol_id?: string | null
          receipt_date?: string
          receipt_number?: string | null
          updated_at?: string | null
          validated?: boolean | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_receipts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_receipts_payment_request_id_fkey"
            columns: ["payment_request_id"]
            isOneToOne: false
            referencedRelation: "payment_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_receipts_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "closing_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_receipts_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_requests: {
        Row: {
          bank_batch_id: string | null
          cc_emails: string[] | null
          created_at: string | null
          created_by: string | null
          id: string
          last_reminder_at: string | null
          message: string
          paid_at: string | null
          pdf_url: string | null
          protocol_ids: string[]
          recipient_email: string
          reminder_count: number | null
          request_type: string | null
          sent_at: string | null
          status: string
          subject: string
          total_amount: number
          updated_at: string | null
          viewed_at: string | null
        }
        Insert: {
          bank_batch_id?: string | null
          cc_emails?: string[] | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_reminder_at?: string | null
          message: string
          paid_at?: string | null
          pdf_url?: string | null
          protocol_ids: string[]
          recipient_email: string
          reminder_count?: number | null
          request_type?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          total_amount: number
          updated_at?: string | null
          viewed_at?: string | null
        }
        Update: {
          bank_batch_id?: string | null
          cc_emails?: string[] | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_reminder_at?: string | null
          message?: string
          paid_at?: string | null
          pdf_url?: string | null
          protocol_ids?: string[]
          recipient_email?: string
          reminder_count?: number | null
          request_type?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          total_amount?: number
          updated_at?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_bank_batch_id_fkey"
            columns: ["bank_batch_id"]
            isOneToOne: false
            referencedRelation: "bank_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_created_by_fkey"
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
          approval_status: Database["public"]["Enums"]["approval_status"] | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          daily_rate: number | null
          email: string
          failed_access_attempts: number | null
          full_name: string
          hourly_rate: number | null
          id: string
          last_failed_access: string | null
          mfa_backup_codes_generated_at: string | null
          mfa_enabled: boolean | null
          mfa_enrollment_date: string | null
          mfa_verified: boolean | null
          operation_account_id: string | null
          phone_number: string | null
          phone_verified: boolean | null
          phone_verified_at: string | null
          rejection_reason: string | null
          role: Database["public"]["Enums"]["user_role"]
          trusted_devices: Json | null
          updated_at: string | null
        }
        Insert: {
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          daily_rate?: number | null
          email: string
          failed_access_attempts?: number | null
          full_name: string
          hourly_rate?: number | null
          id: string
          last_failed_access?: string | null
          mfa_backup_codes_generated_at?: string | null
          mfa_enabled?: boolean | null
          mfa_enrollment_date?: string | null
          mfa_verified?: boolean | null
          operation_account_id?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          phone_verified_at?: string | null
          rejection_reason?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          trusted_devices?: Json | null
          updated_at?: string | null
        }
        Update: {
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          daily_rate?: number | null
          email?: string
          failed_access_attempts?: number | null
          full_name?: string
          hourly_rate?: number | null
          id?: string
          last_failed_access?: string | null
          mfa_backup_codes_generated_at?: string | null
          mfa_enabled?: boolean | null
          mfa_enrollment_date?: string | null
          mfa_verified?: boolean | null
          operation_account_id?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          phone_verified_at?: string | null
          rejection_reason?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          trusted_devices?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number | null
          client_id: string | null
          client_name: string | null
          code: string | null
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          name: string
          org_id: string | null
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          budget?: number | null
          client_id?: string | null
          client_name?: string | null
          code?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          org_id?: string | null
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          budget?: number | null
          client_id?: string | null
          client_name?: string | null
          code?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          org_id?: string | null
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      protocol_history: {
        Row: {
          action: string
          created_at: string | null
          id: string
          metadata: Json | null
          new_status: string | null
          old_status: string | null
          protocol_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_status?: string | null
          old_status?: string | null
          protocol_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_status?: string | null
          old_status?: string | null
          protocol_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_history_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "closing_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_steps: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          id: string
          notes: string | null
          protocol_id: string | null
          started_at: string | null
          status: string | null
          step_name: string
          step_order: number
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          protocol_id?: string | null
          started_at?: string | null
          status?: string | null
          step_name: string
          step_order: number
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          protocol_id?: string | null
          started_at?: string | null
          status?: string | null
          step_name?: string
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "protocol_steps_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "closing_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_requests: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["approval_status"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      sms_verification_logs: {
        Row: {
          attempts: number | null
          created_at: string | null
          id: string
          phone_number: string
          status: string
          user_id: string | null
          verification_type: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          id?: string
          phone_number: string
          status: string
          user_id?: string | null
          verification_type: string
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          id?: string
          phone_number?: string
          status?: string
          user_id?: string | null
          verification_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_verification_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          bank_info: Json | null
          cnpj: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          org_id: string | null
          phone: string | null
          pix_key: string | null
          tipo_fornecedor: string | null
          updated_at: string | null
        }
        Insert: {
          bank_info?: Json | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          org_id?: string | null
          phone?: string | null
          pix_key?: string | null
          tipo_fornecedor?: string | null
          updated_at?: string | null
        }
        Update: {
          bank_info?: Json | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          org_id?: string | null
          phone?: string | null
          pix_key?: string | null
          tipo_fornecedor?: string | null
          updated_at?: string | null
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
      company_costs_v: {
        Row: {
          amount: number | null
          category: string | null
          created_at: string | null
          created_by: string | null
          date: string | null
          description: string | null
          files: string[] | null
          id: string | null
          observations: string | null
          sub_category: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string | null
          description?: string | null
          files?: string[] | null
          id?: string | null
          observations?: string | null
          sub_category?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string | null
          description?: string | null
          files?: string[] | null
          id?: string | null
          observations?: string | null
          sub_category?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
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
      service_provider_costs_masked_v: {
        Row: {
          amount: number | null
          cnpj: string | null
          competence: string | null
          cpf: string | null
          created_at: string | null
          created_by: string | null
          days_worked: number | null
          email: string | null
          files: string[] | null
          id: string | null
          invoice_number: string | null
          last_sensitive_access: string | null
          name: string | null
          phone: string | null
          pix_key: string | null
          sensitive_access_count: number | null
          status: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          cnpj?: never
          competence?: string | null
          cpf?: never
          created_at?: string | null
          created_by?: string | null
          days_worked?: number | null
          email?: string | null
          files?: string[] | null
          id?: string | null
          invoice_number?: string | null
          last_sensitive_access?: string | null
          name?: string | null
          phone?: string | null
          pix_key?: never
          sensitive_access_count?: number | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          cnpj?: never
          competence?: string | null
          cpf?: never
          created_at?: string | null
          created_by?: string | null
          days_worked?: number | null
          email?: string | null
          files?: string[] | null
          id?: string | null
          invoice_number?: string | null
          last_sensitive_access?: string | null
          name?: string | null
          phone?: string | null
          pix_key?: never
          sensitive_access_count?: number | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      approve_user: {
        Args: { p_notes?: string; p_user_id: string }
        Returns: undefined
      }
      check_sensitive_data_rate_limit: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      cleanup_expired_reset_tokens: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_backups: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_mfa_backup_codes: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      generate_sms_code: {
        Args: Record<PropertyKey, never>
        Returns: string
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
      get_user_approval_status: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["approval_status"]
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      log_mfa_event: {
        Args: { p_event_type: string; p_metadata?: Json }
        Returns: undefined
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
      reject_user: {
        Args: { p_notes?: string; p_reason: string; p_user_id: string }
        Returns: undefined
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
      verify_mfa_backup_code: {
        Args: { p_code: string }
        Returns: boolean
      }
    }
    Enums: {
      approval_status: "pending" | "approved" | "rejected"
      balance_sheet_type:
        | "current_asset"
        | "non_current_asset"
        | "current_liability"
        | "non_current_liability"
        | "equity"
      batch_status: "draft" | "sent" | "processing" | "completed" | "failed"
      cash_flow_method: "direct" | "indirect"
      dfc_activity_type: "OPERATING" | "INVESTING" | "FINANCING"
      document_status:
        | "pending"
        | "in_progress"
        | "review"
        | "completed"
        | "delivered"
      dre_section_type:
        | "REVENUE"
        | "DEDUCTIONS"
        | "COGS"
        | "VAR_EXP"
        | "FIXED_EXP"
        | "DEPREC_AMORT"
        | "FIN_RESULT"
        | "INCOME_TAX"
      expense_classification: "fixo" | "variavel"
      expense_closing_status: "draft" | "under_review" | "approved" | "closed"
      expense_nature: "capex" | "opex"
      expense_status: "previsto" | "lancado" | "pago" | "conciliado"
      expense_type:
        | "empresa"
        | "prestador_servico"
        | "custo_venda"
        | "investimento"
      financial_entry_type: "revenue" | "expense" | "tax" | "deduction"
      payment_status_enum: "pending" | "sent" | "paid" | "failed"
      protocol_type: "receita" | "despesa_fixa" | "despesa_variavel" | "folha"
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
      approval_status: ["pending", "approved", "rejected"],
      balance_sheet_type: [
        "current_asset",
        "non_current_asset",
        "current_liability",
        "non_current_liability",
        "equity",
      ],
      batch_status: ["draft", "sent", "processing", "completed", "failed"],
      cash_flow_method: ["direct", "indirect"],
      dfc_activity_type: ["OPERATING", "INVESTING", "FINANCING"],
      document_status: [
        "pending",
        "in_progress",
        "review",
        "completed",
        "delivered",
      ],
      dre_section_type: [
        "REVENUE",
        "DEDUCTIONS",
        "COGS",
        "VAR_EXP",
        "FIXED_EXP",
        "DEPREC_AMORT",
        "FIN_RESULT",
        "INCOME_TAX",
      ],
      expense_classification: ["fixo", "variavel"],
      expense_closing_status: ["draft", "under_review", "approved", "closed"],
      expense_nature: ["capex", "opex"],
      expense_status: ["previsto", "lancado", "pago", "conciliado"],
      expense_type: [
        "empresa",
        "prestador_servico",
        "custo_venda",
        "investimento",
      ],
      financial_entry_type: ["revenue", "expense", "tax", "deduction"],
      payment_status_enum: ["pending", "sent", "paid", "failed"],
      protocol_type: ["receita", "despesa_fixa", "despesa_variavel", "folha"],
      scenario_type: ["pessimistic", "realistic", "optimistic"],
      user_role: ["master", "admin", "operation", "owner"],
    },
  },
} as const
