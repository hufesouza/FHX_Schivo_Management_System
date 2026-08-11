export type SchedJobStatus = 'planned' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
export type SchedJobPriority = 'low' | 'medium' | 'high' | 'critical';

export interface SchedMachine {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  daily_hours: number;
  notes: string | null;
}

export interface SchedSetter {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
  start_time: string;
  end_time: string;
  break_minutes: number;
  notes: string | null;
}

export interface SchedSetterDay {
  id: string;
  setter_id: string;
  day_of_week: number; // 0 = Sunday ... 6 = Saturday
  hours: number;
}

export interface SchedHoliday {
  id: string;
  holiday_date: string;
  label: string | null;
  setter_id: string | null;
  machine_id: string | null;
}

export type CycleTimeUnit = 'seconds' | 'minutes' | 'hours';
export type ProductionStatus =
  | 'not_scheduled'
  | 'scheduled'
  | 'in_production'
  | 'completed'
  | 'on_hold'
  | 'cancelled';

/**
 * Allocation kind:
 * - development : setter + machine
 * - programming : setter only
 * - setup       : setter + machine (machine setup before a production run)
 * - production  : machine only (the run itself)
 */
export type AllocType = 'development' | 'programming' | 'production' | 'setup';

/** Both production types require a machine AND a setter for setup. */
export type ProductionType = 'npi_production' | 'standard_production';

/** Programming status mirrors production statuses. */
export type ProgrammingStatus = ProductionStatus;

export interface SchedJob {
  id: string;
  job_number: string;
  po_number: string;
  part_number: string | null;
  customer: string | null;
  machine_id: string | null;
  setter_id: string | null;
  start_date: string;
  development_hours: number;
  priority: SchedJobPriority;
  status: SchedJobStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // --- production layer ---
  production_quantity: number;
  cycle_time: number;
  cycle_time_unit: CycleTimeUnit;
  production_start: string | null;
  production_end: string | null;
  production_status: ProductionStatus;
  // --- job type + production setup ---
  is_npi: boolean;
  is_production: boolean;
  production_type: ProductionType;
  production_setter_id: string | null;
  setup_hours: number;
  // --- programming layer (consumes programmer/setter time only) ---
  programmer_id: string | null;
  programming_hours: number;
  programming_start: string | null;
  programming_end: string | null;
  programming_status: ProgrammingStatus;
}

export interface SchedAllocation {
  id: string;
  job_id: string;
  setter_id: string | null;
  machine_id: string | null;
  alloc_date: string;
  hours: number;
  alloc_type: AllocType;
}


export interface SchedAuditEntry {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  entity_label: string | null;
  previous_value: unknown;
  new_value: unknown;
  created_at: string;
}

export const STATUS_OPTIONS: { value: SchedJobStatus; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const PRIORITY_OPTIONS: { value: SchedJobPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export const DOW_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** Monday-first order used by the calendar grid. */
export const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];

export const CYCLE_TIME_UNITS: { value: CycleTimeUnit; label: string }[] = [
  { value: 'seconds', label: 'Seconds / pc' },
  { value: 'minutes', label: 'Minutes / pc' },
  { value: 'hours', label: 'Hours / pc' },
];

export const PRODUCTION_STATUS_OPTIONS: { value: ProductionStatus; label: string }[] = [
  { value: 'not_scheduled', label: 'Not Scheduled' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_production', label: 'In Production' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const PRODUCTION_TYPE_OPTIONS: { value: ProductionType; label: string }[] = [
  { value: 'npi_production', label: 'NPI Production' },
  { value: 'standard_production', label: 'Standard Production' },
];

export const PROGRAMMING_STATUS_OPTIONS: { value: ProgrammingStatus; label: string }[] = [
  { value: 'not_scheduled', label: 'Not Scheduled' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_production', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'cancelled', label: 'Cancelled' },
];
