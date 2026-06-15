export type SchedulingMode = 'Exclusive' | 'Parallel';

export const DEV_RESOURCE_NAME = 'Development / Engineering';

export type SchedulerResource = {
  id: string;
  resource_name: string;
  resource_type?: string | null;
  resource_category?: string | null;
  lead_time_days?: number | null;
  available_hours_per_day: number;
  status?: string | null;
  scheduling_mode?: SchedulingMode | null;
};

export type SchedulerJob = {
  id: string;
  job_number: string;
  quantity: number;
  due_date: string | null;
  priority: string;
  status: string;
  development_time_hours?: number | null;
  planned_date_locked?: boolean | null;
  best_commence_date?: string | null;
};

export type SchedulerOp = {
  id: string;
  job_id: string;
  operation_number: number;
  operation_name: string;
  resource_id: string | null;
  setup_time_hours: number;
  cycle_time_seconds: number;
  total_time_hours: number | null;
  planned_start: string | null;
  planned_finish: string | null;
  is_locked: boolean;
  sequence_order: number | null;
};

export type ScheduledOpUpdate = {
  id: string;
  planned_start: string;
  planned_finish: string;
};

export type ScheduledJobUpdate = {
  id: string;
  planned_start: string | null;
  planned_finish: string | null;
  schedule_status: string;
  status: string;
  planned_dev_start: string | null;
  planned_dev_finish: string | null;
  dev_resource_id: string | null;
  best_commence_date: string | null;
  latest_start_date: string | null;
  schedule_risk: 'On Track' | 'At Risk' | 'Late';
};

type Reservation = { start: Date; end: Date };

const PRIORITY_ORDER: Record<string, number> = { Urgent: 0, High: 1, Normal: 2, Low: 3 };

const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

export function effectiveSchedulingMode(resource: SchedulerResource): SchedulingMode {
  const name = (resource.resource_name || '').toLowerCase();
  const category = (resource.resource_category || '').toLowerCase();
  const type = (resource.resource_type || '').toLowerCase();

  if (name === DEV_RESOURCE_NAME.toLowerCase()) return 'Parallel';
  if (resource.scheduling_mode) return resource.scheduling_mode;
  if (category === 'subcontractor') return 'Parallel';
  if (['inspection', 'deburr', 'wash'].some(token => type.includes(token))) return 'Parallel';
  return 'Exclusive';
}

export const isExclusiveResource = (resource: SchedulerResource) => effectiveSchedulingMode(resource) === 'Exclusive';

function nextWorkingMoment(d: Date): Date {
  const out = new Date(d);
  while (isWeekend(out)) {
    out.setDate(out.getDate() + 1);
    out.setHours(0, 0, 0, 0);
  }
  return out;
}

function addWorkingHours(start: Date, hours: number, dailyHours: number): Date {
  if (hours <= 0) return new Date(start);
  let remaining = hours;
  const cursor = nextWorkingMoment(new Date(start));
  const dayStart = new Date(cursor);
  dayStart.setHours(0, 0, 0, 0);
  let usedToday = (cursor.getTime() - dayStart.getTime()) / 3600000;

  while (remaining > 0) {
    const available = Math.max(0, dailyHours - usedToday);
    if (available <= 0) {
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(0, 0, 0, 0);
      while (isWeekend(cursor)) cursor.setDate(cursor.getDate() + 1);
      usedToday = 0;
      continue;
    }
    const take = Math.min(remaining, available);
    cursor.setTime(cursor.getTime() + take * 3600000);
    usedToday += take;
    remaining -= take;
  }

  return cursor;
}

function subtractWorkingHours(end: Date, hours: number, dailyHours: number): Date {
  if (hours <= 0) return new Date(end);
  let remaining = hours;
  const cursor = new Date(end);

  while (isWeekend(cursor)) {
    cursor.setDate(cursor.getDate() - 1);
    cursor.setHours(23, 59, 59, 999);
  }

  const dayStart = new Date(cursor);
  dayStart.setHours(0, 0, 0, 0);
  let available = Math.min((cursor.getTime() - dayStart.getTime()) / 3600000, dailyHours);

  while (remaining > 0) {
    if (available <= 0) {
      cursor.setDate(cursor.getDate() - 1);
      cursor.setHours(23, 59, 59, 999);
      while (isWeekend(cursor)) cursor.setDate(cursor.getDate() - 1);
      available = dailyHours;
      continue;
    }
    const take = Math.min(remaining, available);
    cursor.setTime(cursor.getTime() - take * 3600000);
    available -= take;
    remaining -= take;
  }

  return cursor;
}

function addDuration(start: Date, hours: number, dailyHours: number, calendarTime: boolean): Date {
  return calendarTime ? new Date(start.getTime() + hours * 3600000) : addWorkingHours(start, hours, dailyHours);
}

function normaliseStart(start: Date, calendarTime: boolean): Date {
  return calendarTime ? new Date(start) : nextWorkingMoment(start);
}

function findEarliestSlot(
  existing: Reservation[],
  earliest: Date,
  durationHours: number,
  dailyHours: number,
  calendarTime: boolean,
): Reservation {
  let start = normaliseStart(earliest, calendarTime);

  for (const reservation of existing) {
    if (reservation.end <= start) continue;
    const end = addDuration(start, durationHours, dailyHours, calendarTime);
    if (end <= reservation.start) return { start, end };
    start = normaliseStart(reservation.end, calendarTime);
  }

  return { start, end: addDuration(start, durationHours, dailyHours, calendarTime) };
}

function addReservation(map: Map<string, Reservation[]>, resourceId: string, reservation: Reservation) {
  const list = map.get(resourceId) || [];
  list.push(reservation);
  list.sort((a, b) => a.start.getTime() - b.start.getTime());
  map.set(resourceId, list);
}

function operationDuration(op: SchedulerOp, job: SchedulerJob, resource: SchedulerResource): { hours: number; calendarTime: boolean } {
  const category = (resource.resource_category || '').toLowerCase();
  const type = (resource.resource_type || '').toLowerCase();
  const isSubcontractor = category === 'subcontractor' || type.includes('subcontractor');

  if (isSubcontractor) {
    return { hours: Number(resource.lead_time_days || 0) * 24, calendarTime: true };
  }

  const hours = op.total_time_hours && op.total_time_hours > 0
    ? Number(op.total_time_hours)
    : Number(op.setup_time_hours || 0) + (Number(op.cycle_time_seconds || 0) * Number(job.quantity || 0)) / 3600;

  return { hours, calendarTime: false };
}

export function buildSchedule({
  resources,
  jobs,
  ops,
  baseStart,
}: {
  resources: SchedulerResource[];
  jobs: SchedulerJob[];
  ops: SchedulerOp[];
  baseStart: Date;
}): { opUpdates: ScheduledOpUpdate[]; jobUpdates: ScheduledJobUpdate[] } {
  const activeResources = new Map(resources.filter(r => r.status !== 'Inactive').map(r => [r.id, r]));
  const devResource = resources.find(r => r.resource_name === DEV_RESOURCE_NAME && r.status !== 'Inactive') || null;
  const base = nextWorkingMoment(baseStart);
  const reservations = new Map<string, Reservation[]>();

  ops.filter(o => o.is_locked && o.planned_start && o.planned_finish && o.resource_id).forEach(op => {
    const resource = activeResources.get(op.resource_id!);
    if (!resource || !isExclusiveResource(resource)) return;
    addReservation(reservations, op.resource_id!, { start: new Date(op.planned_start!), end: new Date(op.planned_finish!) });
  });

  const eligible = jobs
    .filter(j => j.status === 'Planned' || j.status === 'Scheduled')
    .sort((a, b) => {
      const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      if (da !== db) return da - db;
      return (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
    });

  const opUpdates: ScheduledOpUpdate[] = [];
  const jobUpdates: ScheduledJobUpdate[] = [];

  for (const job of eligible) {
    const jobOps = ops
      .filter(o => o.job_id === job.id)
      .sort((a, b) => (a.sequence_order ?? a.operation_number) - (b.sequence_order ?? b.operation_number));

    let previousEnd = base;
    let jobStart: Date | null = null;
    let jobEnd: Date | null = null;
    let devStart: Date | null = null;
    let devEnd: Date | null = null;
    let totalDurationHours = 0;
    let dailyHoursRef = 24;

    const devHours = Number(job.development_time_hours || 0);
    if (devHours > 0 && devResource) {
      const dailyHours = devResource.available_hours_per_day || 8;
      const mode = effectiveSchedulingMode(devResource);
      const slot = mode === 'Exclusive'
        ? findEarliestSlot(reservations.get(devResource.id) || [], previousEnd, devHours, dailyHours, false)
        : { start: nextWorkingMoment(previousEnd), end: addWorkingHours(nextWorkingMoment(previousEnd), devHours, dailyHours) };

      if (mode === 'Exclusive') addReservation(reservations, devResource.id, slot);
      devStart = slot.start;
      devEnd = slot.end;
      previousEnd = slot.end;
      jobStart = slot.start;
      jobEnd = slot.end;
      totalDurationHours += devHours;
      dailyHoursRef = dailyHours;
    }

    for (const op of jobOps) {
      if (op.is_locked && op.planned_start && op.planned_finish) {
        const start = new Date(op.planned_start);
        const end = new Date(op.planned_finish);
        if (!jobStart || start < jobStart) jobStart = start;
        if (!jobEnd || end > jobEnd) jobEnd = end;
        if (end > previousEnd) previousEnd = end;
        totalDurationHours += (end.getTime() - start.getTime()) / 3600000;
        continue;
      }

      if (!op.resource_id) continue;
      const resource = activeResources.get(op.resource_id);
      if (!resource) continue;

      const { hours, calendarTime } = operationDuration(op, job, resource);
      if (hours <= 0) continue;

      const dailyHours = resource.available_hours_per_day || 8;
      const mode = effectiveSchedulingMode(resource);
      const slot = mode === 'Exclusive'
        ? findEarliestSlot(reservations.get(op.resource_id) || [], previousEnd, hours, dailyHours, calendarTime)
        : (() => {
            const start = normaliseStart(previousEnd, calendarTime);
            return { start, end: addDuration(start, hours, dailyHours, calendarTime) };
          })();

      if (mode === 'Exclusive') addReservation(reservations, op.resource_id, slot);
      previousEnd = slot.end;
      if (!jobStart || slot.start < jobStart) jobStart = slot.start;
      if (!jobEnd || slot.end > jobEnd) jobEnd = slot.end;
      totalDurationHours += hours;
      dailyHoursRef = Math.max(dailyHoursRef, dailyHours);
      opUpdates.push({ id: op.id, planned_start: slot.start.toISOString(), planned_finish: slot.end.toISOString() });
    }

    const dueEnd = job.due_date ? new Date(job.due_date + 'T23:59:59') : null;
    const isLate = !!(jobEnd && dueEnd && jobEnd > dueEnd);
    const latestStart = (dueEnd && totalDurationHours > 0) ? subtractWorkingHours(dueEnd, totalDurationHours, dailyHoursRef) : null;
    const now = new Date();
    const risk: 'On Track' | 'At Risk' | 'Late' = isLate ? 'Late' : (latestStart && now > latestStart ? 'At Risk' : 'On Track');

    jobUpdates.push({
      id: job.id,
      planned_start: jobStart?.toISOString() || null,
      planned_finish: jobEnd?.toISOString() || null,
      schedule_status: jobEnd ? (isLate ? 'Late' : 'Scheduled') : 'Unscheduled',
      status: jobEnd ? 'Scheduled' : job.status,
      planned_dev_start: devStart?.toISOString() || null,
      planned_dev_finish: devEnd?.toISOString() || null,
      dev_resource_id: devStart ? (devResource?.id || null) : null,
      best_commence_date: jobStart?.toISOString() || null,
      latest_start_date: latestStart?.toISOString() || null,
      schedule_risk: risk,
    });
  }

  return { opUpdates, jobUpdates };
}