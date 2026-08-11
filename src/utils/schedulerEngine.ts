// Deterministic scheduling engine for the NPI Resource Scheduling System.
// Input : start date, setter working calendar, holidays, development hours
// Output: per-day allocation, planned end date, working days, conflicts.
//
// No hidden "today" anchor is used anywhere: every calculation starts from the
// job's explicit start date.

import type { SchedAllocation, SchedHoliday, SchedMachine, SchedSetterDay } from '@/types/scheduler';
import { plannedHoursPerDay } from '@/utils/capacityModel';

export interface PlannedAllocation {
  alloc_date: string;
  hours: number;
}

export interface SchedulePlan {
  allocations: PlannedAllocation[];
  startDate: string | null;
  endDate: string | null;
  workingDays: number;
  allocatedHours: number;
  unallocatedHours: number;
}

/** Map: setterId -> (dayOfWeek -> hours) */
export type SetterCalendarMap = Record<string, Record<number, number>>;

export const toISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const fromISO = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const addDays = (s: string, n: number): string => {
  const d = fromISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

export const buildSetterCalendar = (days: SchedSetterDay[]): SetterCalendarMap => {
  const map: SetterCalendarMap = {};
  for (const d of days) {
    map[d.setter_id] = map[d.setter_id] || {};
    map[d.setter_id][d.day_of_week] = Number(d.hours) || 0;
  }
  return map;
};

export const weeklyCapacity = (setterId: string, cal: SetterCalendarMap): number =>
  Object.values(cal[setterId] || {}).reduce((a, b) => a + (Number(b) || 0), 0);

/** True when the date is blocked by a company-wide or setter/machine specific holiday. */
export const isBlockedDay = (
  iso: string,
  holidays: SchedHoliday[],
  opts: { setterId?: string | null; machineId?: string | null },
): boolean =>
  holidays.some((h) => {
    if (h.holiday_date !== iso) return false;
    if (!h.setter_id && !h.machine_id) return true; // company wide
    if (h.setter_id && opts.setterId && h.setter_id === opts.setterId) return true;
    if (h.machine_id && opts.machineId && h.machine_id === opts.machineId) return true;
    return false;
  });

/** Hours the setter can actually work on a given date. */
export const setterHoursOn = (
  iso: string,
  setterId: string | null,
  cal: SetterCalendarMap,
  holidays: SchedHoliday[],
): number => {
  if (!setterId) return 0;
  const base = cal[setterId]?.[fromISO(iso).getDay()] ?? 0;
  if (base <= 0) return 0;
  if (isBlockedDay(iso, holidays, { setterId })) return 0;
  return base;
};

/**
 * PLANNED machine hours available on a date.
 * Respects the machine's working days, planned hours/day, effective machine
 * count and any machine-specific downtime. Machine availability % is NOT
 * applied here: it is applied to the production run duration instead
 * (planned run time = ideal / availability), so it must not be double counted.
 */
export const machineHoursOn = (
  iso: string,
  machine: SchedMachine | undefined,
  holidays: SchedHoliday[],
): number => {
  if (!machine) return 0;
  if (isBlockedDay(iso, holidays, { machineId: machine.id })) return 0;
  const days = Array.isArray(machine.working_days) && machine.working_days.length
    ? machine.working_days.map(Number)
    : [0, 1, 2, 3, 4, 5, 6];
  if (!days.includes(fromISO(iso).getDay())) return 0;
  return plannedHoursPerDay(machine);
};

const MAX_DAYS = 730;

/**
 * Spread `hours` of development work across the setter's working days,
 * starting at `startDate`. Weekends / zero-hour days / holidays are skipped.
 */
export const planSchedule = (
  startDate: string,
  hours: number,
  setterId: string | null,
  cal: SetterCalendarMap,
  holidays: SchedHoliday[],
): SchedulePlan => {
  const allocations: PlannedAllocation[] = [];
  let remaining = Math.max(0, Number(hours) || 0);
  const total = remaining;

  if (!startDate || remaining === 0 || !setterId) {
    return {
      allocations,
      startDate: null,
      endDate: null,
      workingDays: 0,
      allocatedHours: 0,
      unallocatedHours: remaining,
    };
  }

  let cursor = startDate;
  let guard = 0;
  while (remaining > 0.0001 && guard < MAX_DAYS) {
    guard += 1;
    const cap = setterHoursOn(cursor, setterId, cal, holidays);
    if (cap > 0) {
      const take = Math.min(cap, remaining);
      allocations.push({ alloc_date: cursor, hours: Math.round(take * 100) / 100 });
      remaining -= take;
    }
    if (remaining > 0.0001) cursor = addDays(cursor, 1);
  }

  const allocated = allocations.reduce((a, b) => a + b.hours, 0);
  return {
    allocations,
    startDate: allocations[0]?.alloc_date ?? null,
    endDate: allocations[allocations.length - 1]?.alloc_date ?? null,
    workingDays: allocations.length,
    allocatedHours: Math.round(allocated * 100) / 100,
    unallocatedHours: Math.round((total - allocated) * 100) / 100,
  };
};

export interface SetterConflict {
  date: string;
  capacity: number;
  existing: number;
  requested: number;
  over: number;
  jobIds: string[];
}

export interface MachineConflict {
  date: string;
  capacity: number;
  existing: number;
  requested: number;
  over: number;
  jobIds: string[];
}

export interface ConflictReport {
  setterConflicts: SetterConflict[];
  machineConflicts: MachineConflict[];
  hasConflicts: boolean;
  totalSetterOver: number;
  totalMachineOver: number;
  conflictingJobIds: string[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Check the planned allocation against everything already booked.
 * Setter capacity and machine capacity are two independent resources —
 * both have to be available.
 */
export const detectConflicts = (
  plan: PlannedAllocation[],
  ctx: {
    jobId?: string | null;
    setterId: string | null;
    machineId: string | null;
  },
  existingAllocations: SchedAllocation[],
  cal: SetterCalendarMap,
  holidays: SchedHoliday[],
  machines: SchedMachine[],
  ignoredJobIds: string[] = [],
): ConflictReport => {
  const skip = new Set([ctx.jobId, ...ignoredJobIds].filter(Boolean) as string[]);
  const machine = machines.find((m) => m.id === ctx.machineId);

  const setterConflicts: SetterConflict[] = [];
  const machineConflicts: MachineConflict[] = [];
  const conflicting = new Set<string>();

  for (const slot of plan) {
    const sameDay = existingAllocations.filter((a) => a.alloc_date === slot.alloc_date && !skip.has(a.job_id));

    // --- setter capacity ---
    if (ctx.setterId) {
      const capacity = setterHoursOn(slot.alloc_date, ctx.setterId, cal, holidays);
      // Programming rows of the job itself still consume the person's time.
      const ownProgramming = existingAllocations.filter(
        (a) =>
          a.alloc_date === slot.alloc_date &&
          a.alloc_type === 'programming' &&
          a.job_id === ctx.jobId,
      );
      const rows = [...sameDay, ...ownProgramming].filter(
        (a) => a.setter_id === ctx.setterId && a.alloc_type !== 'production',
      );
      const existing = round2(rows.reduce((a, b) => a + Number(b.hours), 0));
      const over = round2(existing + slot.hours - capacity);
      if (over > 0.01) {
        rows.forEach((r) => conflicting.add(r.job_id));
        setterConflicts.push({
          date: slot.alloc_date,
          capacity,
          existing,
          requested: slot.hours,
          over,
          jobIds: rows.map((r) => r.job_id),
        });
      }
    }

    // --- machine capacity ---
    if (ctx.machineId) {
      const capacity = machineHoursOn(slot.alloc_date, machine, holidays);
      const rows = sameDay.filter((a) => a.machine_id === ctx.machineId);
      const existing = round2(rows.reduce((a, b) => a + Number(b.hours), 0));
      const over = round2(existing + slot.hours - capacity);
      if (over > 0.01) {
        rows.forEach((r) => conflicting.add(r.job_id));
        machineConflicts.push({
          date: slot.alloc_date,
          capacity,
          existing,
          requested: slot.hours,
          over,
          jobIds: rows.map((r) => r.job_id),
        });
      }
    }
  }

  return {
    setterConflicts,
    machineConflicts,
    hasConflicts: setterConflicts.length > 0 || machineConflicts.length > 0,
    totalSetterOver: round2(setterConflicts.reduce((a, b) => a + b.over, 0)),
    totalMachineOver: round2(machineConflicts.reduce((a, b) => a + b.over, 0)),
    conflictingJobIds: Array.from(conflicting),
  };
};

/** Calendar helpers -------------------------------------------------- */

export const monthMatrix = (year: number, month: number): string[][] => {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Monday-first
  const start = new Date(year, month, 1 - offset);
  const weeks: string[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < 6; w++) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(toISO(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    if (cursor.getMonth() !== month && cursor > new Date(year, month + 1, 0)) break;
  }
  return weeks;
};

export const isoWeekKey = (iso: string): string => {
  const d = fromISO(iso);
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = target.valueOf() - firstThursday.valueOf();
  const week = 1 + Math.round((diff / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
  return `${target.getFullYear()}-W${String(week).padStart(2, '0')}`;
};

export const fmtHours = (n: number): string => `${Math.round((Number(n) || 0) * 10) / 10}h`;

/** Production layer ---------------------------------------------------
 * Production consumes MACHINE capacity only (never setter capacity).
 */

import type { CycleTimeUnit } from '@/types/scheduler';

/** Quantity x cycle time -> hours of machine occupancy. */
export const productionHours = (
  quantity: number,
  cycleTime: number,
  unit: CycleTimeUnit,
): number => {
  const qty = Math.max(0, Number(quantity) || 0);
  const ct = Math.max(0, Number(cycleTime) || 0);
  const perPieceHours = unit === 'seconds' ? ct / 3600 : unit === 'minutes' ? ct / 60 : ct;
  return Math.round(qty * perPieceHours * 100) / 100;
};

/** Human readable duration: 1.67h -> "1h 40m" */
export const fmtDuration = (hours: number): string => {
  const total = Math.max(0, Math.round((Number(hours) || 0) * 60));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

/**
 * Spread production hours across the machine's working calendar,
 * starting at `startDate`. Non-working days / holidays are skipped.
 */
export const planProduction = (
  startDate: string,
  hours: number,
  machine: SchedMachine | undefined,
  holidays: SchedHoliday[],
): SchedulePlan => {
  const allocations: PlannedAllocation[] = [];
  let remaining = Math.max(0, Number(hours) || 0);
  const total = remaining;

  if (!startDate || remaining === 0 || !machine) {
    return {
      allocations,
      startDate: null,
      endDate: null,
      workingDays: 0,
      allocatedHours: 0,
      unallocatedHours: remaining,
    };
  }

  let cursor = startDate;
  let guard = 0;
  while (remaining > 0.0001 && guard < MAX_DAYS) {
    guard += 1;
    const cap = machineHoursOn(cursor, machine, holidays);
    if (cap > 0) {
      const take = Math.min(cap, remaining);
      allocations.push({ alloc_date: cursor, hours: Math.round(take * 100) / 100 });
      remaining -= take;
    }
    if (remaining > 0.0001) cursor = addDays(cursor, 1);
  }

  const allocated = allocations.reduce((a, b) => a + b.hours, 0);
  return {
    allocations,
    startDate: allocations[0]?.alloc_date ?? null,
    endDate: allocations[allocations.length - 1]?.alloc_date ?? null,
    workingDays: allocations.length,
    allocatedHours: Math.round(allocated * 100) / 100,
    unallocatedHours: Math.round((total - allocated) * 100) / 100,
  };
};

export interface ProductionConflictReport {
  conflicts: MachineConflict[];
  hasConflicts: boolean;
  totalOver: number;
  conflictingJobIds: string[];
}

/**
 * Machine capacity check for a production plan.
 * Counts BOTH development and production allocations already booked on the
 * machine. Only the job's own *production* rows are ignored (they are being
 * replaced) — its own development rows still occupy the machine.
 */
export const detectProductionConflicts = (
  plan: PlannedAllocation[],
  ctx: { jobId?: string | null; machineId: string | null },
  existingAllocations: SchedAllocation[],
  holidays: SchedHoliday[],
  machines: SchedMachine[],
): ProductionConflictReport => {
  const machine = machines.find((m) => m.id === ctx.machineId);
  const conflicts: MachineConflict[] = [];
  const conflicting = new Set<string>();

  if (!ctx.machineId) {
    return { conflicts, hasConflicts: false, totalOver: 0, conflictingJobIds: [] };
  }

  for (const slot of plan) {
    const capacity = machineHoursOn(slot.alloc_date, machine, holidays);
    const rows = existingAllocations.filter(
      (a) =>
        a.alloc_date === slot.alloc_date &&
        a.machine_id === ctx.machineId &&
        !(a.job_id === ctx.jobId && a.alloc_type === 'production'),
    );
    const existing = round2(rows.reduce((a, b) => a + Number(b.hours), 0));
    const over = round2(existing + slot.hours - capacity);
    if (over > 0.01) {
      rows.forEach((r) => conflicting.add(r.job_id));
      conflicts.push({
        date: slot.alloc_date,
        capacity,
        existing,
        requested: slot.hours,
        over,
        jobIds: rows.map((r) => r.job_id),
      });
    }
  }

  return {
    conflicts,
    hasConflicts: conflicts.length > 0,
    totalOver: round2(conflicts.reduce((a, b) => a + b.over, 0)),
    conflictingJobIds: Array.from(conflicting),
  };
};


/** Programming layer -------------------------------------------------
 * Programming consumes the PROGRAMMER (setter resource) only.
 * It never creates a machine allocation and never causes a machine conflict.
 */

export interface ProgrammingConflictReport {
  conflicts: SetterConflict[];
  hasConflicts: boolean;
  totalOver: number;
  conflictingJobIds: string[];
}

/** Spread programming hours across the programmer's working calendar. */
export const planProgramming = (
  startDate: string,
  hours: number,
  programmerId: string | null,
  cal: SetterCalendarMap,
  holidays: SchedHoliday[],
): SchedulePlan => planSchedule(startDate, hours, programmerId, cal, holidays);

/**
 * Capacity check for a programming plan against the programmer's calendar.
 * Counts development + programming allocations already booked on that person.
 * Machine capacity is deliberately NOT considered.
 */
export const detectProgrammingConflicts = (
  plan: PlannedAllocation[],
  ctx: { jobId?: string | null; programmerId: string | null },
  existingAllocations: SchedAllocation[],
  cal: SetterCalendarMap,
  holidays: SchedHoliday[],
): ProgrammingConflictReport => {
  const conflicts: SetterConflict[] = [];
  const conflicting = new Set<string>();

  if (!ctx.programmerId) {
    return { conflicts, hasConflicts: false, totalOver: 0, conflictingJobIds: [] };
  }

  for (const slot of plan) {
    const capacity = setterHoursOn(slot.alloc_date, ctx.programmerId, cal, holidays);
    const rows = existingAllocations.filter(
      (a) =>
        a.alloc_date === slot.alloc_date &&
        a.setter_id === ctx.programmerId &&
        a.alloc_type !== 'production' &&
        !(a.job_id === ctx.jobId && a.alloc_type === 'programming'),
    );
    const existing = round2(rows.reduce((a, b) => a + Number(b.hours), 0));
    const over = round2(existing + slot.hours - capacity);
    if (over > 0.01) {
      rows.forEach((r) => conflicting.add(r.job_id));
      conflicts.push({
        date: slot.alloc_date,
        capacity,
        existing,
        requested: slot.hours,
        over,
        jobIds: rows.map((r) => r.job_id),
      });
    }
  }

  return {
    conflicts,
    hasConflicts: conflicts.length > 0,
    totalOver: round2(conflicts.reduce((a, b) => a + b.over, 0)),
    conflictingJobIds: Array.from(conflicting),
  };
};

/** Production SETUP layer ---------------------------------------------
 * Setup happens before the run and consumes BOTH the setter and the machine.
 * The run itself consumes the machine only.
 */

/** Spread setup hours across days where the setter AND the machine are both available. */
export const planSetup = (
  startDate: string,
  hours: number,
  setterId: string | null,
  machine: SchedMachine | undefined,
  cal: SetterCalendarMap,
  holidays: SchedHoliday[],
): SchedulePlan => {
  const allocations: PlannedAllocation[] = [];
  let remaining = Math.max(0, Number(hours) || 0);
  const total = remaining;

  if (!startDate || remaining === 0 || !setterId || !machine) {
    return { allocations, startDate: null, endDate: null, workingDays: 0, allocatedHours: 0, unallocatedHours: remaining };
  }

  let cursor = startDate;
  let guard = 0;
  while (remaining > 0.0001 && guard < MAX_DAYS) {
    guard += 1;
    const cap = Math.min(
      setterHoursOn(cursor, setterId, cal, holidays),
      machineHoursOn(cursor, machine, holidays),
    );
    if (cap > 0) {
      const take = Math.min(cap, remaining);
      allocations.push({ alloc_date: cursor, hours: Math.round(take * 100) / 100 });
      remaining -= take;
    }
    if (remaining > 0.0001) cursor = addDays(cursor, 1);
  }

  const allocated = allocations.reduce((a, b) => a + b.hours, 0);
  return {
    allocations,
    startDate: allocations[0]?.alloc_date ?? null,
    endDate: allocations[allocations.length - 1]?.alloc_date ?? null,
    workingDays: allocations.length,
    allocatedHours: Math.round(allocated * 100) / 100,
    unallocatedHours: Math.round((total - allocated) * 100) / 100,
  };
};

/** Spread run hours across machine days, minus hours already reserved that day (e.g. setup). */
export const planRun = (
  startDate: string,
  hours: number,
  machine: SchedMachine | undefined,
  holidays: SchedHoliday[],
  reserved: Record<string, number> = {},
): SchedulePlan => {
  const allocations: PlannedAllocation[] = [];
  let remaining = Math.max(0, Number(hours) || 0);
  const total = remaining;

  if (!startDate || remaining === 0 || !machine) {
    return { allocations, startDate: null, endDate: null, workingDays: 0, allocatedHours: 0, unallocatedHours: remaining };
  }

  let cursor = startDate;
  let guard = 0;
  while (remaining > 0.0001 && guard < MAX_DAYS) {
    guard += 1;
    const cap = Math.max(0, machineHoursOn(cursor, machine, holidays) - (reserved[cursor] ?? 0));
    if (cap > 0) {
      const take = Math.min(cap, remaining);
      allocations.push({ alloc_date: cursor, hours: Math.round(take * 100) / 100 });
      remaining -= take;
    }
    if (remaining > 0.0001) cursor = addDays(cursor, 1);
  }

  const allocated = allocations.reduce((a, b) => a + b.hours, 0);
  return {
    allocations,
    startDate: allocations[0]?.alloc_date ?? null,
    endDate: allocations[allocations.length - 1]?.alloc_date ?? null,
    workingDays: allocations.length,
    allocatedHours: Math.round(allocated * 100) / 100,
    unallocatedHours: Math.round((total - allocated) * 100) / 100,
  };
};

export interface ProductionSchedule {
  setup: SchedulePlan;
  run: SchedulePlan;
  setupHours: number;
  runHours: number;
  totalMachineHours: number;
  startDate: string | null;
  endDate: string | null;
}

/** Plan setup (setter + machine) followed by the run (machine only). */
export const planProductionWithSetup = (
  startDate: string,
  input: { setupHours: number; runHours: number },
  machine: SchedMachine | undefined,
  setterId: string | null,
  cal: SetterCalendarMap,
  holidays: SchedHoliday[],
): ProductionSchedule => {
  const setupHours = Math.max(0, Number(input.setupHours) || 0);
  const runHours = Math.max(0, Number(input.runHours) || 0);
  const setup = planSetup(startDate, setupHours, setterId, machine, cal, holidays);
  const reserved: Record<string, number> = {};
  setup.allocations.forEach((a) => {
    reserved[a.alloc_date] = (reserved[a.alloc_date] ?? 0) + a.hours;
  });
  // Setup and run are STRICTLY IN SERIES on the machine: the run can only begin
  // once the setup is fully finished (same day only if setup left machine capacity).
  const lastSetupDate = setup.endDate;
  let runStart = startDate;
  if (lastSetupDate) {
    const machineCapOnLastDay = machineHoursOn(lastSetupDate, machine, holidays);
    const leftover = machineCapOnLastDay - (reserved[lastSetupDate] ?? 0);
    runStart = leftover > 0.0001 ? lastSetupDate : addDays(lastSetupDate, 1);
  }
  const run = planRun(runStart, runHours, machine, holidays, reserved);
  const dates = [...setup.allocations, ...run.allocations].map((a) => a.alloc_date).sort();
  return {
    setup,
    run,
    setupHours,
    runHours,
    totalMachineHours: round2(setupHours + runHours),
    startDate: dates[0] ?? null,
    endDate: dates[dates.length - 1] ?? null,
  };
};

export interface ProductionSetupConflictReport {
  machineConflicts: MachineConflict[];
  setterConflicts: SetterConflict[];
  hasConflicts: boolean;
  totalMachineOver: number;
  totalSetterOver: number;
  conflictingJobIds: string[];
}

/**
 * Capacity check for a setup + run plan.
 * Machine: setup + run hours, against every other allocation on the machine.
 * Setter : setup hours only, against the person's development / programming / setup work.
 */
export const detectProductionSetupConflicts = (
  setupPlan: PlannedAllocation[],
  runPlan: PlannedAllocation[],
  ctx: { jobId?: string | null; machineId: string | null; setterId: string | null },
  existingAllocations: SchedAllocation[],
  cal: SetterCalendarMap,
  holidays: SchedHoliday[],
  machines: SchedMachine[],
): ProductionSetupConflictReport => {
  const machine = machines.find((m) => m.id === ctx.machineId);
  const machineConflicts: MachineConflict[] = [];
  const setterConflicts: SetterConflict[] = [];
  const conflicting = new Set<string>();

  // --- machine: aggregate setup + run per date ---
  if (ctx.machineId) {
    const byDate: Record<string, number> = {};
    [...setupPlan, ...runPlan].forEach((a) => {
      byDate[a.alloc_date] = round2((byDate[a.alloc_date] ?? 0) + a.hours);
    });
    for (const [date, requested] of Object.entries(byDate)) {
      const capacity = machineHoursOn(date, machine, holidays);
      const rows = existingAllocations.filter(
        (a) =>
          a.alloc_date === date &&
          a.machine_id === ctx.machineId &&
          !(a.job_id === ctx.jobId && (a.alloc_type === 'production' || a.alloc_type === 'setup')),
      );
      const existing = round2(rows.reduce((s, r) => s + Number(r.hours), 0));
      const over = round2(existing + requested - capacity);
      if (over > 0.01) {
        rows.forEach((r) => conflicting.add(r.job_id));
        machineConflicts.push({ date, capacity, existing, requested, over, jobIds: rows.map((r) => r.job_id) });
      }
    }
    machineConflicts.sort((a, b) => a.date.localeCompare(b.date));
  }

  // --- setter: setup hours only ---
  if (ctx.setterId) {
    for (const slot of setupPlan) {
      const capacity = setterHoursOn(slot.alloc_date, ctx.setterId, cal, holidays);
      const rows = existingAllocations.filter(
        (a) =>
          a.alloc_date === slot.alloc_date &&
          a.setter_id === ctx.setterId &&
          a.alloc_type !== 'production' &&
          !(a.job_id === ctx.jobId && a.alloc_type === 'setup'),
      );
      const existing = round2(rows.reduce((s, r) => s + Number(r.hours), 0));
      const over = round2(existing + slot.hours - capacity);
      if (over > 0.01) {
        rows.forEach((r) => conflicting.add(r.job_id));
        setterConflicts.push({
          date: slot.alloc_date,
          capacity,
          existing,
          requested: slot.hours,
          over,
          jobIds: rows.map((r) => r.job_id),
        });
      }
    }
  }

  return {
    machineConflicts,
    setterConflicts,
    hasConflicts: machineConflicts.length > 0 || setterConflicts.length > 0,
    totalMachineOver: round2(machineConflicts.reduce((a, b) => a + b.over, 0)),
    totalSetterOver: round2(setterConflicts.reduce((a, b) => a + b.over, 0)),
    conflictingJobIds: Array.from(conflicting),
  };
};
