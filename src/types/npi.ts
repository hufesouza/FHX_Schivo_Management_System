export interface NPIJob {
  id: string;
  row_index: number | null;
  npi_pm: string | null;
  customer: string | null;
  mc_cell: string | null;
  mc: string | null;
  part: string | null;
  dp1: string | null;
  dp2: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  days: number | null;
  status: string | null;
  gate_commit_date: string | null;
  percent_complete: number | null;
  uploaded_by: string;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
}

export interface NPIPrereq {
  id: string;
  job_id: string;
  doc_control: string | null;
  po_printed: string | null;
  packaging: string | null;
  material: string | null;
  tooling: string | null;
  mc_prep: string | null;
  metr_prg: string | null;
  metr_fix: string | null;
  gauges: string | null;
  additional_reqs: string | null;
  created_at: string;
}

export interface NPIPostMc {
  id: string;
  job_id: string;
  work_instructions: string | null;
  production_ims: string | null;
  qc_ims: string | null;
  fair: string | null;
  re_rev_closure: string | null;
  aging_days: number | null;
  created_at: string;
}

export interface NPIJobWithRelations extends NPIJob {
  prereq?: NPIPrereq;
  post_mc?: NPIPostMc;
  ready_for_mc: boolean;
  fully_released: boolean;
}

export interface ParsedNPIData {
  jobs: Omit<NPIJob, 'id' | 'uploaded_by' | 'uploaded_at' | 'created_at' | 'updated_at'>[];
  prereqs: Omit<NPIPrereq, 'id' | 'job_id' | 'created_at'>[];
  postMcs: Omit<NPIPostMc, 'id' | 'job_id' | 'created_at'>[];
}

// Status values commonly found in NPI tracking
export const NPI_STATUSES = [
  'Not Started',
  'In-Process',
  'QA',
  'DB',
  'Complete',
  'On Hold',
  'Cancelled'
] as const;

// MC Cell categories
export const MC_CELLS = [
  'SLH',
  'MT',
  'LASER',
  'MILL',
  'TURN',
  'OTHER'
] as const;

// Prerequisite status values
export const PREREQ_STATUS_VALUES = {
  COMPLETE: ['C', 'G', '✓', 'Y', 'YES', 'COMPLETE'],
  WIP: ['WIP', 'IP', 'IN PROGRESS'],
  NOT_STARTED: ['N/S', 'NS', 'NOT STARTED', 'N', 'NO', ''],
  NOT_APPLICABLE: ['N/A', 'NA', '-']
} as const;

export function getPrereqStatusColor(value: string | null): 'green' | 'yellow' | 'red' | 'gray' {
  if (!value) return 'red';
  const upper = value.toUpperCase().trim();
  
  if ((PREREQ_STATUS_VALUES.COMPLETE as readonly string[]).includes(upper)) return 'green';
  if ((PREREQ_STATUS_VALUES.WIP as readonly string[]).includes(upper)) return 'yellow';
  if ((PREREQ_STATUS_VALUES.NOT_APPLICABLE as readonly string[]).includes(upper)) return 'gray';
  return 'red';
}

export function isPrereqComplete(value: string | null): boolean {
  if (!value) return false;
  const upper = value.toUpperCase().trim();
  return (PREREQ_STATUS_VALUES.COMPLETE as readonly string[]).includes(upper) || 
         (PREREQ_STATUS_VALUES.NOT_APPLICABLE as readonly string[]).includes(upper);
}

export function isJobReadyForMC(prereq: NPIPrereq | undefined): boolean {
  if (!prereq) return false;
  
  const fields = [
    prereq.doc_control,
    prereq.po_printed,
    prereq.packaging,
    prereq.material,
    prereq.tooling,
    prereq.mc_prep,
    prereq.metr_prg,
    prereq.metr_fix,
    prereq.gauges
  ];
  
  return fields.every(isPrereqComplete);
}

export function isJobFullyReleased(postMc: NPIPostMc | undefined): boolean {
  if (!postMc) return false;
  
  const fields = [
    postMc.work_instructions,
    postMc.production_ims,
    postMc.qc_ims,
    postMc.fair,
    postMc.re_rev_closure
  ];
  
  return fields.every(isPrereqComplete);
}
