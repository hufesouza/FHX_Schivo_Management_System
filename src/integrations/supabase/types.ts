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
      capacity_data: {
        Row: {
          created_at: string
          data: Json
          department: string
          file_name: string
          id: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          data: Json
          department: string
          file_name: string
          id?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          data?: Json
          department?: string
          file_name?: string
          id?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
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
      enquiry_log: {
        Row: {
          aging: number | null
          business_type: string | null
          comments: string | null
          commercial_owner: string | null
          created_at: string
          customer: string | null
          customer_type: string | null
          date_po_received: string | null
          date_quote_submitted: string | null
          date_received: string | null
          details: string | null
          ecd_quote_submission: string | null
          enquiry_no: string
          id: string
          is_quoted: boolean | null
          npi_owner: string | null
          po_received: boolean | null
          po_value_euro: number | null
          priority: string | null
          quantity_parts_quoted: number | null
          quoted_gap: number | null
          quoted_price_euro: number | null
          status: string | null
          turnaround_days: number | null
          updated_at: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          aging?: number | null
          business_type?: string | null
          comments?: string | null
          commercial_owner?: string | null
          created_at?: string
          customer?: string | null
          customer_type?: string | null
          date_po_received?: string | null
          date_quote_submitted?: string | null
          date_received?: string | null
          details?: string | null
          ecd_quote_submission?: string | null
          enquiry_no: string
          id?: string
          is_quoted?: boolean | null
          npi_owner?: string | null
          po_received?: boolean | null
          po_value_euro?: number | null
          priority?: string | null
          quantity_parts_quoted?: number | null
          quoted_gap?: number | null
          quoted_price_euro?: number | null
          status?: string | null
          turnaround_days?: number | null
          updated_at?: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          aging?: number | null
          business_type?: string | null
          comments?: string | null
          commercial_owner?: string | null
          created_at?: string
          customer?: string | null
          customer_type?: string | null
          date_po_received?: string | null
          date_quote_submitted?: string | null
          date_received?: string | null
          details?: string | null
          ecd_quote_submission?: string | null
          enquiry_no?: string
          id?: string
          is_quoted?: boolean | null
          npi_owner?: string | null
          po_received?: boolean | null
          po_value_euro?: number | null
          priority?: string | null
          quantity_parts_quoted?: number | null
          quoted_gap?: number | null
          quoted_price_euro?: number | null
          status?: string | null
          turnaround_days?: number | null
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      enquiry_quotation_parts: {
        Row: {
          created_at: string
          days_dev_time: number | null
          description: string | null
          dev_time_cost: number | null
          development_time: number | null
          id: string
          labour_per_hr: number | null
          labour_processing_cost: number | null
          line_number: number
          machine_cost_per_min: number | null
          machine_manning: string | null
          machine_run_time: number | null
          machine_setup: number | null
          margin: number | null
          material_markup: number | null
          material_name: string | null
          material_qty_per_unit: number | null
          material_std_cost_est: number | null
          nre: number | null
          overheads_per_hr: number | null
          part_deburr: number | null
          part_number: string | null
          quantity: number | null
          quotation_id: string
          resource: string | null
          secondary_ops_cost_per_min: number | null
          shift: number | null
          subcon_cost: number | null
          subcon_cost_per_part: number | null
          subcon_markup: number | null
          tooling: number | null
          total_cost_per_part: number | null
          total_material: number | null
          unit_price: number | null
          volume: number | null
          wash: number | null
        }
        Insert: {
          created_at?: string
          days_dev_time?: number | null
          description?: string | null
          dev_time_cost?: number | null
          development_time?: number | null
          id?: string
          labour_per_hr?: number | null
          labour_processing_cost?: number | null
          line_number: number
          machine_cost_per_min?: number | null
          machine_manning?: string | null
          machine_run_time?: number | null
          machine_setup?: number | null
          margin?: number | null
          material_markup?: number | null
          material_name?: string | null
          material_qty_per_unit?: number | null
          material_std_cost_est?: number | null
          nre?: number | null
          overheads_per_hr?: number | null
          part_deburr?: number | null
          part_number?: string | null
          quantity?: number | null
          quotation_id: string
          resource?: string | null
          secondary_ops_cost_per_min?: number | null
          shift?: number | null
          subcon_cost?: number | null
          subcon_cost_per_part?: number | null
          subcon_markup?: number | null
          tooling?: number | null
          total_cost_per_part?: number | null
          total_material?: number | null
          unit_price?: number | null
          volume?: number | null
          wash?: number | null
        }
        Update: {
          created_at?: string
          days_dev_time?: number | null
          description?: string | null
          dev_time_cost?: number | null
          development_time?: number | null
          id?: string
          labour_per_hr?: number | null
          labour_processing_cost?: number | null
          line_number?: number
          machine_cost_per_min?: number | null
          machine_manning?: string | null
          machine_run_time?: number | null
          machine_setup?: number | null
          margin?: number | null
          material_markup?: number | null
          material_name?: string | null
          material_qty_per_unit?: number | null
          material_std_cost_est?: number | null
          nre?: number | null
          overheads_per_hr?: number | null
          part_deburr?: number | null
          part_number?: string | null
          quantity?: number | null
          quotation_id?: string
          resource?: string | null
          secondary_ops_cost_per_min?: number | null
          shift?: number | null
          subcon_cost?: number | null
          subcon_cost_per_part?: number | null
          subcon_markup?: number | null
          tooling?: number | null
          total_cost_per_part?: number | null
          total_material?: number | null
          unit_price?: number | null
          volume?: number | null
          wash?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "enquiry_quotation_parts_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "enquiry_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiry_quotations: {
        Row: {
          average_margin: number | null
          created_at: string
          created_by: string
          customer: string
          enquiry_no: string
          id: string
          notes: string | null
          source_file_name: string | null
          status: string
          total_cost: number | null
          total_quoted_price: number | null
          updated_at: string
        }
        Insert: {
          average_margin?: number | null
          created_at?: string
          created_by: string
          customer: string
          enquiry_no: string
          id?: string
          notes?: string | null
          source_file_name?: string | null
          status?: string
          total_cost?: number | null
          total_quoted_price?: number | null
          updated_at?: string
        }
        Update: {
          average_margin?: number | null
          created_at?: string
          created_by?: string
          customer?: string
          enquiry_no?: string
          id?: string
          notes?: string | null
          source_file_name?: string | null
          status?: string
          total_cost?: number | null
          total_quoted_price?: number | null
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
      job_move_history: {
        Row: {
          from_machine: string
          id: string
          job_id: string
          moved_at: string
          moved_by: string
          new_duration_hours: number
          new_start_datetime: string | null
          old_duration_hours: number
          old_start_datetime: string | null
          reason: string | null
          to_machine: string
        }
        Insert: {
          from_machine: string
          id?: string
          job_id: string
          moved_at?: string
          moved_by: string
          new_duration_hours: number
          new_start_datetime?: string | null
          old_duration_hours: number
          old_start_datetime?: string | null
          reason?: string | null
          to_machine: string
        }
        Update: {
          from_machine?: string
          id?: string
          job_id?: string
          moved_at?: string
          moved_by?: string
          new_duration_hours?: number
          new_start_datetime?: string | null
          old_duration_hours?: number
          old_start_datetime?: string | null
          reason?: string | null
          to_machine?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_move_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
        ]
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
      npi_audit_log: {
        Row: {
          action_description: string
          action_type: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          performed_at: string
          performed_by: string
          performed_by_name: string | null
          project_id: string
          user_agent: string | null
        }
        Insert: {
          action_description: string
          action_type: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          performed_at?: string
          performed_by: string
          performed_by_name?: string | null
          project_id: string
          user_agent?: string | null
        }
        Update: {
          action_description?: string
          action_type?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          performed_at?: string
          performed_by?: string
          performed_by_name?: string | null
          project_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "npi_audit_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "npi_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      npi_blue_reviews: {
        Row: {
          all_stages_complete: boolean | null
          created_at: string
          id: string
          notes: string | null
          project_id: string
          stage_1_approved_by: string | null
          stage_1_approved_date: string | null
          stage_1_complete: boolean | null
          stage_2_approved_by: string | null
          stage_2_approved_date: string | null
          stage_2_complete: boolean | null
          stage_3_approved_by: string | null
          stage_3_approved_date: string | null
          stage_3_complete: boolean | null
          stage_4_approved_by: string | null
          stage_4_approved_date: string | null
          stage_4_complete: boolean | null
          stage_5_approved_by: string | null
          stage_5_approved_date: string | null
          stage_5_complete: boolean | null
          updated_at: string
          work_order_id: string | null
        }
        Insert: {
          all_stages_complete?: boolean | null
          created_at?: string
          id?: string
          notes?: string | null
          project_id: string
          stage_1_approved_by?: string | null
          stage_1_approved_date?: string | null
          stage_1_complete?: boolean | null
          stage_2_approved_by?: string | null
          stage_2_approved_date?: string | null
          stage_2_complete?: boolean | null
          stage_3_approved_by?: string | null
          stage_3_approved_date?: string | null
          stage_3_complete?: boolean | null
          stage_4_approved_by?: string | null
          stage_4_approved_date?: string | null
          stage_4_complete?: boolean | null
          stage_5_approved_by?: string | null
          stage_5_approved_date?: string | null
          stage_5_complete?: boolean | null
          updated_at?: string
          work_order_id?: string | null
        }
        Update: {
          all_stages_complete?: boolean | null
          created_at?: string
          id?: string
          notes?: string | null
          project_id?: string
          stage_1_approved_by?: string | null
          stage_1_approved_date?: string | null
          stage_1_complete?: boolean | null
          stage_2_approved_by?: string | null
          stage_2_approved_date?: string | null
          stage_2_complete?: boolean | null
          stage_3_approved_by?: string | null
          stage_3_approved_date?: string | null
          stage_3_complete?: boolean | null
          stage_4_approved_by?: string | null
          stage_4_approved_date?: string | null
          stage_4_complete?: boolean | null
          stage_5_approved_by?: string | null
          stage_5_approved_date?: string | null
          stage_5_complete?: boolean | null
          updated_at?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "npi_blue_reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "npi_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      npi_evidence: {
        Row: {
          description: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          task_id: string
          uploaded_at: string
          uploaded_by: string
          uploaded_by_name: string | null
        }
        Insert: {
          description?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          task_id: string
          uploaded_at?: string
          uploaded_by: string
          uploaded_by_name?: string | null
        }
        Update: {
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          task_id?: string
          uploaded_at?: string
          uploaded_by?: string
          uploaded_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "npi_evidence_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "npi_phase_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      npi_handshakes: {
        Row: {
          created_at: string
          from_confirmed: boolean | null
          from_confirmed_date: string | null
          from_notes: string | null
          from_party_id: string | null
          from_party_name: string | null
          from_party_role: string
          handshake_type: string
          id: string
          is_complete: boolean | null
          project_id: string
          to_confirmed: boolean | null
          to_confirmed_date: string | null
          to_notes: string | null
          to_party_id: string | null
          to_party_name: string | null
          to_party_role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_confirmed?: boolean | null
          from_confirmed_date?: string | null
          from_notes?: string | null
          from_party_id?: string | null
          from_party_name?: string | null
          from_party_role: string
          handshake_type: string
          id?: string
          is_complete?: boolean | null
          project_id: string
          to_confirmed?: boolean | null
          to_confirmed_date?: string | null
          to_notes?: string | null
          to_party_id?: string | null
          to_party_name?: string | null
          to_party_role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_confirmed?: boolean | null
          from_confirmed_date?: string | null
          from_notes?: string | null
          from_party_id?: string | null
          from_party_name?: string | null
          from_party_role?: string
          handshake_type?: string
          id?: string
          is_complete?: boolean | null
          project_id?: string
          to_confirmed?: boolean | null
          to_confirmed_date?: string | null
          to_notes?: string | null
          to_party_id?: string | null
          to_party_name?: string | null
          to_party_role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "npi_handshakes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "npi_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      npi_phase_gates: {
        Row: {
          all_tasks_complete: boolean | null
          created_at: string
          evidence_verified: boolean | null
          from_phase: string
          gate_name: string
          id: string
          is_overridden: boolean | null
          is_passed: boolean | null
          ops_approved_by: string | null
          ops_approved_date: string | null
          overridden_by: string | null
          overridden_date: string | null
          override_reason: string | null
          passed_by: string | null
          passed_date: string | null
          pm_approved_by: string | null
          pm_approved_date: string | null
          project_id: string
          qa_approved_by: string | null
          qa_approved_date: string | null
          requires_ops_approval: boolean | null
          requires_pm_approval: boolean | null
          requires_qa_approval: boolean | null
          requires_sc_approval: boolean | null
          sc_approved_by: string | null
          sc_approved_date: string | null
          to_phase: string
          updated_at: string
        }
        Insert: {
          all_tasks_complete?: boolean | null
          created_at?: string
          evidence_verified?: boolean | null
          from_phase: string
          gate_name: string
          id?: string
          is_overridden?: boolean | null
          is_passed?: boolean | null
          ops_approved_by?: string | null
          ops_approved_date?: string | null
          overridden_by?: string | null
          overridden_date?: string | null
          override_reason?: string | null
          passed_by?: string | null
          passed_date?: string | null
          pm_approved_by?: string | null
          pm_approved_date?: string | null
          project_id: string
          qa_approved_by?: string | null
          qa_approved_date?: string | null
          requires_ops_approval?: boolean | null
          requires_pm_approval?: boolean | null
          requires_qa_approval?: boolean | null
          requires_sc_approval?: boolean | null
          sc_approved_by?: string | null
          sc_approved_date?: string | null
          to_phase: string
          updated_at?: string
        }
        Update: {
          all_tasks_complete?: boolean | null
          created_at?: string
          evidence_verified?: boolean | null
          from_phase?: string
          gate_name?: string
          id?: string
          is_overridden?: boolean | null
          is_passed?: boolean | null
          ops_approved_by?: string | null
          ops_approved_date?: string | null
          overridden_by?: string | null
          overridden_date?: string | null
          override_reason?: string | null
          passed_by?: string | null
          passed_date?: string | null
          pm_approved_by?: string | null
          pm_approved_date?: string | null
          project_id?: string
          qa_approved_by?: string | null
          qa_approved_date?: string | null
          requires_ops_approval?: boolean | null
          requires_pm_approval?: boolean | null
          requires_qa_approval?: boolean | null
          requires_sc_approval?: boolean | null
          sc_approved_by?: string | null
          sc_approved_date?: string | null
          to_phase?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "npi_phase_gates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "npi_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      npi_phase_tasks: {
        Row: {
          blocked_by_task_id: string | null
          blocker_reason: string | null
          completed_by: string | null
          completed_by_name: string | null
          completed_date: string | null
          created_at: string
          description: string | null
          display_order: number | null
          due_date: string | null
          evidence_file_url: string | null
          evidence_notes: string | null
          evidence_reference: string | null
          evidence_required: boolean | null
          evidence_type: string | null
          id: string
          is_blocking: boolean | null
          is_mandatory: boolean | null
          owner_department: string
          owner_id: string | null
          owner_name: string | null
          phase: string
          project_id: string
          reference_document: string | null
          started_date: string | null
          status: string
          task_code: string
          task_name: string
          updated_at: string
        }
        Insert: {
          blocked_by_task_id?: string | null
          blocker_reason?: string | null
          completed_by?: string | null
          completed_by_name?: string | null
          completed_date?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          due_date?: string | null
          evidence_file_url?: string | null
          evidence_notes?: string | null
          evidence_reference?: string | null
          evidence_required?: boolean | null
          evidence_type?: string | null
          id?: string
          is_blocking?: boolean | null
          is_mandatory?: boolean | null
          owner_department: string
          owner_id?: string | null
          owner_name?: string | null
          phase: string
          project_id: string
          reference_document?: string | null
          started_date?: string | null
          status?: string
          task_code: string
          task_name: string
          updated_at?: string
        }
        Update: {
          blocked_by_task_id?: string | null
          blocker_reason?: string | null
          completed_by?: string | null
          completed_by_name?: string | null
          completed_date?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          due_date?: string | null
          evidence_file_url?: string | null
          evidence_notes?: string | null
          evidence_reference?: string | null
          evidence_required?: boolean | null
          evidence_type?: string | null
          id?: string
          is_blocking?: boolean | null
          is_mandatory?: boolean | null
          owner_department?: string
          owner_id?: string | null
          owner_name?: string | null
          phase?: string
          project_id?: string
          reference_document?: string | null
          started_date?: string | null
          status?: string
          task_code?: string
          task_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "npi_phase_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "npi_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      npi_project_charter: {
        Row: {
          approved_by_name: string | null
          approved_by_position: string | null
          approved_date: string | null
          approved_signature: string | null
          created_at: string
          expected_outcome: string | null
          id: string
          is_approved: boolean | null
          project_description: string | null
          project_id: string
          project_owner: string | null
          project_reference: string | null
          purpose: string | null
          revision: number | null
          timelines_milestones: string | null
          updated_at: string
        }
        Insert: {
          approved_by_name?: string | null
          approved_by_position?: string | null
          approved_date?: string | null
          approved_signature?: string | null
          created_at?: string
          expected_outcome?: string | null
          id?: string
          is_approved?: boolean | null
          project_description?: string | null
          project_id: string
          project_owner?: string | null
          project_reference?: string | null
          purpose?: string | null
          revision?: number | null
          timelines_milestones?: string | null
          updated_at?: string
        }
        Update: {
          approved_by_name?: string | null
          approved_by_position?: string | null
          approved_date?: string | null
          approved_signature?: string | null
          created_at?: string
          expected_outcome?: string | null
          id?: string
          is_approved?: boolean | null
          project_description?: string | null
          project_id?: string
          project_owner?: string | null
          project_reference?: string | null
          purpose?: string | null
          revision?: number | null
          timelines_milestones?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "npi_project_charter_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "npi_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      npi_project_milestones: {
        Row: {
          actual_date: string | null
          approved_by: string | null
          created_at: string
          display_order: number | null
          id: string
          milestone_name: string
          notes: string | null
          phase: string
          project_id: string
          status: string
          target_date: string | null
          updated_at: string
        }
        Insert: {
          actual_date?: string | null
          approved_by?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          milestone_name: string
          notes?: string | null
          phase: string
          project_id: string
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          actual_date?: string | null
          approved_by?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          milestone_name?: string
          notes?: string | null
          phase?: string
          project_id?: string
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "npi_project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "npi_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      npi_project_team: {
        Row: {
          created_at: string
          department: string | null
          id: string
          is_active: boolean | null
          project_id: string
          responsibilities: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          id?: string
          is_active?: boolean | null
          project_id: string
          responsibilities?: string | null
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          id?: string
          is_active?: boolean | null
          project_id?: string
          responsibilities?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "npi_project_team_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "npi_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      npi_projects: {
        Row: {
          actual_completion_date: string | null
          created_at: string
          created_by: string
          current_phase: string
          customer: string | null
          description: string | null
          id: string
          npi_lead_id: string | null
          po_number: string | null
          po_received_date: string | null
          project_manager_id: string | null
          project_name: string
          project_number: string
          project_type: string
          quotation_reference: string | null
          quote_submitted_date: string | null
          rfq_received_date: string | null
          sales_owner_id: string | null
          sap_part_number: string | null
          status: string
          target_completion_date: string | null
          updated_at: string
          work_order_number: string | null
        }
        Insert: {
          actual_completion_date?: string | null
          created_at?: string
          created_by: string
          current_phase?: string
          customer?: string | null
          description?: string | null
          id?: string
          npi_lead_id?: string | null
          po_number?: string | null
          po_received_date?: string | null
          project_manager_id?: string | null
          project_name: string
          project_number: string
          project_type?: string
          quotation_reference?: string | null
          quote_submitted_date?: string | null
          rfq_received_date?: string | null
          sales_owner_id?: string | null
          sap_part_number?: string | null
          status?: string
          target_completion_date?: string | null
          updated_at?: string
          work_order_number?: string | null
        }
        Update: {
          actual_completion_date?: string | null
          created_at?: string
          created_by?: string
          current_phase?: string
          customer?: string | null
          description?: string | null
          id?: string
          npi_lead_id?: string | null
          po_number?: string | null
          po_received_date?: string | null
          project_manager_id?: string | null
          project_name?: string
          project_number?: string
          project_type?: string
          quotation_reference?: string | null
          quote_submitted_date?: string | null
          rfq_received_date?: string | null
          sales_owner_id?: string | null
          sap_part_number?: string | null
          status?: string
          target_completion_date?: string | null
          updated_at?: string
          work_order_number?: string | null
        }
        Relationships: []
      }
      personal_actions: {
        Row: {
          action: string
          comments: string | null
          created_at: string
          due_date: string | null
          id: string
          owner_id: string | null
          owner_name: string | null
          priority: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action: string
          comments?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          owner_id?: string | null
          owner_name?: string | null
          priority?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action?: string
          comments?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          owner_id?: string | null
          owner_name?: string | null
          priority?: string
          status?: string
          updated_at?: string
          user_id?: string
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
      production_jobs: {
        Row: {
          comments: string | null
          created_at: string
          customer: string | null
          days_from_today: number | null
          department: string
          duration_hours: number
          end_product: string | null
          id: string
          is_manually_moved: boolean
          item_name: string | null
          machine: string
          moved_at: string | null
          moved_by: string | null
          operation_no: string | null
          original_duration_hours: number
          original_machine: string
          priority: number | null
          process_order: string
          production_order: string | null
          qty: number | null
          start_datetime: string
          status: string | null
          updated_at: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          comments?: string | null
          created_at?: string
          customer?: string | null
          days_from_today?: number | null
          department: string
          duration_hours?: number
          end_product?: string | null
          id?: string
          is_manually_moved?: boolean
          item_name?: string | null
          machine: string
          moved_at?: string | null
          moved_by?: string | null
          operation_no?: string | null
          original_duration_hours?: number
          original_machine: string
          priority?: number | null
          process_order: string
          production_order?: string | null
          qty?: number | null
          start_datetime: string
          status?: string | null
          updated_at?: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          comments?: string | null
          created_at?: string
          customer?: string | null
          days_from_today?: number | null
          department?: string
          duration_hours?: number
          end_product?: string | null
          id?: string
          is_manually_moved?: boolean
          item_name?: string | null
          machine?: string
          moved_at?: string | null
          moved_by?: string | null
          operation_no?: string | null
          original_duration_hours?: number
          original_machine?: string
          priority?: number | null
          process_order?: string
          production_order?: string | null
          qty?: number | null
          start_datetime?: string
          status?: string | null
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string
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
      quotation_material_suppliers: {
        Row: {
          bp_code: string
          bp_name: string
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          bp_code: string
          bp_name: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          bp_code?: string
          bp_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      quotation_materials: {
        Row: {
          certification_required: string | null
          created_at: string
          description_for_qa: string | null
          id: string
          line_number: number
          mat_category: string | null
          material_description: string | null
          part_number: string | null
          purchaser: string | null
          qa_inspection_required: boolean | null
          qty_per_unit: number | null
          quotation_id: string
          std_cost_est: number | null
          total_material: number | null
          uom: string | null
          vendor_name: string | null
          vendor_no: string | null
        }
        Insert: {
          certification_required?: string | null
          created_at?: string
          description_for_qa?: string | null
          id?: string
          line_number: number
          mat_category?: string | null
          material_description?: string | null
          part_number?: string | null
          purchaser?: string | null
          qa_inspection_required?: boolean | null
          qty_per_unit?: number | null
          quotation_id: string
          std_cost_est?: number | null
          total_material?: number | null
          uom?: string | null
          vendor_name?: string | null
          vendor_no?: string | null
        }
        Update: {
          certification_required?: string | null
          created_at?: string
          description_for_qa?: string | null
          id?: string
          line_number?: number
          mat_category?: string | null
          material_description?: string | null
          part_number?: string | null
          purchaser?: string | null
          qa_inspection_required?: boolean | null
          qty_per_unit?: number | null
          quotation_id?: string
          std_cost_est?: number | null
          total_material?: number | null
          uom?: string | null
          vendor_name?: string | null
          vendor_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_materials_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "system_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_resources: {
        Row: {
          cost_per_minute: number
          created_at: string
          id: string
          is_active: boolean | null
          resource_description: string
          resource_no: string
          updated_at: string
        }
        Insert: {
          cost_per_minute?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          resource_description: string
          resource_no: string
          updated_at?: string
        }
        Update: {
          cost_per_minute?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          resource_description?: string
          resource_no?: string
          updated_at?: string
        }
        Relationships: []
      }
      quotation_routings: {
        Row: {
          cost: number | null
          created_at: string
          id: string
          op_no: number
          operation_details: string | null
          part_number: string | null
          quotation_id: string
          resource_id: string | null
          resource_no: string | null
          run_time: number | null
          setup_time: number | null
          subcon_processing_time: number | null
          sublevel_bom: boolean | null
        }
        Insert: {
          cost?: number | null
          created_at?: string
          id?: string
          op_no: number
          operation_details?: string | null
          part_number?: string | null
          quotation_id: string
          resource_id?: string | null
          resource_no?: string | null
          run_time?: number | null
          setup_time?: number | null
          subcon_processing_time?: number | null
          sublevel_bom?: boolean | null
        }
        Update: {
          cost?: number | null
          created_at?: string
          id?: string
          op_no?: number
          operation_details?: string | null
          part_number?: string | null
          quotation_id?: string
          resource_id?: string | null
          resource_no?: string | null
          run_time?: number | null
          setup_time?: number | null
          subcon_processing_time?: number | null
          sublevel_bom?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_routings_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "system_quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_routings_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "quotation_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_subcon_vendors: {
        Row: {
          bp_code: string
          bp_name: string
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          bp_code: string
          bp_name: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          bp_code?: string
          bp_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      quotation_subcons: {
        Row: {
          certification_required: boolean | null
          created_at: string
          id: string
          line_number: number
          part_number: string | null
          process_description: string | null
          quotation_id: string
          std_cost_est: number | null
          total_subcon: number | null
          vendor_name: string | null
          vendor_no: string | null
        }
        Insert: {
          certification_required?: boolean | null
          created_at?: string
          id?: string
          line_number: number
          part_number?: string | null
          process_description?: string | null
          quotation_id: string
          std_cost_est?: number | null
          total_subcon?: number | null
          vendor_name?: string | null
          vendor_no?: string | null
        }
        Update: {
          certification_required?: boolean | null
          created_at?: string
          id?: string
          line_number?: number
          part_number?: string | null
          process_description?: string | null
          quotation_id?: string
          std_cost_est?: number | null
          total_subcon?: number | null
          vendor_name?: string | null
          vendor_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_subcons_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "system_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_system_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      quotation_volume_pricing: {
        Row: {
          carriage: number | null
          cost_per_hour: number | null
          cost_per_unit: number | null
          created_at: string
          hours: number | null
          id: string
          labour_cost: number | null
          margin: number | null
          material_cost: number | null
          misc: number | null
          quantity: number
          quotation_id: string
          subcon_cost: number | null
          tooling_cost: number | null
          total_price: number | null
          unit_price_quoted: number | null
        }
        Insert: {
          carriage?: number | null
          cost_per_hour?: number | null
          cost_per_unit?: number | null
          created_at?: string
          hours?: number | null
          id?: string
          labour_cost?: number | null
          margin?: number | null
          material_cost?: number | null
          misc?: number | null
          quantity: number
          quotation_id: string
          subcon_cost?: number | null
          tooling_cost?: number | null
          total_price?: number | null
          unit_price_quoted?: number | null
        }
        Update: {
          carriage?: number | null
          cost_per_hour?: number | null
          cost_per_unit?: number | null
          created_at?: string
          hours?: number | null
          id?: string
          labour_cost?: number | null
          margin?: number | null
          material_cost?: number | null
          misc?: number | null
          quantity?: number
          quotation_id?: string
          subcon_cost?: number | null
          tooling_cost?: number | null
          total_price?: number | null
          unit_price_quoted?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_volume_pricing_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "system_quotations"
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
      resource_configurations: {
        Row: {
          created_at: string
          department: string
          id: string
          is_active: boolean | null
          resource_name: string
          updated_at: string
          working_hours_per_day: number
        }
        Insert: {
          created_at?: string
          department?: string
          id?: string
          is_active?: boolean | null
          resource_name: string
          updated_at?: string
          working_hours_per_day?: number
        }
        Update: {
          created_at?: string
          department?: string
          id?: string
          is_active?: boolean | null
          resource_name?: string
          updated_at?: string
          working_hours_per_day?: number
        }
        Relationships: []
      }
      system_quotations: {
        Row: {
          batch_traceable: boolean | null
          blue_review_required: boolean | null
          created_at: string
          created_by: string
          customer: string
          customer_code: string | null
          description: string | null
          enquiry_no: string
          id: string
          manufacture_type: string | null
          material_markup: number | null
          notes: string | null
          part_number: string
          qty_per: number | null
          quoted_by: string | null
          revision: string | null
          rohs_compliant: boolean | null
          serial_traceable: boolean | null
          status: string | null
          subcon_markup: number | null
          updated_at: string
          vol_1: number | null
          vol_2: number | null
          vol_3: number | null
          vol_4: number | null
          vol_5: number | null
          won_volume: number | null
        }
        Insert: {
          batch_traceable?: boolean | null
          blue_review_required?: boolean | null
          created_at?: string
          created_by: string
          customer: string
          customer_code?: string | null
          description?: string | null
          enquiry_no: string
          id?: string
          manufacture_type?: string | null
          material_markup?: number | null
          notes?: string | null
          part_number: string
          qty_per?: number | null
          quoted_by?: string | null
          revision?: string | null
          rohs_compliant?: boolean | null
          serial_traceable?: boolean | null
          status?: string | null
          subcon_markup?: number | null
          updated_at?: string
          vol_1?: number | null
          vol_2?: number | null
          vol_3?: number | null
          vol_4?: number | null
          vol_5?: number | null
          won_volume?: number | null
        }
        Update: {
          batch_traceable?: boolean | null
          blue_review_required?: boolean | null
          created_at?: string
          created_by?: string
          customer?: string
          customer_code?: string | null
          description?: string | null
          enquiry_no?: string
          id?: string
          manufacture_type?: string | null
          material_markup?: number | null
          notes?: string | null
          part_number?: string
          qty_per?: number | null
          quoted_by?: string | null
          revision?: string | null
          rohs_compliant?: boolean | null
          serial_traceable?: boolean | null
          status?: string | null
          subcon_markup?: number | null
          updated_at?: string
          vol_1?: number | null
          vol_2?: number | null
          vol_3?: number | null
          vol_4?: number | null
          vol_5?: number | null
          won_volume?: number | null
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
          actions_completed_details: string | null
          additional_requirements: boolean | null
          additional_requirements_details: string | null
          all_actions_completed: boolean | null
          all_sections_details: string | null
          all_sections_filled: boolean | null
          approval_status_details: string | null
          approval_status_updated: boolean | null
          blue_review_number: number
          bom_hardware_available: boolean | null
          bom_hardware_details: string | null
          bom_lead_time: string | null
          br_needs_redo: boolean | null
          br_on_hold: boolean | null
          br_redo_new_wo_number: string | null
          cmm_lead_time: string | null
          cmm_program_details: string | null
          cmm_program_required: boolean | null
          costings_need_reevaluation: boolean | null
          costings_reevaluation_details: string | null
          created_at: string
          current_stage: string
          customer: string | null
          deburr_time: number | null
          departments_agreed_details: string | null
          departments_agreed_to_change: boolean | null
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
          handover_comments: string | null
          handover_engineering_accept: boolean | null
          handover_engineering_date: string | null
          handover_engineering_details: string | null
          handover_engineering_signature: string | null
          handover_operations_accept: boolean | null
          handover_operations_date: string | null
          handover_operations_details: string | null
          handover_operations_signature: string | null
          handover_quality_accept: boolean | null
          handover_quality_date: string | null
          handover_quality_details: string | null
          handover_quality_signature: string | null
          id: string
          ims_updated: boolean | null
          ims_updated_details: string | null
          inspection_aql_details: string | null
          inspection_aql_specified: boolean | null
          inspection_sheet_available: boolean | null
          inspection_sheet_details: string | null
          inspection_time: number | null
          machining_times_as_planned: boolean | null
          machining_times_details: string | null
          material_leadtime: string | null
          material_size_allowance: string | null
          material_size_correct: boolean | null
          material_size_details: string | null
          npi_approval_by: string | null
          npi_approval_date: string | null
          npi_final_comments: string | null
          npi_final_signature: string | null
          npi_final_signature_date: string | null
          npi_project_id: string | null
          open_actions_details: string | null
          open_actions_identified: boolean | null
          operations_comments: string | null
          operations_work_centres: Json | null
          parent_br_id: string | null
          part_and_rev: string | null
          post_process_work_centres: Json | null
          programming_signature: string | null
          programming_signature_date: string | null
          quality_additional_details: string | null
          quality_additional_requirements: boolean | null
          quality_gauges_calibrated: boolean | null
          quality_gauges_details: string | null
          quality_signature: string | null
          quality_signature_date: string | null
          reasons_in_remarks: boolean | null
          reasons_in_remarks_details: string | null
          revision_round: number | null
          routing_operations_details: string | null
          routing_operations_removed: boolean | null
          sap_changes_completed: boolean | null
          sap_changes_details: string | null
          status: string
          supply_chain_signature: string | null
          supply_chain_signature_date: string | null
          times_can_be_improved: boolean | null
          times_improvement_details: string | null
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
          actions_completed_details?: string | null
          additional_requirements?: boolean | null
          additional_requirements_details?: string | null
          all_actions_completed?: boolean | null
          all_sections_details?: string | null
          all_sections_filled?: boolean | null
          approval_status_details?: string | null
          approval_status_updated?: boolean | null
          blue_review_number?: number
          bom_hardware_available?: boolean | null
          bom_hardware_details?: string | null
          bom_lead_time?: string | null
          br_needs_redo?: boolean | null
          br_on_hold?: boolean | null
          br_redo_new_wo_number?: string | null
          cmm_lead_time?: string | null
          cmm_program_details?: string | null
          cmm_program_required?: boolean | null
          costings_need_reevaluation?: boolean | null
          costings_reevaluation_details?: string | null
          created_at?: string
          current_stage?: string
          customer?: string | null
          deburr_time?: number | null
          departments_agreed_details?: string | null
          departments_agreed_to_change?: boolean | null
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
          handover_comments?: string | null
          handover_engineering_accept?: boolean | null
          handover_engineering_date?: string | null
          handover_engineering_details?: string | null
          handover_engineering_signature?: string | null
          handover_operations_accept?: boolean | null
          handover_operations_date?: string | null
          handover_operations_details?: string | null
          handover_operations_signature?: string | null
          handover_quality_accept?: boolean | null
          handover_quality_date?: string | null
          handover_quality_details?: string | null
          handover_quality_signature?: string | null
          id?: string
          ims_updated?: boolean | null
          ims_updated_details?: string | null
          inspection_aql_details?: string | null
          inspection_aql_specified?: boolean | null
          inspection_sheet_available?: boolean | null
          inspection_sheet_details?: string | null
          inspection_time?: number | null
          machining_times_as_planned?: boolean | null
          machining_times_details?: string | null
          material_leadtime?: string | null
          material_size_allowance?: string | null
          material_size_correct?: boolean | null
          material_size_details?: string | null
          npi_approval_by?: string | null
          npi_approval_date?: string | null
          npi_final_comments?: string | null
          npi_final_signature?: string | null
          npi_final_signature_date?: string | null
          npi_project_id?: string | null
          open_actions_details?: string | null
          open_actions_identified?: boolean | null
          operations_comments?: string | null
          operations_work_centres?: Json | null
          parent_br_id?: string | null
          part_and_rev?: string | null
          post_process_work_centres?: Json | null
          programming_signature?: string | null
          programming_signature_date?: string | null
          quality_additional_details?: string | null
          quality_additional_requirements?: boolean | null
          quality_gauges_calibrated?: boolean | null
          quality_gauges_details?: string | null
          quality_signature?: string | null
          quality_signature_date?: string | null
          reasons_in_remarks?: boolean | null
          reasons_in_remarks_details?: string | null
          revision_round?: number | null
          routing_operations_details?: string | null
          routing_operations_removed?: boolean | null
          sap_changes_completed?: boolean | null
          sap_changes_details?: string | null
          status?: string
          supply_chain_signature?: string | null
          supply_chain_signature_date?: string | null
          times_can_be_improved?: boolean | null
          times_improvement_details?: string | null
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
          actions_completed_details?: string | null
          additional_requirements?: boolean | null
          additional_requirements_details?: string | null
          all_actions_completed?: boolean | null
          all_sections_details?: string | null
          all_sections_filled?: boolean | null
          approval_status_details?: string | null
          approval_status_updated?: boolean | null
          blue_review_number?: number
          bom_hardware_available?: boolean | null
          bom_hardware_details?: string | null
          bom_lead_time?: string | null
          br_needs_redo?: boolean | null
          br_on_hold?: boolean | null
          br_redo_new_wo_number?: string | null
          cmm_lead_time?: string | null
          cmm_program_details?: string | null
          cmm_program_required?: boolean | null
          costings_need_reevaluation?: boolean | null
          costings_reevaluation_details?: string | null
          created_at?: string
          current_stage?: string
          customer?: string | null
          deburr_time?: number | null
          departments_agreed_details?: string | null
          departments_agreed_to_change?: boolean | null
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
          handover_comments?: string | null
          handover_engineering_accept?: boolean | null
          handover_engineering_date?: string | null
          handover_engineering_details?: string | null
          handover_engineering_signature?: string | null
          handover_operations_accept?: boolean | null
          handover_operations_date?: string | null
          handover_operations_details?: string | null
          handover_operations_signature?: string | null
          handover_quality_accept?: boolean | null
          handover_quality_date?: string | null
          handover_quality_details?: string | null
          handover_quality_signature?: string | null
          id?: string
          ims_updated?: boolean | null
          ims_updated_details?: string | null
          inspection_aql_details?: string | null
          inspection_aql_specified?: boolean | null
          inspection_sheet_available?: boolean | null
          inspection_sheet_details?: string | null
          inspection_time?: number | null
          machining_times_as_planned?: boolean | null
          machining_times_details?: string | null
          material_leadtime?: string | null
          material_size_allowance?: string | null
          material_size_correct?: boolean | null
          material_size_details?: string | null
          npi_approval_by?: string | null
          npi_approval_date?: string | null
          npi_final_comments?: string | null
          npi_final_signature?: string | null
          npi_final_signature_date?: string | null
          npi_project_id?: string | null
          open_actions_details?: string | null
          open_actions_identified?: boolean | null
          operations_comments?: string | null
          operations_work_centres?: Json | null
          parent_br_id?: string | null
          part_and_rev?: string | null
          post_process_work_centres?: Json | null
          programming_signature?: string | null
          programming_signature_date?: string | null
          quality_additional_details?: string | null
          quality_additional_requirements?: boolean | null
          quality_gauges_calibrated?: boolean | null
          quality_gauges_details?: string | null
          quality_signature?: string | null
          quality_signature_date?: string | null
          reasons_in_remarks?: boolean | null
          reasons_in_remarks_details?: string | null
          revision_round?: number | null
          routing_operations_details?: string | null
          routing_operations_removed?: boolean | null
          sap_changes_completed?: boolean | null
          sap_changes_details?: string | null
          status?: string
          supply_chain_signature?: string | null
          supply_chain_signature_date?: string | null
          times_can_be_improved?: boolean | null
          times_improvement_details?: string | null
          tooling_details?: string | null
          tooling_in_matrix?: boolean | null
          tooling_lead_time?: string | null
          updated_at?: string
          user_id?: string
          wash_time?: number | null
          work_order_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_parent_br_id_fkey"
            columns: ["parent_br_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
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
