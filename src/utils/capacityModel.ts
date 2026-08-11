// ---------------------------------------------------------------------------
// CENTRAL machine capacity + production calculation model.
//
// This is the ONE place where the capacity/production chain is implemented:
//
//   PLANNED MACHINE HOURS -> MACHINE AVAILABILITY -> EFFECTIVE MACHINE HOURS
//   -> CYCLE TIME -> GROSS PIECES -> SCRAP/YIELD -> GOOD PIECES
//
//   REQUIRED GOOD QTY -> SCRAP % -> GROSS QTY -> CYCLE TIME
//   -> IDEAL PRODUCTION TIME -> AVAILABILITY % -> PLANNED MACHINE RUN TIME
//   -> + SETUP -> TOTAL MACHINE OCCUPANCY -> END DATE
//
// Never duplicate these formulas in a UI component: import from here.
// ---------------------------------------------------------------------------

import type { CycleTimeUnit, SchedJob, SchedMachine, SchedMachinePartCycleTime } from '@/types/scheduler';

export const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
export const round1 = (n: number) => Math.round((Number(n) || 0) * 10) / 10;

/** Availability as a 0..1 factor (85% -> 0.85). Never 0 to avoid divide-by-zero. */
export const availabilityFactor = (machine?: Pick<SchedMachine, 'availability_pct'> | null): number => {
  const pct = Number(machine?.availability_pct);
  if (!Number.isFinite(pct) || pct <= 0) return 1;
  return Math.min(1, pct / 100);
};

/** Effective machine count (>= 1 when configured, 1 by default). */
export const effectiveMachines = (machine?: Pick<SchedMachine, 'effective_machines'> | null): number => {
  const n = Number(machine?.effective_machines);
  return Number.isFinite(n) && n > 0 ? n : 1;
};

/** Planned (calendar) machine hours available on one working day, all machines combined. */
export const plannedHoursPerDay = (
  machine?: Pick<SchedMachine, 'planned_hours_per_day' | 'daily_hours' | 'effective_machines'> | null,
): number => {
  if (!machine) return 0;
  const planned = Number(machine.planned_hours_per_day);
  const base = Number.isFinite(planned) && planned > 0 ? planned : Number(machine.daily_hours) || 0;
  return round2(base * effectiveMachines(machine));
};

export interface MachineEffectiveness {
  effectiveMachines: number;
  plannedHoursPerDayPerMachine: number;
  plannedHoursPerDay: number;
  availabilityPct: number;
  daysPerWeek: number;
  weeksPerMonth: number;
  effectiveHoursPerDay: number;
  effectiveHoursPerWeek: number;
  effectiveHoursPerMonth: number;
}

/**
 * Effective (productive) machine hours = planned hours x availability,
 * scaled by the number of effective machines.
 */
export const machineEffectiveness = (machine?: SchedMachine | null): MachineEffectiveness => {
  const count = effectiveMachines(machine);
  const perMachine = machine
    ? Number(machine.planned_hours_per_day) > 0
      ? Number(machine.planned_hours_per_day)
      : Number(machine.daily_hours) || 0
    : 0;
  const avail = availabilityFactor(machine);
  const daysPerWeek = Number(machine?.days_per_week) > 0 ? Number(machine!.days_per_week) : 7;
  const weeksPerMonth = Number(machine?.weeks_per_month) > 0 ? Number(machine!.weeks_per_month) : 4.33;
  const effPerDay = perMachine * avail * count;
  return {
    effectiveMachines: count,
    plannedHoursPerDayPerMachine: round2(perMachine),
    plannedHoursPerDay: round2(perMachine * count),
    availabilityPct: machine ? Number(machine.availability_pct) || 100 : 100,
    daysPerWeek,
    weeksPerMonth,
    effectiveHoursPerDay: round2(effPerDay),
    effectiveHoursPerWeek: round2(effPerDay * daysPerWeek),
    effectiveHoursPerMonth: round2(effPerDay * daysPerWeek * weeksPerMonth),
  };
};

/** Cycle time expressed in hours per piece. */
export const cycleTimeHours = (cycleTime: number, unit: CycleTimeUnit): number => {
  const ct = Math.max(0, Number(cycleTime) || 0);
  if (unit === 'seconds') return ct / 3600;
  if (unit === 'minutes') return ct / 60;
  return ct;
};

/** Pieces per hour = 3600/seconds, 60/minutes or 1/hours. */
export const piecesPerHour = (cycleTime: number, unit: CycleTimeUnit): number => {
  const h = cycleTimeHours(cycleTime, unit);
  if (h <= 0) return 0;
  return 1 / h;
};

/** Scrap % (0..100) -> yield factor (0..1]. */
export const yieldFactor = (scrapPct: number): number => {
  const s = Math.min(99.9, Math.max(0, Number(scrapPct) || 0));
  return 1 - s / 100;
};

/** Gross quantity to produce = CEILING(good qty / yield). */
export const grossQuantity = (goodQty: number, scrapPct: number): number => {
  const good = Math.max(0, Math.round(Number(goodQty) || 0));
  const y = yieldFactor(scrapPct);
  if (good === 0) return 0;
  return Math.ceil(good / y);
};

export interface MachinePartCapacity {
  partNumber: string;
  cycleTime: number;
  cycleTimeUnit: CycleTimeUnit;
  piecesPerHour: number;
  grossPerDay: number;
  grossPerWeek: number;
  grossMonthly: number;
  scrapPct: number;
  yieldPct: number;
  goodMonthly: number;
}

/** Gross & good capacity for one part on one machine. */
export const machinePartCapacity = (
  machine: SchedMachine | undefined | null,
  input: { partNumber: string; cycleTime: number; cycleTimeUnit: CycleTimeUnit; scrapPct?: number },
): MachinePartCapacity => {
  const eff = machineEffectiveness(machine);
  const pph = piecesPerHour(input.cycleTime, input.cycleTimeUnit);
  const scrapPct = Math.max(0, Number(input.scrapPct) || 0);
  const y = yieldFactor(scrapPct);
  const grossMonthly = eff.effectiveHoursPerMonth * pph;
  return {
    partNumber: input.partNumber,
    cycleTime: Number(input.cycleTime) || 0,
    cycleTimeUnit: input.cycleTimeUnit,
    piecesPerHour: Math.round(pph * 1000) / 1000,
    grossPerDay: Math.floor(eff.effectiveHoursPerDay * pph),
    grossPerWeek: Math.floor(eff.effectiveHoursPerWeek * pph),
    grossMonthly: Math.floor(grossMonthly),
    scrapPct,
    yieldPct: round1(y * 100),
    goodMonthly: Math.floor(grossMonthly * y),
  };
};

export interface ProductionMetrics {
  goodQuantity: number;
  scrapPct: number;
  yieldPct: number;
  grossQuantity: number;
  expectedScrap: number;
  cycleTime: number;
  cycleTimeUnit: CycleTimeUnit;
  piecesPerHour: number;
  /** Theoretical cycle-time requirement (gross qty x cycle time). */
  idealProductionHours: number;
  /** Calendar machine time to reserve = ideal / availability. */
  plannedRunHours: number;
  availabilityPct: number;
  setupHours: number;
  /** setup + planned run — what the machine calendar must reserve. */
  totalMachineHours: number;
}

/**
 * Full production calculation for a job on a machine.
 * `quantity` is the REQUIRED GOOD QUANTITY.
 */
export const productionMetrics = (input: {
  quantity: number;
  scrapPct: number;
  cycleTime: number;
  cycleTimeUnit: CycleTimeUnit;
  setupHours?: number;
  machine?: SchedMachine | null;
}): ProductionMetrics => {
  const good = Math.max(0, Math.round(Number(input.quantity) || 0));
  const scrapPct = Math.max(0, Number(input.scrapPct) || 0);
  const gross = grossQuantity(good, scrapPct);
  const perPiece = cycleTimeHours(input.cycleTime, input.cycleTimeUnit);
  const ideal = round2(gross * perPiece);
  const avail = availabilityFactor(input.machine);
  const plannedRun = round2(ideal / avail);
  const setup = Math.max(0, Number(input.setupHours) || 0);
  return {
    goodQuantity: good,
    scrapPct,
    yieldPct: round1(yieldFactor(scrapPct) * 100),
    grossQuantity: gross,
    expectedScrap: Math.max(0, gross - good),
    cycleTime: Number(input.cycleTime) || 0,
    cycleTimeUnit: input.cycleTimeUnit,
    piecesPerHour: Math.round(piecesPerHour(input.cycleTime, input.cycleTimeUnit) * 1000) / 1000,
    idealProductionHours: ideal,
    plannedRunHours: plannedRun,
    availabilityPct: input.machine ? Number(input.machine.availability_pct) || 100 : 100,
    setupHours: round2(setup),
    totalMachineHours: round2(plannedRun + setup),
  };
};

/** Metrics for a stored job (single source of truth for every view). */
export const jobProductionMetrics = (
  job: Pick<
    SchedJob,
    'production_quantity' | 'scrap_pct' | 'cycle_time' | 'cycle_time_unit' | 'setup_hours'
  >,
  machine?: SchedMachine | null,
): ProductionMetrics =>
  productionMetrics({
    quantity: Number(job.production_quantity),
    scrapPct: Number(job.scrap_pct),
    cycleTime: Number(job.cycle_time),
    cycleTimeUnit: job.cycle_time_unit,
    setupHours: Number(job.setup_hours),
    machine,
  });

/** Look up the configured cycle time for a machine + part combination. */
export const findCycleTime = (
  rows: SchedMachinePartCycleTime[],
  machineId: string | null,
  partNumber: string | null,
): SchedMachinePartCycleTime | undefined => {
  if (!machineId || !partNumber) return undefined;
  const pn = partNumber.trim().toLowerCase();
  return rows.find((r) => r.machine_id === machineId && r.part_number.trim().toLowerCase() === pn);
};

export const fmtPieces = (n: number): string => Math.round(Number(n) || 0).toLocaleString();
