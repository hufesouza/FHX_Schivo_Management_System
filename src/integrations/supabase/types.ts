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
      enquiry_parts: {
        Row: {
          created_at: string
          description: string | null
          drawing_file_name: string | null
          drawing_url: string | null
          enquiry_id: string
          id: string
          line_number: number
          part_number: string
          quote_status: string | null
          revision: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          drawing_file_name?: string | null
          drawing_url?: string | null
          enquiry_id: string
          id?: string
          line_number: number
          part_number: string
          quote_status?: string | null
          revision?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          drawing_file_name?: string | null
          drawing_url?: string | null
          enquiry_id?: string
          id?: string
          line_number?: number
          part_number?: string
          quote_status?: string | null
          revision?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enquiry_parts_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "quotation_enquiries"
            referencedColumns: ["id"]
          },
        ]
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
      enquiry_quoted_part_materials: {
        Row: {
          certification_required: string | null
          description_for_qa: string | null
          enquiry_quoted_part_id: string
          id: string
          line_number: number
          mat_category: string | null
          material_description: string | null
          part_number: string | null
          purchaser: string | null
          qa_inspection_required: boolean | null
          qty_per_unit: number | null
          std_cost_est: number | null
          total_material: number | null
          uom: string | null
          vendor_name: string | null
          vendor_no: string | null
        }
        Insert: {
          certification_required?: string | null
          description_for_qa?: string | null
          enquiry_quoted_part_id: string
          id?: string
          line_number: number
          mat_category?: string | null
          material_description?: string | null
          part_number?: string | null
          purchaser?: string | null
          qa_inspection_required?: boolean | null
          qty_per_unit?: number | null
          std_cost_est?: number | null
          total_material?: number | null
          uom?: string | null
          vendor_name?: string | null
          vendor_no?: string | null
        }
        Update: {
          certification_required?: string | null
          description_for_qa?: string | null
          enquiry_quoted_part_id?: string
          id?: string
          line_number?: number
          mat_category?: string | null
          material_description?: string | null
          part_number?: string | null
          purchaser?: string | null
          qa_inspection_required?: boolean | null
          qty_per_unit?: number | null
          std_cost_est?: number | null
          total_material?: number | null
          uom?: string | null
          vendor_name?: string | null
          vendor_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enquiry_quoted_part_materials_enquiry_quoted_part_id_fkey"
            columns: ["enquiry_quoted_part_id"]
            isOneToOne: false
            referencedRelation: "enquiry_quoted_parts"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiry_quoted_part_routings: {
        Row: {
          cost: number | null
          enquiry_quoted_part_id: string
          id: string
          op_no: number
          operation_details: string | null
          part_number: string | null
          resource_id: string | null
          resource_no: string | null
          run_time: number | null
          setup_time: number | null
          subcon_processing_time: number | null
          sublevel_bom: boolean | null
        }
        Insert: {
          cost?: number | null
          enquiry_quoted_part_id: string
          id?: string
          op_no: number
          operation_details?: string | null
          part_number?: string | null
          resource_id?: string | null
          resource_no?: string | null
          run_time?: number | null
          setup_time?: number | null
          subcon_processing_time?: number | null
          sublevel_bom?: boolean | null
        }
        Update: {
          cost?: number | null
          enquiry_quoted_part_id?: string
          id?: string
          op_no?: number
          operation_details?: string | null
          part_number?: string | null
          resource_id?: string | null
          resource_no?: string | null
          run_time?: number | null
          setup_time?: number | null
          subcon_processing_time?: number | null
          sublevel_bom?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "enquiry_quoted_part_routings_enquiry_quoted_part_id_fkey"
            columns: ["enquiry_quoted_part_id"]
            isOneToOne: false
            referencedRelation: "enquiry_quoted_parts"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiry_quoted_part_subcons: {
        Row: {
          certification_required: boolean | null
          enquiry_quoted_part_id: string
          id: string
          line_number: number
          part_number: string | null
          process_description: string | null
          std_cost_est: number | null
          total_subcon: number | null
          vendor_name: string | null
          vendor_no: string | null
        }
        Insert: {
          certification_required?: boolean | null
          enquiry_quoted_part_id: string
          id?: string
          line_number: number
          part_number?: string | null
          process_description?: string | null
          std_cost_est?: number | null
          total_subcon?: number | null
          vendor_name?: string | null
          vendor_no?: string | null
        }
        Update: {
          certification_required?: boolean | null
          enquiry_quoted_part_id?: string
          id?: string
          line_number?: number
          part_number?: string | null
          process_description?: string | null
          std_cost_est?: number | null
          total_subcon?: number | null
          vendor_name?: string | null
          vendor_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enquiry_quoted_part_subcons_enquiry_quoted_part_id_fkey"
            columns: ["enquiry_quoted_part_id"]
            isOneToOne: false
            referencedRelation: "enquiry_quoted_parts"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiry_quoted_part_volume_pricing: {
        Row: {
          carriage: number | null
          cost_per_hour: number | null
          cost_per_unit: number | null
          enquiry_quoted_part_id: string
          hours: number | null
          id: string
          labour_cost: number | null
          margin: number | null
          material_cost: number | null
          misc: number | null
          quantity: number
          subcon_cost: number | null
          tooling_cost: number | null
          total_price: number | null
          unit_price_quoted: number | null
        }
        Insert: {
          carriage?: number | null
          cost_per_hour?: number | null
          cost_per_unit?: number | null
          enquiry_quoted_part_id: string
          hours?: number | null
          id?: string
          labour_cost?: number | null
          margin?: number | null
          material_cost?: number | null
          misc?: number | null
          quantity: number
          subcon_cost?: number | null
          tooling_cost?: number | null
          total_price?: number | null
          unit_price_quoted?: number | null
        }
        Update: {
          carriage?: number | null
          cost_per_hour?: number | null
          cost_per_unit?: number | null
          enquiry_quoted_part_id?: string
          hours?: number | null
          id?: string
          labour_cost?: number | null
          margin?: number | null
          material_cost?: number | null
          misc?: number | null
          quantity?: number
          subcon_cost?: number | null
          tooling_cost?: number | null
          total_price?: number | null
          unit_price_quoted?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "enquiry_quoted_part_volume_pricing_enquiry_quoted_part_id_fkey"
            columns: ["enquiry_quoted_part_id"]
            isOneToOne: false
            referencedRelation: "enquiry_quoted_parts"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiry_quoted_parts: {
        Row: {
          average_margin: number | null
          batch_traceable: boolean | null
          blue_review_required: boolean | null
          created_at: string
          customer: string
          customer_code: string | null
          description: string | null
          enquiry_id: string
          id: string
          manufacture_type: string | null
          material_markup: number | null
          notes: string | null
          part_number: string
          qty_per: number | null
          revision: string | null
          rohs_compliant: boolean | null
          serial_traceable: boolean | null
          source_quotation_id: string
          subcon_markup: number | null
          total_quoted_value: number | null
          updated_at: string
          vol_1: number | null
          vol_2: number | null
          vol_3: number | null
          vol_4: number | null
          vol_5: number | null
          won_volume: number | null
        }
        Insert: {
          average_margin?: number | null
          batch_traceable?: boolean | null
          blue_review_required?: boolean | null
          created_at?: string
          customer: string
          customer_code?: string | null
          description?: string | null
          enquiry_id: string
          id?: string
          manufacture_type?: string | null
          material_markup?: number | null
          notes?: string | null
          part_number: string
          qty_per?: number | null
          revision?: string | null
          rohs_compliant?: boolean | null
          serial_traceable?: boolean | null
          source_quotation_id: string
          subcon_markup?: number | null
          total_quoted_value?: number | null
          updated_at?: string
          vol_1?: number | null
          vol_2?: number | null
          vol_3?: number | null
          vol_4?: number | null
          vol_5?: number | null
          won_volume?: number | null
        }
        Update: {
          average_margin?: number | null
          batch_traceable?: boolean | null
          blue_review_required?: boolean | null
          created_at?: string
          customer?: string
          customer_code?: string | null
          description?: string | null
          enquiry_id?: string
          id?: string
          manufacture_type?: string | null
          material_markup?: number | null
          notes?: string | null
          part_number?: string
          qty_per?: number | null
          revision?: string | null
          rohs_compliant?: boolean | null
          serial_traceable?: boolean | null
          source_quotation_id?: string
          subcon_markup?: number | null
          total_quoted_value?: number | null
          updated_at?: string
          vol_1?: number | null
          vol_2?: number | null
          vol_3?: number | null
          vol_4?: number | null
          vol_5?: number | null
          won_volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "enquiry_quoted_parts_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "quotation_enquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiry_quoted_parts_source_quotation_id_fkey"
            columns: ["source_quotation_id"]
            isOneToOne: false
            referencedRelation: "system_quotations"
            referencedColumns: ["id"]
          },
        ]
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
      job_operations: {
        Row: {
          created_at: string
          cycle_time_seconds: number
          has_conflict: boolean
          id: string
          is_locked: boolean
          job_id: string
          notes: string | null
          operation_name: string
          operation_number: number
          planned_finish: string | null
          planned_start: string | null
          resource_id: string | null
          sequence_order: number
          sequence_warning: boolean
          setup_time_hours: number
          total_time_hours: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          cycle_time_seconds?: number
          has_conflict?: boolean
          id?: string
          is_locked?: boolean
          job_id: string
          notes?: string | null
          operation_name: string
          operation_number: number
          planned_finish?: string | null
          planned_start?: string | null
          resource_id?: string | null
          sequence_order: number
          sequence_warning?: boolean
          setup_time_hours?: number
          total_time_hours?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          cycle_time_seconds?: number
          has_conflict?: boolean
          id?: string
          is_locked?: boolean
          job_id?: string
          notes?: string | null
          operation_name?: string
          operation_number?: number
          planned_finish?: string | null
          planned_start?: string | null
          resource_id?: string | null
          sequence_order?: number
          sequence_warning?: boolean
          setup_time_hours?: number
          total_time_hours?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_operations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_operations_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          best_commence_date: string | null
          created_at: string
          dev_person_id: string | null
          dev_resource_id: string | null
          development_time_hours: number
          due_date: string
          earliest_start_date: string | null
          id: string
          job_level: string
          job_number: string
          latest_start_date: string | null
          notes: string | null
          parent_job_id: string | null
          part_id: string
          pending_planned_date: string | null
          pending_planned_date_reason: string | null
          planned_date_locked: boolean
          planned_dev_finish: string | null
          planned_dev_start: string | null
          planned_finish: string | null
          planned_start: string | null
          priority: string
          quantity: number
          schedule_risk: string
          schedule_status: string
          status: string
          updated_at: string
        }
        Insert: {
          best_commence_date?: string | null
          created_at?: string
          dev_person_id?: string | null
          dev_resource_id?: string | null
          development_time_hours?: number
          due_date: string
          earliest_start_date?: string | null
          id?: string
          job_level?: string
          job_number: string
          latest_start_date?: string | null
          notes?: string | null
          parent_job_id?: string | null
          part_id: string
          pending_planned_date?: string | null
          pending_planned_date_reason?: string | null
          planned_date_locked?: boolean
          planned_dev_finish?: string | null
          planned_dev_start?: string | null
          planned_finish?: string | null
          planned_start?: string | null
          priority?: string
          quantity?: number
          schedule_risk?: string
          schedule_status?: string
          status?: string
          updated_at?: string
        }
        Update: {
          best_commence_date?: string | null
          created_at?: string
          dev_person_id?: string | null
          dev_resource_id?: string | null
          development_time_hours?: number
          due_date?: string
          earliest_start_date?: string | null
          id?: string
          job_level?: string
          job_number?: string
          latest_start_date?: string | null
          notes?: string | null
          parent_job_id?: string | null
          part_id?: string
          pending_planned_date?: string | null
          pending_planned_date_reason?: string | null
          planned_date_locked?: boolean
          planned_dev_finish?: string | null
          planned_dev_start?: string | null
          planned_finish?: string | null
          planned_start?: string | null
          priority?: string
          quantity?: number
          schedule_risk?: string
          schedule_status?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_dev_person_id_fkey"
            columns: ["dev_person_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_dev_resource_id_fkey"
            columns: ["dev_resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_parent_job_id_fkey"
            columns: ["parent_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
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
      npi_customers: {
        Row: {
          account_owner: string | null
          created_at: string
          created_by: string | null
          customer_code: string | null
          customer_name: string
          email: string | null
          id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          account_owner?: string | null
          created_at?: string
          created_by?: string | null
          customer_code?: string | null
          customer_name: string
          email?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          account_owner?: string | null
          created_at?: string
          created_by?: string | null
          customer_code?: string | null
          customer_name?: string
          email?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      npi_email_recipients: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      npi_machine_availability: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          machine_id: string
          notes: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          machine_id: string
          notes?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          machine_id?: string
          notes?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "npi_machine_availability_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "npi_machines"
            referencedColumns: ["id"]
          },
        ]
      }
      npi_machine_schedule: {
        Row: {
          allocation_status: string
          created_at: string
          created_by: string | null
          customer_name: string | null
          end_date: string
          id: string
          machine_id: string | null
          machine_name: string | null
          notes: string | null
          part_id: string | null
          part_number: string | null
          project_name: string | null
          start_date: string
          total_required_time: number
          updated_at: string
        }
        Insert: {
          allocation_status?: string
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          end_date: string
          id?: string
          machine_id?: string | null
          machine_name?: string | null
          notes?: string | null
          part_id?: string | null
          part_number?: string | null
          project_name?: string | null
          start_date: string
          total_required_time?: number
          updated_at?: string
        }
        Update: {
          allocation_status?: string
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          end_date?: string
          id?: string
          machine_id?: string | null
          machine_name?: string | null
          notes?: string | null
          part_id?: string | null
          part_number?: string | null
          project_name?: string | null
          start_date?: string
          total_required_time?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "npi_machine_schedule_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "npi_machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "npi_machine_schedule_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "npi_parts"
            referencedColumns: ["id"]
          },
        ]
      }
      npi_machines: {
        Row: {
          created_at: string
          daily_available_hours: number
          id: string
          machine_name: string
          machine_type: string | null
          notes: string | null
          shift_pattern: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_available_hours?: number
          id?: string
          machine_name: string
          machine_type?: string | null
          notes?: string | null
          shift_pattern?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_available_hours?: number
          id?: string
          machine_name?: string
          machine_type?: string | null
          notes?: string | null
          shift_pattern?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      npi_materials_catalog: {
        Row: {
          created_at: string
          default_lead_time_days: number | null
          default_unit_cost: number | null
          id: string
          material_code: string | null
          material_description: string
          notes: string | null
          supplier: string | null
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_lead_time_days?: number | null
          default_unit_cost?: number | null
          id?: string
          material_code?: string | null
          material_description: string
          notes?: string | null
          supplier?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_lead_time_days?: number | null
          default_unit_cost?: number | null
          id?: string
          material_code?: string | null
          material_description?: string
          notes?: string | null
          supplier?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "npi_materials_catalog_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "npi_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      npi_part_machine_options: {
        Row: {
          created_at: string
          id: string
          machine_id: string
          part_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          machine_id: string
          part_id: string
        }
        Update: {
          created_at?: string
          id?: string
          machine_id?: string
          part_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "npi_part_machine_options_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "npi_machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "npi_part_machine_options_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "npi_parts"
            referencedColumns: ["id"]
          },
        ]
      }
      npi_part_tooling: {
        Row: {
          catalog_tool_id: string | null
          created_at: string
          expected_delivery_date: string | null
          id: string
          lead_time_days: number | null
          notes: string | null
          ordered_at: string | null
          ordered_status: string | null
          part_id: string
          po: string | null
          qty: number | null
          received_at: string | null
          supplier: string | null
          supplier_id: string | null
          tooling_description: string
          total_cost: number | null
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          catalog_tool_id?: string | null
          created_at?: string
          expected_delivery_date?: string | null
          id?: string
          lead_time_days?: number | null
          notes?: string | null
          ordered_at?: string | null
          ordered_status?: string | null
          part_id: string
          po?: string | null
          qty?: number | null
          received_at?: string | null
          supplier?: string | null
          supplier_id?: string | null
          tooling_description: string
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          catalog_tool_id?: string | null
          created_at?: string
          expected_delivery_date?: string | null
          id?: string
          lead_time_days?: number | null
          notes?: string | null
          ordered_at?: string | null
          ordered_status?: string | null
          part_id?: string
          po?: string | null
          qty?: number | null
          received_at?: string | null
          supplier?: string | null
          supplier_id?: string | null
          tooling_description?: string
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "npi_part_tooling_catalog_tool_id_fkey"
            columns: ["catalog_tool_id"]
            isOneToOne: false
            referencedRelation: "npi_tooling_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "npi_part_tooling_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "npi_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "npi_part_tooling_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "npi_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      npi_parts: {
        Row: {
          backend_time: number | null
          best_commence_date: string | null
          committed_date: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string | null
          cycle_time: number | null
          description: string | null
          dev_allow_weekends: boolean
          development_time: number | null
          engineer: string | null
          id: string
          kanban_stage: string
          machine_id: string | null
          machine_name: string | null
          material: string | null
          material_catalog_id: string | null
          material_lead_time: number | null
          material_ordered_at: string | null
          material_received_at: string | null
          material_status: string | null
          material_supplier_id: string | null
          material_supplier_name: string | null
          notes: string | null
          overall_status: string
          parent_part_id: string | null
          part_level: string
          part_number: string
          part_revision: string | null
          po: string | null
          prod_allow_weekends: boolean
          project_name: string | null
          qty: number | null
          quotation_file_name: string | null
          quotation_file_path: string | null
          sales_price: number | null
          setter_id: string | null
          ship_date: string | null
          stage_updated_at: string | null
          subcon: boolean | null
          subcon_lead_time: number | null
          subcon_status: string | null
          subcon_supplier_id: string | null
          supplier_name: string | null
          tooling: string | null
          tooling_lead_time: number | null
          tooling_ordered_at: string | null
          tooling_received_at: string | null
          tooling_status: string | null
          total_required_time: number | null
          type_of_service: string | null
          updated_at: string
        }
        Insert: {
          backend_time?: number | null
          best_commence_date?: string | null
          committed_date?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          cycle_time?: number | null
          description?: string | null
          dev_allow_weekends?: boolean
          development_time?: number | null
          engineer?: string | null
          id?: string
          kanban_stage?: string
          machine_id?: string | null
          machine_name?: string | null
          material?: string | null
          material_catalog_id?: string | null
          material_lead_time?: number | null
          material_ordered_at?: string | null
          material_received_at?: string | null
          material_status?: string | null
          material_supplier_id?: string | null
          material_supplier_name?: string | null
          notes?: string | null
          overall_status?: string
          parent_part_id?: string | null
          part_level?: string
          part_number: string
          part_revision?: string | null
          po?: string | null
          prod_allow_weekends?: boolean
          project_name?: string | null
          qty?: number | null
          quotation_file_name?: string | null
          quotation_file_path?: string | null
          sales_price?: number | null
          setter_id?: string | null
          ship_date?: string | null
          stage_updated_at?: string | null
          subcon?: boolean | null
          subcon_lead_time?: number | null
          subcon_status?: string | null
          subcon_supplier_id?: string | null
          supplier_name?: string | null
          tooling?: string | null
          tooling_lead_time?: number | null
          tooling_ordered_at?: string | null
          tooling_received_at?: string | null
          tooling_status?: string | null
          total_required_time?: number | null
          type_of_service?: string | null
          updated_at?: string
        }
        Update: {
          backend_time?: number | null
          best_commence_date?: string | null
          committed_date?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          cycle_time?: number | null
          description?: string | null
          dev_allow_weekends?: boolean
          development_time?: number | null
          engineer?: string | null
          id?: string
          kanban_stage?: string
          machine_id?: string | null
          machine_name?: string | null
          material?: string | null
          material_catalog_id?: string | null
          material_lead_time?: number | null
          material_ordered_at?: string | null
          material_received_at?: string | null
          material_status?: string | null
          material_supplier_id?: string | null
          material_supplier_name?: string | null
          notes?: string | null
          overall_status?: string
          parent_part_id?: string | null
          part_level?: string
          part_number?: string
          part_revision?: string | null
          po?: string | null
          prod_allow_weekends?: boolean
          project_name?: string | null
          qty?: number | null
          quotation_file_name?: string | null
          quotation_file_path?: string | null
          sales_price?: number | null
          setter_id?: string | null
          ship_date?: string | null
          stage_updated_at?: string | null
          subcon?: boolean | null
          subcon_lead_time?: number | null
          subcon_status?: string | null
          subcon_supplier_id?: string | null
          supplier_name?: string | null
          tooling?: string | null
          tooling_lead_time?: number | null
          tooling_ordered_at?: string | null
          tooling_received_at?: string | null
          tooling_status?: string | null
          total_required_time?: number | null
          type_of_service?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "npi_parts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "npi_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "npi_parts_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "npi_machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "npi_parts_material_catalog_id_fkey"
            columns: ["material_catalog_id"]
            isOneToOne: false
            referencedRelation: "npi_materials_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "npi_parts_material_supplier_id_fkey"
            columns: ["material_supplier_id"]
            isOneToOne: false
            referencedRelation: "npi_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "npi_parts_parent_part_id_fkey"
            columns: ["parent_part_id"]
            isOneToOne: false
            referencedRelation: "npi_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "npi_parts_setter_id_fkey"
            columns: ["setter_id"]
            isOneToOne: false
            referencedRelation: "npi_setters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "npi_parts_subcon_supplier_id_fkey"
            columns: ["subcon_supplier_id"]
            isOneToOne: false
            referencedRelation: "npi_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      npi_parts_catalog: {
        Row: {
          backend_time: number | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string | null
          cycle_time: number | null
          description: string | null
          dev_allow_weekends: boolean | null
          development_time: number | null
          id: string
          material: string | null
          material_lead_time: number | null
          material_supplier_id: string | null
          material_supplier_name: string | null
          notes: string | null
          part_number: string
          part_revision: string | null
          prod_allow_weekends: boolean | null
          sales_price: number | null
          subcon: boolean | null
          subcon_lead_time: number | null
          subcon_supplier_id: string | null
          supplier_name: string | null
          tooling: string | null
          tooling_lead_time: number | null
          type_of_service: string | null
          updated_at: string
        }
        Insert: {
          backend_time?: number | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          cycle_time?: number | null
          description?: string | null
          dev_allow_weekends?: boolean | null
          development_time?: number | null
          id?: string
          material?: string | null
          material_lead_time?: number | null
          material_supplier_id?: string | null
          material_supplier_name?: string | null
          notes?: string | null
          part_number: string
          part_revision?: string | null
          prod_allow_weekends?: boolean | null
          sales_price?: number | null
          subcon?: boolean | null
          subcon_lead_time?: number | null
          subcon_supplier_id?: string | null
          supplier_name?: string | null
          tooling?: string | null
          tooling_lead_time?: number | null
          type_of_service?: string | null
          updated_at?: string
        }
        Update: {
          backend_time?: number | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          cycle_time?: number | null
          description?: string | null
          dev_allow_weekends?: boolean | null
          development_time?: number | null
          id?: string
          material?: string | null
          material_lead_time?: number | null
          material_supplier_id?: string | null
          material_supplier_name?: string | null
          notes?: string | null
          part_number?: string
          part_revision?: string | null
          prod_allow_weekends?: boolean | null
          sales_price?: number | null
          subcon?: boolean | null
          subcon_lead_time?: number | null
          subcon_supplier_id?: string | null
          supplier_name?: string | null
          tooling?: string | null
          tooling_lead_time?: number | null
          type_of_service?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      npi_planner_settings: {
        Row: {
          country_code: string
          country_label: string
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
          weekend_days: number[]
        }
        Insert: {
          country_code?: string
          country_label?: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          weekend_days?: number[]
        }
        Update: {
          country_code?: string
          country_label?: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          weekend_days?: number[]
        }
        Relationships: []
      }
      npi_projects_planning: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string | null
          engineer: string | null
          id: string
          notes: string | null
          project_name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          engineer?: string | null
          id?: string
          notes?: string | null
          project_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          engineer?: string | null
          id?: string
          notes?: string | null
          project_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "npi_projects_planning_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "npi_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      npi_setters: {
        Row: {
          active: boolean
          color: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          setter_name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          color?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          setter_name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          setter_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      npi_suppliers: {
        Row: {
          address: string | null
          contact_name: string | null
          created_at: string
          created_by: string | null
          default_lead_time_days: number | null
          email: string | null
          id: string
          notes: string | null
          phone: string | null
          supplier_name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          default_lead_time_days?: number | null
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          supplier_name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          default_lead_time_days?: number | null
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          supplier_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      npi_tooling_catalog: {
        Row: {
          created_at: string
          default_lead_time_days: number | null
          default_unit_cost: number | null
          id: string
          notes: string | null
          supplier: string | null
          supplier_id: string | null
          tool_code: string | null
          tooling_description: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_lead_time_days?: number | null
          default_unit_cost?: number | null
          id?: string
          notes?: string | null
          supplier?: string | null
          supplier_id?: string | null
          tool_code?: string | null
          tooling_description: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_lead_time_days?: number | null
          default_unit_cost?: number | null
          id?: string
          notes?: string | null
          supplier?: string | null
          supplier_id?: string | null
          tool_code?: string | null
          tooling_description?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "npi_tooling_catalog_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "npi_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      npi_tooling_tracker: {
        Row: {
          catalog_tool_id: string | null
          created_at: string
          expected_delivery_date: string | null
          id: string
          lead_time_days: number | null
          notes: string | null
          ordered_status: string | null
          part_id: string | null
          part_number: string | null
          po: string | null
          qty: number | null
          required_status: string | null
          supplier: string | null
          supplier_id: string | null
          tooling_description: string
          total_cost: number | null
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          catalog_tool_id?: string | null
          created_at?: string
          expected_delivery_date?: string | null
          id?: string
          lead_time_days?: number | null
          notes?: string | null
          ordered_status?: string | null
          part_id?: string | null
          part_number?: string | null
          po?: string | null
          qty?: number | null
          required_status?: string | null
          supplier?: string | null
          supplier_id?: string | null
          tooling_description: string
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          catalog_tool_id?: string | null
          created_at?: string
          expected_delivery_date?: string | null
          id?: string
          lead_time_days?: number | null
          notes?: string | null
          ordered_status?: string | null
          part_id?: string | null
          part_number?: string | null
          po?: string | null
          qty?: number | null
          required_status?: string | null
          supplier?: string | null
          supplier_id?: string | null
          tooling_description?: string
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "npi_tooling_tracker_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "npi_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "npi_tooling_tracker_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "npi_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      npi_tools_catalog: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          id: string
          lead_time_days: number | null
          notes: string | null
          supplier: string | null
          supplier_id: string | null
          times_used: number | null
          tool_code: string | null
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          lead_time_days?: number | null
          notes?: string | null
          supplier?: string | null
          supplier_id?: string | null
          times_used?: number | null
          tool_code?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          lead_time_days?: number | null
          notes?: string | null
          supplier?: string | null
          supplier_id?: string | null
          times_used?: number | null
          tool_code?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "npi_tools_catalog_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "npi_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      part_bom_components: {
        Row: {
          assembly_part_id: string
          component_part_id: string
          created_at: string
          id: string
          notes: string | null
          quantity_per_assembly: number
          updated_at: string
        }
        Insert: {
          assembly_part_id: string
          component_part_id: string
          created_at?: string
          id?: string
          notes?: string | null
          quantity_per_assembly?: number
          updated_at?: string
        }
        Update: {
          assembly_part_id?: string
          component_part_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          quantity_per_assembly?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "part_bom_components_assembly_part_id_fkey"
            columns: ["assembly_part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_bom_components_component_part_id_fkey"
            columns: ["component_part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      part_operations: {
        Row: {
          created_at: string
          cycle_time_seconds: number
          id: string
          notes: string | null
          operation_name: string
          operation_number: number
          part_id: string
          resource_id: string | null
          setup_time_hours: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          cycle_time_seconds?: number
          id?: string
          notes?: string | null
          operation_name: string
          operation_number: number
          part_id: string
          resource_id?: string | null
          setup_time_hours?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          cycle_time_seconds?: number
          id?: string
          notes?: string | null
          operation_name?: string
          operation_number?: number
          part_id?: string
          resource_id?: string | null
          setup_time_hours?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "part_operations_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_operations_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      parts: {
        Row: {
          created_at: string
          customer: string | null
          description: string | null
          id: string
          part_number: string
          part_type: string
          project: string | null
          revision: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer?: string | null
          description?: string | null
          id?: string
          part_number: string
          part_type?: string
          project?: string | null
          revision?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer?: string | null
          description?: string | null
          id?: string
          part_number?: string
          part_type?: string
          project?: string | null
          revision?: string | null
          updated_at?: string
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
      quotation_customers: {
        Row: {
          bp_code: string
          bp_name: string
          created_at: string
          id: string
          is_active: boolean
          site: string
          updated_at: string
        }
        Insert: {
          bp_code: string
          bp_name: string
          created_at?: string
          id?: string
          is_active?: boolean
          site?: string
          updated_at?: string
        }
        Update: {
          bp_code?: string
          bp_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          site?: string
          updated_at?: string
        }
        Relationships: []
      }
      quotation_enquiries: {
        Row: {
          approver_id: string | null
          approver_name: string | null
          average_margin: number | null
          created_at: string
          created_by: string
          customer_id: string | null
          customer_name: string
          enquiry_no: string
          id: string
          notes: string | null
          review_comments: string | null
          reviewed_at: string | null
          sales_representative: string | null
          status: Database["public"]["Enums"]["enquiry_status"]
          submitted_by: string | null
          submitted_for_review_at: string | null
          total_quoted_value: number | null
          updated_at: string
        }
        Insert: {
          approver_id?: string | null
          approver_name?: string | null
          average_margin?: number | null
          created_at?: string
          created_by: string
          customer_id?: string | null
          customer_name: string
          enquiry_no: string
          id?: string
          notes?: string | null
          review_comments?: string | null
          reviewed_at?: string | null
          sales_representative?: string | null
          status?: Database["public"]["Enums"]["enquiry_status"]
          submitted_by?: string | null
          submitted_for_review_at?: string | null
          total_quoted_value?: number | null
          updated_at?: string
        }
        Update: {
          approver_id?: string | null
          approver_name?: string | null
          average_margin?: number | null
          created_at?: string
          created_by?: string
          customer_id?: string | null
          customer_name?: string
          enquiry_no?: string
          id?: string
          notes?: string | null
          review_comments?: string | null
          reviewed_at?: string | null
          sales_representative?: string | null
          status?: Database["public"]["Enums"]["enquiry_status"]
          submitted_by?: string | null
          submitted_for_review_at?: string | null
          total_quoted_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_enquiries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "quotation_customers"
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
          site: string
          updated_at: string
        }
        Insert: {
          bp_code: string
          bp_name: string
          created_at?: string
          id?: string
          is_active?: boolean
          site?: string
          updated_at?: string
        }
        Update: {
          bp_code?: string
          bp_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          site?: string
          updated_at?: string
        }
        Relationships: []
      }
      quotation_materials: {
        Row: {
          certification_required: string | null
          created_at: string
          cut_off: number | null
          description_for_qa: string | null
          diameter: number | null
          id: string
          length: number | null
          line_number: number
          mat_category: string | null
          material_description: string | null
          overhead: number | null
          part_number: string | null
          purchaser: string | null
          qa_inspection_required: boolean | null
          qty_per_unit: number | null
          qty_vol_1: number | null
          qty_vol_2: number | null
          qty_vol_3: number | null
          qty_vol_4: number | null
          qty_vol_5: number | null
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
          cut_off?: number | null
          description_for_qa?: string | null
          diameter?: number | null
          id?: string
          length?: number | null
          line_number: number
          mat_category?: string | null
          material_description?: string | null
          overhead?: number | null
          part_number?: string | null
          purchaser?: string | null
          qa_inspection_required?: boolean | null
          qty_per_unit?: number | null
          qty_vol_1?: number | null
          qty_vol_2?: number | null
          qty_vol_3?: number | null
          qty_vol_4?: number | null
          qty_vol_5?: number | null
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
          cut_off?: number | null
          description_for_qa?: string | null
          diameter?: number | null
          id?: string
          length?: number | null
          line_number?: number
          mat_category?: string | null
          material_description?: string | null
          overhead?: number | null
          part_number?: string | null
          purchaser?: string | null
          qa_inspection_required?: boolean | null
          qty_per_unit?: number | null
          qty_vol_1?: number | null
          qty_vol_2?: number | null
          qty_vol_3?: number | null
          qty_vol_4?: number | null
          qty_vol_5?: number | null
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
          site: string
          updated_at: string
        }
        Insert: {
          cost_per_minute?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          resource_description: string
          resource_no: string
          site?: string
          updated_at?: string
        }
        Update: {
          cost_per_minute?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          resource_description?: string
          resource_no?: string
          site?: string
          updated_at?: string
        }
        Relationships: []
      }
      quotation_review_tasks: {
        Row: {
          assigned_by: string | null
          assigned_to: string
          comments: string | null
          completed_at: string | null
          created_at: string
          enquiry_id: string
          id: string
          status: string
          task_type: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to: string
          comments?: string | null
          completed_at?: string | null
          created_at?: string
          enquiry_id: string
          id?: string
          status?: string
          task_type?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string
          comments?: string | null
          completed_at?: string | null
          created_at?: string
          enquiry_id?: string
          id?: string
          status?: string
          task_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_review_tasks_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "quotation_enquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_routings: {
        Row: {
          cost: number | null
          created_at: string
          id: string
          include_setup_calc: boolean
          op_no: number
          operation_details: string | null
          override_cost: number | null
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
          include_setup_calc?: boolean
          op_no: number
          operation_details?: string | null
          override_cost?: number | null
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
          include_setup_calc?: boolean
          op_no?: number
          operation_details?: string | null
          override_cost?: number | null
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
      quotation_secondary_ops: {
        Row: {
          calculated_cost: number | null
          cost_per_minute: number | null
          cost_type: string
          created_at: string
          id: string
          markup: number | null
          notes: string | null
          operation: string
          qty_per_run: number | null
          quotation_id: string
          resource_id: string | null
          time_per_piece: number | null
          time_per_run: number | null
          total_time: number | null
        }
        Insert: {
          calculated_cost?: number | null
          cost_per_minute?: number | null
          cost_type?: string
          created_at?: string
          id?: string
          markup?: number | null
          notes?: string | null
          operation: string
          qty_per_run?: number | null
          quotation_id: string
          resource_id?: string | null
          time_per_piece?: number | null
          time_per_run?: number | null
          total_time?: number | null
        }
        Update: {
          calculated_cost?: number | null
          cost_per_minute?: number | null
          cost_type?: string
          created_at?: string
          id?: string
          markup?: number | null
          notes?: string | null
          operation?: string
          qty_per_run?: number | null
          quotation_id?: string
          resource_id?: string | null
          time_per_piece?: number | null
          time_per_run?: number | null
          total_time?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_secondary_ops_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "system_quotations"
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
          site: string
          updated_at: string
        }
        Insert: {
          bp_code: string
          bp_name: string
          created_at?: string
          id?: string
          is_active?: boolean
          site?: string
          updated_at?: string
        }
        Update: {
          bp_code?: string
          bp_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          site?: string
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
          site: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: number
          site?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: number
          site?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      quotation_tool_library: {
        Row: {
          created_at: string
          default_price: number | null
          id: string
          is_active: boolean | null
          site: string | null
          tool_name: string
        }
        Insert: {
          created_at?: string
          default_price?: number | null
          id?: string
          is_active?: boolean | null
          site?: string | null
          tool_name: string
        }
        Update: {
          created_at?: string
          default_price?: number | null
          id?: string
          is_active?: boolean | null
          site?: string | null
          tool_name?: string
        }
        Relationships: []
      }
      quotation_tools: {
        Row: {
          created_at: string
          id: string
          line_number: number
          markup: number | null
          price: number | null
          qty_vol_1: number | null
          qty_vol_2: number | null
          qty_vol_3: number | null
          qty_vol_4: number | null
          qty_vol_5: number | null
          quantity: number | null
          quotation_id: string
          tool_name: string | null
          total: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          line_number?: number
          markup?: number | null
          price?: number | null
          qty_vol_1?: number | null
          qty_vol_2?: number | null
          qty_vol_3?: number | null
          qty_vol_4?: number | null
          qty_vol_5?: number | null
          quantity?: number | null
          quotation_id: string
          tool_name?: string | null
          total?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          line_number?: number
          markup?: number | null
          price?: number | null
          qty_vol_1?: number | null
          qty_vol_2?: number | null
          qty_vol_3?: number | null
          qty_vol_4?: number | null
          qty_vol_5?: number | null
          quantity?: number | null
          quotation_id?: string
          tool_name?: string | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_tools_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "system_quotations"
            referencedColumns: ["id"]
          },
        ]
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
      resource_lookups: {
        Row: {
          created_at: string
          id: string
          kind: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          available_hours_per_day: number
          created_at: string
          id: string
          lead_time_days: number | null
          number_of_shifts: number
          resource_category: string
          resource_name: string
          resource_type: string
          scheduling_mode: string
          status: string
          supplier_name: string | null
          updated_at: string
        }
        Insert: {
          available_hours_per_day?: number
          created_at?: string
          id?: string
          lead_time_days?: number | null
          number_of_shifts?: number
          resource_category?: string
          resource_name: string
          resource_type: string
          scheduling_mode?: string
          status?: string
          supplier_name?: string | null
          updated_at?: string
        }
        Update: {
          available_hours_per_day?: number
          created_at?: string
          id?: string
          lead_time_days?: number | null
          number_of_shifts?: number
          resource_category?: string
          resource_name?: string
          resource_type?: string
          scheduling_mode?: string
          status?: string
          supplier_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sched_audit_log: {
        Row: {
          action: string
          created_at: string
          entity: string
          entity_id: string | null
          entity_label: string | null
          id: string
          new_value: Json | null
          previous_value: Json | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity: string
          entity_id?: string | null
          entity_label?: string | null
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string
          entity_id?: string | null
          entity_label?: string | null
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sched_holidays: {
        Row: {
          created_at: string
          holiday_date: string
          id: string
          label: string | null
          machine_id: string | null
          setter_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          holiday_date: string
          id?: string
          label?: string | null
          machine_id?: string | null
          setter_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          holiday_date?: string
          id?: string
          label?: string | null
          machine_id?: string | null
          setter_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sched_holidays_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "sched_machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sched_holidays_setter_id_fkey"
            columns: ["setter_id"]
            isOneToOne: false
            referencedRelation: "sched_setters"
            referencedColumns: ["id"]
          },
        ]
      }
      sched_job_allocations: {
        Row: {
          alloc_date: string
          alloc_type: string
          created_at: string
          hours: number
          id: string
          job_id: string
          machine_id: string | null
          setter_id: string | null
        }
        Insert: {
          alloc_date: string
          alloc_type?: string
          created_at?: string
          hours: number
          id?: string
          job_id: string
          machine_id?: string | null
          setter_id?: string | null
        }
        Update: {
          alloc_date?: string
          alloc_type?: string
          created_at?: string
          hours?: number
          id?: string
          job_id?: string
          machine_id?: string | null
          setter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sched_job_allocations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "sched_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sched_job_allocations_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "sched_machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sched_job_allocations_setter_id_fkey"
            columns: ["setter_id"]
            isOneToOne: false
            referencedRelation: "sched_setters"
            referencedColumns: ["id"]
          },
        ]
      }
      sched_jobs: {
        Row: {
          created_at: string
          created_by: string | null
          customer: string | null
          cycle_time: number
          cycle_time_unit: string
          development_hours: number
          id: string
          is_npi: boolean
          is_production: boolean
          job_number: string
          machine_id: string | null
          notes: string | null
          part_number: string | null
          po_number: string
          priority: Database["public"]["Enums"]["sched_job_priority"]
          production_end: string | null
          production_quantity: number
          production_setter_id: string | null
          production_start: string | null
          production_status: string
          production_type: string
          programmer_id: string | null
          programming_end: string | null
          programming_hours: number
          programming_start: string | null
          programming_status: string
          scrap_pct: number
          setter_id: string | null
          setup_hours: number
          start_date: string
          status: Database["public"]["Enums"]["sched_job_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer?: string | null
          cycle_time?: number
          cycle_time_unit?: string
          development_hours?: number
          id?: string
          is_npi?: boolean
          is_production?: boolean
          job_number: string
          machine_id?: string | null
          notes?: string | null
          part_number?: string | null
          po_number: string
          priority?: Database["public"]["Enums"]["sched_job_priority"]
          production_end?: string | null
          production_quantity?: number
          production_setter_id?: string | null
          production_start?: string | null
          production_status?: string
          production_type?: string
          programmer_id?: string | null
          programming_end?: string | null
          programming_hours?: number
          programming_start?: string | null
          programming_status?: string
          scrap_pct?: number
          setter_id?: string | null
          setup_hours?: number
          start_date: string
          status?: Database["public"]["Enums"]["sched_job_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer?: string | null
          cycle_time?: number
          cycle_time_unit?: string
          development_hours?: number
          id?: string
          is_npi?: boolean
          is_production?: boolean
          job_number?: string
          machine_id?: string | null
          notes?: string | null
          part_number?: string | null
          po_number?: string
          priority?: Database["public"]["Enums"]["sched_job_priority"]
          production_end?: string | null
          production_quantity?: number
          production_setter_id?: string | null
          production_start?: string | null
          production_status?: string
          production_type?: string
          programmer_id?: string | null
          programming_end?: string | null
          programming_hours?: number
          programming_start?: string | null
          programming_status?: string
          scrap_pct?: number
          setter_id?: string | null
          setup_hours?: number
          start_date?: string
          status?: Database["public"]["Enums"]["sched_job_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sched_jobs_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "sched_machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sched_jobs_production_setter_id_fkey"
            columns: ["production_setter_id"]
            isOneToOne: false
            referencedRelation: "sched_setters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sched_jobs_programmer_id_fkey"
            columns: ["programmer_id"]
            isOneToOne: false
            referencedRelation: "sched_setters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sched_jobs_setter_id_fkey"
            columns: ["setter_id"]
            isOneToOne: false
            referencedRelation: "sched_setters"
            referencedColumns: ["id"]
          },
        ]
      }
      sched_machine_part_cycle_times: {
        Row: {
          created_at: string
          cycle_time: number
          cycle_time_unit: string
          id: string
          machine_id: string
          notes: string | null
          part_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cycle_time?: number
          cycle_time_unit?: string
          id?: string
          machine_id: string
          notes?: string | null
          part_number: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cycle_time?: number
          cycle_time_unit?: string
          id?: string
          machine_id?: string
          notes?: string | null
          part_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sched_machine_part_cycle_times_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "sched_machines"
            referencedColumns: ["id"]
          },
        ]
      }
      sched_machines: {
        Row: {
          availability_pct: number
          code: string
          created_at: string
          daily_hours: number
          days_per_week: number
          effective_machines: number
          id: string
          is_active: boolean
          name: string
          notes: string | null
          planned_hours_per_day: number
          updated_at: string
          weeks_per_month: number
          working_days: number[]
        }
        Insert: {
          availability_pct?: number
          code: string
          created_at?: string
          daily_hours?: number
          days_per_week?: number
          effective_machines?: number
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          planned_hours_per_day?: number
          updated_at?: string
          weeks_per_month?: number
          working_days?: number[]
        }
        Update: {
          availability_pct?: number
          code?: string
          created_at?: string
          daily_hours?: number
          days_per_week?: number
          effective_machines?: number
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          planned_hours_per_day?: number
          updated_at?: string
          weeks_per_month?: number
          working_days?: number[]
        }
        Relationships: []
      }
      sched_setter_days: {
        Row: {
          created_at: string
          day_of_week: number
          hours: number
          id: string
          setter_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          hours?: number
          id?: string
          setter_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          hours?: number
          id?: string
          setter_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sched_setter_days_setter_id_fkey"
            columns: ["setter_id"]
            isOneToOne: false
            referencedRelation: "sched_setters"
            referencedColumns: ["id"]
          },
        ]
      }
      sched_setters: {
        Row: {
          break_minutes: number
          color: string
          created_at: string
          end_time: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          start_time: string
          updated_at: string
        }
        Insert: {
          break_minutes?: number
          color?: string
          created_at?: string
          end_time?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          start_time?: string
          updated_at?: string
        }
        Update: {
          break_minutes?: number
          color?: string
          created_at?: string
          end_time?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_quotations: {
        Row: {
          assignment_status: string | null
          batch_traceable: boolean | null
          blue_review_required: boolean | null
          created_at: string
          created_by: string
          customer: string
          customer_code: string | null
          cycle_time_per_piece: number | null
          description: string | null
          enquiry_no: string
          enquiry_part_id: string | null
          hourly_rate: number | null
          id: string
          is_template: boolean | null
          manufacture_type: string | null
          material_markup: number | null
          notes: string | null
          part_number: string
          production_effectiveness: number | null
          production_hours_per_day: number | null
          production_profit_percent: number | null
          production_sales_commission_percent: number | null
          programming_hours: number | null
          programming_rate: number | null
          qty_per: number | null
          quoted_by: string | null
          revision: string | null
          rohs_compliant: boolean | null
          serial_traceable: boolean | null
          setup_hours: number | null
          setup_rate: number | null
          site: string
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
          assignment_status?: string | null
          batch_traceable?: boolean | null
          blue_review_required?: boolean | null
          created_at?: string
          created_by: string
          customer: string
          customer_code?: string | null
          cycle_time_per_piece?: number | null
          description?: string | null
          enquiry_no: string
          enquiry_part_id?: string | null
          hourly_rate?: number | null
          id?: string
          is_template?: boolean | null
          manufacture_type?: string | null
          material_markup?: number | null
          notes?: string | null
          part_number: string
          production_effectiveness?: number | null
          production_hours_per_day?: number | null
          production_profit_percent?: number | null
          production_sales_commission_percent?: number | null
          programming_hours?: number | null
          programming_rate?: number | null
          qty_per?: number | null
          quoted_by?: string | null
          revision?: string | null
          rohs_compliant?: boolean | null
          serial_traceable?: boolean | null
          setup_hours?: number | null
          setup_rate?: number | null
          site?: string
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
          assignment_status?: string | null
          batch_traceable?: boolean | null
          blue_review_required?: boolean | null
          created_at?: string
          created_by?: string
          customer?: string
          customer_code?: string | null
          cycle_time_per_piece?: number | null
          description?: string | null
          enquiry_no?: string
          enquiry_part_id?: string | null
          hourly_rate?: number | null
          id?: string
          is_template?: boolean | null
          manufacture_type?: string | null
          material_markup?: number | null
          notes?: string | null
          part_number?: string
          production_effectiveness?: number | null
          production_hours_per_day?: number | null
          production_profit_percent?: number | null
          production_sales_commission_percent?: number | null
          programming_hours?: number | null
          programming_rate?: number | null
          qty_per?: number | null
          quoted_by?: string | null
          revision?: string | null
          rohs_compliant?: boolean | null
          serial_traceable?: boolean | null
          setup_hours?: number | null
          setup_rate?: number | null
          site?: string
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
        Relationships: [
          {
            foreignKeyName: "system_quotations_enquiry_part_id_fkey"
            columns: ["enquiry_part_id"]
            isOneToOne: false
            referencedRelation: "enquiry_parts"
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
      enquiry_status:
        | "open"
        | "in_progress"
        | "submitted_for_review"
        | "approved"
        | "declined"
        | "submitted"
        | "won"
        | "lost"
      sched_job_priority: "low" | "medium" | "high" | "critical"
      sched_job_status:
        | "planned"
        | "in_progress"
        | "completed"
        | "on_hold"
        | "cancelled"
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
      enquiry_status: [
        "open",
        "in_progress",
        "submitted_for_review",
        "approved",
        "declined",
        "submitted",
        "won",
        "lost",
      ],
      sched_job_priority: ["low", "medium", "high", "critical"],
      sched_job_status: [
        "planned",
        "in_progress",
        "completed",
        "on_hold",
        "cancelled",
      ],
    },
  },
} as const
