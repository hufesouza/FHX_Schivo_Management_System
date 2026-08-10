// Deterministic scheduling engine for the NPI Resource Scheduling System.
// Input : start date, setter working calendar, holidays, development hours
// Output: per-day allocation, planned end date, working days, conflicts.
//
// No hidden "today" anchor is used anywhere: every calculation starts from the
// job's explicit start date.

import type { SchedAllocation, SchedHoliday, SchedMachine, SchedSetterDay } from '@/types/scheduler';

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

export const machineHoursOn = (
  iso: string,
  machine: SchedMachine | undefined,
  holidays: SchedHoliday[],
): number => {
  if (!machine) return 0;
  if (isBlockedDay(iso, holidays, { machineId: machine.id })) return 0;
  return Number(machine.daily_hours) || 0;
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
      const rows = sameDay.filter((a) => a.setter_id === ctx.setterId);
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
