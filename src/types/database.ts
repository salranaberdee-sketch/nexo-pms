export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ads: {
        Row: {
          budget_adjustment: number | null
          budget_allocated: number | null
          budget_approved: number | null
          budget_remaining: number | null
          budget_spent: number | null
          budget_total: number | null
          campaign_name: string
          channel: string | null
          clicks: number | null
          content_ref: string | null
          cpl: number | null
          created_at: string | null
          end_date: string | null
          id: number
          leads: number | null
          managed_by: string | null
          managed_by_id: string | null
          month: string
          next_action: string | null
          product_id: string
          reach: number | null
          result_notes: string | null
          roas: number | null
          sales_amount: number | null
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          budget_adjustment?: number | null
          budget_allocated?: number | null
          budget_approved?: number | null
          budget_remaining?: number | null
          budget_spent?: number | null
          budget_total?: number | null
          campaign_name: string
          channel?: string | null
          clicks?: number | null
          content_ref?: string | null
          cpl?: number | null
          created_at?: string | null
          end_date?: string | null
          id?: number
          leads?: number | null
          managed_by?: string | null
          managed_by_id?: string | null
          month: string
          next_action?: string | null
          product_id: string
          reach?: number | null
          result_notes?: string | null
          roas?: number | null
          sales_amount?: number | null
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          budget_adjustment?: number | null
          budget_allocated?: number | null
          budget_approved?: number | null
          budget_remaining?: number | null
          budget_spent?: number | null
          budget_total?: number | null
          campaign_name?: string
          channel?: string | null
          clicks?: number | null
          content_ref?: string | null
          cpl?: number | null
          created_at?: string | null
          end_date?: string | null
          id?: number
          leads?: number | null
          managed_by?: string | null
          managed_by_id?: string | null
          month?: string
          next_action?: string | null
          product_id?: string
          reach?: number | null
          result_notes?: string | null
          roas?: number | null
          sales_amount?: number | null
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ads_managed_by_id_fkey"
            columns: ["managed_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
        ]
      }
      contents: {
        Row: {
          actual_post_date: string | null
          actual_submit_date: string | null
          approved_at: string | null
          approver: string | null
          approver_id: string | null
          assigned_date: string | null
          assigned_to: string | null
          assigned_to_id: string | null
          channel: string | null
          created_at: string | null
          cta: string | null
          deadline: string | null
          file_link: string | null
          file_reference: string | null
          format_size: string | null
          hook: string | null
          id: number
          issues: string | null
          message: string | null
          objective: string | null
          post_link: string | null
          poster: string | null
          poster_id: string | null
          producer: string | null
          producer_id: string | null
          product_id: string
          scheduled_post_date: string | null
          seq: number
          status: string | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          actual_post_date?: string | null
          actual_submit_date?: string | null
          approved_at?: string | null
          approver?: string | null
          approver_id?: string | null
          assigned_date?: string | null
          assigned_to?: string | null
          assigned_to_id?: string | null
          channel?: string | null
          created_at?: string | null
          cta?: string | null
          deadline?: string | null
          file_link?: string | null
          file_reference?: string | null
          format_size?: string | null
          hook?: string | null
          id?: number
          issues?: string | null
          message?: string | null
          objective?: string | null
          post_link?: string | null
          poster?: string | null
          poster_id?: string | null
          producer?: string | null
          producer_id?: string | null
          product_id: string
          scheduled_post_date?: string | null
          seq: number
          status?: string | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          actual_post_date?: string | null
          actual_submit_date?: string | null
          approved_at?: string | null
          approver?: string | null
          approver_id?: string | null
          assigned_date?: string | null
          assigned_to?: string | null
          assigned_to_id?: string | null
          channel?: string | null
          created_at?: string | null
          cta?: string | null
          deadline?: string | null
          file_link?: string | null
          file_reference?: string | null
          format_size?: string | null
          hook?: string | null
          id?: number
          issues?: string | null
          message?: string | null
          objective?: string | null
          post_link?: string | null
          poster?: string | null
          poster_id?: string | null
          producer?: string | null
          producer_id?: string | null
          product_id?: string
          scheduled_post_date?: string | null
          seq?: number
          status?: string | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contents_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contents_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contents_poster_id_fkey"
            columns: ["poster_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contents_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contents_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_briefs: {
        Row: {
          benefits: string | null
          brief_type: string
          competitors: string | null
          contact_channel: string | null
          created_at: string | null
          deliverables: string | null
          delivery: string | null
          evidence: string | null
          format: string | null
          highlights: string | null
          id: number
          instructors: string | null
          legal_info: string | null
          order_method: string | null
          packages: string | null
          payment_method: string | null
          price: string | null
          problem: string | null
          product_description: string | null
          product_id: string
          registration_link: string | null
          registration_period: string | null
          schedule: string | null
          target_audience: string | null
          topic: string | null
          updated_at: string | null
          usage_method: string | null
          warnings: string | null
          warranty: string | null
        }
        Insert: {
          benefits?: string | null
          brief_type: string
          competitors?: string | null
          contact_channel?: string | null
          created_at?: string | null
          deliverables?: string | null
          delivery?: string | null
          evidence?: string | null
          format?: string | null
          highlights?: string | null
          id?: number
          instructors?: string | null
          legal_info?: string | null
          order_method?: string | null
          packages?: string | null
          payment_method?: string | null
          price?: string | null
          problem?: string | null
          product_description?: string | null
          product_id: string
          registration_link?: string | null
          registration_period?: string | null
          schedule?: string | null
          target_audience?: string | null
          topic?: string | null
          updated_at?: string | null
          usage_method?: string | null
          warnings?: string | null
          warranty?: string | null
        }
        Update: {
          benefits?: string | null
          brief_type?: string
          competitors?: string | null
          contact_channel?: string | null
          created_at?: string | null
          deliverables?: string | null
          delivery?: string | null
          evidence?: string | null
          format?: string | null
          highlights?: string | null
          id?: number
          instructors?: string | null
          legal_info?: string | null
          order_method?: string | null
          packages?: string | null
          payment_method?: string | null
          price?: string | null
          problem?: string | null
          product_description?: string | null
          product_id?: string
          registration_link?: string | null
          registration_period?: string | null
          schedule?: string | null
          target_audience?: string | null
          topic?: string | null
          updated_at?: string | null
          usage_method?: string | null
          warnings?: string | null
          warranty?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_briefs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          business_type: string | null
          created_at: string | null
          created_by: string | null
          id: number
          name: string
          notes: string | null
          owner: string | null
          owner_id: string | null
          product_id: string
          product_type: string | null
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          brand?: string | null
          business_type?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: number
          name: string
          notes?: string | null
          owner?: string | null
          owner_id?: string | null
          product_id: string
          product_type?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          brand?: string | null
          business_type?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: number
          name?: string
          notes?: string | null
          owner?: string | null
          owner_id?: string | null
          product_id?: string
          product_type?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          brand_access: string[] | null
          created_at: string | null
          email: string
          id: string
          name: string
          role: string
          updated_at: string | null
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          brand_access?: string[] | null
          created_at?: string | null
          email: string
          id: string
          name: string
          role?: string
          updated_at?: string | null
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          brand_access?: string[] | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          role?: string
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
      sales: {
        Row: {
          actual_received: number | null
          actual_sales: number | null
          created_at: string | null
          id: number
          period_end: string
          period_start: string
          product_id: string
          sales_target_amount: number | null
          sales_target_count: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          actual_received?: number | null
          actual_sales?: number | null
          created_at?: string | null
          id?: number
          period_end: string
          period_start: string
          product_id: string
          sales_target_amount?: number | null
          sales_target_count?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_received?: number | null
          actual_sales?: number | null
          created_at?: string | null
          id?: number
          period_end?: string
          period_start?: string
          product_id?: string
          sales_target_amount?: number | null
          sales_target_count?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
