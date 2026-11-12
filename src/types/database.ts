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
      ad_contents: {
        Row: {
          ad_id: number
          attribution_pct: number | null
          content_id: number
          created_at: string | null
          id: number
          note: string | null
        }
        Insert: {
          ad_id: number
          attribution_pct?: number | null
          content_id: number
          created_at?: string | null
          id?: number
          note?: string | null
        }
        Update: {
          ad_id?: number
          attribution_pct?: number | null
          content_id?: number
          created_at?: string | null
          id?: number
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_contents_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_contents_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_contents_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_content_roi"
            referencedColumns: ["content_id"]
          },
        ]
      }
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
      app_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string | null
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          id: number
          name: string
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
          sort_order?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      content_assets: {
        Row: {
          asset_type: string
          category: string
          content_id: number
          created_at: string
          file_size: number | null
          id: number
          label: string | null
          mime_type: string | null
          sort_order: number
          storage_path: string | null
          uploaded_by: string | null
          url: string
        }
        Insert: {
          asset_type?: string
          category?: string
          content_id: number
          created_at?: string
          file_size?: number | null
          id?: number
          label?: string | null
          mime_type?: string | null
          sort_order?: number
          storage_path?: string | null
          uploaded_by?: string | null
          url: string
        }
        Update: {
          asset_type?: string
          category?: string
          content_id?: number
          created_at?: string
          file_size?: number | null
          id?: number
          label?: string | null
          mime_type?: string | null
          sort_order?: number
          storage_path?: string | null
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_assets_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_assets_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_content_roi"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "content_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_assignment_log: {
        Row: {
          assigned_at: string
          assigned_by_id: string | null
          assigned_by_name: string | null
          assigned_to_id: string | null
          assigned_to_name: string | null
          content_id: number
          id: number
          note: string | null
          role: string
        }
        Insert: {
          assigned_at?: string
          assigned_by_id?: string | null
          assigned_by_name?: string | null
          assigned_to_id?: string | null
          assigned_to_name?: string | null
          content_id: number
          id?: number
          note?: string | null
          role: string
        }
        Update: {
          assigned_at?: string
          assigned_by_id?: string | null
          assigned_by_name?: string | null
          assigned_to_id?: string | null
          assigned_to_name?: string | null
          content_id?: number
          id?: number
          note?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_assignment_log_assigned_by_id_fkey"
            columns: ["assigned_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_assignment_log_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_assignment_log_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_assignment_log_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_content_roi"
            referencedColumns: ["content_id"]
          },
        ]
      }
      content_types: {
        Row: {
          color: string
          created_at: string | null
          id: number
          name: string
          sort_order: number
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: number
          name: string
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: number
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      contents: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
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
          production_cost: number | null
          scheduled_post_date: string | null
          seq: number
          status: string | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
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
          production_cost?: number | null
          scheduled_post_date?: string | null
          seq: number
          status?: string | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
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
          production_cost?: number | null
          scheduled_post_date?: string | null
          seq?: number
          status?: string | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contents_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
      leads: {
        Row: {
          ad_id: number | null
          channel_in: string
          closed_at: string | null
          consent_at: string | null
          consent_given: boolean
          content_id: number | null
          created_at: string | null
          deal_amount: number | null
          id: number
          notes: string | null
          owner_id: string | null
          owner_name: string | null
          product_id: string
          status: string
          updated_at: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          ad_id?: number | null
          channel_in?: string
          closed_at?: string | null
          consent_at?: string | null
          consent_given?: boolean
          content_id?: number | null
          created_at?: string | null
          deal_amount?: number | null
          id?: number
          notes?: string | null
          owner_id?: string | null
          owner_name?: string | null
          product_id: string
          status?: string
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          ad_id?: number | null
          channel_in?: string
          closed_at?: string | null
          consent_at?: string | null
          consent_given?: boolean
          content_id?: number | null
          created_at?: string | null
          deal_amount?: number | null
          id?: number
          notes?: string | null
          owner_id?: string | null
          owner_name?: string | null
          product_id?: string
          status?: string
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_content_roi"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "leads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_product_id_fkey"
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
      product_features: {
        Row: {
          created_at: string | null
          id: number
          label: string
          product_id: string
          sort_order: number
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          label: string
          product_id: string
          sort_order?: number
          updated_at?: string | null
          value?: string
        }
        Update: {
          created_at?: string | null
          id?: number
          label?: string
          product_id?: string
          sort_order?: number
          updated_at?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_features_product_id_fkey"
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
          avatar_url: string | null
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
          avatar_url?: string | null
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
          avatar_url?: string | null
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
      report_schedules: {
        Row: {
          created_at: string
          created_by: string
          date_range_days: number
          format: string
          frequency: string
          id: number
          is_active: boolean
          last_sent_at: string | null
          name: string
          next_run_at: string | null
          product_filter: string[] | null
          recipients: string[]
          schedule_day: number | null
          schedule_time: string
          sections: string[]
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          date_range_days?: number
          format?: string
          frequency?: string
          id?: number
          is_active?: boolean
          last_sent_at?: string | null
          name: string
          next_run_at?: string | null
          product_filter?: string[] | null
          recipients?: string[]
          schedule_day?: number | null
          schedule_time?: string
          sections?: string[]
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          date_range_days?: number
          format?: string
          frequency?: string
          id?: number
          is_active?: boolean
          last_sent_at?: string | null
          name?: string
          next_run_at?: string | null
          product_filter?: string[] | null
          recipients?: string[]
          schedule_day?: number | null
          schedule_time?: string
          sections?: string[]
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_schedules_created_by_fkey"
            columns: ["created_by"]
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
      v_content_roi: {
        Row: {
          ad_cost_share: number | null
          assigned_to: string | null
          channel: string | null
          closed_leads: number | null
          content_id: number | null
          content_status: string | null
          conversion_rate: number | null
          deal_revenue: number | null
          product_id: string | null
          production_cost: number | null
          roi: number | null
          roi_pct: number | null
          seq: number | null
          title: string | null
          total_cost: number | null
          total_leads: number | null
          type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contents_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
        ]
      }
    }
    Functions: {
      get_my_approval_status: { Args: never; Returns: string }
      get_my_role: { Args: never; Returns: string }
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
