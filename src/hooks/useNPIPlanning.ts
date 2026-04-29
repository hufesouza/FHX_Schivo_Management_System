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
  tooling: string | null;
  tooling_lead_time: number | null;
  tooling_status: string | null;
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

export const useNPIPlanning = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<PlanningProject[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [tooling, setTooling] = useState<ToolingItem[]>([]);
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [c, p, m, pa, s, t, r] = await Promise.all([
      supabase.from('npi_customers').select('*').order('customer_name'),
      supabase.from('npi_projects_planning').select('*').order('project_name'),
      supabase.from('npi_machines').select('*').order('machine_name'),
      supabase.from('npi_parts').select('*').order('created_at', { ascending: false }),
      supabase.from('npi_machine_schedule').select('*').order('start_date'),
      supabase.from('npi_tooling_tracker').select('*').order('expected_delivery_date'),
      supabase.from('npi_email_recipients').select('*').order('role'),
    ]);
    setCustomers((c.data as any) || []);
    setProjects((p.data as any) || []);
    setMachines((m.data as any) || []);
    setParts((pa.data as any) || []);
    setSchedule((s.data as any) || []);
    setTooling((t.data as any) || []);
    setRecipients((r.data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return {
    customers, projects, machines, parts, schedule, tooling, recipients,
    loading, reload: loadAll,
    setCustomers, setProjects, setMachines, setParts, setSchedule, setTooling, setRecipients,
  };
};

// === Allocation logic ===
export type AllocationOption = {
  machine: Machine;
  earliestStart: Date;
  end: Date;
  meetsCommittedDate: boolean;
  meetsBestCommence: boolean;
  score: number; // lower = better
};

export const findNextGap = (
  machine: Machine,
  schedule: ScheduleEntry[],
  requiredHours: number,
  earliestStart: Date,
): { start: Date; end: Date } => {
  const dailyHours = Number(machine.daily_available_hours) || 24;
  const requiredMs = (requiredHours / dailyHours) * 24 * 3600 * 1000;

  const machineSchedule = schedule
    .filter(s => s.machine_id === machine.id && s.allocation_status !== 'Cancelled' && s.allocation_status !== 'Completed')
    .map(s => ({ start: new Date(s.start_date), end: new Date(s.end_date) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  let cursor = new Date(earliestStart);
  for (const slot of machineSchedule) {
    if (slot.end <= cursor) continue;
    if (slot.start.getTime() - cursor.getTime() >= requiredMs) {
      return { start: cursor, end: new Date(cursor.getTime() + requiredMs) };
    }
    if (slot.end > cursor) cursor = new Date(slot.end);
  }
  return { start: cursor, end: new Date(cursor.getTime() + requiredMs) };
};

export const recommendAllocations = (
  candidateMachines: Machine[],
  schedule: ScheduleEntry[],
  requiredHours: number,
  bestCommenceDate: Date | null,
  committedDate: Date | null,
): AllocationOption[] => {
  const earliest = bestCommenceDate && bestCommenceDate > new Date()
    ? bestCommenceDate
    : new Date();

  const options = candidateMachines
    .filter(m => m.status === 'Available')
    .map(m => {
      const gap = findNextGap(m, schedule, requiredHours, earliest);
      const meetsCommitted = !committedDate || gap.end <= committedDate;
      const meetsBest = !bestCommenceDate || gap.start <= bestCommenceDate;
      // Score: earliest start wins, penalize missing committed
      const score = gap.start.getTime() + (meetsCommitted ? 0 : 1e12);
      return {
        machine: m,
        earliestStart: gap.start,
        end: gap.end,
        meetsCommittedDate: meetsCommitted,
        meetsBestCommence: meetsBest,
        score,
      };
    })
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
