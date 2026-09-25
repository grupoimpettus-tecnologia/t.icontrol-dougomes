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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_entries: {
        Row: {
          ambiente: string | null
          created_at: string
          criado_por: string | null
          custo_mensal: number | null
          grupo: string | null
          id: string
          nome: string
          observacoes: string | null
          tipo: string | null
          updated_at: string
          url: string | null
          usuario: string | null
          workspace_id: string
        }
        Insert: {
          ambiente?: string | null
          created_at?: string
          criado_por?: string | null
          custo_mensal?: number | null
          grupo?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          tipo?: string | null
          updated_at?: string
          url?: string | null
          usuario?: string | null
          workspace_id: string
        }
        Update: {
          ambiente?: string | null
          created_at?: string
          criado_por?: string | null
          custo_mensal?: number | null
          grupo?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          tipo?: string | null
          updated_at?: string
          url?: string | null
          usuario?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_entries_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          acao: string
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          entidade: string | null
          entidade_id: string | null
          id: string
          item_nome: string | null
          metadata: Json
          modulo: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          item_nome?: string | null
          metadata?: Json
          modulo?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          item_nome?: string | null
          metadata?: Json
          modulo?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_heartbeats: {
        Row: {
          equipment_id: string
          id: number
          metricas: Json
          recebido_em: string
          workspace_id: string
        }
        Insert: {
          equipment_id: string
          id?: number
          metricas?: Json
          recebido_em?: string
          workspace_id: string
        }
        Update: {
          equipment_id?: string
          id?: number
          metricas?: Json
          recebido_em?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_heartbeats_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_heartbeats_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      equipments: {
        Row: {
          agent_status: string
          agent_token_hash: string | null
          condicao: string | null
          configuracao: string | null
          cpu: string | null
          created_at: string
          criado_por: string | null
          custo_compra: number | null
          disco: string | null
          grupo: string | null
          hostname: string | null
          id: string
          ip: string | null
          local: string | null
          mac: string | null
          manutencao: boolean
          marca: string | null
          memoria: string | null
          modelo: string | null
          numero_serie: string | null
          observacoes: string | null
          patrimonio: string
          responsavel: string | null
          setor: string | null
          sistema_operacional: string | null
          status: string | null
          termo_url: string | null
          tipo: string | null
          ultimo_heartbeat: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          agent_status?: string
          agent_token_hash?: string | null
          condicao?: string | null
          configuracao?: string | null
          cpu?: string | null
          created_at?: string
          criado_por?: string | null
          custo_compra?: number | null
          disco?: string | null
          grupo?: string | null
          hostname?: string | null
          id?: string
          ip?: string | null
          local?: string | null
          mac?: string | null
          manutencao?: boolean
          marca?: string | null
          memoria?: string | null
          modelo?: string | null
          numero_serie?: string | null
          observacoes?: string | null
          patrimonio: string
          responsavel?: string | null
          setor?: string | null
          sistema_operacional?: string | null
          status?: string | null
          termo_url?: string | null
          tipo?: string | null
          ultimo_heartbeat?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          agent_status?: string
          agent_token_hash?: string | null
          condicao?: string | null
          configuracao?: string | null
          cpu?: string | null
          created_at?: string
          criado_por?: string | null
          custo_compra?: number | null
          disco?: string | null
          grupo?: string | null
          hostname?: string | null
          id?: string
          ip?: string | null
          local?: string | null
          mac?: string | null
          manutencao?: boolean
          marca?: string | null
          memoria?: string | null
          modelo?: string | null
          numero_serie?: string | null
          observacoes?: string | null
          patrimonio?: string
          responsavel?: string | null
          setor?: string | null
          sistema_operacional?: string | null
          status?: string | null
          termo_url?: string | null
          tipo?: string | null
          ultimo_heartbeat?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipments_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          aceito_em: string | null
          created_at: string
          criado_por: string | null
          email: string
          expira_em: string
          id: string
          nome: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
          workspace_ids: string[]
        }
        Insert: {
          aceito_em?: string | null
          created_at?: string
          criado_por?: string | null
          email: string
          expira_em?: string
          id?: string
          nome?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          workspace_ids?: string[]
        }
        Update: {
          aceito_em?: string | null
          created_at?: string
          criado_por?: string | null
          email?: string
          expira_em?: string
          id?: string
          nome?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          workspace_ids?: string[]
        }
        Relationships: []
      }
      monitor_checks: {
        Row: {
          criado_em: string
          id: number
          latencia_ms: number | null
          mensagem: string | null
          monitor_id: string
          ok: boolean
          status_code: number | null
          workspace_id: string
        }
        Insert: {
          criado_em?: string
          id?: number
          latencia_ms?: number | null
          mensagem?: string | null
          monitor_id: string
          ok: boolean
          status_code?: number | null
          workspace_id: string
        }
        Update: {
          criado_em?: string
          id?: number
          latencia_ms?: number | null
          mensagem?: string | null
          monitor_id?: string
          ok?: boolean
          status_code?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitor_checks_monitor_id_fkey"
            columns: ["monitor_id"]
            isOneToOne: false
            referencedRelation: "monitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitor_checks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      monitor_incidents: {
        Row: {
          causa: string | null
          duracao_segundos: number | null
          id: string
          iniciado_em: string
          monitor_id: string
          resolvido_em: string | null
          workspace_id: string
        }
        Insert: {
          causa?: string | null
          duracao_segundos?: number | null
          id?: string
          iniciado_em?: string
          monitor_id: string
          resolvido_em?: string | null
          workspace_id: string
        }
        Update: {
          causa?: string | null
          duracao_segundos?: number | null
          id?: string
          iniciado_em?: string
          monitor_id?: string
          resolvido_em?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitor_incidents_monitor_id_fkey"
            columns: ["monitor_id"]
            isOneToOne: false
            referencedRelation: "monitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitor_incidents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      monitor_notification_recipients: {
        Row: {
          canal: string
          created_at: string
          email: string | null
          id: string
          monitor_id: string
          profile_id: string | null
          workspace_id: string
        }
        Insert: {
          canal: string
          created_at?: string
          email?: string | null
          id?: string
          monitor_id: string
          profile_id?: string | null
          workspace_id: string
        }
        Update: {
          canal?: string
          created_at?: string
          email?: string | null
          id?: string
          monitor_id?: string
          profile_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitor_notification_recipients_monitor_id_fkey"
            columns: ["monitor_id"]
            isOneToOne: false
            referencedRelation: "monitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitor_notification_recipients_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitor_notification_recipients_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      monitors: {
        Row: {
          ativo: boolean
          created_at: string
          criado_por: string | null
          dns_tipo: string | null
          email_destinatario: string | null
          falhas_consecutivas: number
          falhas_para_alerta: number
          heartbeat_token: string | null
          hostname: string | null
          id: string
          intervalo_segundos: number
          keyword: string | null
          metodo: string
          nome: string
          notificar_email: boolean
          porta: number | null
          publico: boolean
          status: Database["public"]["Enums"]["monitor_status"]
          status_codes_aceitos: string
          sucessos_consecutivos: number
          timeout_segundos: number
          tipo: Database["public"]["Enums"]["monitor_type"]
          ultima_latencia_ms: number | null
          ultima_mensagem: string | null
          ultima_verificacao: string | null
          updated_at: string
          url: string | null
          webhook_url: string | null
          workspace_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          criado_por?: string | null
          dns_tipo?: string | null
          email_destinatario?: string | null
          falhas_consecutivas?: number
          falhas_para_alerta?: number
          heartbeat_token?: string | null
          hostname?: string | null
          id?: string
          intervalo_segundos?: number
          keyword?: string | null
          metodo?: string
          nome: string
          notificar_email?: boolean
          porta?: number | null
          publico?: boolean
          status?: Database["public"]["Enums"]["monitor_status"]
          status_codes_aceitos?: string
          sucessos_consecutivos?: number
          timeout_segundos?: number
          tipo?: Database["public"]["Enums"]["monitor_type"]
          ultima_latencia_ms?: number | null
          ultima_mensagem?: string | null
          ultima_verificacao?: string | null
          updated_at?: string
          url?: string | null
          webhook_url?: string | null
          workspace_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          criado_por?: string | null
          dns_tipo?: string | null
          email_destinatario?: string | null
          falhas_consecutivas?: number
          falhas_para_alerta?: number
          heartbeat_token?: string | null
          hostname?: string | null
          id?: string
          intervalo_segundos?: number
          keyword?: string | null
          metodo?: string
          nome?: string
          notificar_email?: boolean
          porta?: number | null
          publico?: boolean
          status?: Database["public"]["Enums"]["monitor_status"]
          status_codes_aceitos?: string
          sucessos_consecutivos?: number
          timeout_segundos?: number
          tipo?: Database["public"]["Enums"]["monitor_type"]
          ultima_latencia_ms?: number | null
          ultima_mensagem?: string | null
          ultima_verificacao?: string | null
          updated_at?: string
          url?: string | null
          webhook_url?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitors_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitors_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          canal: string
          created_at: string
          destinatario: string | null
          enviado: boolean
          evento: string
          id: string
          mensagem: string | null
          monitor_id: string | null
          workspace_id: string
        }
        Insert: {
          canal: string
          created_at?: string
          destinatario?: string | null
          enviado?: boolean
          evento: string
          id?: string
          mensagem?: string | null
          monitor_id?: string | null
          workspace_id: string
        }
        Update: {
          canal?: string
          created_at?: string
          destinatario?: string | null
          enviado?: boolean
          evento?: string
          id?: string
          mensagem?: string | null
          monitor_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_monitor_id_fkey"
            columns: ["monitor_id"]
            isOneToOne: false
            referencedRelation: "monitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      org_versions: {
        Row: {
          atual: boolean
          created_at: string
          id: string
          nodes: Json
          nome: string
          periodo: string | null
          tipo: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          atual?: boolean
          created_at?: string
          id?: string
          nodes?: Json
          nome: string
          periodo?: string | null
          tipo?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          atual?: boolean
          created_at?: string
          id?: string
          nodes?: Json
          nome?: string
          periodo?: string | null
          tipo?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_versions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      pdv_loja_etapas: {
        Row: {
          concluida: boolean
          concluida_em: string | null
          concluida_por: string | null
          created_at: string
          etapa_id: string
          evidencia_html: string | null
          id: string
          loja_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          concluida?: boolean
          concluida_em?: string | null
          concluida_por?: string | null
          created_at?: string
          etapa_id: string
          evidencia_html?: string | null
          id?: string
          loja_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          concluida?: boolean
          concluida_em?: string | null
          concluida_por?: string | null
          created_at?: string
          etapa_id?: string
          evidencia_html?: string | null
          id?: string
          loja_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdv_loja_etapas_concluida_por_fkey"
            columns: ["concluida_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdv_loja_etapas_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "pdv_lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdv_loja_etapas_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      pdv_lojas: {
        Row: {
          cnpj: string
          created_at: string
          criado_por: string | null
          id: string
          marca: string
          nome: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          cnpj: string
          created_at?: string
          criado_por?: string | null
          id?: string
          marca: string
          nome: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          cnpj?: string
          created_at?: string
          criado_por?: string | null
          id?: string
          marca?: string
          nome?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdv_lojas_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdv_lojas_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_lines: {
        Row: {
          condicoes: string | null
          created_at: string
          criado_por: string | null
          fidelidade_ate: string | null
          grupo: string | null
          id: string
          imei: string | null
          linha: string | null
          marca: string | null
          modelo: string | null
          observacoes: string | null
          operadora: string | null
          pacote_extra: string | null
          plano: string | null
          responsavel: string
          setor: string | null
          sistema: string | null
          status: string | null
          tem_aparelho: boolean
          tipo_linha: string | null
          updated_at: string
          valor: number | null
          workspace_id: string
        }
        Insert: {
          condicoes?: string | null
          created_at?: string
          criado_por?: string | null
          fidelidade_ate?: string | null
          grupo?: string | null
          id?: string
          imei?: string | null
          linha?: string | null
          marca?: string | null
          modelo?: string | null
          observacoes?: string | null
          operadora?: string | null
          pacote_extra?: string | null
          plano?: string | null
          responsavel: string
          setor?: string | null
          sistema?: string | null
          status?: string | null
          tem_aparelho?: boolean
          tipo_linha?: string | null
          updated_at?: string
          valor?: number | null
          workspace_id: string
        }
        Update: {
          condicoes?: string | null
          created_at?: string
          criado_por?: string | null
          fidelidade_ate?: string | null
          grupo?: string | null
          id?: string
          imei?: string | null
          linha?: string | null
          marca?: string | null
          modelo?: string | null
          observacoes?: string | null
          operadora?: string | null
          pacote_extra?: string | null
          plano?: string | null
          responsavel?: string
          setor?: string | null
          sistema?: string | null
          status?: string | null
          tem_aparelho?: boolean
          tipo_linha?: string | null
          updated_at?: string
          valor?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phone_lines_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_lines_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_stock: {
        Row: {
          created_at: string
          criado_por: string | null
          estado: string | null
          grupo: string | null
          id: string
          modelo: string
          observacoes: string | null
          quantidade: number
          status: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          estado?: string | null
          grupo?: string | null
          id?: string
          modelo: string
          observacoes?: string | null
          quantidade?: number
          status?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          estado?: string | null
          grupo?: string | null
          id?: string
          modelo?: string
          observacoes?: string | null
          quantidade?: number
          status?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phone_stock_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_stock_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          nome: string
          role_global: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id: string
          nome?: string
          role_global?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          role_global?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          id: string
          plataforma: string
          profile_id: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          plataforma?: string
          profile_id: string
          token: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          plataforma?: string
          profile_id?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_assets: {
        Row: {
          contrato_url: string | null
          created_at: string
          criado_por: string | null
          custo: number | null
          fornecedor: string | null
          grupo: string | null
          id: string
          nome: string
          observacoes: string | null
          renovacao_em: string | null
          status: string | null
          tipo_contrato: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          contrato_url?: string | null
          created_at?: string
          criado_por?: string | null
          custo?: number | null
          fornecedor?: string | null
          grupo?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          renovacao_em?: string | null
          status?: string | null
          tipo_contrato?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          contrato_url?: string | null
          created_at?: string
          criado_por?: string | null
          custo?: number | null
          fornecedor?: string | null
          grupo?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          renovacao_em?: string | null
          status?: string | null
          tipo_contrato?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_assets_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_assets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          area: string | null
          atribuicoes: string | null
          cargo: string | null
          created_at: string
          gestor_id: string | null
          id: string
          nivel: string | null
          nome: string
          ordem: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          area?: string | null
          atribuicoes?: string | null
          cargo?: string | null
          created_at?: string
          gestor_id?: string | null
          id?: string
          nivel?: string | null
          nome: string
          ordem?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          area?: string | null
          atribuicoes?: string | null
          cargo?: string | null
          created_at?: string
          gestor_id?: string | null
          id?: string
          nivel?: string | null
          nome?: string
          ordem?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_workspaces: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          role_no_workspace: Database["public"]["Enums"]["app_role"]
          ultimo_acesso: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          role_no_workspace?: Database["public"]["Enums"]["app_role"]
          ultimo_acesso?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          role_no_workspace?: Database["public"]["Enums"]["app_role"]
          ultimo_acesso?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_workspaces_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_workspaces_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          id: string
          logo_url: string | null
          nome: string
          segmento: string | null
          slug: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          segmento?: string | null
          slug: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          segmento?: string | null
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: { Args: { _token: string }; Returns: Json }
      can_manage_workspace: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_master: { Args: { _user_id: string }; Returns: boolean }
      my_workspace_ids: { Args: { _user_id: string }; Returns: string[] }
      workspace_role: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
    }
    Enums: {
      app_role: "master" | "admin" | "tecnico" | "viewer"
      monitor_status: "pendente" | "ativo" | "fora" | "pausado"
      monitor_type: "http" | "keyword" | "tcp" | "dns" | "heartbeat" | "ping"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["master", "admin", "tecnico", "viewer"],
      monitor_status: ["pendente", "ativo", "fora", "pausado"],
      monitor_type: ["http", "keyword", "tcp", "dns", "heartbeat", "ping"],
    },
  },
} as const
