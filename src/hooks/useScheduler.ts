import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type {
  SchedAllocation,
  SchedAuditEntry,
  SchedHoliday,
  SchedJob,
  SchedMachine,
  SchedSetter,
  SchedSetterDay,
} from '@/types/scheduler';
import {
  buildSetterCalendar,
  detectConflicts,
  detectProductionSetupConflicts,
  detectProgrammingConflicts,
  planProductionWithSetup,
  planProgramming,
  planSchedule,
  productionHours,
  type ConflictReport,
  type ProductionSchedule,
  type ProductionSetupConflictReport,
  type ProgrammingConflictReport,
  type SchedulePlan,
  type SetterCalendarMap,
} from '@/utils/schedulerEngine';
import type { CycleTimeUnit, ProductionStatus, ProductionType, ProgrammingStatus } from '@/types/scheduler';

export interface JobInput {
  id?: string;
  job_number: string;
  po_number: string;
  part_number: string | null;
  customer: string | null;
  machine_id: string | null;
  setter_id: string | null;
  start_date: string;
  development_hours: number;
  priority: SchedJob['priority'];
  status: SchedJob['status'];
  notes: string | null;
  // production layer
  production_quantity: number;
  cycle_time: number;
  cycle_time_unit: CycleTimeUnit;
  production_start: string | null;
  production_status: ProductionStatus;
  // job type + production setup
  is_npi: boolean;
  is_production: boolean;
  production_type: ProductionType;
  production_setter_id: string | null;
  setup_hours: number;
  // programming layer
  programmer_id: string | null;
  programming_hours: number;
  programming_start: string | null;
  programming_status: ProgrammingStatus;
}


export function useScheduler() {
  const { user } = useAuth();
  const [machines, setMachines] = useState<SchedMachine[]>([]);
  const [setters, setSetters] = useState<SchedSetter[]>([]);
  const [setterDays, setSetterDays] = useState<SchedSetterDay[]>([]);
  const [holidays, setHolidays] = useState<SchedHoliday[]>([]);
  const [jobs, setJobs] = useState<SchedJob[]>([]);
  const [allocations, setAllocations] = useState<SchedAllocation[]>([]);
  const [audit, setAudit] = useState<SchedAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<number | null>(null);

  const fetchAll = useCallback(async () => {
    const [m, s, sd, h, j, a, au] = await Promise.all([
      supabase.from('sched_machines').select('*').order('code'),
      supabase.from('sched_setters').select('*').order('name'),
      supabase.from('sched_setter_days').select('*'),
      supabase.from('sched_holidays').select('*'),
      supabase.from('sched_jobs').select('*').order('start_date'),
      supabase.from('sched_job_allocations').select('*'),
      supabase.from('sched_audit_log').select('*').order('created_at', { ascending: false }).limit(200),
    ]);
    if (m.data) setMachines(m.data as SchedMachine[]);
    if (s.data) setSetters(s.data as SchedSetter[]);
    if (sd.data) setSetterDays(sd.data as SchedSetterDay[]);
    if (h.data) setHolidays(h.data as SchedHoliday[]);
    if (j.data) setJobs(j.data as SchedJob[]);
    if (a.data) setAllocations(a.data as SchedAllocation[]);
    if (au.data) setAudit(au.data as unknown as SchedAuditEntry[]);
    setLoading(false);
  }, []);

  // Initial load
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime: any change on any scheduling table refreshes shared state
  useEffect(() => {
    const refresh = () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => fetchAll(), 250);
    };
    const tables = [
      'sched_machines',
      'sched_setters',
      'sched_setter_days',
      'sched_holidays',
      'sched_jobs',
      'sched_job_allocations',
      'sched_audit_log',
    ];
    const channel = supabase.channel('npi-scheduler-realtime');
    tables.forEach((table) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, refresh);
    });
    channel.subscribe();
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const calendar = useMemo(() => buildSetterCalendar(setterDays), [setterDays]);

  const logAudit = useCallback(
    async (entry: {
      action: string;
      entity: string;
      entity_id?: string | null;
      entity_label?: string | null;
      previous_value?: unknown;
      new_value?: unknown;
    }) => {
      if (!user) return;
      await supabase.from('sched_audit_log').insert({
        user_id: user.id,
        user_email: user.email ?? null,
        action: entry.action,
        entity: entry.entity,
        entity_id: entry.entity_id ?? null,
        entity_label: entry.entity_label ?? null,
        previous_value: (entry.previous_value ?? null) as never,
        new_value: (entry.new_value ?? null) as never,
      });
    },
    [user],
  );

  /** Plan a job without saving it. */
  const plan = useCallback(
    (startDate: string, hours: number, setterId: string | null): SchedulePlan =>
      planSchedule(startDate, hours, setterId, calendar, holidays),
    [calendar, holidays],
  );

  /** Validate a planned job against setter + machine capacity. */
  const validate = useCallback(
    (input: {
      jobId?: string | null;
      setterId: string | null;
      machineId: string | null;
      startDate: string;
      hours: number;
    }): { plan: SchedulePlan; conflicts: ConflictReport } => {
      const p = planSchedule(input.startDate, input.hours, input.setterId, calendar, holidays);
      const conflicts = detectConflicts(
        p.allocations,
        { jobId: input.jobId, setterId: input.setterId, machineId: input.machineId },
        allocations,
        calendar,
        holidays,
        machines,
      );
      return { plan: p, conflicts };
    },
    [allocations, calendar, holidays, machines],
  );

  /**
   * Validate a production plan.
   * Setup consumes the production setter + the machine, the run consumes the machine only.
   */
  const validateProduction = useCallback(
    (input: {
      jobId?: string | null;
      machineId: string | null;
      setterId?: string | null;
      startDate: string | null;
      quantity: number;
      cycleTime: number;
      unit: CycleTimeUnit;
      setupHours?: number;
    }): {
      runHours: number;
      setupHours: number;
      totalMachineHours: number;
      schedule: ProductionSchedule;
      conflicts: ProductionSetupConflictReport;
    } => {
      const runHours = productionHours(input.quantity, input.cycleTime, input.unit);
      const setupHours = Math.max(0, Number(input.setupHours) || 0);
      const machine = machines.find((m) => m.id === input.machineId);
      const schedule = planProductionWithSetup(
        input.startDate ?? '',
        { setupHours, runHours },
        machine,
        input.setterId ?? null,
        calendar,
        holidays,
      );
      const conflicts = detectProductionSetupConflicts(
        schedule.setup.allocations,
        schedule.run.allocations,
        { jobId: input.jobId, machineId: input.machineId, setterId: input.setterId ?? null },
        allocations,
        calendar,
        holidays,
        machines,
      );
      return { runHours, setupHours, totalMachineHours: schedule.totalMachineHours, schedule, conflicts };
    },
    [allocations, calendar, holidays, machines],
  );

  /** Validate a programming plan against the programmer's own capacity (dev + programming). */
  const validateProgramming = useCallback(
    (input: {
      jobId?: string | null;
      programmerId: string | null;
      startDate: string | null;
      hours: number;
    }): { plan: SchedulePlan; conflicts: ProgrammingConflictReport } => {
      const p = planProgramming(input.startDate ?? '', input.hours, input.programmerId, calendar, holidays);
      const conflicts = detectProgrammingConflicts(
        p.allocations,
        { jobId: input.jobId, programmerId: input.programmerId },
        allocations,
        calendar,
        holidays,
      );
      return { plan: p, conflicts };
    },
    [allocations, calendar, holidays],
  );

  const writeAllocations = useCallback(
    async (jobId: string, input: { setter_id: string | null; machine_id: string | null }, p: SchedulePlan) => {
      await supabase
        .from('sched_job_allocations')
        .delete()
        .eq('job_id', jobId)
        .eq('alloc_type', 'development');
      if (p.allocations.length === 0) return;
      const rows = p.allocations.map((a) => ({
        job_id: jobId,
        setter_id: input.setter_id,
        machine_id: input.machine_id,
        alloc_date: a.alloc_date,
        hours: a.hours,
        alloc_type: 'development',
      }));
      const { error } = await supabase.from('sched_job_allocations').insert(rows);
      if (error) throw error;
    },
    [],
  );

  /** Production allocations consume machine capacity only — never the setter. */
  const writeProductionAllocations = useCallback(
    async (jobId: string, machineId: string | null, p: SchedulePlan) => {
      await supabase
        .from('sched_job_allocations')
        .delete()
        .eq('job_id', jobId)
        .eq('alloc_type', 'production');
      if (p.allocations.length === 0) return;
      const rows = p.allocations.map((a) => ({
        job_id: jobId,
        setter_id: null,
        machine_id: machineId,
        alloc_date: a.alloc_date,
        hours: a.hours,
        alloc_type: 'production',
      }));
      const { error } = await supabase.from('sched_job_allocations').insert(rows);
      if (error) throw error;
    },
    [],
  );

  /** Setup allocations consume the production setter AND the machine. */
  const writeSetupAllocations = useCallback(
    async (jobId: string, setterId: string | null, machineId: string | null, p: SchedulePlan) => {
      await supabase
        .from('sched_job_allocations')
        .delete()
        .eq('job_id', jobId)
        .eq('alloc_type', 'setup');
      if (p.allocations.length === 0) return;
      const rows = p.allocations.map((a) => ({
        job_id: jobId,
        setter_id: setterId,
        machine_id: machineId,
        alloc_date: a.alloc_date,
        hours: a.hours,
        alloc_type: 'setup',
      }));
      const { error } = await supabase.from('sched_job_allocations').insert(rows);
      if (error) throw error;
    },
    [],
  );

  /** Programming allocations consume the programmer only — machine_id stays null. */
  const writeProgrammingAllocations = useCallback(
    async (jobId: string, programmerId: string | null, p: SchedulePlan) => {
      await supabase
        .from('sched_job_allocations')
        .delete()
        .eq('job_id', jobId)
        .eq('alloc_type', 'programming');
      if (p.allocations.length === 0) return;
      const rows = p.allocations.map((a) => ({
        job_id: jobId,
        setter_id: programmerId,
        machine_id: null,
        alloc_date: a.alloc_date,
        hours: a.hours,
        alloc_type: 'programming',
      }));
      const { error } = await supabase.from('sched_job_allocations').insert(rows);
      if (error) throw error;
    },
    [],
  );

  const saveJob = useCallback(
    async (input: JobInput): Promise<{ ok: boolean; error?: string }> => {
      const p = planSchedule(input.start_date, input.development_hours, input.setter_id, calendar, holidays);
      const previous = input.id ? jobs.find((j) => j.id === input.id) ?? null : null;

      const runHours = productionHours(input.production_quantity, input.cycle_time, input.cycle_time_unit);
      const machine = machines.find((m) => m.id === input.machine_id);
      const prodSchedule = planProductionWithSetup(
        input.production_start ?? '',
        { setupHours: input.setup_hours, runHours },
        machine,
        input.production_setter_id,
        calendar,
        holidays,
      );
      const prodPlan = prodSchedule.run;
      const progPlan = planProgramming(
        input.programming_start ?? '',
        input.programming_hours,
        input.programmer_id,
        calendar,
        holidays,
      );

      const payload = {
        job_number: input.job_number,
        po_number: input.po_number,
        part_number: input.part_number,
        customer: input.customer,
        machine_id: input.machine_id,
        setter_id: input.setter_id,
        start_date: input.start_date,
        development_hours: input.development_hours,
        priority: input.priority,
        status: input.status,
        notes: input.notes,
        production_quantity: input.production_quantity,
        cycle_time: input.cycle_time,
        cycle_time_unit: input.cycle_time_unit,
        production_start: prodSchedule.startDate ?? input.production_start,
        production_end: prodSchedule.endDate ?? prodPlan.endDate,
        production_status: input.production_status,
        is_npi: input.is_npi,
        is_production: input.is_production,
        production_type: input.production_type,
        production_setter_id: input.production_setter_id,
        setup_hours: input.setup_hours,
        programmer_id: input.programmer_id,
        programming_hours: input.programming_hours,
        programming_start: progPlan.startDate ?? input.programming_start,
        programming_end: progPlan.endDate,
        programming_status: input.programming_status,
      };

      try {
        let jobId = input.id;
        if (jobId) {
          const { error } = await supabase.from('sched_jobs').update(payload).eq('id', jobId);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from('sched_jobs')
            .insert({ ...payload, created_by: user?.id ?? null })
            .select('id')
            .single();
          if (error) throw error;
          jobId = data.id;
        }
        await writeAllocations(jobId!, input, p);
        await writeSetupAllocations(jobId!, input.production_setter_id, input.machine_id, prodSchedule.setup);
        await writeProductionAllocations(jobId!, input.machine_id, prodPlan);
        await writeProgrammingAllocations(jobId!, input.programmer_id, progPlan);
        await logAudit({
          action: input.id ? 'update' : 'create',
          entity: 'job',
          entity_id: jobId,
          entity_label: input.job_number,
          previous_value: previous,
          new_value: payload,
        });
        await fetchAll();
        return { ok: true };
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to save job';
        return { ok: false, error: message };
      }
    },
    [calendar, holidays, jobs, machines, logAudit, user, writeAllocations, writeProductionAllocations, writeSetupAllocations, writeProgrammingAllocations, fetchAll],
  );


  /** Move a job to a new start date. Rejected if it creates an invalid schedule. */
  const moveJob = useCallback(
    async (jobId: string, newStartDate: string): Promise<{ ok: boolean; error?: string }> => {
      const job = jobs.find((j) => j.id === jobId);
      if (!job) return { ok: false, error: 'Job not found' };
      const { plan: p, conflicts } = validate({
        jobId,
        setterId: job.setter_id,
        machineId: job.machine_id,
        startDate: newStartDate,
        hours: Number(job.development_hours),
      });
      if (p.allocations.length === 0) {
        return { ok: false, error: 'The setter has no working hours available from that date.' };
      }
      if (conflicts.hasConflicts) {
        const first = conflicts.setterConflicts[0] ?? conflicts.machineConflicts[0];
        const kind = conflicts.setterConflicts.length ? 'Setter' : 'Machine';
        return {
          ok: false,
          error: `${kind} capacity exceeded on ${first.date}: ${first.existing}h already booked + ${first.requested}h requested vs ${first.capacity}h available (over by ${first.over}h).`,
        };
      }
      try {
        const { error } = await supabase.from('sched_jobs').update({ start_date: newStartDate }).eq('id', jobId);
        if (error) throw error;
        await writeAllocations(jobId, { setter_id: job.setter_id, machine_id: job.machine_id }, p);
        await logAudit({
          action: 'move',
          entity: 'job',
          entity_id: jobId,
          entity_label: job.job_number,
          previous_value: { start_date: job.start_date },
          new_value: { start_date: newStartDate },
        });
        await fetchAll();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Failed to move job' };
      }
    },
    [jobs, validate, writeAllocations, logAudit, fetchAll],
  );

  const deleteJob = useCallback(
    async (jobId: string) => {
      const job = jobs.find((j) => j.id === jobId);
      const { error } = await supabase.from('sched_jobs').delete().eq('id', jobId);
      if (error) {
        toast.error('Failed to delete job');
        return;
      }
      await logAudit({
        action: 'delete',
        entity: 'job',
        entity_id: jobId,
        entity_label: job?.job_number ?? null,
        previous_value: job ?? null,
      });
      toast.success('Job deleted');
      await fetchAll();
    },
    [jobs, logAudit, fetchAll],
  );

  /** Machines --------------------------------------------------------- */
  const saveMachine = useCallback(
    async (m: Partial<SchedMachine> & { name: string; code: string }) => {
      const previous = m.id ? machines.find((x) => x.id === m.id) ?? null : null;
      const payload = {
        name: m.name,
        code: m.code,
        is_active: m.is_active ?? true,
        daily_hours: m.daily_hours ?? 24,
        notes: m.notes ?? null,
      };
      const { error } = m.id
        ? await supabase.from('sched_machines').update(payload).eq('id', m.id)
        : await supabase.from('sched_machines').insert(payload);
      if (error) {
        toast.error(error.message);
        return false;
      }
      await logAudit({
        action: m.id ? 'update' : 'create',
        entity: 'machine',
        entity_id: m.id ?? null,
        entity_label: m.name,
        previous_value: previous,
        new_value: payload,
      });
      await fetchAll();
      return true;
    },
    [machines, logAudit, fetchAll],
  );

  const deleteMachine = useCallback(
    async (id: string) => {
      const previous = machines.find((x) => x.id === id) ?? null;
      const { error } = await supabase.from('sched_machines').delete().eq('id', id);
      if (error) {
        toast.error(error.message);
        return;
      }
      await logAudit({ action: 'delete', entity: 'machine', entity_id: id, entity_label: previous?.name ?? null, previous_value: previous });
      await fetchAll();
    },
    [machines, logAudit, fetchAll],
  );

  /** Setters ---------------------------------------------------------- */
  const saveSetter = useCallback(
    async (
      s: Partial<SchedSetter> & { name: string },
      dayHours?: Record<number, number>,
    ) => {
      const previous = s.id ? setters.find((x) => x.id === s.id) ?? null : null;
      const payload = {
        name: s.name,
        color: s.color ?? '#3b82f6',
        is_active: s.is_active ?? true,
        start_time: s.start_time ?? '07:30',
        end_time: s.end_time ?? '16:00',
        break_minutes: s.break_minutes ?? 30,
        notes: s.notes ?? null,
      };
      let setterId = s.id;
      if (setterId) {
        const { error } = await supabase.from('sched_setters').update(payload).eq('id', setterId);
        if (error) {
          toast.error(error.message);
          return false;
        }
      } else {
        const { data, error } = await supabase.from('sched_setters').insert(payload).select('id').single();
        if (error) {
          toast.error(error.message);
          return false;
        }
        setterId = data.id;
      }
      if (dayHours) {
        const rows = [0, 1, 2, 3, 4, 5, 6].map((dow) => ({
          setter_id: setterId!,
          day_of_week: dow,
          hours: Number(dayHours[dow] ?? 0),
        }));
        const { error } = await supabase
          .from('sched_setter_days')
          .upsert(rows, { onConflict: 'setter_id,day_of_week' });
        if (error) {
          toast.error(error.message);
          return false;
        }
        // Availability changed → re-plan every job that uses this person so the
        // day-by-day allocations respect the new daily hours.
        const nextCal: SetterCalendarMap = {
          ...calendar,
          [setterId!]: [0, 1, 2, 3, 4, 5, 6].reduce<Record<number, number>>((acc, dow) => {
            acc[dow] = Number(dayHours[dow] ?? 0);
            return acc;
          }, {}),
        };
        const affected = jobs.filter(
          (j) => j.setter_id === setterId || j.programmer_id === setterId || j.production_setter_id === setterId,
        );
        for (const j of affected) {
          if (j.setter_id === setterId && Number(j.development_hours) > 0 && j.start_date) {
            const p = planSchedule(j.start_date, Number(j.development_hours), setterId!, nextCal, holidays);
            try {
              await writeAllocations(j.id, { setter_id: j.setter_id, machine_id: j.machine_id }, p);
            } catch (err) {
              toast.error(`Could not re-plan development for ${j.po_number ?? j.job_number}`);
            }
          }
          if (j.production_setter_id === setterId && Number(j.setup_hours) > 0 && j.production_start) {
            const runHours = productionHours(j.production_quantity, j.cycle_time, j.cycle_time_unit);
            const machine = machines.find((m) => m.id === j.machine_id);
            const sched = planProductionWithSetup(
              j.production_start,
              { setupHours: Number(j.setup_hours), runHours },
              machine,
              setterId!,
              nextCal,
              holidays,
            );
            try {
              await writeSetupAllocations(j.id, setterId!, j.machine_id, sched.setup);
              await writeProductionAllocations(j.id, j.machine_id, sched.run);
              await supabase
                .from('sched_jobs')
                .update({ production_start: sched.startDate ?? j.production_start, production_end: sched.endDate })
                .eq('id', j.id);
            } catch (err) {
              toast.error(`Could not re-plan production setup for ${j.po_number ?? j.job_number}`);
            }
          }
          if (j.programmer_id === setterId && Number(j.programming_hours) > 0 && j.programming_start) {
            const p = planProgramming(j.programming_start, Number(j.programming_hours), setterId!, nextCal, holidays);
            try {
              await writeProgrammingAllocations(j.id, setterId!, p);
              await supabase
                .from('sched_jobs')
                .update({ programming_start: p.startDate ?? j.programming_start, programming_end: p.endDate })
                .eq('id', j.id);
            } catch (err) {
              toast.error(`Could not re-plan programming for ${j.po_number ?? j.job_number}`);
            }
          }
        }
      }
      const prevDays = previous
        ? setterDays.filter((d) => d.setter_id === previous.id).map((d) => ({ [d.day_of_week]: d.hours }))
        : null;
      await logAudit({
        action: s.id ? 'update' : 'create',
        entity: 'setter',
        entity_id: setterId ?? null,
        entity_label: s.name,
        previous_value: previous ? { ...previous, days: prevDays } : null,
        new_value: { ...payload, days: dayHours ?? null },
      });
      await fetchAll();
      return true;
    },
    [
      setters,
      setterDays,
      logAudit,
      fetchAll,
      calendar,
      holidays,
      jobs,
      machines,
      writeAllocations,
      writeProgrammingAllocations,
      writeSetupAllocations,
      writeProductionAllocations,
    ],
  );

  const deleteSetter = useCallback(
    async (id: string) => {
      const previous = setters.find((x) => x.id === id) ?? null;
      const { error } = await supabase.from('sched_setters').delete().eq('id', id);
      if (error) {
        toast.error(error.message);
        return;
      }
      await logAudit({ action: 'delete', entity: 'setter', entity_id: id, entity_label: previous?.name ?? null, previous_value: previous });
      await fetchAll();
    },
    [setters, logAudit, fetchAll],
  );

  /** Holidays --------------------------------------------------------- */
  const addHoliday = useCallback(
    async (h: { holiday_date: string; label: string | null; setter_id: string | null; machine_id: string | null }) => {
      const { error } = await supabase.from('sched_holidays').insert(h);
      if (error) {
        toast.error(error.message);
        return false;
      }
      await logAudit({ action: 'create', entity: 'holiday', entity_label: h.label ?? h.holiday_date, new_value: h });
      await fetchAll();
      return true;
    },
    [logAudit, fetchAll],
  );

  const deleteHoliday = useCallback(
    async (id: string) => {
      const previous = holidays.find((h) => h.id === id) ?? null;
      const { error } = await supabase.from('sched_holidays').delete().eq('id', id);
      if (error) {
        toast.error(error.message);
        return;
      }
      await logAudit({ action: 'delete', entity: 'holiday', entity_id: id, entity_label: previous?.label ?? null, previous_value: previous });
      await fetchAll();
    },
    [holidays, logAudit, fetchAll],
  );

  /** Move a production run to a new start date on its machine. */
  const moveProduction = useCallback(
    async (jobId: string, newStartDate: string): Promise<{ ok: boolean; error?: string }> => {
      const job = jobs.find((j) => j.id === jobId);
      if (!job) return { ok: false, error: 'Job not found' };
      if (!job.machine_id) return { ok: false, error: 'Assign a machine before scheduling production.' };
      const { schedule, conflicts } = validateProduction({
        jobId,
        machineId: job.machine_id,
        setterId: job.production_setter_id,
        startDate: newStartDate,
        quantity: Number(job.production_quantity),
        cycleTime: Number(job.cycle_time),
        unit: job.cycle_time_unit,
        setupHours: Number(job.setup_hours),
      });
      const p = schedule.run;
      if (p.allocations.length === 0 && schedule.setup.allocations.length === 0) {
        return { ok: false, error: 'No machine working hours available from that date (or no production quantity set).' };
      }
      if (Number(job.setup_hours) > 0 && schedule.setup.allocations.length === 0) {
        return { ok: false, error: 'Setup cannot be scheduled from that date — the production setter has no available hours.' };
      }
      if (conflicts.hasConflicts) {
        const first = conflicts.machineConflicts[0] ?? conflicts.setterConflicts[0];
        const kind = conflicts.machineConflicts.length ? 'Machine' : 'Setter';
        return {
          ok: false,
          error: `${kind} capacity exceeded on ${first.date}: ${first.existing}h already booked + ${first.requested}h requested vs ${first.capacity}h available (over by ${first.over}h).`,
        };
      }
      try {
        const { error } = await supabase
          .from('sched_jobs')
          .update({ production_start: schedule.startDate, production_end: schedule.endDate })
          .eq('id', jobId);
        if (error) throw error;
        await writeSetupAllocations(jobId, job.production_setter_id, job.machine_id, schedule.setup);
        await writeProductionAllocations(jobId, job.machine_id, p);
        await logAudit({
          action: 'move_production',
          entity: 'job',
          entity_id: jobId,
          entity_label: job.job_number,
          previous_value: { production_start: job.production_start, production_end: job.production_end },
          new_value: { production_start: schedule.startDate, production_end: schedule.endDate },
        });
        await fetchAll();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Failed to move production run' };
      }
    },
    [jobs, validateProduction, writeProductionAllocations, writeSetupAllocations, logAudit, fetchAll],
  );

  /** Move a programming block to a new start date on the programmer's calendar. */
  const moveProgramming = useCallback(
    async (jobId: string, newStartDate: string): Promise<{ ok: boolean; error?: string }> => {
      const job = jobs.find((j) => j.id === jobId);
      if (!job) return { ok: false, error: 'Job not found' };
      if (!job.programmer_id) return { ok: false, error: 'Assign a programmer before scheduling programming.' };
      const { plan: p, conflicts } = validateProgramming({
        jobId,
        programmerId: job.programmer_id,
        startDate: newStartDate,
        hours: Number(job.programming_hours),
      });
      if (p.allocations.length === 0) {
        return { ok: false, error: 'No programmer working hours available from that date (or no programming time set).' };
      }
      if (conflicts.hasConflicts) {
        const first = conflicts.conflicts[0];
        return {
          ok: false,
          error: `Resource capacity conflict on ${first.date}: ${first.existing}h already booked + ${first.requested}h requested vs ${first.capacity}h available (over by ${first.over}h).`,
        };
      }
      try {
        const { error } = await supabase
          .from('sched_jobs')
          .update({ programming_start: p.startDate, programming_end: p.endDate })
          .eq('id', jobId);
        if (error) throw error;
        await writeProgrammingAllocations(jobId, job.programmer_id, p);
        await logAudit({
          action: 'move_programming',
          entity: 'job',
          entity_id: jobId,
          entity_label: job.po_number ?? job.job_number,
          previous_value: { programming_start: job.programming_start, programming_end: job.programming_end },
          new_value: { programming_start: p.startDate, programming_end: p.endDate },
        });
        await fetchAll();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Failed to move programming' };
      }
    },
    [jobs, validateProgramming, writeProgrammingAllocations, logAudit, fetchAll],
  );

  const machineById = useMemo(() => Object.fromEntries(machines.map((m) => [m.id, m])), [machines]);
  const setterById = useMemo(() => Object.fromEntries(setters.map((s) => [s.id, s])), [setters]);
  const jobById = useMemo(() => Object.fromEntries(jobs.map((j) => [j.id, j])), [jobs]);
  const devAllocations = useMemo(() => allocations.filter((a) => a.alloc_type === 'development'), [allocations]);
  const progAllocations = useMemo(() => allocations.filter((a) => a.alloc_type === 'programming'), [allocations]);
  const prodAllocations = useMemo(() => allocations.filter((a) => a.alloc_type === 'production'), [allocations]);
  const setupAllocations = useMemo(() => allocations.filter((a) => a.alloc_type === 'setup'), [allocations]);

  return {
    loading,
    machines,
    setters,
    setterDays,
    holidays,
    jobs,
    allocations,
    devAllocations,
    prodAllocations,
    progAllocations,
    setupAllocations,
    audit,
    calendar,
    machineById,
    setterById,
    jobById,
    refetch: fetchAll,
    plan,
    validate,
    validateProduction,
    validateProgramming,
    saveJob,
    moveJob,
    moveProduction,
    moveProgramming,

    deleteJob,
    saveMachine,
    deleteMachine,
    saveSetter,
    deleteSetter,
    addHoliday,
    deleteHoliday,
  };
}
