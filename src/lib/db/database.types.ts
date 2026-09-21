export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agents: {
        Row: {
          areas: string[]
          bot_name: string
          company: string
          created_at: string
          id: string
          kb: string | null
          name: string
          phone: string
        }
        Insert: {
          areas?: string[]
          bot_name?: string
          company?: string
          created_at?: string
          id: string
          kb?: string | null
          name?: string
          phone?: string
        }
        Update: {
          areas?: string[]
          bot_name?: string
          company?: string
          created_at?: string
          id?: string
          kb?: string | null
          name?: string
          phone?: string
        }
        Relationships: []
      }
      client_logs: {
        Row: {
          agent_id: string
          client_id: string
          created_at: string
          id: string
          text: string
        }
        Insert: {
          agent_id?: string
          client_id: string
          created_at?: string
          id?: string
          text: string
        }
        Update: {
          agent_id?: string
          client_id?: string
          created_at?: string
          id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_logs_client_id_agent_id_fkey"
            columns: ["client_id", "agent_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id", "agent_id"]
          },
        ]
      }
      clients: {
        Row: {
          age: string
          agent_id: string
          area: string
          budget: string
          commute: string
          created_at: string
          gender: string
          handoff_question: string | null
          id: string
          is_student: boolean
          job: string
          lease_end: string | null
          move_in: string
          move_in_date: string | null
          name: string
          needs_subsidy: boolean
          people: string
          pet: string
          phone: string
          smoke: string
          source: Database["public"]["Enums"]["client_source"]
          stage: Database["public"]["Enums"]["client_stage"]
          transport: string
          updated_at: string
        }
        Insert: {
          age?: string
          agent_id?: string
          area?: string
          budget?: string
          commute?: string
          created_at?: string
          gender?: string
          handoff_question?: string | null
          id?: string
          is_student?: boolean
          job?: string
          lease_end?: string | null
          move_in?: string
          move_in_date?: string | null
          name?: string
          needs_subsidy?: boolean
          people?: string
          pet?: string
          phone?: string
          smoke?: string
          source?: Database["public"]["Enums"]["client_source"]
          stage?: Database["public"]["Enums"]["client_stage"]
          transport?: string
          updated_at?: string
        }
        Update: {
          age?: string
          agent_id?: string
          area?: string
          budget?: string
          commute?: string
          created_at?: string
          gender?: string
          handoff_question?: string | null
          id?: string
          is_student?: boolean
          job?: string
          lease_end?: string | null
          move_in?: string
          move_in_date?: string | null
          name?: string
          needs_subsidy?: boolean
          people?: string
          pet?: string
          phone?: string
          smoke?: string
          source?: Database["public"]["Enums"]["client_source"]
          stage?: Database["public"]["Enums"]["client_stage"]
          transport?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      viewings: {
        Row: {
          address: string
          agent_id: string
          client_id: string
          created_at: string
          id: string
          starts_at: string
        }
        Insert: {
          address: string
          agent_id?: string
          client_id: string
          created_at?: string
          id?: string
          starts_at: string
        }
        Update: {
          address?: string
          agent_id?: string
          client_id?: string
          created_at?: string
          id?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "viewings_client_id_agent_id_fkey"
            columns: ["client_id", "agent_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id", "agent_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      client_source: "手動" | "AI 接客" | "貼上整理" | "示範"
      client_stage:
        | "新詢問"
        | "資料蒐集中"
        | "待推薦"
        | "已約看"
        | "斡旋中"
        | "已成交"
        | "暫停"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      client_source: ["手動", "AI 接客", "貼上整理", "示範"],
      client_stage: [
        "新詢問",
        "資料蒐集中",
        "待推薦",
        "已約看",
        "斡旋中",
        "已成交",
        "暫停",
      ],
    },
  },
} as const

