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

/** Allocation kind — development consumes setter + machine, production consumes machine only. */
export type AllocType = 'development' | 'production';

export interface SchedJob {
  id: string;
  job_number: string;
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
