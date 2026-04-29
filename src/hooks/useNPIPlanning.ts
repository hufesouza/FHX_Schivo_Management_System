import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type Customer = {
  id: string;
  customer_name: string;
  customer_code: string | null;
  account_owner: string | null;
  email: string | null;
  notes: string | null;
};

export type PlanningProject = {
  id: string;
  project_name: string;
  customer_id: string | null;
  customer_name: string | null;
  engineer: string | null;
  status: string;
  notes: string | null;
};

export type Machine = {
  id: string;
  machine_name: string;
  machine_type: string | null;
  daily_available_hours: number;
  shift_pattern: string | null;
  status: string;
  notes: string | null;
};

export type Part = {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  project_id: string | null;
  project_name: string | null;
  engineer: string | null;
  part_number: string;
  description: string | null;
  po: string | null;
  qty: number | null;
  material: string | null;
  material_lead_time: number | null;
  material_status: string | null;
  material_ordered_at: string | null;
  material_received_at: string | null;
  tooling: string | null;
  tooling_lead_time: number | null;
  tooling_status: string | null;
  tooling_ordered_at: string | null;
  tooling_received_at: string | null;
  committed_date: string | null;
  best_commence_date: string | null;
  ship_date: string | null;
  cycle_time: number | null;
  development_time: number | null;
  total_required_time: number | null;
  machine_id: string | null;
  machine_name: string | null;
  overall_status: string;
  subcon: boolean | null;
  supplier_name: string | null;
  type_of_service: string | null;
  subcon_lead_time: number | null;
  subcon_status: string | null;
  sales_price: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ScheduleEntry = {
  id: string;
  part_id: string | null;
  part_number: string | null;
  customer_name: string | null;
  project_name: string | null;
  machine_id: string | null;
  machine_name: string | null;
  start_date: string;
  end_date: string;
  total_required_time: number;
  allocation_status: string;
  notes: string | null;
};

export type ToolingItem = {
  id: string;
  part_id: string | null;
  part_number: string | null;
  tooling_description: string;
  required_status: string | null;
  ordered_status: string | null;
  supplier: string | null;
  expected_delivery_date: string | null;
  notes: string | null;
};

export type ChangeLog = {
  id: string;
  part_id: string | null;
  part_number: string | null;
  customer_name: string | null;
  project_name: string | null;
  field_changed: string;
  previous_value: string | null;
  new_value: string | null;
  reason: string | null;
  changed_by_name: string | null;
  email_sent: boolean | null;
  created_at: string;
};

export type EmailRecipient = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  is_active: boolean;
};

export type MachineAvailability = {
  id: string;
  machine_id: string;
  start_date: string;
  end_date: string;
  notes: string | null;
};

export const useNPIPlanning = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<PlanningProject[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [tooling, setTooling] = useState<ToolingItem[]>([]);
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [availability, setAvailability] = useState<MachineAvailability[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [c, p, m, pa, s, t, r, a] = await Promise.all([
      supabase.from('npi_customers').select('*').order('customer_name'),
      supabase.from('npi_projects_planning').select('*').order('project_name'),
      supabase.from('npi_machines').select('*').order('machine_name'),
      supabase.from('npi_parts').select('*').order('created_at', { ascending: false }),
      supabase.from('npi_machine_schedule').select('*').order('start_date'),
      supabase.from('npi_tooling_tracker').select('*').order('expected_delivery_date'),
      supabase.from('npi_email_recipients').select('*').order('role'),
      supabase.from('npi_machine_availability').select('*').order('start_date'),
    ]);
    setCustomers((c.data as any) || []);
    setProjects((p.data as any) || []);
    setMachines((m.data as any) || []);
    setParts((pa.data as any) || []);
    setSchedule((s.data as any) || []);
    setTooling((t.data as any) || []);
    setRecipients((r.data as any) || []);
    setAvailability((a.data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return {
    customers, projects, machines, parts, schedule, tooling, recipients, availability,
    loading, reload: loadAll,
    setCustomers, setProjects, setMachines, setParts, setSchedule, setTooling, setRecipients,
  };
};

// === Allocation logic ===
export type AllocationOption = {
  machine: Machine;
  earliestStart: Date;        // earliest the job CAN start (constrained by lead times)
  machiningStart: Date;       // when the machine actually starts running it
  machiningEnd: Date;         // machining complete
  backendEnd: Date;           // backend ops complete
  shipDate: Date;             // = backendEnd
  end: Date;                  // alias for machiningEnd (back-compat with calendar/schedule code)
  meetsCommittedDate: boolean;
  meetsBestCommence: boolean;
  status: 'On Track' | 'At Risk' | 'Late';
  reason: string;
  score: number;              // lower = better
};

// Compute the earliest the job can physically start, constrained by material/tooling lead times.
// Lead-time clock starts when status becomes "Ordered" (uses ordered_at + lead_time days).
// "Received" / "Not Required" => already satisfied (today).
// Otherwise (Required / Not Ordered / null) => not yet ordered, clock starts today.
export const computeEarliestStart = (params: {
  materialLeadTime?: number | null;
  materialStatus?: string | null;
  materialOrderedAt?: Date | string | null;
  materialReceivedAt?: Date | string | null;
  toolingLeadTime?: number | null;   // already the MAX across tools
  toolingStatus?: string | null;
  toolingOrderedAt?: Date | string | null;
  toolingReceivedAt?: Date | string | null;
  bestCommenceDate?: Date | null;
}): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const readyDate = (
    status: string | null | undefined,
    leadTime: number | null | undefined,
    orderedAt: Date | string | null | undefined,
    receivedAt: Date | string | null | undefined,
  ): Date => {
    if (status === 'Received' || status === 'Not Required') {
      return receivedAt ? new Date(receivedAt) : today;
    }
    const lead = Math.max(0, Number(leadTime) || 0);
    if (status === 'Ordered' && orderedAt) {
      return new Date(new Date(orderedAt).getTime() + lead * 24 * 3600 * 1000);
    }
    // Not yet ordered — clock starts today
    return new Date(today.getTime() + lead * 24 * 3600 * 1000);
  };

  const matReady = readyDate(params.materialStatus, params.materialLeadTime, params.materialOrderedAt, params.materialReceivedAt);
  const toolReady = readyDate(params.toolingStatus, params.toolingLeadTime, params.toolingOrderedAt, params.toolingReceivedAt);
  const leadStart = matReady > toolReady ? matReady : toolReady;

  if (params.bestCommenceDate && params.bestCommenceDate > leadStart) return params.bestCommenceDate;
  return leadStart;
};

// Find next gap that fits required time within machine's existing schedule
// AND inside one of its NPI availability windows.
export const findNextGap = (
  machine: Machine,
  schedule: ScheduleEntry[],
  availability: MachineAvailability[],
  requiredHours: number,
  earliestStart: Date,
): { start: Date; end: Date } | null => {
  const dailyHours = Number(machine.daily_available_hours) || 24;
  const requiredMs = (requiredHours / dailyHours) * 24 * 3600 * 1000;

  const machineSchedule = schedule
    .filter(s => s.machine_id === machine.id && s.allocation_status !== 'Cancelled' && s.allocation_status !== 'Completed')
    .map(s => ({ start: new Date(s.start_date), end: new Date(s.end_date) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const windows = availability
    .filter(a => a.machine_id === machine.id)
    .map(a => ({
      start: new Date(a.start_date + 'T00:00:00'),
      // end_date is inclusive day; treat as end of that day
      end: new Date(a.end_date + 'T23:59:59'),
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  // If no windows defined, machine is never available for NPI
  if (windows.length === 0) return null;

  for (const win of windows) {
    if (win.end <= earliestStart) continue;
    let cursor = new Date(Math.max(win.start.getTime(), earliestStart.getTime()));

    const slotsInWindow = machineSchedule.filter(s => s.end > win.start && s.start < win.end);

    let placed = false;
    for (const slot of slotsInWindow) {
      if (slot.end <= cursor) continue;
      const availableMs = slot.start.getTime() - cursor.getTime();
      if (availableMs >= requiredMs) {
        return { start: cursor, end: new Date(cursor.getTime() + requiredMs) };
      }
      if (slot.end > cursor) cursor = new Date(slot.end);
      if (cursor >= win.end) { placed = true; break; }
    }

    // Try after the last booking inside this window
    if (!placed && win.end.getTime() - cursor.getTime() >= requiredMs) {
      return { start: cursor, end: new Date(cursor.getTime() + requiredMs) };
    }
  }
  return null;
};

export type AllocationInputs = {
  qty: number;
  cycleTimeHrs: number;          // hrs per piece
  developmentTimeHrs: number;    // one-off setup/dev hrs
  materialLeadTime: number | null;
  materialStatus: string | null;
  materialOrderedAt?: Date | string | null;
  materialReceivedAt?: Date | string | null;
  toolingLeadTime: number | null;  // already MAX across tools
  toolingStatus: string | null;
  toolingOrderedAt?: Date | string | null;
  toolingReceivedAt?: Date | string | null;
  subconRequired: boolean;
  subconLeadTime: number | null;   // days, after machining
  backendLeadTime?: number | null; // days, deburr/wash/inspection (default 0)
  bestCommenceDate: Date | null;
  committedDate: Date | null;
};

export const recommendAllocations = (
  candidateMachines: Machine[],
  schedule: ScheduleEntry[],
  availability: MachineAvailability[],
  inputs: AllocationInputs,
): AllocationOption[] => {
  const totalMachiningHrs =
    (Number(inputs.developmentTimeHrs) || 0) +
    (Number(inputs.cycleTimeHrs) || 0) * (Number(inputs.qty) || 0);

  const earliestStart = computeEarliestStart({
    materialLeadTime: inputs.materialLeadTime,
    materialStatus: inputs.materialStatus,
    materialOrderedAt: inputs.materialOrderedAt,
    materialReceivedAt: inputs.materialReceivedAt,
    toolingLeadTime: inputs.toolingLeadTime,
    toolingStatus: inputs.toolingStatus,
    toolingOrderedAt: inputs.toolingOrderedAt,
    toolingReceivedAt: inputs.toolingReceivedAt,
    bestCommenceDate: inputs.bestCommenceDate,
  });

  const backendDays =
    (Number(inputs.backendLeadTime) || 0) +
    (inputs.subconRequired ? (Number(inputs.subconLeadTime) || 0) : 0);

  const matDays = Math.max(0, Number(inputs.materialLeadTime) || 0);
  const toolDays = Math.max(0, Number(inputs.toolingLeadTime) || 0);
  const constraintLabel = toolDays > matDays ? 'tooling lead time' : (matDays > 0 ? 'material lead time' : null);

  const options = candidateMachines
    .filter(m => m.status === 'Available')
    .map(m => {
      const gap = findNextGap(m, schedule, availability, totalMachiningHrs, earliestStart);
      if (!gap) return null;

      const machiningStart = gap.start;
      const machiningEnd = gap.end;
      const backendEnd = new Date(machiningEnd.getTime() + backendDays * 24 * 3600 * 1000);
      const shipDate = backendEnd;

      const meetsCommitted = !inputs.committedDate || shipDate <= inputs.committedDate;
      const meetsBest = !inputs.bestCommenceDate || machiningStart <= inputs.bestCommenceDate;

      let status: AllocationOption['status'] = 'On Track';
      if (!meetsCommitted) {
        const overdueDays = inputs.committedDate
          ? (shipDate.getTime() - inputs.committedDate.getTime()) / (24 * 3600 * 1000)
          : 0;
        status = overdueDays > 3 ? 'Late' : 'At Risk';
      }

      const reasonParts: string[] = [];
      if (constraintLabel && earliestStart.getTime() > Date.now()) {
        reasonParts.push(`Earliest start delayed by ${constraintLabel} (${Math.max(matDays, toolDays)}d)`);
      }
      if (machiningStart.getTime() > earliestStart.getTime() + 24 * 3600 * 1000) {
        reasonParts.push('Waiting for machine availability');
      }
      if (backendDays > 0) {
        reasonParts.push(`+${backendDays}d backend/subcon`);
      }
      if (!meetsCommitted) {
        reasonParts.push('Cannot meet committed date with current constraints');
      }

      const score = shipDate.getTime() + (meetsCommitted ? 0 : 1e12);

      return {
        machine: m,
        earliestStart,
        machiningStart,
        machiningEnd,
        backendEnd,
        shipDate,
        end: machiningEnd,
        meetsCommittedDate: meetsCommitted,
        meetsBestCommence: meetsBest,
        status,
        reason: reasonParts.join(' · ') || 'All constraints satisfied',
        score,
      } as AllocationOption;
    })
    .filter((o): o is AllocationOption => o !== null)
    .sort((a, b) => a.score - b.score);

  return options;
};

// === CRUD helpers ===
export const upsertPart = async (part: Partial<Part>, machineOptionIds: string[] = []) => {
  const { data: { user } } = await supabase.auth.getUser();
  const payload: any = { ...part };
  if (!part.id) payload.created_by = user?.id;

  const { data, error } = part.id
    ? await supabase.from('npi_parts').update(payload).eq('id', part.id).select().single()
    : await supabase.from('npi_parts').insert(payload).select().single();

  if (error) {
    toast.error(error.message);
    throw error;
  }

  // Update machine options
  if (data) {
    await supabase.from('npi_part_machine_options').delete().eq('part_id', data.id);
    if (machineOptionIds.length) {
      await supabase.from('npi_part_machine_options').insert(
        machineOptionIds.map(mid => ({ part_id: data.id, machine_id: mid }))
      );
    }
  }

  return data;
};

export const logChange = async (
  part: Part,
  field: string,
  prev: string | null,
  next: string | null,
  reason: string | null,
) => {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles').select('full_name,email').eq('user_id', user?.id || '').maybeSingle();

  const { data: log } = await supabase.from('npi_change_log').insert({
    part_id: part.id,
    part_number: part.part_number,
    customer_name: part.customer_name,
    project_name: part.project_name,
    field_changed: field,
    previous_value: prev,
    new_value: next,
    reason,
    changed_by: user?.id,
    changed_by_name: profile?.full_name || profile?.email || 'Unknown',
  }).select().single();

  // Trigger email for committed_date or machine changes
  if (field === 'committed_date' || field === 'machine_name') {
    try {
      await supabase.functions.invoke('npi-notify-change', { body: { changeLogId: log?.id } });
    } catch (e) {
      console.error('Email notify failed', e);
    }
  }
};
