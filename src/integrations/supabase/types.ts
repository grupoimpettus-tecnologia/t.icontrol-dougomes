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
      audit_logs: {
        Row: {
          acao: string
          created_at: string
          entidade: string | null
          entidade_id: string | null
          id: string
          metadata: Json
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          metadata?: Json
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          metadata?: Json
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
      monitor_type: "http" | "keyword" | "tcp" | "dns" | "heartbeat"
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
      monitor_type: ["http", "keyword", "tcp", "dns", "heartbeat"],
    },
  },
} as const
