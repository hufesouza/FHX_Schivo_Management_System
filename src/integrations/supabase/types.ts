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
      compliance_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
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
      machines: {
        Row: {
          created_at: string
          description: string
          group_name: string
          id: string
          is_active: boolean | null
          load_unload_time: number | null
          machine_type: string
          max_cutting_feedrate: number | null
          max_spindle_rpm: number | null
          performance_factor: number | null
          probing_time: number | null
          rapid_rate_x: number | null
          rapid_rate_y: number | null
          rapid_rate_z: number | null
          resource: string
          suitable_for_5axis: boolean | null
          suitable_for_prismatic: boolean | null
          suitable_for_small_detailed: boolean | null
          suitable_for_turned: boolean | null
          tool_change_time: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          group_name: string
          id?: string
          is_active?: boolean | null
          load_unload_time?: number | null
          machine_type?: string
          max_cutting_feedrate?: number | null
          max_spindle_rpm?: number | null
          performance_factor?: number | null
          probing_time?: number | null
          rapid_rate_x?: number | null
          rapid_rate_y?: number | null
          rapid_rate_z?: number | null
          resource: string
          suitable_for_5axis?: boolean | null
          suitable_for_prismatic?: boolean | null
          suitable_for_small_detailed?: boolean | null
          suitable_for_turned?: boolean | null
          tool_change_time?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          group_name?: string
          id?: string
          is_active?: boolean | null
          load_unload_time?: number | null
          machine_type?: string
          max_cutting_feedrate?: number | null
          max_spindle_rpm?: number | null
          performance_factor?: number | null
          probing_time?: number | null
          rapid_rate_x?: number | null
          rapid_rate_y?: number | null
          rapid_rate_z?: number | null
          resource?: string
          suitable_for_5axis?: boolean | null
          suitable_for_prismatic?: boolean | null
          suitable_for_small_detailed?: boolean | null
          suitable_for_turned?: boolean | null
          tool_change_time?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      material_price_records: {
        Row: {
          created_at: string
          id: string
          material_id: string
          notes: string | null
          price_per_kg: number
          quantity_max: number | null
          quantity_min: number | null
          record_date: string
          supplier_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          notes?: string | null
          price_per_kg: number
          quantity_max?: number | null
          quantity_min?: number | null
          record_date?: string
          supplier_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          notes?: string | null
          price_per_kg?: number
          quantity_max?: number | null
          quantity_min?: number | null
          record_date?: string
          supplier_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_price_records_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "quote_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_actions: {
        Row: {
          action: string
          comments: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          meeting_id: string
          owner_id: string | null
          owner_name: string | null
          priority: string
          status: string
          updated_at: string
        }
        Insert: {
          action: string
          comments?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          meeting_id: string
          owner_id?: string | null
          owner_name?: string | null
          priority?: string
          status?: string
          updated_at?: string
        }
        Update: {
          action?: string
          comments?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          meeting_id?: string
          owner_id?: string | null
          owner_name?: string | null
          priority?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_actions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "daily_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_customers: {
        Row: {
          created_at: string
          deactivated_at: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          deactivated_at?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          deactivated_at?: string | null
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
      meeting_recognitions: {
        Row: {
          created_at: string
          id: string
          meeting_id: string
          reason: string
          recognized_by_id: string | null
          recognized_by_name: string
          recognized_user_id: string | null
          recognized_user_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_id: string
          reason: string
          recognized_by_id?: string | null
          recognized_by_name: string
          recognized_user_id?: string | null
          recognized_user_name: string
        }
        Update: {
          created_at?: string
          id?: string
          meeting_id?: string
          reason?: string
          recognized_by_id?: string | null
          recognized_by_name?: string
          recognized_user_id?: string | null
          recognized_user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_recognitions_meeting_id_fkey"
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
          deactivated_at: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          deactivated_at?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          deactivated_at?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      post_process_types: {
        Row: {
          created_at: string
          default_lead_time_days: number | null
          id: string
          is_active: boolean | null
          minimum_lot_charge: number | null
          name: string
          pricing_model: string
          setup_fee: number | null
          unit_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_lead_time_days?: number | null
          id?: string
          is_active?: boolean | null
          minimum_lot_charge?: number | null
          name: string
          pricing_model?: string
          setup_fee?: number | null
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_lead_time_days?: number | null
          id?: string
          is_active?: boolean | null
          minimum_lot_charge?: number | null
          name?: string
          pricing_model?: string
          setup_fee?: number | null
          unit_cost?: number
          updated_at?: string
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
      quick_quote_lines: {
        Row: {
          created_at: string
          id: string
          lead_time_days: number | null
          line_margin_percent: number | null
          manufacturing_cost_per_part: number | null
          material_cost_per_part: number | null
          pert_contingency: number | null
          pert_expected: number | null
          pert_high: number | null
          pert_low: number | null
          pert_most_likely: number | null
          post_process_cost_per_part_total: number | null
          quantity: number | null
          quote_id: string
          rfq_part_id: string
          sales_price_per_part: number | null
          sales_price_total: number | null
          total_cost_per_part: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          lead_time_days?: number | null
          line_margin_percent?: number | null
          manufacturing_cost_per_part?: number | null
          material_cost_per_part?: number | null
          pert_contingency?: number | null
          pert_expected?: number | null
          pert_high?: number | null
          pert_low?: number | null
          pert_most_likely?: number | null
          post_process_cost_per_part_total?: number | null
          quantity?: number | null
          quote_id: string
          rfq_part_id: string
          sales_price_per_part?: number | null
          sales_price_total?: number | null
          total_cost_per_part?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          lead_time_days?: number | null
          line_margin_percent?: number | null
          manufacturing_cost_per_part?: number | null
          material_cost_per_part?: number | null
          pert_contingency?: number | null
          pert_expected?: number | null
          pert_high?: number | null
          pert_low?: number | null
          pert_most_likely?: number | null
          post_process_cost_per_part_total?: number | null
          quantity?: number | null
          quote_id?: string
          rfq_part_id?: string
          sales_price_per_part?: number | null
          sales_price_total?: number | null
          total_cost_per_part?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quick_quote_lines_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quick_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_quote_lines_rfq_part_id_fkey"
            columns: ["rfq_part_id"]
            isOneToOne: false
            referencedRelation: "quick_quote_rfq_parts"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_quote_rfq_part_post_processes: {
        Row: {
          complexity_level: string | null
          created_at: string
          id: string
          override_setup_fee: number | null
          override_unit_cost: number | null
          post_process_type_id: string
          rfq_part_id: string
        }
        Insert: {
          complexity_level?: string | null
          created_at?: string
          id?: string
          override_setup_fee?: number | null
          override_unit_cost?: number | null
          post_process_type_id: string
          rfq_part_id: string
        }
        Update: {
          complexity_level?: string | null
          created_at?: string
          id?: string
          override_setup_fee?: number | null
          override_unit_cost?: number | null
          post_process_type_id?: string
          rfq_part_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_quote_rfq_part_post_processes_post_process_type_id_fkey"
            columns: ["post_process_type_id"]
            isOneToOne: false
            referencedRelation: "post_process_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_quote_rfq_part_post_processes_rfq_part_id_fkey"
            columns: ["rfq_part_id"]
            isOneToOne: false
            referencedRelation: "quick_quote_rfq_parts"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_quote_rfq_parts: {
        Row: {
          created_at: string
          description: string | null
          drawing_file_url: string | null
          estimated_net_weight_kg: number | null
          estimated_surface_area_m2: number | null
          id: string
          material_id: string | null
          material_text_raw: string | null
          part_number: string | null
          quantity_requested: number | null
          remarks: string | null
          rfq_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          drawing_file_url?: string | null
          estimated_net_weight_kg?: number | null
          estimated_surface_area_m2?: number | null
          id?: string
          material_id?: string | null
          material_text_raw?: string | null
          part_number?: string | null
          quantity_requested?: number | null
          remarks?: string | null
          rfq_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          drawing_file_url?: string | null
          estimated_net_weight_kg?: number | null
          estimated_surface_area_m2?: number | null
          id?: string
          material_id?: string | null
          material_text_raw?: string | null
          part_number?: string | null
          quantity_requested?: number | null
          remarks?: string | null
          rfq_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_quote_rfq_parts_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "quote_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_quote_rfq_parts_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "quick_quote_rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_quote_rfqs: {
        Row: {
          created_at: string
          customer_code: string | null
          customer_name: string | null
          due_date: string | null
          id: string
          notes: string | null
          received_date: string | null
          rfq_reference: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_code?: string | null
          customer_name?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          received_date?: string | null
          rfq_reference?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_code?: string | null
          customer_name?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          received_date?: string | null
          rfq_reference?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quick_quote_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      quick_quotes: {
        Row: {
          created_at: string
          currency: string | null
          global_margin_percent: number | null
          id: string
          quote_date: string | null
          quote_number: string | null
          rfq_id: string
          status: string | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          currency?: string | null
          global_margin_percent?: number | null
          id?: string
          quote_date?: string | null
          quote_number?: string | null
          rfq_id: string
          status?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          currency?: string | null
          global_margin_percent?: number | null
          id?: string
          quote_date?: string | null
          quote_number?: string | null
          rfq_id?: string
          status?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quick_quotes_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "quick_quote_rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_audit_trail: {
        Row: {
          action_type: string
          ai_prompt_version: string | null
          created_at: string
          cycle_time_result: number | null
          drawing_stored: boolean | null
          id: string
          ip_address: string | null
          machine_group: string | null
          machine_id: string | null
          material: string | null
          part_name: string | null
          quotation_id: string | null
          request_payload: Json | null
          response_summary: Json | null
          user_agent: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          ai_prompt_version?: string | null
          created_at?: string
          cycle_time_result?: number | null
          drawing_stored?: boolean | null
          id?: string
          ip_address?: string | null
          machine_group?: string | null
          machine_id?: string | null
          material?: string | null
          part_name?: string | null
          quotation_id?: string | null
          request_payload?: Json | null
          response_summary?: Json | null
          user_agent?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          ai_prompt_version?: string | null
          created_at?: string
          cycle_time_result?: number | null
          drawing_stored?: boolean | null
          id?: string
          ip_address?: string | null
          machine_group?: string | null
          machine_id?: string | null
          material?: string | null
          part_name?: string | null
          quotation_id?: string | null
          request_payload?: Json | null
          response_summary?: Json | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_audit_trail_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_audit_trail_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          ai_interpretation: Json | null
          blank_diameter: number | null
          blank_length: number | null
          blank_thickness: number | null
          blank_type: string | null
          blank_width: number | null
          calculated_cycle_time: number | null
          created_at: string
          drawing_url: string | null
          id: string
          material: string | null
          notes_to_ai: string | null
          order_quantity: number | null
          part_name: string | null
          production_type: string | null
          selected_machine_id: string | null
          status: string | null
          suggested_machine_id: string | null
          surface_finish: string | null
          tolerance_level: string | null
          total_machining_time: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_interpretation?: Json | null
          blank_diameter?: number | null
          blank_length?: number | null
          blank_thickness?: number | null
          blank_type?: string | null
          blank_width?: number | null
          calculated_cycle_time?: number | null
          created_at?: string
          drawing_url?: string | null
          id?: string
          material?: string | null
          notes_to_ai?: string | null
          order_quantity?: number | null
          part_name?: string | null
          production_type?: string | null
          selected_machine_id?: string | null
          status?: string | null
          suggested_machine_id?: string | null
          surface_finish?: string | null
          tolerance_level?: string | null
          total_machining_time?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_interpretation?: Json | null
          blank_diameter?: number | null
          blank_length?: number | null
          blank_thickness?: number | null
          blank_type?: string | null
          blank_width?: number | null
          calculated_cycle_time?: number | null
          created_at?: string
          drawing_url?: string | null
          id?: string
          material?: string | null
          notes_to_ai?: string | null
          order_quantity?: number | null
          part_name?: string | null
          production_type?: string | null
          selected_machine_id?: string | null
          status?: string | null
          suggested_machine_id?: string | null
          surface_finish?: string | null
          tolerance_level?: string | null
          total_machining_time?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotations_selected_machine_id_fkey"
            columns: ["selected_machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_suggested_machine_id_fkey"
            columns: ["suggested_machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_materials: {
        Row: {
          created_at: string
          default_yield: number | null
          density_kg_m3: number | null
          dimension_range: string | null
          form: string | null
          grade: string | null
          id: string
          inflation_rate_per_year: number | null
          is_active: boolean | null
          name: string
          updated_at: string
          volatility_level: string | null
        }
        Insert: {
          created_at?: string
          default_yield?: number | null
          density_kg_m3?: number | null
          dimension_range?: string | null
          form?: string | null
          grade?: string | null
          id?: string
          inflation_rate_per_year?: number | null
          is_active?: boolean | null
          name: string
          updated_at?: string
          volatility_level?: string | null
        }
        Update: {
          created_at?: string
          default_yield?: number | null
          density_kg_m3?: number | null
          dimension_range?: string | null
          form?: string | null
          grade?: string | null
          id?: string
          inflation_rate_per_year?: number | null
          is_active?: boolean | null
          name?: string
          updated_at?: string
          volatility_level?: string | null
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
