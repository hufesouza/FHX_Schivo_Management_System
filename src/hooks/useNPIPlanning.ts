import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  CalendarSettings,
  DEFAULT_CALENDAR,
  isNonWorkingDay,
  nextWorkingDay,
  addWorkingHours,
  idleNonWorkingDaysAfter,
} from '@/utils/workingCalendar';
export { isNonWorkingDay, idleNonWorkingDaysAfter } from '@/utils/workingCalendar';
export type { CalendarSettings } from '@/utils/workingCalendar';

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
  backend_time: number | null;
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
  dev_allow_weekends: boolean | null;
  prod_allow_weekends: boolean | null;
  part_level: string | null;
  parent_part_id: string | null;
  created_at: string;
  updated_at: string;
};

// Derive a "completion" date for dependency calculations.
// Used when a Top Level part needs to wait on its Sub Level children.
export const partCompletionDate = (p: Part, schedule: ScheduleEntry[]): Date | null => {
  if (p.ship_date) return new Date(p.ship_date);
  // Find the latest active schedule end for this part
  const ends = schedule
    .filter(s => s.part_id === p.id && s.allocation_status !== 'Cancelled')
    .map(s => new Date(s.end_date).getTime());
  if (ends.length) return new Date(Math.max(...ends));
  if (p.committed_date) return new Date(p.committed_date);
  return null;
};

// Returns the latest expected completion across a Top Level part's children.
// Returns null if there are no children (no parent dependency).
export const childrenLatestCompletion = (
  parentId: string,
  parts: Part[],
  schedule: ScheduleEntry[],
): Date | null => {
  const kids = parts.filter(p => p.parent_part_id === parentId);
  if (!kids.length) return null;
  let latest: Date | null = null;
  for (const k of kids) {
    if (k.overall_status === 'Completed') continue; // already done
    const d = partCompletionDate(k, schedule);
    if (d && (!latest || d > latest)) latest = d;
  }
  return latest;
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
  const [toolingCatalog, setToolingCatalog] = useState<any[]>([]);
  const [partTooling, setPartTooling] = useState<any[]>([]);
  const [materialsCatalog, setMaterialsCatalog] = useState<any[]>([]);
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [availability, setAvailability] = useState<MachineAvailability[]>([]);
  const [calendarSettings, setCalendarSettings] = useState<CalendarSettings>(DEFAULT_CALENDAR);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [c, p, m, pa, s, t, tc, pt, mc, r, a, cs] = await Promise.all([
      supabase.from('npi_customers').select('*').order('customer_name'),
      supabase.from('npi_projects_planning').select('*').order('project_name'),
      supabase.from('npi_machines').select('*').order('machine_name'),
      supabase.from('npi_parts').select('*').order('created_at', { ascending: false }),
      supabase.from('npi_machine_schedule').select('*').order('start_date'),
      supabase.from('npi_tooling_tracker').select('*').order('expected_delivery_date'),
      supabase.from('npi_tooling_catalog').select('*').order('tooling_description'),
      supabase.from('npi_part_tooling').select('*').order('created_at', { ascending: false }),
      supabase.from('npi_materials_catalog').select('*').order('material_description'),
      supabase.from('npi_email_recipients').select('*').order('role'),
      supabase.from('npi_machine_availability').select('*').order('start_date'),
      supabase.from('npi_planner_settings').select('*').eq('is_active', true).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    setCustomers((c.data as any) || []);
    setProjects((p.data as any) || []);
    setMachines((m.data as any) || []);
    setParts((pa.data as any) || []);
    setSchedule((s.data as any) || []);
    setTooling((t.data as any) || []);
    setToolingCatalog((tc.data as any) || []);
    setPartTooling((pt.data as any) || []);
    setMaterialsCatalog((mc.data as any) || []);
    setRecipients((r.data as any) || []);
    setAvailability((a.data as any) || []);
    if (cs.data) {
      setCalendarSettings({
        countryCode: (cs.data as any).country_code,
        countryLabel: (cs.data as any).country_label,
        weekendDays: (cs.data as any).weekend_days || [0, 6],
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return {
    customers, projects, machines, parts, schedule, tooling, toolingCatalog, partTooling, materialsCatalog, recipients, availability,
    calendarSettings,
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
// When `calendar` + `respectCalendar` are supplied, machining hours skip non-working days
// (weekends/holidays). When `respectCalendar` is false (production allowed weekends), the
// job runs continuously through the gap.
export const findNextGap = (
  machine: Machine,
  schedule: ScheduleEntry[],
  availability: MachineAvailability[],
  requiredHours: number,
  earliestStart: Date,
  calendar?: CalendarSettings,
  respectCalendar: boolean = false,
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
      end: new Date(a.end_date + 'T23:59:59'),
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  if (windows.length === 0) return null;

  const computeEnd = (start: Date): Date => {
    if (calendar && respectCalendar) {
      // Skip non-working days when consuming hours
      return addWorkingHours(start, requiredHours, dailyHours, calendar, true);
    }
    return new Date(start.getTime() + requiredMs);
  };

  // Bump cursor forward to a working day if the calendar requires it
  const bumpToWorking = (d: Date): Date => {
    if (calendar && respectCalendar) return nextWorkingDay(d, calendar);
    return d;
  };

  const fitsBefore = (start: Date, hardEnd: Date): { start: Date; end: Date } | null => {
    const adjusted = bumpToWorking(start);
    if (adjusted >= hardEnd) return null;
    const end = computeEnd(adjusted);
    if (end <= hardEnd) return { start: adjusted, end };
    return null;
  };

  for (const win of windows) {
    if (win.end <= earliestStart) continue;
    let cursor = new Date(Math.max(win.start.getTime(), earliestStart.getTime()));

    const slotsInWindow = machineSchedule.filter(s => s.end > win.start && s.start < win.end);

    let placed = false;
    for (const slot of slotsInWindow) {
      if (slot.end <= cursor) continue;
      const fit = fitsBefore(cursor, slot.start);
      if (fit) return fit;
      if (slot.end > cursor) cursor = new Date(slot.end);
      if (cursor >= win.end) { placed = true; break; }
    }

    if (!placed) {
      const fit = fitsBefore(cursor, win.end);
      if (fit) return fit;
    }
  }
  return null;
};

export type AllocationInputs = {
  qty: number;
  cycleTimeHrs: number;
  developmentTimeHrs: number;
  materialLeadTime: number | null;
  materialStatus: string | null;
  materialOrderedAt?: Date | string | null;
  materialReceivedAt?: Date | string | null;
  toolingLeadTime: number | null;
  toolingStatus: string | null;
  toolingOrderedAt?: Date | string | null;
  toolingReceivedAt?: Date | string | null;
  subconRequired: boolean;
  subconLeadTime: number | null;
  backendLeadTime?: number | null;
  bestCommenceDate: Date | null;
  committedDate: Date | null;
  // Calendar / weekend permissions
  calendar?: CalendarSettings;
  devAllowWeekends?: boolean;   // if false, dev hours skip non-working days
  prodAllowWeekends?: boolean;  // if false, production hours skip non-working days
  // Top Level parts may not start before children complete
  childrenReadyDate?: Date | null;
};

export const recommendAllocations = (
  candidateMachines: Machine[],
  schedule: ScheduleEntry[],
  availability: MachineAvailability[],
  inputs: AllocationInputs,
): AllocationOption[] => {
  const devHrs = Number(inputs.developmentTimeHrs) || 0;
  const prodHrs = (Number(inputs.cycleTimeHrs) || 0) * (Number(inputs.qty) || 0);
  const totalMachiningHrs = devHrs + prodHrs;

  // If dev and prod have different weekend rules, the most restrictive wins for the combined
  // scheduling block (we treat dev + prod as one continuous machine booking). This is a
  // pragmatic choice: if EITHER stage forbids weekends, the block respects the calendar.
  const calendar = inputs.calendar;
  const respectCalendar = !!calendar && (
    (devHrs > 0 && inputs.devAllowWeekends === false) ||
    (prodHrs > 0 && inputs.prodAllowWeekends === false)
  );

  let earliestStart = computeEarliestStart({
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
  // Parent depends on children: cannot start before the latest sub-level completion.
  if ((inputs as any).childrenReadyDate) {
    const cr = new Date((inputs as any).childrenReadyDate);
    if (cr > earliestStart) earliestStart = cr;
  }
  if (calendar && respectCalendar) {
    earliestStart = nextWorkingDay(earliestStart, calendar);
  }

  const backendDays =
    (Number(inputs.backendLeadTime) || 0) +
    (inputs.subconRequired ? (Number(inputs.subconLeadTime) || 0) : 0);

  const matDays = Math.max(0, Number(inputs.materialLeadTime) || 0);
  const toolDays = Math.max(0, Number(inputs.toolingLeadTime) || 0);
  const constraintLabel = toolDays > matDays ? 'tooling lead time' : (matDays > 0 ? 'material lead time' : null);

  const options = candidateMachines
    .filter(m => m.status === 'Available')
    .map(m => {
      const gap = findNextGap(m, schedule, availability, totalMachiningHrs, earliestStart, calendar, respectCalendar);
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

      // Idle weekend bonus: jobs that bridge a weekend (run continuously through it)
      // get a small score boost so the engine prefers them when committed dates allow.
      let weekendBonus = 0;
      let weekendNote = '';
      if (calendar && inputs.prodAllowWeekends && !respectCalendar) {
        // count non-working days swallowed by the booking
        const cursor = new Date(machiningStart);
        cursor.setHours(0, 0, 0, 0);
        let bridged = 0;
        while (cursor < machiningEnd) {
          if (isNonWorkingDay(cursor, calendar)) bridged++;
          cursor.setDate(cursor.getDate() + 1);
        }
        if (bridged > 0) {
          weekendBonus = bridged * 12 * 3600 * 1000; // half-day bonus per bridged non-working day
          weekendNote = `Bridges ${bridged} non-working day${bridged > 1 ? 's' : ''} — improves machine utilisation`;
        }
      }

      const reasonParts: string[] = [];
      if (inputs.childrenReadyDate) {
        reasonParts.push(`Waiting on Sub Level parts (ready ${new Date(inputs.childrenReadyDate).toLocaleDateString()})`);
      }
      if (constraintLabel && earliestStart.getTime() > Date.now()) {
        reasonParts.push(`Earliest start delayed by ${constraintLabel} (${Math.max(matDays, toolDays)}d)`);
      }
      if (machiningStart.getTime() > earliestStart.getTime() + 24 * 3600 * 1000) {
        reasonParts.push('Waiting for machine availability');
      }
      if (respectCalendar) {
        reasonParts.push('Calendar-aware: skips weekends/holidays');
      }
      if (weekendNote) reasonParts.push(weekendNote);
      if (backendDays > 0) reasonParts.push(`+${backendDays}d backend/subcon`);
      if (!meetsCommitted) reasonParts.push('Cannot meet committed date with current constraints');

      const score = shipDate.getTime() - weekendBonus + (meetsCommitted ? 0 : 1e12);

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
