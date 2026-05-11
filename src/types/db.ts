export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      calendar_events: {
        Row: {
          all_day: boolean
          created_at: string
          date: string
          end_time: string | null
          family_id: string
          id: string
          member_id: string
          source: Database["public"]["Enums"]["calendar_source"]
          start_time: string | null
          title: string
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          date: string
          end_time?: string | null
          family_id: string
          id?: string
          member_id: string
          source?: Database["public"]["Enums"]["calendar_source"]
          start_time?: string | null
          title: string
        }
        Update: {
          all_day?: boolean
          created_at?: string
          date?: string
          end_time?: string | null
          family_id?: string
          id?: string
          member_id?: string
          source?: Database["public"]["Enums"]["calendar_source"]
          start_time?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          active_days: number[]
          active_meal_types: string[]
          cook_available_days: number[]
          created_at: string
          id: string
          invite_code: string
          language: Database["public"]["Enums"]["language"]
          name: string
          nutrition_style: Database["public"]["Enums"]["nutrition_style"]
          owner_id: string | null
        }
        Insert: {
          active_days?: number[]
          active_meal_types?: string[]
          cook_available_days?: number[]
          created_at?: string
          id?: string
          invite_code?: string
          language?: Database["public"]["Enums"]["language"]
          name: string
          nutrition_style?: Database["public"]["Enums"]["nutrition_style"]
          owner_id?: string | null
        }
        Update: {
          active_days?: number[]
          active_meal_types?: string[]
          cook_available_days?: number[]
          created_at?: string
          id?: string
          invite_code?: string
          language?: Database["public"]["Enums"]["language"]
          name?: string
          nutrition_style?: Database["public"]["Enums"]["nutrition_style"]
          owner_id?: string | null
        }
        Relationships: []
      }
      family_wishes: {
        Row: {
          created_at: string
          family_id: string
          id: string
          member_id: string | null
          wish_text: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          member_id?: string | null
          wish_text: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          member_id?: string | null
          wish_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_wishes_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_wishes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_attendees: {
        Row: {
          meal_id: string
          member_id: string
        }
        Insert: {
          meal_id: string
          member_id: string
        }
        Update: {
          meal_id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_attendees_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_attendees_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      meals: {
        Row: {
          id: string
          instructions: string | null
          is_ready_meal: boolean
          meal_type: Database["public"]["Enums"]["meal_type"]
          name: string
          plan_day_id: string
          recipe_json: Json | null
          servings: number
        }
        Insert: {
          id?: string
          instructions?: string | null
          is_ready_meal?: boolean
          meal_type: Database["public"]["Enums"]["meal_type"]
          name: string
          plan_day_id: string
          recipe_json?: Json | null
          servings?: number
        }
        Update: {
          id?: string
          instructions?: string | null
          is_ready_meal?: boolean
          meal_type?: Database["public"]["Enums"]["meal_type"]
          name?: string
          plan_day_id?: string
          recipe_json?: Json | null
          servings?: number
        }
        Relationships: [
          {
            foreignKeyName: "meals_plan_day_id_fkey"
            columns: ["plan_day_id"]
            isOneToOne: false
            referencedRelation: "plan_days"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          created_at: string
          dislikes: string[]
          family_id: string
          google_oauth_token: string | null
          ical_secret_token: string
          id: string
          is_child: boolean
          meal_schedule: Json | null
          name: string
          preferences: string[]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dislikes?: string[]
          family_id: string
          google_oauth_token?: string | null
          ical_secret_token?: string
          id?: string
          is_child?: boolean
          meal_schedule?: Json | null
          name: string
          preferences?: string[]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dislikes?: string[]
          family_id?: string
          google_oauth_token?: string | null
          ical_secret_token?: string
          id?: string
          is_child?: boolean
          meal_schedule?: Json | null
          name?: string
          preferences?: string[]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_days: {
        Row: {
          cook_available: boolean
          date: string
          id: string
          week_plan_id: string
        }
        Insert: {
          cook_available?: boolean
          date: string
          id?: string
          week_plan_id: string
        }
        Update: {
          cook_available?: boolean
          date?: string
          id?: string
          week_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_days_week_plan_id_fkey"
            columns: ["week_plan_id"]
            isOneToOne: false
            referencedRelation: "week_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      product_history: {
        Row: {
          category: Database["public"]["Enums"]["shopping_category"] | null
          family_id: string
          id: string
          name: string
          unit: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["shopping_category"] | null
          family_id: string
          id?: string
          name: string
          unit?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["shopping_category"] | null
          family_id?: string
          id?: string
          name?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_history_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_items: {
        Row: {
          amount: number | null
          category: Database["public"]["Enums"]["shopping_category"]
          checked: boolean
          created_at: string
          family_id: string
          id: string
          last_updated_by_plan: string | null
          name: string
          source_meal_id: string | null
          unit: string | null
        }
        Insert: {
          amount?: number | null
          category?: Database["public"]["Enums"]["shopping_category"]
          checked?: boolean
          created_at?: string
          family_id: string
          id?: string
          last_updated_by_plan?: string | null
          name: string
          source_meal_id?: string | null
          unit?: string | null
        }
        Update: {
          amount?: number | null
          category?: Database["public"]["Enums"]["shopping_category"]
          checked?: boolean
          created_at?: string
          family_id?: string
          id?: string
          last_updated_by_plan?: string | null
          name?: string
          source_meal_id?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopping_items_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_items_source_meal_id_fkey"
            columns: ["source_meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
        ]
      }
      week_plans: {
        Row: {
          created_at: string
          family_id: string
          id: string
          week_start_date: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          week_start_date: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "week_plans_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_family_id_by_invite_code: {
        Args: { p_invite_code: string }
        Returns: string
      }
      get_my_family_id: { Args: never; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      calendar_source: "google" | "manual"
      language: "de" | "en"
      meal_type: "breakfast" | "lunch" | "dinner"
      nutrition_style:
        | "low_carb_high_protein"
        | "vegetarian"
        | "vegan"
        | "mediterranean"
        | "balanced"
        | "paleo"
      shopping_category:
        | "produce"
        | "meat"
        | "dairy"
        | "frozen"
        | "dry_goods"
        | "beverages"
        | "household"
        | "other"
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
      calendar_source: ["google", "manual"],
      language: ["de", "en"],
      meal_type: ["breakfast", "lunch", "dinner"],
      nutrition_style: [
        "low_carb_high_protein",
        "vegetarian",
        "vegan",
        "mediterranean",
        "balanced",
        "paleo",
      ],
      shopping_category: [
        "produce",
        "meat",
        "dairy",
        "frozen",
        "dry_goods",
        "beverages",
        "household",
        "other",
      ],
    },
  },
} as const

