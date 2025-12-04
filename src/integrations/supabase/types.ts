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
      daily_meetings: {
        Row: {
          created_at: string
          created_by: string
          id: string
          meeting_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          meeting_date?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          meeting_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      form_fields: {
        Row: {
          created_at: string
          display_order: number
          field_key: string
          field_type: string
          id: string
          is_active: boolean
          label: string
          options: Json | null
          placeholder: string | null
          required: boolean
          section: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          field_key: string
          field_type: string
          id?: string
          is_active?: boolean
          label: string
          options?: Json | null
          placeholder?: string | null
          required?: boolean
          section: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          field_key?: string
          field_type?: string
          id?: string
          is_active?: boolean
          label?: string
          options?: Json | null
          placeholder?: string | null
          required?: boolean
          section?: string
          updated_at?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: []
      }
      meeting_customers: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      meeting_flags: {
        Row: {
          comment: string | null
          customer_id: string
          id: string
          meeting_id: string
          status: string
          topic_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          comment?: string | null
          customer_id: string
          id?: string
          meeting_id: string
          status?: string
          topic_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          comment?: string | null
          customer_id?: string
          id?: string
          meeting_id?: string
          status?: string
          topic_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_flags_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "meeting_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_flags_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "daily_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_flags_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "meeting_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_participants: {
        Row: {
          attended: boolean
          created_at: string
          id: string
          meeting_id: string
          user_id: string
        }
        Insert: {
          attended?: boolean
          created_at?: string
          id?: string
          meeting_id: string
          user_id: string
        }
        Update: {
          attended?: boolean
          created_at?: string
          id?: string
          meeting_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "daily_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_topics: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_by: string | null
          assigned_to: string
          completed_at: string | null
          created_at: string
          department: string
          id: string
          status: string
          work_order_id: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to: string
          completed_at?: string | null
          created_at?: string
          department: string
          id?: string
          status?: string
          work_order_id: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string
          completed_at?: string | null
          created_at?: string
          department?: string
          id?: string
          status?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
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
      work_orders: {
        Row: {
          acceptable_to_change_details: string | null
          acceptable_to_change_white: boolean | null
          additional_requirements: boolean | null
          additional_requirements_details: string | null
          all_sections_details: string | null
          all_sections_filled: boolean | null
          approval_status_details: string | null
          approval_status_updated: boolean | null
          bom_hardware_available: boolean | null
          bom_hardware_details: string | null
          bom_lead_time: string | null
          cmm_lead_time: string | null
          cmm_program_details: string | null
          cmm_program_required: boolean | null
          created_at: string
          current_stage: string
          customer: string | null
          deburr_time: number | null
          drawings_available: boolean | null
          drawings_details: string | null
          engineering_approved_by: string | null
          engineering_approved_date: string | null
          est_cycle_time: number | null
          est_development_time: number | null
          est_setup_time: number | null
          est_tooling_cost: number | null
          fair_complete: boolean | null
          fair_details: string | null
          fixtures_details: string | null
          fixtures_lead_time: string | null
          fixtures_required: boolean | null
          gauges_calibrated: boolean | null
          gauges_details: string | null
          icn_number: string | null
          id: string
          ims_updated: boolean | null
          ims_updated_details: string | null
          inspection_aql_details: string | null
          inspection_aql_specified: boolean | null
          inspection_sheet_available: boolean | null
          inspection_sheet_details: string | null
          inspection_time: number | null
          material_leadtime: string | null
          material_size_allowance: string | null
          material_size_correct: boolean | null
          material_size_details: string | null
          npi_approval_by: string | null
          npi_approval_date: string | null
          npi_final_comments: string | null
          npi_final_signature: string | null
          npi_final_signature_date: string | null
          operations_comments: string | null
          operations_work_centres: Json | null
          part_and_rev: string | null
          quality_additional_details: string | null
          quality_additional_requirements: boolean | null
          quality_gauges_calibrated: boolean | null
          quality_gauges_details: string | null
          quality_signature: string | null
          quality_signature_date: string | null
          routing_operations_details: string | null
          routing_operations_removed: boolean | null
          sap_changes_completed: boolean | null
          sap_changes_details: string | null
          status: string
          supply_chain_signature: string | null
          supply_chain_signature_date: string | null
          tooling_details: string | null
          tooling_in_matrix: boolean | null
          tooling_lead_time: string | null
          updated_at: string
          user_id: string
          wash_time: number | null
          work_order_number: string | null
        }
        Insert: {
          acceptable_to_change_details?: string | null
          acceptable_to_change_white?: boolean | null
          additional_requirements?: boolean | null
          additional_requirements_details?: string | null
          all_sections_details?: string | null
          all_sections_filled?: boolean | null
          approval_status_details?: string | null
          approval_status_updated?: boolean | null
          bom_hardware_available?: boolean | null
          bom_hardware_details?: string | null
          bom_lead_time?: string | null
          cmm_lead_time?: string | null
          cmm_program_details?: string | null
          cmm_program_required?: boolean | null
          created_at?: string
          current_stage?: string
          customer?: string | null
          deburr_time?: number | null
          drawings_available?: boolean | null
          drawings_details?: string | null
          engineering_approved_by?: string | null
          engineering_approved_date?: string | null
          est_cycle_time?: number | null
          est_development_time?: number | null
          est_setup_time?: number | null
          est_tooling_cost?: number | null
          fair_complete?: boolean | null
          fair_details?: string | null
          fixtures_details?: string | null
          fixtures_lead_time?: string | null
          fixtures_required?: boolean | null
          gauges_calibrated?: boolean | null
          gauges_details?: string | null
          icn_number?: string | null
          id?: string
          ims_updated?: boolean | null
          ims_updated_details?: string | null
          inspection_aql_details?: string | null
          inspection_aql_specified?: boolean | null
          inspection_sheet_available?: boolean | null
          inspection_sheet_details?: string | null
          inspection_time?: number | null
          material_leadtime?: string | null
          material_size_allowance?: string | null
          material_size_correct?: boolean | null
          material_size_details?: string | null
          npi_approval_by?: string | null
          npi_approval_date?: string | null
          npi_final_comments?: string | null
          npi_final_signature?: string | null
          npi_final_signature_date?: string | null
          operations_comments?: string | null
          operations_work_centres?: Json | null
          part_and_rev?: string | null
          quality_additional_details?: string | null
          quality_additional_requirements?: boolean | null
          quality_gauges_calibrated?: boolean | null
          quality_gauges_details?: string | null
          quality_signature?: string | null
          quality_signature_date?: string | null
          routing_operations_details?: string | null
          routing_operations_removed?: boolean | null
          sap_changes_completed?: boolean | null
          sap_changes_details?: string | null
          status?: string
          supply_chain_signature?: string | null
          supply_chain_signature_date?: string | null
          tooling_details?: string | null
          tooling_in_matrix?: boolean | null
          tooling_lead_time?: string | null
          updated_at?: string
          user_id: string
          wash_time?: number | null
          work_order_number?: string | null
        }
        Update: {
          acceptable_to_change_details?: string | null
          acceptable_to_change_white?: boolean | null
          additional_requirements?: boolean | null
          additional_requirements_details?: string | null
          all_sections_details?: string | null
          all_sections_filled?: boolean | null
          approval_status_details?: string | null
          approval_status_updated?: boolean | null
          bom_hardware_available?: boolean | null
          bom_hardware_details?: string | null
          bom_lead_time?: string | null
          cmm_lead_time?: string | null
          cmm_program_details?: string | null
          cmm_program_required?: boolean | null
          created_at?: string
          current_stage?: string
          customer?: string | null
          deburr_time?: number | null
          drawings_available?: boolean | null
          drawings_details?: string | null
          engineering_approved_by?: string | null
          engineering_approved_date?: string | null
          est_cycle_time?: number | null
          est_development_time?: number | null
          est_setup_time?: number | null
          est_tooling_cost?: number | null
          fair_complete?: boolean | null
          fair_details?: string | null
          fixtures_details?: string | null
          fixtures_lead_time?: string | null
          fixtures_required?: boolean | null
          gauges_calibrated?: boolean | null
          gauges_details?: string | null
          icn_number?: string | null
          id?: string
          ims_updated?: boolean | null
          ims_updated_details?: string | null
          inspection_aql_details?: string | null
          inspection_aql_specified?: boolean | null
          inspection_sheet_available?: boolean | null
          inspection_sheet_details?: string | null
          inspection_time?: number | null
          material_leadtime?: string | null
          material_size_allowance?: string | null
          material_size_correct?: boolean | null
          material_size_details?: string | null
          npi_approval_by?: string | null
          npi_approval_date?: string | null
          npi_final_comments?: string | null
          npi_final_signature?: string | null
          npi_final_signature_date?: string | null
          operations_comments?: string | null
          operations_work_centres?: Json | null
          part_and_rev?: string | null
          quality_additional_details?: string | null
          quality_additional_requirements?: boolean | null
          quality_gauges_calibrated?: boolean | null
          quality_gauges_details?: string | null
          quality_signature?: string | null
          quality_signature_date?: string | null
          routing_operations_details?: string | null
          routing_operations_removed?: boolean | null
          sap_changes_completed?: boolean | null
          sap_changes_details?: string | null
          status?: string
          supply_chain_signature?: string | null
          supply_chain_signature_date?: string | null
          tooling_details?: string | null
          tooling_in_matrix?: boolean | null
          tooling_lead_time?: string | null
          updated_at?: string
          user_id?: string
          wash_time?: number | null
          work_order_number?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_users_by_department: {
        Args: { _department: string }
        Returns: {
          email: string
          full_name: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "engineering"
        | "operations"
        | "quality"
        | "npi"
        | "supply_chain"
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
        "admin",
        "engineering",
        "operations",
        "quality",
        "npi",
        "supply_chain",
      ],
    },
  },
} as const
