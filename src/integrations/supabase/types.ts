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
      account_lockouts: {
        Row: {
          failed_attempts: number
          id: string
          identifier: string
          locked_at: string | null
          locked_until: string | null
          lockout_type: string
          metadata: Json | null
          reason: string
          unlocked_at: string | null
          unlocked_by: string | null
          user_id: string | null
        }
        Insert: {
          failed_attempts: number
          id?: string
          identifier: string
          locked_at?: string | null
          locked_until?: string | null
          lockout_type: string
          metadata?: Json | null
          reason: string
          unlocked_at?: string | null
          unlocked_by?: string | null
          user_id?: string | null
        }
        Update: {
          failed_attempts?: number
          id?: string
          identifier?: string
          locked_at?: string | null
          locked_until?: string | null
          lockout_type?: string
          metadata?: Json | null
          reason?: string
          unlocked_at?: string | null
          unlocked_by?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      active_sessions: {
        Row: {
          created_at: string | null
          device_fingerprint: string | null
          expires_at: string
          id: string
          ip_address: unknown | null
          last_activity: string | null
          refresh_token_hash: string | null
          revoke_reason: string | null
          revoked_at: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_fingerprint?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown | null
          last_activity?: string | null
          refresh_token_hash?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_fingerprint?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          last_activity?: string | null
          refresh_token_hash?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
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
      chat_channel_members: {
        Row: {
          channel_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          notifications_enabled: boolean | null
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          notifications_enabled?: boolean | null
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          notifications_enabled?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channel_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          archived: boolean | null
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          archived?: boolean | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          type?: string
          updated_at?: string
        }
        Update: {
          archived?: boolean | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachments: Json | null
          channel_id: string
          content: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          reply_to: string | null
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          channel_id: string
          content: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          reply_to?: string | null
          user_id: string
        }
        Update: {
          attachments?: Json | null
          channel_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          reply_to?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_presence: {
        Row: {
          channel_id: string | null
          id: string
          is_typing: boolean | null
          last_seen: string
          status: string
          typing_channel_id: string | null
          user_id: string
        }
        Insert: {
          channel_id?: string | null
          id?: string
          is_typing?: boolean | null
          last_seen?: string
          status?: string
          typing_channel_id?: string | null
          user_id: string
        }
        Update: {
          channel_id?: string | null
          id?: string
          is_typing?: boolean | null
          last_seen?: string
          status?: string
          typing_channel_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_presence_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_presence_typing_channel_id_fkey"
            columns: ["typing_channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_presence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      closing_protocols: {
        Row: {
          approval_notes: string | null
          approved_at: string | null
          approved_by: string | null
          attachment_url: string | null
          avg_value_per_document: number
          bank_batch_id: string | null
          competence_month: string
          created_at: string | null
          created_by: string | null
          document_data: Json
          generated_pdf_url: string | null
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
          attachment_url?: string | null
          avg_value_per_document: number
          bank_batch_id?: string | null
          competence_month: string
          created_at?: string | null
          created_by?: string | null
          document_data: Json
          generated_pdf_url?: string | null
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
          attachment_url?: string | null
          avg_value_per_document?: number
          bank_batch_id?: string | null
          competence_month?: string
          created_at?: string | null
          created_by?: string | null
          document_data?: Json
          generated_pdf_url?: string | null
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
      consolidated_protocols: {
        Row: {
          approval_notes: string | null
          approved_at: string | null
          approved_by: string | null
          competence_month: string
          created_at: string
          created_by: string | null
          expense_count: number
          id: string
          metadata: Json | null
          paid_at: string | null
          payment_batch_id: string | null
          payment_reference: string | null
          protocol_number: string
          provider_count: number
          service_provider_protocol_ids: string[]
          status: string
          summary_data: Json | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          competence_month: string
          created_at?: string
          created_by?: string | null
          expense_count?: number
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_batch_id?: string | null
          payment_reference?: string | null
          protocol_number: string
          provider_count?: number
          service_provider_protocol_ids?: string[]
          status?: string
          summary_data?: Json | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          competence_month?: string
          created_at?: string
          created_by?: string | null
          expense_count?: number
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_batch_id?: string | null
          payment_reference?: string | null
          protocol_number?: string
          provider_count?: number
          service_provider_protocol_ids?: string[]
          status?: string
          summary_data?: Json | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      contas_a_pagar: {
        Row: {
          anexos: string[] | null
          created_at: string
          created_by: string | null
          id: string
          meio_pagamento_agencia: string | null
          meio_pagamento_digital: string | null
          nota_fiscal_url: string | null
          observacoes: string | null
          pago_em: string | null
          pedido_ids: string[] | null
          prestador_cnpj: string | null
          prestador_cpf: string | null
          prestador_funcao: string | null
          prestador_id: string | null
          prestador_nome: string
          protocolo: string | null
          status: Database["public"]["Enums"]["conta_pagar_status"]
          updated_at: string
          valor_total: number
        }
        Insert: {
          anexos?: string[] | null
          created_at?: string
          created_by?: string | null
          id?: string
          meio_pagamento_agencia?: string | null
          meio_pagamento_digital?: string | null
          nota_fiscal_url?: string | null
          observacoes?: string | null
          pago_em?: string | null
          pedido_ids?: string[] | null
          prestador_cnpj?: string | null
          prestador_cpf?: string | null
          prestador_funcao?: string | null
          prestador_id?: string | null
          prestador_nome: string
          protocolo?: string | null
          status?: Database["public"]["Enums"]["conta_pagar_status"]
          updated_at?: string
          valor_total?: number
        }
        Update: {
          anexos?: string[] | null
          created_at?: string
          created_by?: string | null
          id?: string
          meio_pagamento_agencia?: string | null
          meio_pagamento_digital?: string | null
          nota_fiscal_url?: string | null
          observacoes?: string | null
          pago_em?: string | null
          pedido_ids?: string[] | null
          prestador_cnpj?: string | null
          prestador_cpf?: string | null
          prestador_funcao?: string | null
          prestador_id?: string | null
          prestador_nome?: string
          protocolo?: string | null
          status?: Database["public"]["Enums"]["conta_pagar_status"]
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "contas_a_pagar_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_a_pagar_prestador_id_fkey"
            columns: ["prestador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_a_receber: {
        Row: {
          cliente_id: string | null
          cliente_nome: string
          cnpj: string
          created_at: string
          created_by: string | null
          id: string
          media_por_documento: number | null
          pix: string | null
          prestacoes: Json | null
          produto_1_vendido: number | null
          total_ids: number | null
          total_paginas: number | null
          updated_at: string
          valor_por_produto: Json | null
          valor_total: number
        }
        Insert: {
          cliente_id?: string | null
          cliente_nome: string
          cnpj: string
          created_at?: string
          created_by?: string | null
          id?: string
          media_por_documento?: number | null
          pix?: string | null
          prestacoes?: Json | null
          produto_1_vendido?: number | null
          total_ids?: number | null
          total_paginas?: number | null
          updated_at?: string
          valor_por_produto?: Json | null
          valor_total?: number
        }
        Update: {
          cliente_id?: string | null
          cliente_nome?: string
          cnpj?: string
          created_at?: string
          created_by?: string | null
          id?: string
          media_por_documento?: number | null
          pix?: string | null
          prestacoes?: Json | null
          produto_1_vendido?: number | null
          total_ids?: number | null
          total_paginas?: number | null
          updated_at?: string
          valor_por_produto?: Json | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "contas_a_receber_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_a_receber_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      customer_pendency_requests: {
        Row: {
          attachments: Json | null
          converted_at: string | null
          converted_by: string | null
          converted_to_pendency_id: string | null
          created_at: string | null
          created_by: string
          customer_name: string
          description: string
          id: string
          internal_notes: string | null
          order_id: string
          priority: string | null
          rejection_reason: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          converted_at?: string | null
          converted_by?: string | null
          converted_to_pendency_id?: string | null
          created_at?: string | null
          created_by: string
          customer_name: string
          description: string
          id?: string
          internal_notes?: string | null
          order_id: string
          priority?: string | null
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          converted_at?: string | null
          converted_by?: string | null
          converted_to_pendency_id?: string | null
          created_at?: string | null
          created_by?: string
          customer_name?: string
          description?: string
          id?: string
          internal_notes?: string | null
          order_id?: string
          priority?: string | null
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_pendency_requests_converted_to_pendency_id_fkey"
            columns: ["converted_to_pendency_id"]
            isOneToOne: false
            referencedRelation: "pendencies"
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
          paid_at: string | null
          paid_by: string | null
          payment_amount: number | null
          payment_receipt_url: string | null
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
          paid_at?: string | null
          paid_by?: string | null
          payment_amount?: number | null
          payment_receipt_url?: string | null
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
          paid_at?: string | null
          paid_by?: string | null
          payment_amount?: number | null
          payment_receipt_url?: string | null
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
          cnpj: string | null
          competence: string | null
          conta_contabil_id: string
          cpf: string | null
          created_at: string | null
          created_by: string | null
          currency: string
          data_competencia: string
          data_emissao: string | null
          data_pagamento: string | null
          data_vencimento: string | null
          days_worked: number | null
          description: string
          document_ref: string | null
          email: string | null
          exchange_rate: number
          files: string[] | null
          fixo_variavel:
            | Database["public"]["Enums"]["expense_classification"]
            | null
          fornecedor_id: string | null
          id: string
          invoice_number: string | null
          notes: string | null
          observations: string | null
          org_id: string | null
          payment_method: string | null
          phone: string | null
          pix_key: string | null
          projeto_cliente_id: string | null
          service_provider_protocol_id: string | null
          status: Database["public"]["Enums"]["expense_status"]
          sub_category: string | null
          tipo_despesa: string | null
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
          cnpj?: string | null
          competence?: string | null
          conta_contabil_id: string
          cpf?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          data_competencia: string
          data_emissao?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          days_worked?: number | null
          description: string
          document_ref?: string | null
          email?: string | null
          exchange_rate?: number
          files?: string[] | null
          fixo_variavel?:
            | Database["public"]["Enums"]["expense_classification"]
            | null
          fornecedor_id?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          observations?: string | null
          org_id?: string | null
          payment_method?: string | null
          phone?: string | null
          pix_key?: string | null
          projeto_cliente_id?: string | null
          service_provider_protocol_id?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          sub_category?: string | null
          tipo_despesa?: string | null
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
          cnpj?: string | null
          competence?: string | null
          conta_contabil_id?: string
          cpf?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          data_competencia?: string
          data_emissao?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          days_worked?: number | null
          description?: string
          document_ref?: string | null
          email?: string | null
          exchange_rate?: number
          files?: string[] | null
          fixo_variavel?:
            | Database["public"]["Enums"]["expense_classification"]
            | null
          fornecedor_id?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          observations?: string | null
          org_id?: string | null
          payment_method?: string | null
          phone?: string | null
          pix_key?: string | null
          projeto_cliente_id?: string | null
          service_provider_protocol_id?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          sub_category?: string | null
          tipo_despesa?: string | null
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
          {
            foreignKeyName: "expenses_service_provider_protocol_id_fkey"
            columns: ["service_provider_protocol_id"]
            isOneToOne: false
            referencedRelation: "service_provider_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      facebook_accounts: {
        Row: {
          account_id: string
          account_name: string
          created_at: string | null
          currency: string | null
          id: string
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          account_name: string
          created_at?: string | null
          currency?: string | null
          id?: string
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          account_name?: string
          created_at?: string | null
          currency?: string | null
          id?: string
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      facebook_ad_sets: {
        Row: {
          adset_id: string
          adset_name: string
          bid_amount: number | null
          campaign_id: string | null
          created_at: string | null
          daily_budget: number | null
          id: string
          lifetime_budget: number | null
          status: string
          targeting: Json | null
          updated_at: string | null
        }
        Insert: {
          adset_id: string
          adset_name: string
          bid_amount?: number | null
          campaign_id?: string | null
          created_at?: string | null
          daily_budget?: number | null
          id?: string
          lifetime_budget?: number | null
          status: string
          targeting?: Json | null
          updated_at?: string | null
        }
        Update: {
          adset_id?: string
          adset_name?: string
          bid_amount?: number | null
          campaign_id?: string | null
          created_at?: string | null
          daily_budget?: number | null
          id?: string
          lifetime_budget?: number | null
          status?: string
          targeting?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facebook_ad_sets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "facebook_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      facebook_ads: {
        Row: {
          ad_id: string
          ad_name: string
          adset_id: string | null
          created_at: string | null
          creative: Json | null
          id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          ad_id: string
          ad_name: string
          adset_id?: string | null
          created_at?: string | null
          creative?: Json | null
          id?: string
          status: string
          updated_at?: string | null
        }
        Update: {
          ad_id?: string
          ad_name?: string
          adset_id?: string | null
          created_at?: string | null
          creative?: Json | null
          id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facebook_ads_adset_id_fkey"
            columns: ["adset_id"]
            isOneToOne: false
            referencedRelation: "facebook_ad_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      facebook_campaigns: {
        Row: {
          account_id: string | null
          budget_spent: number | null
          budget_total: number | null
          campaign_id: string
          campaign_name: string
          created_at: string | null
          created_time: string | null
          id: string
          objective: string | null
          start_time: string | null
          status: string
          stop_time: string | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          budget_spent?: number | null
          budget_total?: number | null
          campaign_id: string
          campaign_name: string
          created_at?: string | null
          created_time?: string | null
          id?: string
          objective?: string | null
          start_time?: string | null
          status: string
          stop_time?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          budget_spent?: number | null
          budget_total?: number | null
          campaign_id?: string
          campaign_name?: string
          created_at?: string | null
          created_time?: string | null
          id?: string
          objective?: string | null
          start_time?: string | null
          status?: string
          stop_time?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facebook_campaigns_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "facebook_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      facebook_metrics: {
        Row: {
          account_id: string | null
          ad_id: string | null
          adset_id: string | null
          campaign_id: string | null
          clicks: number | null
          conversion_value: number | null
          conversions: number | null
          cost_per_conversion: number | null
          cpc: number | null
          cpm: number | null
          created_at: string | null
          ctr: number | null
          date: string
          engagement: number | null
          frequency: number | null
          id: string
          impressions: number | null
          reach: number | null
          roas: number | null
          spend: number | null
          updated_at: string | null
          video_views: number | null
        }
        Insert: {
          account_id?: string | null
          ad_id?: string | null
          adset_id?: string | null
          campaign_id?: string | null
          clicks?: number | null
          conversion_value?: number | null
          conversions?: number | null
          cost_per_conversion?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          date: string
          engagement?: number | null
          frequency?: number | null
          id?: string
          impressions?: number | null
          reach?: number | null
          roas?: number | null
          spend?: number | null
          updated_at?: string | null
          video_views?: number | null
        }
        Update: {
          account_id?: string | null
          ad_id?: string | null
          adset_id?: string | null
          campaign_id?: string | null
          clicks?: number | null
          conversion_value?: number | null
          conversions?: number | null
          cost_per_conversion?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          date?: string
          engagement?: number | null
          frequency?: number | null
          id?: string
          impressions?: number | null
          reach?: number | null
          roas?: number | null
          spend?: number | null
          updated_at?: string | null
          video_views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "facebook_metrics_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "facebook_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facebook_metrics_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "facebook_ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facebook_metrics_adset_id_fkey"
            columns: ["adset_id"]
            isOneToOne: false
            referencedRelation: "facebook_ad_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facebook_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "facebook_campaigns"
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
      idempotency_keys: {
        Row: {
          completed_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          key: string
          operation_type: string
          request_hash: string
          response_data: Json | null
          status: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          key: string
          operation_type: string
          request_hash: string
          response_data?: Json | null
          status?: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          key?: string
          operation_type?: string
          request_hash?: string
          response_data?: Json | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      lead_conversions: {
        Row: {
          attribution_campaign: string | null
          attribution_medium: string | null
          attribution_source: string | null
          conversion_page: string | null
          conversion_type: string
          conversion_value: number | null
          created_at: string
          id: string
          lead_id: string
          session_id: string
        }
        Insert: {
          attribution_campaign?: string | null
          attribution_medium?: string | null
          attribution_source?: string | null
          conversion_page?: string | null
          conversion_type: string
          conversion_value?: number | null
          created_at?: string
          id?: string
          lead_id: string
          session_id: string
        }
        Update: {
          attribution_campaign?: string | null
          attribution_medium?: string | null
          attribution_source?: string | null
          conversion_page?: string | null
          conversion_type?: string
          conversion_value?: number | null
          created_at?: string
          id?: string
          lead_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_conversions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_events: {
        Row: {
          created_at: string
          element_class: string | null
          element_id: string | null
          element_text: string | null
          event_action: string | null
          event_category: string | null
          event_label: string | null
          event_type: string
          event_value: number | null
          id: string
          lead_id: string | null
          metadata: Json | null
          page_url: string | null
          scroll_depth: number | null
          session_id: string
          time_on_page: number | null
        }
        Insert: {
          created_at?: string
          element_class?: string | null
          element_id?: string | null
          element_text?: string | null
          event_action?: string | null
          event_category?: string | null
          event_label?: string | null
          event_type: string
          event_value?: number | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          page_url?: string | null
          scroll_depth?: number | null
          session_id: string
          time_on_page?: number | null
        }
        Update: {
          created_at?: string
          element_class?: string | null
          element_id?: string | null
          element_text?: string | null
          event_action?: string | null
          event_category?: string | null
          event_label?: string | null
          event_type?: string
          event_value?: number | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          page_url?: string | null
          scroll_depth?: number | null
          session_id?: string
          time_on_page?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_page_views: {
        Row: {
          bounce: boolean | null
          created_at: string
          exit_intent: boolean | null
          id: string
          lead_id: string | null
          page_path: string | null
          page_title: string | null
          page_url: string
          scroll_depth_percentage: number | null
          session_id: string
          time_spent_seconds: number | null
        }
        Insert: {
          bounce?: boolean | null
          created_at?: string
          exit_intent?: boolean | null
          id?: string
          lead_id?: string | null
          page_path?: string | null
          page_title?: string | null
          page_url: string
          scroll_depth_percentage?: number | null
          session_id: string
          time_spent_seconds?: number | null
        }
        Update: {
          bounce?: boolean | null
          created_at?: string
          exit_intent?: boolean | null
          id?: string
          lead_id?: string | null
          page_path?: string | null
          page_title?: string | null
          page_url?: string
          scroll_depth_percentage?: number | null
          session_id?: string
          time_spent_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_page_views_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_pricing_analysis: {
        Row: {
          created_at: string | null
          daily_volume: number
          id: string
          lead_info: Json | null
          potential_savings: number | null
          potential_savings_percent: number | null
          selected_plan: string
          traditional_cost_per_document: number
        }
        Insert: {
          created_at?: string | null
          daily_volume: number
          id?: string
          lead_info?: Json | null
          potential_savings?: number | null
          potential_savings_percent?: number | null
          selected_plan: string
          traditional_cost_per_document: number
        }
        Update: {
          created_at?: string | null
          daily_volume?: number
          id?: string
          lead_info?: Json | null
          potential_savings?: number | null
          potential_savings_percent?: number | null
          selected_plan?: string
          traditional_cost_per_document?: number
        }
        Relationships: []
      }
      lead_sessions: {
        Row: {
          browser: string | null
          created_at: string
          device_type: string | null
          duration_seconds: number | null
          ended_at: string | null
          entry_page: string | null
          entry_utm_campaign: string | null
          entry_utm_content: string | null
          entry_utm_medium: string | null
          entry_utm_source: string | null
          entry_utm_term: string | null
          events_count: number | null
          id: string
          ip_address: unknown | null
          language: string | null
          lead_id: string | null
          lead_score: number | null
          os: string | null
          page_views_count: number | null
          referrer: string | null
          screen_resolution: string | null
          session_id: string
          started_at: string
          timezone: string | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device_type?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          entry_page?: string | null
          entry_utm_campaign?: string | null
          entry_utm_content?: string | null
          entry_utm_medium?: string | null
          entry_utm_source?: string | null
          entry_utm_term?: string | null
          events_count?: number | null
          id?: string
          ip_address?: unknown | null
          language?: string | null
          lead_id?: string | null
          lead_score?: number | null
          os?: string | null
          page_views_count?: number | null
          referrer?: string | null
          screen_resolution?: string | null
          session_id: string
          started_at?: string
          timezone?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          browser?: string | null
          created_at?: string
          device_type?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          entry_page?: string | null
          entry_utm_campaign?: string | null
          entry_utm_content?: string | null
          entry_utm_medium?: string | null
          entry_utm_source?: string | null
          entry_utm_term?: string | null
          events_count?: number | null
          id?: string
          ip_address?: unknown | null
          language?: string | null
          lead_id?: string | null
          lead_score?: number | null
          os?: string | null
          page_views_count?: number | null
          referrer?: string | null
          screen_resolution?: string | null
          session_id?: string
          started_at?: string
          timezone?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          attribution_campaign: string | null
          attribution_medium: string | null
          attribution_source: string | null
          company: string | null
          created_at: string
          device_fingerprint: string | null
          email: string
          first_seen_at: string | null
          id: string
          interest_level: number | null
          last_seen_at: string | null
          lead_score: number | null
          meeting_time: string | null
          message: string | null
          metadata: Json | null
          monthly_revenue: string | null
          name: string
          phone: string | null
          probability: number | null
          source: string | null
          stage: string | null
          total_page_views: number | null
          total_sessions: number | null
          total_time_spent_seconds: number | null
          updated_at: string
        }
        Insert: {
          attribution_campaign?: string | null
          attribution_medium?: string | null
          attribution_source?: string | null
          company?: string | null
          created_at?: string
          device_fingerprint?: string | null
          email: string
          first_seen_at?: string | null
          id?: string
          interest_level?: number | null
          last_seen_at?: string | null
          lead_score?: number | null
          meeting_time?: string | null
          message?: string | null
          metadata?: Json | null
          monthly_revenue?: string | null
          name: string
          phone?: string | null
          probability?: number | null
          source?: string | null
          stage?: string | null
          total_page_views?: number | null
          total_sessions?: number | null
          total_time_spent_seconds?: number | null
          updated_at?: string
        }
        Update: {
          attribution_campaign?: string | null
          attribution_medium?: string | null
          attribution_source?: string | null
          company?: string | null
          created_at?: string
          device_fingerprint?: string | null
          email?: string
          first_seen_at?: string | null
          id?: string
          interest_level?: number | null
          last_seen_at?: string | null
          lead_score?: number | null
          meeting_time?: string | null
          message?: string | null
          metadata?: Json | null
          monthly_revenue?: string | null
          name?: string
          phone?: string | null
          probability?: number | null
          source?: string | null
          stage?: string | null
          total_page_views?: number | null
          total_sessions?: number | null
          total_time_spent_seconds?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempt_type: string
          created_at: string | null
          failure_reason: string | null
          id: string
          identifier: string
          ip_address: unknown | null
          metadata: Json | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          attempt_type: string
          created_at?: string | null
          failure_reason?: string | null
          id?: string
          identifier: string
          ip_address?: unknown | null
          metadata?: Json | null
          success: boolean
          user_agent?: string | null
        }
        Update: {
          attempt_type?: string
          created_at?: string | null
          failure_reason?: string | null
          id?: string
          identifier?: string
          ip_address?: unknown | null
          metadata?: Json | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      login_notifications: {
        Row: {
          acknowledged_at: string | null
          id: string
          login_attempt_id: string | null
          metadata: Json | null
          notification_type: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          id?: string
          login_attempt_id?: string | null
          metadata?: Json | null
          notification_type: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          id?: string
          login_attempt_id?: string | null
          metadata?: Json | null
          notification_type?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "login_notifications_login_attempt_id_fkey"
            columns: ["login_attempt_id"]
            isOneToOne: false
            referencedRelation: "login_attempts"
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
          customer: string | null
          deadline: string
          delivered_at: string | null
          document_count: number
          has_attention: boolean | null
          has_delay: boolean | null
          id: string
          is_urgent: boolean | null
          order_number: string
          service_order_link: string | null
          service_provider_protocol_id: string | null
          service_type: string | null
          status_order: string
          tags: string[] | null
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
          customer?: string | null
          deadline: string
          delivered_at?: string | null
          document_count: number
          has_attention?: boolean | null
          has_delay?: boolean | null
          id?: string
          is_urgent?: boolean | null
          order_number: string
          service_order_link?: string | null
          service_provider_protocol_id?: string | null
          service_type?: string | null
          status_order?: string
          tags?: string[] | null
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
          customer?: string | null
          deadline?: string
          delivered_at?: string | null
          document_count?: number
          has_attention?: boolean | null
          has_delay?: boolean | null
          id?: string
          is_urgent?: boolean | null
          order_number?: string
          service_order_link?: string | null
          service_provider_protocol_id?: string | null
          service_type?: string | null
          status_order?: string
          tags?: string[] | null
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
          {
            foreignKeyName: "orders_service_provider_protocol_id_fkey"
            columns: ["service_provider_protocol_id"]
            isOneToOne: false
            referencedRelation: "service_provider_protocols"
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
      payment_message_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_default: boolean | null
          message: string
          name: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_default?: boolean | null
          message: string
          name: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_default?: boolean | null
          message?: string
          name?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: []
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
      payment_recipient_emails: {
        Row: {
          company: string | null
          created_at: string | null
          created_by: string | null
          email: string
          id: string
          is_active: boolean | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
          customer: string
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
          customer?: string
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
          customer?: string
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
      privacy_policy_acceptances: {
        Row: {
          accepted_at: string | null
          id: string
          ip_address: unknown | null
          policy_version: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          id?: string
          ip_address?: unknown | null
          policy_version?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          id?: string
          ip_address?: unknown | null
          policy_version?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
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
          avatar_animation_preference: Json | null
          avatar_color: string | null
          avatar_style: string | null
          avatar_url: string | null
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
          avatar_animation_preference?: Json | null
          avatar_color?: string | null
          avatar_style?: string | null
          avatar_url?: string | null
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
          avatar_animation_preference?: Json | null
          avatar_color?: string | null
          avatar_style?: string | null
          avatar_url?: string | null
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
      protocol_workflow_steps: {
        Row: {
          assigned_to: string | null
          assigned_to_email: string | null
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          metadata: Json | null
          notes: string | null
          protocol_id: string
          protocol_type: string
          started_at: string | null
          status: string
          step_name: string
          step_order: number
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_email?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          protocol_id: string
          protocol_type: string
          started_at?: string | null
          status?: string
          step_name: string
          step_order: number
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          assigned_to_email?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          protocol_id?: string
          protocol_type?: string
          started_at?: string | null
          status?: string
          step_name?: string
          step_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocol_workflow_steps_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_workflow_steps_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "service_provider_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_entries: {
        Row: {
          blocked_until: string | null
          created_at: string | null
          endpoint: string
          id: string
          identifier: string
          request_count: number
          updated_at: string | null
          window_end: string
          window_start: string
        }
        Insert: {
          blocked_until?: string | null
          created_at?: string | null
          endpoint: string
          id?: string
          identifier: string
          request_count?: number
          updated_at?: string | null
          window_end: string
          window_start?: string
        }
        Update: {
          blocked_until?: string | null
          created_at?: string | null
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number
          updated_at?: string | null
          window_end?: string
          window_start?: string
        }
        Relationships: []
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
      reviewer_protocols: {
        Row: {
          account_type: string | null
          assigned_operation_user_id: string | null
          bank_account: string | null
          bank_agency: string | null
          bank_name: string | null
          cancelled_reason: string | null
          centro_custo_id: string | null
          cnpj: string | null
          competence_month: string
          cpf: string | null
          created_at: string
          created_by: string | null
          document_count: number
          id: string
          invoice_amount: number | null
          invoice_url: string | null
          master_final_approved_at: string | null
          master_final_approved_by: string | null
          master_final_notes: string | null
          master_initial_approved_at: string | null
          master_initial_approved_by: string | null
          master_initial_notes: string | null
          metadata: Json | null
          operation_data_filled_at: string | null
          order_count: number
          orders_data: Json
          owner_approval_notes: string | null
          owner_approved_at: string | null
          owner_approved_by: string | null
          paid_at: string | null
          payment_metadata: Json | null
          payment_receipt_url: string | null
          payment_reference: string | null
          pix_key: string | null
          protocol_number: string
          reviewer_approval_notes: string | null
          reviewer_approved_at: string | null
          reviewer_approved_by: string | null
          reviewer_email: string
          reviewer_id: string
          reviewer_name: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          account_type?: string | null
          assigned_operation_user_id?: string | null
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          cancelled_reason?: string | null
          centro_custo_id?: string | null
          cnpj?: string | null
          competence_month: string
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          document_count?: number
          id?: string
          invoice_amount?: number | null
          invoice_url?: string | null
          master_final_approved_at?: string | null
          master_final_approved_by?: string | null
          master_final_notes?: string | null
          master_initial_approved_at?: string | null
          master_initial_approved_by?: string | null
          master_initial_notes?: string | null
          metadata?: Json | null
          operation_data_filled_at?: string | null
          order_count?: number
          orders_data?: Json
          owner_approval_notes?: string | null
          owner_approved_at?: string | null
          owner_approved_by?: string | null
          paid_at?: string | null
          payment_metadata?: Json | null
          payment_receipt_url?: string | null
          payment_reference?: string | null
          pix_key?: string | null
          protocol_number: string
          reviewer_approval_notes?: string | null
          reviewer_approved_at?: string | null
          reviewer_approved_by?: string | null
          reviewer_email: string
          reviewer_id: string
          reviewer_name: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          account_type?: string | null
          assigned_operation_user_id?: string | null
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          cancelled_reason?: string | null
          centro_custo_id?: string | null
          cnpj?: string | null
          competence_month?: string
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          document_count?: number
          id?: string
          invoice_amount?: number | null
          invoice_url?: string | null
          master_final_approved_at?: string | null
          master_final_approved_by?: string | null
          master_final_notes?: string | null
          master_initial_approved_at?: string | null
          master_initial_approved_by?: string | null
          master_initial_notes?: string | null
          metadata?: Json | null
          operation_data_filled_at?: string | null
          order_count?: number
          orders_data?: Json
          owner_approval_notes?: string | null
          owner_approved_at?: string | null
          owner_approved_by?: string | null
          paid_at?: string | null
          payment_metadata?: Json | null
          payment_receipt_url?: string | null
          payment_reference?: string | null
          pix_key?: string | null
          protocol_number?: string
          reviewer_approval_notes?: string | null
          reviewer_approved_at?: string | null
          reviewer_approved_by?: string | null
          reviewer_email?: string
          reviewer_id?: string
          reviewer_name?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviewer_protocols_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      secret_rotation_logs: {
        Row: {
          expires_at: string | null
          id: string
          metadata: Json | null
          new_secret_hash: string | null
          next_rotation_due: string | null
          old_secret_hash: string | null
          rotated_at: string | null
          rotated_by: string | null
          rotation_type: string
          secret_name: string
          status: string
        }
        Insert: {
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          new_secret_hash?: string | null
          next_rotation_due?: string | null
          old_secret_hash?: string | null
          rotated_at?: string | null
          rotated_by?: string | null
          rotation_type: string
          secret_name: string
          status?: string
        }
        Update: {
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          new_secret_hash?: string | null
          next_rotation_due?: string | null
          old_secret_hash?: string | null
          rotated_at?: string | null
          rotated_by?: string | null
          rotation_type?: string
          secret_name?: string
          status?: string
        }
        Relationships: []
      }
      security_alert_config: {
        Row: {
          alert_type: string
          created_at: string | null
          enabled: boolean
          id: string
          notify_roles: string[]
          threshold: number
          time_window_minutes: number
          updated_at: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          enabled?: boolean
          id?: string
          notify_roles?: string[]
          threshold?: number
          time_window_minutes?: number
          updated_at?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          enabled?: boolean
          id?: string
          notify_roles?: string[]
          threshold?: number
          time_window_minutes?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      security_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          notified_at: string | null
          severity: string
          title: string
          triggered_by: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          notified_at?: string | null
          severity: string
          title: string
          triggered_by?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          notified_at?: string | null
          severity?: string
          title?: string
          triggered_by?: string | null
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
      service_provider_protocols: {
        Row: {
          cancelled_reason: string | null
          competence_month: string
          created_at: string
          created_by: string | null
          expense_count: number
          expenses_data: Json
          final_approval_notes: string | null
          final_approved_at: string | null
          final_approved_by: string | null
          id: string
          invoice_amount: number | null
          invoice_file_url: string | null
          master_final_approved_at: string | null
          master_final_approved_by: string | null
          master_initial_approved_at: string | null
          master_initial_approved_by: string | null
          metadata: Json | null
          owner_approved_at: string | null
          owner_approved_by: string | null
          paid_at: string | null
          payment_batch_id: string | null
          payment_receipt_url: string | null
          payment_reference: string | null
          protocol_number: string
          provider_agencia: string | null
          provider_approval_ip: unknown | null
          provider_approval_notes: string | null
          provider_approved_at: string | null
          provider_banco: string | null
          provider_cnpj: string | null
          provider_conta: string | null
          provider_cpf: string | null
          provider_email: string
          provider_name: string
          provider_phone: string | null
          provider_pix_key: string | null
          provider_tipo_conta: string | null
          provider_token: string | null
          provider_token_expires_at: string | null
          return_reason: string | null
          returned_to_provider_at: string | null
          status: string
          supplier_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          cancelled_reason?: string | null
          competence_month: string
          created_at?: string
          created_by?: string | null
          expense_count?: number
          expenses_data?: Json
          final_approval_notes?: string | null
          final_approved_at?: string | null
          final_approved_by?: string | null
          id?: string
          invoice_amount?: number | null
          invoice_file_url?: string | null
          master_final_approved_at?: string | null
          master_final_approved_by?: string | null
          master_initial_approved_at?: string | null
          master_initial_approved_by?: string | null
          metadata?: Json | null
          owner_approved_at?: string | null
          owner_approved_by?: string | null
          paid_at?: string | null
          payment_batch_id?: string | null
          payment_receipt_url?: string | null
          payment_reference?: string | null
          protocol_number: string
          provider_agencia?: string | null
          provider_approval_ip?: unknown | null
          provider_approval_notes?: string | null
          provider_approved_at?: string | null
          provider_banco?: string | null
          provider_cnpj?: string | null
          provider_conta?: string | null
          provider_cpf?: string | null
          provider_email: string
          provider_name: string
          provider_phone?: string | null
          provider_pix_key?: string | null
          provider_tipo_conta?: string | null
          provider_token?: string | null
          provider_token_expires_at?: string | null
          return_reason?: string | null
          returned_to_provider_at?: string | null
          status?: string
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          cancelled_reason?: string | null
          competence_month?: string
          created_at?: string
          created_by?: string | null
          expense_count?: number
          expenses_data?: Json
          final_approval_notes?: string | null
          final_approved_at?: string | null
          final_approved_by?: string | null
          id?: string
          invoice_amount?: number | null
          invoice_file_url?: string | null
          master_final_approved_at?: string | null
          master_final_approved_by?: string | null
          master_initial_approved_at?: string | null
          master_initial_approved_by?: string | null
          metadata?: Json | null
          owner_approved_at?: string | null
          owner_approved_by?: string | null
          paid_at?: string | null
          payment_batch_id?: string | null
          payment_receipt_url?: string | null
          payment_reference?: string | null
          protocol_number?: string
          provider_agencia?: string | null
          provider_approval_ip?: unknown | null
          provider_approval_notes?: string | null
          provider_approved_at?: string | null
          provider_banco?: string | null
          provider_cnpj?: string | null
          provider_conta?: string | null
          provider_cpf?: string | null
          provider_email?: string
          provider_name?: string
          provider_phone?: string | null
          provider_pix_key?: string | null
          provider_tipo_conta?: string | null
          provider_token?: string | null
          provider_token_expires_at?: string | null
          return_reason?: string | null
          returned_to_provider_at?: string | null
          status?: string
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_provider_protocols_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          agencia: string | null
          banco: string | null
          bank_info: Json | null
          cnpj: string | null
          conta: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          org_id: string | null
          phone: string | null
          pix_key: string | null
          tipo_conta: string | null
          tipo_fornecedor: string | null
          updated_at: string | null
        }
        Insert: {
          agencia?: string | null
          banco?: string | null
          bank_info?: Json | null
          cnpj?: string | null
          conta?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          org_id?: string | null
          phone?: string | null
          pix_key?: string | null
          tipo_conta?: string | null
          tipo_fornecedor?: string | null
          updated_at?: string | null
        }
        Update: {
          agencia?: string | null
          banco?: string | null
          bank_info?: Json | null
          cnpj?: string | null
          conta?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          org_id?: string | null
          phone?: string | null
          pix_key?: string | null
          tipo_conta?: string | null
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
      translation_orders: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          pedido_data: string
          pedido_id: string
          pedido_status: string
          quantidade_documentos: number | null
          review_email: string | null
          review_id: string | null
          review_name: string | null
          reviewer_protocol_id: string | null
          status_pagamento: string
          sync_status: string | null
          updated_at: string
          valor_pago: number
          valor_pedido: number
          valor_total_pago_servico: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          pedido_data: string
          pedido_id: string
          pedido_status: string
          quantidade_documentos?: number | null
          review_email?: string | null
          review_id?: string | null
          review_name?: string | null
          reviewer_protocol_id?: string | null
          status_pagamento: string
          sync_status?: string | null
          updated_at?: string
          valor_pago: number
          valor_pedido: number
          valor_total_pago_servico?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          pedido_data?: string
          pedido_id?: string
          pedido_status?: string
          quantidade_documentos?: number | null
          review_email?: string | null
          review_id?: string | null
          review_name?: string | null
          reviewer_protocol_id?: string | null
          status_pagamento?: string
          sync_status?: string | null
          updated_at?: string
          valor_pago?: number
          valor_pedido?: number
          valor_total_pago_servico?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "translation_orders_reviewer_protocol_id_fkey"
            columns: ["reviewer_protocol_id"]
            isOneToOne: false
            referencedRelation: "reviewer_protocols"
            referencedColumns: ["id"]
          },
        ]
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
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_name?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      variaveis_esporadicas: {
        Row: {
          arquivo_url: string | null
          created_at: string
          created_by: string | null
          descricao: string
          id: string
          status: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          arquivo_url?: string | null
          created_at?: string
          created_by?: string | null
          descricao: string
          id?: string
          status?: string
          tipo: string
          updated_at?: string
          valor: number
        }
        Update: {
          arquivo_url?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string
          id?: string
          status?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "variaveis_esporadicas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          error_message: string | null
          event_type: string
          headers: Json | null
          id: string
          ip_address: unknown | null
          payload: Json
          processed_at: string
          response: Json | null
          status_code: number | null
        }
        Insert: {
          error_message?: string | null
          event_type: string
          headers?: Json | null
          id?: string
          ip_address?: unknown | null
          payload: Json
          processed_at?: string
          response?: Json | null
          status_code?: number | null
        }
        Update: {
          error_message?: string | null
          event_type?: string
          headers?: Json | null
          id?: string
          ip_address?: unknown | null
          payload?: Json
          processed_at?: string
          response?: Json | null
          status_code?: number | null
        }
        Relationships: []
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
      calculate_lead_score: {
        Args: { p_lead_id: string }
        Returns: number
      }
      check_and_apply_lockout: {
        Args: { p_attempt_type?: string; p_identifier: string }
        Returns: Json
      }
      check_rate_limit_v2: {
        Args: {
          p_endpoint: string
          p_identifier: string
          p_max_requests: number
          p_window_seconds: number
        }
        Returns: Json
      }
      check_secret_expiration: {
        Args: Record<PropertyKey, never>
        Returns: {
          days_until_expiration: number
          last_rotation_date: string
          rotation_type: string
          secret_name: string
          status: string
        }[]
      }
      check_sensitive_data_rate_limit: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      cleanup_expired_idempotency_keys: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_reset_tokens: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_backups: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_rate_limit_entries: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_mfa_backup_codes: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      generate_protocol_number: {
        Args: {
          p_competence_month: string
          p_supplier_name?: string
          p_type: string
        }
        Returns: string
      }
      generate_sms_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_active_secrets_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          days_until_expiration: number
          expires_at: string
          last_rotated: string
          rotation_count: number
          secret_name: string
        }[]
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
      get_business_days_between: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: number
      }
      get_company_costs_view: {
        Args: Record<PropertyKey, never>
        Returns: {
          amount: number
          category: string
          created_at: string
          created_by: string
          date: string
          description: string
          files: string[]
          id: string
          observations: string
          sub_category: string
          updated_at: string
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
      get_user_customer: {
        Args: { _user_id: string }
        Returns: string
      }
      get_user_email: {
        Args: { user_id: string }
        Returns: string
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_role_new: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_channel_member: {
        Args: { p_channel_id: string; p_user_id: string }
        Returns: boolean
      }
      is_protocol_delayed: {
        Args: { p_current_step?: string; p_protocol_id: string }
        Returns: boolean
      }
      log_login_attempt: {
        Args: {
          p_attempt_type: string
          p_failure_reason?: string
          p_identifier: string
          p_ip_address?: unknown
          p_metadata?: Json
          p_success: boolean
          p_user_agent?: string
        }
        Returns: string
      }
      log_mfa_event: {
        Args: { p_event_type: string; p_metadata?: Json }
        Returns: undefined
      }
      log_secret_rotation: {
        Args: {
          p_expires_in_days?: number
          p_new_hash: string
          p_old_hash: string
          p_rotation_type: string
          p_secret_name: string
        }
        Returns: string
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
      revoke_user_sessions: {
        Args: {
          p_current_session_token?: string
          p_keep_current?: boolean
          p_reason?: string
          p_user_id: string
        }
        Returns: number
      }
      sync_protocol_workflow_steps: {
        Args: { p_protocol_id: string }
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
      trigger_security_alert: {
        Args: {
          p_alert_type: string
          p_message: string
          p_metadata?: Json
          p_severity: string
          p_title: string
          p_triggered_by?: string
        }
        Returns: string
      }
      validate_sensitive_access: {
        Args: { p_table_name: string; p_user_id: string }
        Returns: boolean
      }
      validate_session: {
        Args: { p_session_token: string }
        Returns: Json
      }
      verify_mfa_backup_code: {
        Args: { p_code: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "owner"
        | "master"
        | "admin"
        | "operation"
        | "translator"
        | "customer"
        | "financeiro"
      approval_status: "pending" | "approved" | "rejected"
      balance_sheet_type:
        | "current_asset"
        | "non_current_asset"
        | "current_liability"
        | "non_current_liability"
        | "equity"
      batch_status: "draft" | "sent" | "processing" | "completed" | "failed"
      cash_flow_method: "direct" | "indirect"
      conta_pagar_status:
        | "novo"
        | "aguardando_pagamento"
        | "aguardando_nf"
        | "finalizado"
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
      user_role:
        | "master"
        | "admin"
        | "operation"
        | "owner"
        | "translator"
        | "financeiro"
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
      app_role: [
        "owner",
        "master",
        "admin",
        "operation",
        "translator",
        "customer",
        "financeiro",
      ],
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
      conta_pagar_status: [
        "novo",
        "aguardando_pagamento",
        "aguardando_nf",
        "finalizado",
      ],
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
      user_role: [
        "master",
        "admin",
        "operation",
        "owner",
        "translator",
        "financeiro",
      ],
    },
  },
} as const
