export interface WorkCentre {
  workCentre: string;
  progAdequate: boolean | null;
  workInstInPlace: boolean | null;
  gaugesInPlace: boolean | null;
  imsOkSubmitted: boolean | null;
  timesCorrectPlan: string;
  timesCorrectActual: string;
  initialDate: string;
}

export interface WorkOrder {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  status: 'draft' | 'in_review' | 'completed';
  current_stage: string;
  
  // Header
  blue_review_number: number | null;
  customer: string | null;
  part_and_rev: string | null;
  work_order_number: string | null;
  
  // Engineering - Process Parameters
  est_development_time: number | null;
  est_setup_time: number | null;
  est_cycle_time: number | null;
  est_tooling_cost: number | null;
  tooling_lead_time: string | null;
  deburr_time: number | null;
  wash_time: number | null;
  inspection_time: number | null;
  
  // Engineering - Raw Material
  material_size_allowance: string | null;
  material_leadtime: string | null;
  material_size_correct: boolean | null;
  material_size_details: string | null;
  
  // Engineering - BOM
  bom_hardware_available: boolean | null;
  bom_hardware_details: string | null;
  bom_lead_time: string | null;
  
  // Engineering - Drawing & Specifications
  drawings_available: boolean | null;
  drawings_details: string | null;
  
  // Engineering - Tooling & Fixturing
  tooling_in_matrix: boolean | null;
  tooling_details: string | null;
  fixtures_required: boolean | null;
  fixtures_details: string | null;
  fixtures_lead_time: string | null;
  
  // Engineering - Gauges & Standards
  gauges_calibrated: boolean | null;
  gauges_details: string | null;
  cmm_program_required: boolean | null;
  cmm_program_details: string | null;
  cmm_lead_time: string | null;
  
  // Engineering - Inspection Sheet
  inspection_sheet_available: boolean | null;
  inspection_sheet_details: string | null;
  
  // Engineering - Additional Requirements
  additional_requirements: boolean | null;
  additional_requirements_details: string | null;
  
  // Engineering Signatures
  engineering_approved_by: string | null;
  engineering_approved_date: string | null;
  npi_approval_by: string | null;
  npi_approval_date: string | null;
  
  // Operations - Machining Operations
  operations_work_centres: WorkCentre[];
  operations_comments: string | null;
  
  // Operations - Post Process Operations
  post_process_work_centres: WorkCentre[];
  
  // Quality
  fair_complete: boolean | null;
  fair_details: string | null;
  inspection_aql_specified: boolean | null;
  inspection_aql_details: string | null;
  quality_gauges_calibrated: boolean | null;
  quality_gauges_details: string | null;
  quality_additional_requirements: boolean | null;
  quality_additional_details: string | null;
  quality_signature: string | null;
  quality_signature_date: string | null;
  
  // Programming Review
  machining_times_as_planned: boolean | null;
  machining_times_details: string | null;
  times_can_be_improved: boolean | null;
  times_improvement_details: string | null;
  open_actions_identified: boolean | null;
  open_actions_details: string | null;
  all_actions_completed: boolean | null;
  actions_completed_details: string | null;
  programming_signature: string | null;
  programming_signature_date: string | null;
  
  // Handover - Engineering
  handover_engineering_accept: boolean | null;
  handover_engineering_details: string | null;
  handover_engineering_signature: string | null;
  handover_engineering_date: string | null;
  
  // Handover - Operations
  handover_operations_accept: boolean | null;
  handover_operations_details: string | null;
  handover_operations_signature: string | null;
  handover_operations_date: string | null;
  
  // Handover - Quality
  handover_quality_accept: boolean | null;
  handover_quality_details: string | null;
  handover_quality_signature: string | null;
  handover_quality_date: string | null;
  handover_comments: string | null;
  
  // Final Review NPI
  all_sections_filled: boolean | null;
  all_sections_details: string | null;
  costings_need_reevaluation: boolean | null;
  costings_reevaluation_details: string | null;
  departments_agreed_to_change: boolean | null;
  departments_agreed_details: string | null;
  acceptable_to_change_white: boolean | null;
  acceptable_to_change_details: string | null;
  npi_final_comments: string | null;
  npi_final_signature: string | null;
  npi_final_signature_date: string | null;
  
  // BR Revision Workflow
  br_needs_redo: boolean | null;
  br_redo_new_wo_number: string | null;
  br_on_hold: boolean | null;
  parent_br_id: string | null;
  revision_round: number | null;
  
  // Supply Chain
  sap_changes_completed: boolean | null;
  sap_changes_details: string | null;
  ims_updated: boolean | null;
  ims_updated_details: string | null;
  approval_status_updated: boolean | null;
  approval_status_details: string | null;
  routing_operations_removed: boolean | null;
  routing_operations_details: string | null;
  reasons_in_remarks: boolean | null;
  reasons_in_remarks_details: string | null;
  supply_chain_signature: string | null;
  supply_chain_signature_date: string | null;
}

export type FormSection = 
  | 'header'
  | 'engineering'
  | 'operations'
  | 'quality'
  | 'programming'
  | 'handover'
  | 'npi-final'
  | 'supply-chain';
