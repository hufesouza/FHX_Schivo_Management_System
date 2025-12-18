export interface NPIProject {
  id: string;
  project_number: string;
  project_name: string;
  customer: string | null;
  description: string | null;
  project_type: 'simple' | 'complex';
  current_phase: 'planning' | 'execution' | 'process_qualification' | 'completed' | 'on_hold';
  status: 'active' | 'completed' | 'on_hold' | 'cancelled';
  project_manager_id: string | null;
  start_date: string | null;
  target_completion_date: string | null;
  actual_completion_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface NPIProjectCharter {
  id: string;
  project_id: string;
  scope: string | null;
  objectives: string | null;
  deliverables: string | null;
  success_criteria: string | null;
  constraints: string | null;
  assumptions: string | null;
  risks: string | null;
  budget_notes: string | null;
  approved_by: string | null;
  approved_date: string | null;
  revision: number;
  created_at: string;
  updated_at: string;
}

export interface NPIDesignTransferItem {
  id: string;
  project_id: string;
  category: string;
  item_name: string;
  description: string | null;
  phase: 'planning' | 'execution' | 'process_qualification';
  status: 'not_started' | 'in_progress' | 'completed' | 'not_applicable';
  owner_id: string | null;
  owner_name: string | null;
  due_date: string | null;
  completed_date: string | null;
  notes: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface NPIProjectTeamMember {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  responsibilities: string | null;
  created_at: string;
  // Joined fields
  email?: string;
  full_name?: string;
}

export interface NPIProjectMilestone {
  id: string;
  project_id: string;
  milestone_name: string;
  phase: 'planning' | 'execution' | 'process_qualification';
  target_date: string | null;
  actual_date: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  notes: string | null;
  approved_by: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface NPIProjectWithRelations extends NPIProject {
  charter?: NPIProjectCharter;
  team?: NPIProjectTeamMember[];
  milestones?: NPIProjectMilestone[];
  design_transfer_items?: NPIDesignTransferItem[];
  project_manager?: { email: string; full_name: string } | null;
  linked_blue_reviews_count?: number;
  linked_pipeline_jobs_count?: number;
}

export const PROJECT_PHASES = [
  { value: 'planning', label: 'Planning', color: 'bg-blue-500' },
  { value: 'execution', label: 'Execution', color: 'bg-amber-500' },
  { value: 'process_qualification', label: 'Process Qualification', color: 'bg-purple-500' },
  { value: 'completed', label: 'Completed', color: 'bg-green-500' },
  { value: 'on_hold', label: 'On Hold', color: 'bg-gray-500' },
] as const;

export const PROJECT_STATUSES = [
  { value: 'active', label: 'Active', color: 'bg-green-500' },
  { value: 'completed', label: 'Completed', color: 'bg-blue-500' },
  { value: 'on_hold', label: 'On Hold', color: 'bg-amber-500' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
] as const;

export const DESIGN_TRANSFER_CATEGORIES = [
  'Equipment',
  'Personnel',
  'Processes',
  'Materials',
  'Suppliers',
  'Validation/Verification',
  'Risk Assessment',
  'Documentation',
  'Regulatory',
  'Facilities',
] as const;

export const DEFAULT_DESIGN_TRANSFER_ITEMS: Omit<NPIDesignTransferItem, 'id' | 'project_id' | 'created_at' | 'updated_at'>[] = [
  // Planning Phase
  { category: 'Equipment', item_name: 'Identification of required equipment', description: 'Identify all equipment needed for production', phase: 'planning', status: 'not_started', owner_id: null, owner_name: null, due_date: null, completed_date: null, notes: null, display_order: 1 },
  { category: 'Personnel', item_name: 'Identification of required personnel', description: 'Identify personnel and training needs', phase: 'planning', status: 'not_started', owner_id: null, owner_name: null, due_date: null, completed_date: null, notes: null, display_order: 2 },
  { category: 'Processes', item_name: 'Identification of required processes', description: 'Document all manufacturing processes', phase: 'planning', status: 'not_started', owner_id: null, owner_name: null, due_date: null, completed_date: null, notes: null, display_order: 3 },
  { category: 'Materials', item_name: 'Identification of materials', description: 'Define all raw materials and components', phase: 'planning', status: 'not_started', owner_id: null, owner_name: null, due_date: null, completed_date: null, notes: null, display_order: 4 },
  { category: 'Suppliers', item_name: 'Approved supplier list', description: 'Establish approved vendor list (AVL)', phase: 'planning', status: 'not_started', owner_id: null, owner_name: null, due_date: null, completed_date: null, notes: null, display_order: 5 },
  { category: 'Validation/Verification', item_name: 'Identification of validation/verification requirements', description: 'Define V&V activities and acceptance criteria', phase: 'planning', status: 'not_started', owner_id: null, owner_name: null, due_date: null, completed_date: null, notes: null, display_order: 6 },
  { category: 'Risk Assessment', item_name: 'Process risk assessment (PFMEA)', description: 'Initial risk assessment and mitigation', phase: 'planning', status: 'not_started', owner_id: null, owner_name: null, due_date: null, completed_date: null, notes: null, display_order: 7 },
  { category: 'Documentation', item_name: 'DMR requirements', description: 'Device Master Record documentation plan', phase: 'planning', status: 'not_started', owner_id: null, owner_name: null, due_date: null, completed_date: null, notes: null, display_order: 8 },
  
  // Execution Phase
  { category: 'Equipment', item_name: 'Equipment installation & validation', description: 'Install and validate production equipment', phase: 'execution', status: 'not_started', owner_id: null, owner_name: null, due_date: null, completed_date: null, notes: null, display_order: 9 },
  { category: 'Personnel', item_name: 'Personnel training', description: 'Complete operator training program', phase: 'execution', status: 'not_started', owner_id: null, owner_name: null, due_date: null, completed_date: null, notes: null, display_order: 10 },
  { category: 'Documentation', item_name: 'Production documentation', description: 'Procedures, inspection docs, DHR requirements', phase: 'execution', status: 'not_started', owner_id: null, owner_name: null, due_date: null, completed_date: null, notes: null, display_order: 11 },
  { category: 'Materials', item_name: 'Material procurement', description: 'Procure materials for development and PQ', phase: 'execution', status: 'not_started', owner_id: null, owner_name: null, due_date: null, completed_date: null, notes: null, display_order: 12 },
  { category: 'Processes', item_name: 'Tooling and fixturing', description: 'Design, build and validate tooling', phase: 'execution', status: 'not_started', owner_id: null, owner_name: null, due_date: null, completed_date: null, notes: null, display_order: 13 },
  { category: 'Validation/Verification', item_name: 'IQ/OQ protocols', description: 'Draft and execute IQ/OQ protocols', phase: 'execution', status: 'not_started', owner_id: null, owner_name: null, due_date: null, completed_date: null, notes: null, display_order: 14 },
  { category: 'Facilities', item_name: 'Facilities validation', description: 'Validate production environment', phase: 'execution', status: 'not_started', owner_id: null, owner_name: null, due_date: null, completed_date: null, notes: null, display_order: 15 },
  
  // Process Qualification Phase
  { category: 'Validation/Verification', item_name: 'PQ protocol execution', description: 'Execute Process Qualification protocol', phase: 'process_qualification', status: 'not_started', owner_id: null, owner_name: null, due_date: null, completed_date: null, notes: null, display_order: 16 },
  { category: 'Documentation', item_name: 'Design transfer review', description: 'Final review and approval of checklist', phase: 'process_qualification', status: 'not_started', owner_id: null, owner_name: null, due_date: null, completed_date: null, notes: null, display_order: 17 },
  { category: 'Regulatory', item_name: 'Quality approval', description: 'Quality sign-off for transfer to production', phase: 'process_qualification', status: 'not_started', owner_id: null, owner_name: null, due_date: null, completed_date: null, notes: null, display_order: 18 },
  { category: 'Processes', item_name: 'Handover to standard operations', description: 'Formal handover to production team', phase: 'process_qualification', status: 'not_started', owner_id: null, owner_name: null, due_date: null, completed_date: null, notes: null, display_order: 19 },
];
