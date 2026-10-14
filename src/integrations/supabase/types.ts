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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          entity: string
          entity_id: string | null
          id: number
          tournament_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity: string
          entity_id?: string | null
          id?: never
          tournament_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity?: string
          entity_id?: string | null
          id?: never
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount: number
          created_at: string
          donor_name: string | null
          id: string
          message: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          show_name: boolean
          status: Database["public"]["Enums"]["donation_status"]
          tournament_id: string
          transfer_reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          donor_name?: string | null
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          show_name?: boolean
          status?: Database["public"]["Enums"]["donation_status"]
          tournament_id: string
          transfer_reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          donor_name?: string | null
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          show_name?: boolean
          status?: Database["public"]["Enums"]["donation_status"]
          tournament_id?: string
          transfer_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      match_events: {
        Row: {
          assist_player_id: string | null
          created_at: string
          id: string
          match_id: string
          minute: number | null
          player_id: string
          team_id: string
          type: Database["public"]["Enums"]["event_type"]
        }
        Insert: {
          assist_player_id?: string | null
          created_at?: string
          id?: string
          match_id: string
          minute?: number | null
          player_id: string
          team_id: string
          type: Database["public"]["Enums"]["event_type"]
        }
        Update: {
          assist_player_id?: string | null
          created_at?: string
          id?: string
          match_id?: string
          minute?: number | null
          player_id?: string
          team_id?: string
          type?: Database["public"]["Enums"]["event_type"]
        }
        Relationships: [
          {
            foreignKeyName: "match_events_assist_player_id_fkey"
            columns: ["assist_player_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_score: number | null
          away_team_id: string
          created_at: string
          home_score: number | null
          home_team_id: string
          id: string
          match_date: string | null
          round: number
          status: Database["public"]["Enums"]["match_status"]
          tournament_id: string
          venue: string | null
        }
        Insert: {
          away_score?: number | null
          away_team_id: string
          created_at?: string
          home_score?: number | null
          home_team_id: string
          id?: string
          match_date?: string | null
          round: number
          status?: Database["public"]["Enums"]["match_status"]
          tournament_id: string
          venue?: string | null
        }
        Update: {
          away_score?: number | null
          away_team_id?: string
          created_at?: string
          home_score?: number | null
          home_team_id?: string
          id?: string
          match_date?: string | null
          round?: number
          status?: Database["public"]["Enums"]["match_status"]
          tournament_id?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          bucket: string
          created_at: string
          id: number
          key: string
        }
        Insert: {
          bucket: string
          created_at?: string
          id?: never
          key: string
        }
        Update: {
          bucket?: string
          created_at?: string
          id?: never
          key?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          code: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          payment_reference: string | null
          phone: string
          preferred_position: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["registration_status"]
          team_id: string | null
          tournament_id: string
        }
        Insert: {
          code: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          payment_reference?: string | null
          phone: string
          preferred_position?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          team_id?: string | null
          tournament_id: string
        }
        Update: {
          code?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          payment_reference?: string | null
          phone?: string
          preferred_position?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          team_id?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
          slot_index: number
          tournament_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slot_index: number
          tournament_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slot_index?: number
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          created_at: string
          donation_message: string
          fee: number
          id: string
          is_current: boolean
          is_demo: boolean
          name: string
          players_per_team: number
          registration_open: boolean
          season: string
          team_count: number
          updated_at: string
        }
        Insert: {
          account_name?: string
          account_number?: string
          bank_name?: string
          created_at?: string
          donation_message?: string
          fee?: number
          id?: string
          is_current?: boolean
          is_demo?: boolean
          name: string
          players_per_team?: number
          registration_open?: boolean
          season: string
          team_count?: number
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          created_at?: string
          donation_message?: string
          fee?: number
          id?: string
          is_current?: boolean
          is_demo?: boolean
          name?: string
          players_per_team?: number
          registration_open?: boolean
          season?: string
          team_count?: number
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_match_event: {
        Args: {
          _assist_id: string
          _match_id: string
          _minute: number
          _player_id: string
          _type: Database["public"]["Enums"]["event_type"]
        }
        Returns: string
      }
      admin_exists: { Args: never; Returns: boolean }
      approve_registration: {
        Args: { _note?: string; _reg_id: string }
        Returns: {
          team_id: string
          team_name: string
        }[]
      }
      check_rate_limit: {
        Args: {
          _bucket: string
          _key: string
          _max: number
          _window_seconds: number
        }
        Returns: boolean
      }
      claim_first_admin: { Args: never; Returns: boolean }
      delete_match_event: { Args: { _id: string }; Returns: undefined }
      generate_fixtures: {
        Args: { _force: boolean; _tid: string }
        Returns: number
      }
      get_public_donations: {
        Args: { _tid: string }
        Returns: {
          donor_count: number
          recent: Json
          total: number
        }[]
      }
      get_public_players: {
        Args: { _tid: string }
        Returns: {
          full_name: string
          id: string
          preferred_position: string
          team_id: string
        }[]
      }
      get_registration_counts: {
        Args: { _tid: string }
        Returns: {
          approved: number
          pending: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      log_audit: {
        Args: {
          _action: string
          _details: Json
          _entity: string
          _entity_id: string
          _tid: string
        }
        Returns: undefined
      }
      lookup_registration: {
        Args: { _code: string; _phone: string }
        Returns: {
          code: string
          created_at: string
          full_name: string
          review_note: string
          status: Database["public"]["Enums"]["registration_status"]
          team_name: string
        }[]
      }
      reassign_player: {
        Args: { _reg_id: string; _team_id: string }
        Returns: undefined
      }
      register_player: {
        Args: {
          _email: string
          _full_name: string
          _payment_reference: string
          _phone: string
          _position: string
        }
        Returns: {
          code: string
          status: Database["public"]["Enums"]["registration_status"]
        }[]
      }
      reject_registration: {
        Args: { _reason: string; _reg_id: string }
        Returns: undefined
      }
      rename_team: {
        Args: { _name: string; _team_id: string }
        Returns: undefined
      }
      replace_fixtures: {
        Args: { _fixtures: Json; _force: boolean; _tid: string }
        Returns: number
      }
      review_donation: {
        Args: {
          _id: string
          _show_name: boolean
          _status: Database["public"]["Enums"]["donation_status"]
        }
        Returns: undefined
      }
      save_match: {
        Args: {
          _away: number
          _date: string
          _home: number
          _match_id: string
          _round: number
          _status: Database["public"]["Enums"]["match_status"]
          _venue: string
        }
        Returns: undefined
      }
      submit_donation: {
        Args: {
          _amount: number
          _donor_name: string
          _message: string
          _ref: string
          _show_name: boolean
        }
        Returns: string
      }
      update_tournament_settings: {
        Args: { _s: Json; _tid: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin"
      donation_status: "pending" | "confirmed" | "rejected"
      event_type:
        | "goal"
        | "penalty_goal"
        | "own_goal"
        | "yellow_card"
        | "red_card"
      match_status: "scheduled" | "completed" | "postponed" | "cancelled"
      registration_status: "pending" | "approved" | "rejected"
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
      app_role: ["admin"],
      donation_status: ["pending", "confirmed", "rejected"],
      event_type: [
        "goal",
        "penalty_goal",
        "own_goal",
        "yellow_card",
        "red_card",
      ],
      match_status: ["scheduled", "completed", "postponed", "cancelled"],
      registration_status: ["pending", "approved", "rejected"],
    },
  },
} as const