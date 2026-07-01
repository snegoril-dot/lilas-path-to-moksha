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
      analytics_events: {
        Row: {
          anon_id: string | null
          app_version: string | null
          cell: number | null
          created_at: string
          dice: number | null
          event_name: string
          id: string
          metadata: Json
          platform: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          anon_id?: string | null
          app_version?: string | null
          cell?: number | null
          created_at?: string
          dice?: number | null
          event_name: string
          id?: string
          metadata?: Json
          platform?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          anon_id?: string | null
          app_version?: string | null
          cell?: number | null
          created_at?: string
          dice?: number | null
          event_name?: string
          id?: string
          metadata?: Json
          platform?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      beta_feedback: {
        Row: {
          anon_id: string | null
          app_version: string | null
          cell: number | null
          confused: string | null
          context: string | null
          created_at: string
          id: string
          improve: string | null
          platform: string | null
          rating: number | null
          resonated: string | null
          session_id: string | null
          understood: string | null
          user_id: string | null
        }
        Insert: {
          anon_id?: string | null
          app_version?: string | null
          cell?: number | null
          confused?: string | null
          context?: string | null
          created_at?: string
          id?: string
          improve?: string | null
          platform?: string | null
          rating?: number | null
          resonated?: string | null
          session_id?: string | null
          understood?: string | null
          user_id?: string | null
        }
        Update: {
          anon_id?: string | null
          app_version?: string | null
          cell?: number | null
          confused?: string | null
          context?: string | null
          created_at?: string
          id?: string
          improve?: string | null
          platform?: string | null
          rating?: number | null
          resonated?: string | null
          session_id?: string | null
          understood?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      game_sessions: {
        Row: {
          current_cell: number
          dice_history: Json
          entry_misses: number
          finished_at: string | null
          id: string
          key_cells: Json
          mode: string
          moves_count: number
          path: Json
          result: string
          sankalpa: string | null
          six_streak: number
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          current_cell?: number
          dice_history?: Json
          entry_misses?: number
          finished_at?: string | null
          id?: string
          key_cells?: Json
          mode?: string
          moves_count?: number
          path?: Json
          result?: string
          sankalpa?: string | null
          six_streak?: number
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          current_cell?: number
          dice_history?: Json
          entry_misses?: number
          finished_at?: string | null
          id?: string
          key_cells?: Json
          mode?: string
          moves_count?: number
          path?: Json
          result?: string
          sankalpa?: string | null
          six_streak?: number
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      guru_usage: {
        Row: {
          count: number
          day: string
          updated_at: string
          user_id: string
        }
        Insert: {
          count?: number
          day?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          count?: number
          day?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          ai_reflection: string | null
          cell: number | null
          created_at: string
          id: string
          kind: string
          prompt: string | null
          session_id: string | null
          user_id: string
          user_text: string | null
        }
        Insert: {
          ai_reflection?: string | null
          cell?: number | null
          created_at?: string
          id?: string
          kind?: string
          prompt?: string | null
          session_id?: string | null
          user_id: string
          user_text?: string | null
        }
        Update: {
          ai_reflection?: string | null
          cell?: number | null
          created_at?: string
          id?: string
          kind?: string
          prompt?: string | null
          session_id?: string | null
          user_id?: string
          user_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_journal_entries: {
        Row: {
          cell_id: number | null
          created_at: string
          id: string
          session_id: string | null
          tags: string[]
          text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cell_id?: number | null
          created_at?: string
          id?: string
          session_id?: string | null
          tags?: string[]
          text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cell_id?: number | null
          created_at?: string
          id?: string
          session_id?: string | null
          tags?: string[]
          text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_journal_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "practice_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_reminders: {
        Row: {
          created_at: string
          enabled: boolean
          morning_sankalpa_enabled: boolean
          quiet_until: string | null
          time_of_day: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          morning_sankalpa_enabled?: boolean
          quiet_until?: string | null
          time_of_day?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          morning_sankalpa_enabled?: boolean
          quiet_until?: string | null
          time_of_day?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      practice_sessions: {
        Row: {
          abandoned_at: string | null
          cell_id: number
          completed_at: string | null
          created_at: string
          due_at: string | null
          duration: string
          emotions: string[]
          id: string
          practice_id: string
          reflection: string | null
          reminder_sent_at: string | null
          resonance: number | null
          sankalpa_bridge: string | null
          started_at: string
          status: string
          steps_checked: number[]
          updated_at: string
          user_id: string
        }
        Insert: {
          abandoned_at?: string | null
          cell_id: number
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          duration: string
          emotions?: string[]
          id?: string
          practice_id: string
          reflection?: string | null
          reminder_sent_at?: string | null
          resonance?: number | null
          sankalpa_bridge?: string | null
          started_at?: string
          status?: string
          steps_checked?: number[]
          updated_at?: string
          user_id: string
        }
        Update: {
          abandoned_at?: string | null
          cell_id?: number
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          duration?: string
          emotions?: string[]
          id?: string
          practice_id?: string
          reflection?: string | null
          reminder_sent_at?: string | null
          resonance?: number | null
          sankalpa_bridge?: string | null
          started_at?: string
          status?: string
          steps_checked?: number[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          banned_at: string | null
          created_at: string
          first_name: string | null
          id: string
          is_premium: boolean
          language_code: string | null
          last_name: string | null
          photo_url: string | null
          telegram_id: number | null
          updated_at: string
          username: string | null
        }
        Insert: {
          banned_at?: string | null
          created_at?: string
          first_name?: string | null
          id: string
          is_premium?: boolean
          language_code?: string | null
          last_name?: string | null
          photo_url?: string | null
          telegram_id?: number | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          banned_at?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          is_premium?: boolean
          language_code?: string | null
          last_name?: string | null
          photo_url?: string | null
          telegram_id?: number | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          ref_code: string
          referred_user_id: string
          referrer_user_id: string
          rewarded_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ref_code: string
          referred_user_id: string
          referrer_user_id: string
          rewarded_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ref_code?: string
          referred_user_id?: string
          referrer_user_id?: string
          rewarded_at?: string | null
        }
        Relationships: []
      }
      sankalpa_history: {
        Row: {
          created_at: string
          id: string
          source: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source?: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source?: string
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      stars_payments: {
        Row: {
          created_at: string
          id: string
          invoice_payload: string | null
          product_id: string
          provider_payment_charge_id: string | null
          raw_payload: Json | null
          refund_charge_id: string | null
          refunded_at: string | null
          stars_amount: number
          telegram_payment_charge_id: string
          telegram_user_id: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_payload?: string | null
          product_id: string
          provider_payment_charge_id?: string | null
          raw_payload?: Json | null
          refund_charge_id?: string | null
          refunded_at?: string | null
          stars_amount: number
          telegram_payment_charge_id: string
          telegram_user_id?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          invoice_payload?: string | null
          product_id?: string
          provider_payment_charge_id?: string | null
          raw_payload?: Json | null
          refund_charge_id?: string | null
          refunded_at?: string | null
          stars_amount?: number
          telegram_payment_charge_id?: string
          telegram_user_id?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_entitlements: {
        Row: {
          created_at: string
          expires_at: string | null
          feature: string
          id: string
          product_id: string | null
          source: string
          stars_charge_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          feature: string
          id?: string
          product_id?: string | null
          source?: string
          stars_charge_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          feature?: string
          id?: string
          product_id?: string | null
          source?: string
          stars_charge_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_recommendations: {
        Row: {
          created_at: string
          focus_loka: string | null
          id: string
          practices: Json
          summary: string
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          focus_loka?: string | null
          id?: string
          practices?: Json
          summary: string
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          focus_loka?: string | null
          id?: string
          practices?: Json
          summary?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_ban_user: {
        Args: { _banned: boolean; _target_user_id: string }
        Returns: undefined
      }
      admin_funnel_stats: {
        Args: { _from: string; _to: string }
        Returns: {
          step: string
          users: number
        }[]
      }
      admin_grant_entitlement: {
        Args: { _days: number; _feature: string; _target_user_id: string }
        Returns: undefined
      }
      admin_growth_stats: {
        Args: never
        Returns: {
          arppu_30d: number
          dau: number
          mau: number
          revenue_30d: number
          revenue_7d: number
          wau: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_guru_usage: {
        Args: { _limit: number; _user_id: string }
        Returns: {
          allowed: boolean
          new_count: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
