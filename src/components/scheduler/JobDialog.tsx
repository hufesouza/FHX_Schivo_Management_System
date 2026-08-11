import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import type { SchedJob, SchedJobPriority, SchedJobStatus, CycleTimeUnit, ProductionStatus, ProductionType, ProgrammingStatus } from '@/types/scheduler';
import { PRIORITY_OPTIONS, STATUS_OPTIONS, CYCLE_TIME_UNITS, PRODUCTION_STATUS_OPTIONS, PRODUCTION_TYPE_OPTIONS, PROGRAMMING_STATUS_OPTIONS } from '@/types/scheduler';
import { addDays, fmtDuration, fmtHours, toISO } from '@/utils/schedulerEngine';
import type { useScheduler } from '@/hooks/useScheduler';


interface JobDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  job: SchedJob | null;
  defaultDate?: string | null;
  scheduler: ReturnType<typeof useScheduler>;
  canEdit?: boolean;
}

const emptyForm = (date: string) => ({
  job_number: '',
  po_number: '',
  part_number: '',
  customer: '',
  machine_id: '',
  setter_id: '',
  start_date: date,
  development_hours: '8',
  priority: 'medium' as SchedJobPriority,
  status: 'planned' as SchedJobStatus,
  notes: '',
  production_quantity: '',
  cycle_time: '',
  cycle_time_unit: 'minutes' as CycleTimeUnit,
  production_start: '',
  production_status: 'not_scheduled' as ProductionStatus,
  job_type: 'npi' as 'npi' | 'production',
  production_setter_id: '',
  setup_hours: '',

  programmer_id: '',
  programming_hours: '',
  programming_start: '',
  programming_status: 'not_scheduled' as ProgrammingStatus,
});


export function JobDialog({ open, onOpenChange, job, defaultDate, scheduler, canEdit = true }: JobDialogProps) {
  const { machines, setters, validate, validateProduction, validateProgramming, saveJob, deleteJob, jobById } = scheduler;
  const [form, setForm] = useState(emptyForm(defaultDate || toISO(new Date())));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (job) {
      setForm({
        job_number: job.job_number,
        po_number: job.po_number ?? '',
        part_number: job.part_number ?? '',
        customer: job.customer ?? '',
        machine_id: job.machine_id ?? '',
        setter_id: job.setter_id ?? '',
        start_date: job.start_date,
        development_hours: String(job.development_hours),
        priority: job.priority,
        status: job.status,
        notes: job.notes ?? '',
        production_quantity: job.production_quantity ? String(job.production_quantity) : '',
        cycle_time: job.cycle_time ? String(job.cycle_time) : '',
        cycle_time_unit: job.cycle_time_unit ?? 'minutes',
        production_start: job.production_start ?? '',
        production_status: job.production_status ?? 'not_scheduled',
        is_npi: job.is_npi ?? true,
        is_production: job.is_production || Number(job.production_quantity) > 0 || Number(job.setup_hours) > 0,
        production_type: (job.production_type as ProductionType) ?? 'npi_production',
        production_setter_id: job.production_setter_id ?? '',
        setup_hours: job.setup_hours ? String(job.setup_hours) : '',
        programmer_id: job.programmer_id ?? '',
        programming_hours: job.programming_hours ? String(job.programming_hours) : '',
        programming_start: job.programming_start ?? '',
        programming_status: job.programming_status ?? 'not_scheduled',
      });
    } else {
      setForm(emptyForm(defaultDate || toISO(new Date())));
    }
  }, [open, job, defaultDate]);

  const hours = Number(form.development_hours) || 0;

  const result = useMemo(
    () =>
      validate({
        jobId: job?.id ?? null,
        setterId: form.setter_id || null,
        machineId: form.machine_id || null,
        startDate: form.start_date,
        hours,
      }),
    [validate, job?.id, form.setter_id, form.machine_id, form.start_date, hours],
  );

  const { plan, conflicts } = result;

  const qty = Number(form.production_quantity) || 0;
  const cycle = Number(form.cycle_time) || 0;
  const setupHours = Number(form.setup_hours) || 0;
  const hasProduction = form.is_production && ((qty > 0 && cycle > 0) || setupHours > 0);

  const production = useMemo(
    () =>
      validateProduction({
        jobId: job?.id ?? null,
        machineId: form.machine_id || null,
        setterId: form.production_setter_id || null,
        startDate: form.production_start || null,
        quantity: qty,
        cycleTime: cycle,
        unit: form.cycle_time_unit,
        setupHours,
      }),
    [
      validateProduction,
      job?.id,
      form.machine_id,
      form.production_setter_id,
      form.production_start,
      form.cycle_time_unit,
      qty,
      cycle,
      setupHours,
    ],
  );
  const prodSchedule = production.schedule;

  const progHours = Number(form.programming_hours) || 0;
  const hasProgramming = progHours > 0;

  const programming = useMemo(
    () =>
      validateProgramming({
        jobId: job?.id ?? null,
        programmerId: form.programmer_id || null,
        startDate: form.programming_start || null,
        hours: progHours,
      }),
    [validateProgramming, job?.id, form.programmer_id, form.programming_start, progHours],
  );

  const suggestedProgStart = plan.endDate ? addDays(plan.endDate, 1) : form.start_date;
  const suggestedProdStart = programming.plan.endDate
    ? addDays(programming.plan.endDate, 1)
    : plan.endDate
      ? addDays(plan.endDate, 1)
      : form.start_date;

  const poTrimmed = form.po_number.trim();
  const duplicatePo = useMemo(
    () =>
      !!poTrimmed &&
      Object.values(jobById).some(
        (j) => j && j.id !== job?.id && (j.po_number ?? '').trim().toLowerCase() === poTrimmed.toLowerCase(),
      ),
    [jobById, job?.id, poTrimmed],
  );

  const missing: string[] = [];
  if (!poTrimmed) missing.push('PO#');
  if (!form.part_number.trim()) missing.push('Part number');
  if (!form.start_date) missing.push('Start date');
  if (!form.setter_id) missing.push('Setter');
  if (!form.machine_id) missing.push('Machine');
  if (hours <= 0) missing.push('Development hours');
  if (!form.is_npi && !form.is_production) missing.push('Job type (NPI and/or Production)');
  if (form.is_production && !form.production_start) missing.push('Production start date');
  if (form.is_production && qty > 0 && cycle <= 0) missing.push('Cycle time');
  if (form.is_production && setupHours <= 0) missing.push('Setup time (hours)');
  if (form.is_production && !form.production_setter_id) missing.push('Production setter (setup)');
  if (hasProgramming && !form.programmer_id) missing.push('Programmer');
  if (hasProgramming && !form.programming_start) missing.push('Programming start date');

  const noWorkingDays = form.setter_id && hours > 0 && plan.allocations.length === 0;
  const noMachineDays =
    hasProduction && !!form.production_start && prodSchedule.run.allocations.length === 0 && production.runHours > 0;
  const noSetupDays = hasProduction && setupHours > 0 && prodSchedule.setup.allocations.length === 0;
  const noProgrammerDays =
    hasProgramming && !!form.programmer_id && !!form.programming_start && programming.plan.allocations.length === 0;
  const blocked =
    missing.length > 0 ||
    duplicatePo ||
    conflicts.hasConflicts ||
    !!noWorkingDays ||
    noMachineDays ||
    noSetupDays ||
    (hasProduction && production.conflicts.hasConflicts) ||
    noProgrammerDays ||
    (hasProgramming && programming.conflicts.hasConflicts);


  const handleSave = async () => {
    if (blocked) return;
    setSaving(true);
    const res = await saveJob({
      id: job?.id,
      job_number: form.part_number.trim(),
      po_number: poTrimmed,
      part_number: form.part_number.trim(),

      customer: form.customer.trim() || null,
      machine_id: form.machine_id || null,
      setter_id: form.setter_id || null,
      start_date: form.start_date,
      development_hours: hours,
      priority: form.priority,
      status: form.status,
      notes: form.notes.trim() || null,
      production_quantity: qty,
      cycle_time: cycle,
      cycle_time_unit: form.cycle_time_unit,
      production_start: hasProduction ? form.production_start || null : null,
      production_status: form.production_status,
      is_npi: form.is_npi,
      is_production: form.is_production,
      production_type: form.production_type,
      production_setter_id: hasProduction ? form.production_setter_id || null : null,
      setup_hours: hasProduction ? setupHours : 0,
      programmer_id: hasProgramming ? form.programmer_id || null : null,
      programming_hours: progHours,
      programming_start: hasProgramming ? form.programming_start || null : null,
      programming_status: form.programming_status,
    });

    setSaving(false);
    if (res.ok) {
      toast.success(job ? 'Job updated' : 'Job created');
      onOpenChange(false);
    } else {
      const dup = /duplicate key|po_number/i.test(res.error ?? '');
      toast.error(dup ? 'PO# already exists.' : res.error || 'Failed to save job');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{job ? `${job.po_number ?? ''} · Job ${job.job_number}` : 'Add Job'}</DialogTitle>
          <DialogDescription>
            The schedule is calculated from the setter's working calendar — weekends, zero-hour days and holidays are skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>PO# *</Label>
            <Input
              value={form.po_number}
              disabled={!canEdit}
              onChange={(e) => setForm({ ...form, po_number: e.target.value })}
              placeholder="PO-123456"
              aria-invalid={duplicatePo}
            />
            {duplicatePo && <p className="text-xs text-destructive">PO# already exists.</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Part number *</Label>
            <Input
              value={form.part_number}
              disabled={!canEdit}
              onChange={(e) => setForm({ ...form, part_number: e.target.value })}
              placeholder="PN-1234"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Customer</Label>
            <Input
              value={form.customer}
              disabled={!canEdit}
              onChange={(e) => setForm({ ...form, customer: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Machine *</Label>
            <Select value={form.machine_id} onValueChange={(v) => setForm({ ...form, machine_id: v })} disabled={!canEdit}>
              <SelectTrigger><SelectValue placeholder="Select machine" /></SelectTrigger>
              <SelectContent>
                {machines.filter((m) => m.is_active).map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.code} — {m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Setter *</Label>
            <Select value={form.setter_id} onValueChange={(v) => setForm({ ...form, setter_id: v })} disabled={!canEdit}>
              <SelectTrigger><SelectValue placeholder="Select setter" /></SelectTrigger>
              <SelectContent>
                {setters.filter((s) => s.is_active).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Start date *</Label>
            <Input
              type="date"
              value={form.start_date}
              disabled={!canEdit}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Development time (hours) *</Label>
            <Input
              type="number"
              min="0"
              step="0.1"
              value={form.development_hours}
              disabled={!canEdit}
              onChange={(e) => setForm({ ...form, development_hours: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as SchedJobPriority })} disabled={!canEdit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as SchedJobStatus })} disabled={!canEdit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Notes</Label>
            <Textarea
              rows={2}
              value={form.notes}
              disabled={!canEdit}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        {/* ---------------- Job type ---------------- */}
        <div className="rounded-lg border border-border p-3 space-y-3">
          <div>
            <h4 className="text-sm font-semibold">Job type *</h4>
            <p className="text-xs text-muted-foreground">
              A job can be NPI, Production, or both. Every production run needs a machine AND a setter for setup.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.is_npi}
                disabled={!canEdit}
                onCheckedChange={(v) => setForm({ ...form, is_npi: !!v })}
              />
              NPI (development / programming)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.is_production}
                disabled={!canEdit}
                onCheckedChange={(v) => setForm({ ...form, is_production: !!v })}
              />
              Production (setup + run)
            </label>
            {form.is_production && (
              <div className="space-y-1.5">
                <Label>Production type</Label>
                <Select
                  value={form.production_type}
                  onValueChange={(v) => setForm({ ...form, production_type: v as ProductionType })}
                  disabled={!canEdit}
                >
                  <SelectTrigger className="w-[210px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRODUCTION_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* ---------------- Programming layer ---------------- */}
        <div className="rounded-lg border border-border p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold">Programming (optional)</h4>
              <p className="text-xs text-muted-foreground">
                Programming consumes the programmer's working hours only — the machine stays completely available.
              </p>
            </div>
            <Badge variant="outline">Resource capacity only</Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Programmer</Label>
              <Select
                value={form.programmer_id}
                onValueChange={(v) => setForm({ ...form, programmer_id: v })}
                disabled={!canEdit}
              >
                <SelectTrigger><SelectValue placeholder="Select programmer" /></SelectTrigger>
                <SelectContent>
                  {setters.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Programming time (hours)</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={form.programming_hours}
                disabled={!canEdit}
                onChange={(e) => setForm({ ...form, programming_hours: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Programming start date</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={form.programming_start}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, programming_start: e.target.value })}
                />
                {canEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setForm({ ...form, programming_start: suggestedProgStart })}
                  >
                    After dev
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Programming status</Label>
              <Select
                value={form.programming_status}
                onValueChange={(v) => setForm({ ...form, programming_status: v as ProgrammingStatus })}
                disabled={!canEdit}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROGRAMMING_STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted/40 p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Programming time</div>
              <div className="font-semibold">{hasProgramming ? fmtDuration(progHours) : '—'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Programming start</div>
              <div className="font-semibold">{programming.plan.startDate ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Programming end</div>
              <div className="font-semibold">{programming.plan.endDate ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Machine impact</div>
              <div className="font-semibold">0h</div>
            </div>
          </div>
        </div>

        {noProgrammerDays && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Cannot schedule programming</AlertTitle>
            <AlertDescription>
              The selected programmer has no working hours available from {form.programming_start}. Change the date, the
              programmer, or their working calendar.
            </AlertDescription>
          </Alert>
        )}

        {hasProgramming && programming.conflicts.hasConflicts && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Resource capacity conflict — programming</AlertTitle>
            <AlertDescription className="space-y-1">
              <p>
                Resource: <strong>{setters.find((s) => s.id === form.programmer_id)?.name}</strong> — over capacity by{' '}
                <strong>{fmtHours(programming.conflicts.totalOver)}</strong> (development + programming combined).
              </p>
              <div className="max-h-32 overflow-y-auto">
                {programming.conflicts.conflicts.map((c) => (
                  <div key={c.date} className="text-xs">
                    {c.date}: booked {fmtHours(c.existing)} + required {fmtHours(c.requested)} vs available {fmtHours(c.capacity)} → over {fmtHours(c.over)}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {programming.conflicts.conflictingJobIds.map((id) => (
                  <Badge key={id} variant="outline">{jobById[id]?.po_number ?? jobById[id]?.job_number ?? id.slice(0, 8)}</Badge>
                ))}
              </div>
              <p className="text-xs">Options: change programmer, change the programming date, reduce the time, or cancel.</p>
            </AlertDescription>
          </Alert>
        )}

        {/* ---------------- Production layer ---------------- */}
        <div className="rounded-lg border border-border p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold">
                Production {form.is_production ? `— ${form.production_type === 'npi_production' ? 'NPI Production' : 'Standard Production'}` : '(enable the Production job type)'}
              </h4>
              <p className="text-xs text-muted-foreground">
                Setup occupies the setter AND the machine. The run afterwards occupies the machine only.
              </p>
            </div>
            <Badge variant="outline">Setup: setter + machine · Run: machine</Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Production quantity</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={form.production_quantity}
                disabled={!canEdit || !form.is_production}
                onChange={(e) => setForm({ ...form, production_quantity: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cycle time per piece</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cycle_time}
                  disabled={!canEdit || !form.is_production}
                  onChange={(e) => setForm({ ...form, cycle_time: e.target.value })}
                  placeholder="0"
                />
                <Select
                  value={form.cycle_time_unit}
                  onValueChange={(v) => setForm({ ...form, cycle_time_unit: v as CycleTimeUnit })}
                  disabled={!canEdit}
                >
                  <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CYCLE_TIME_UNITS.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Production start date</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={form.production_start}
                  disabled={!canEdit || !form.is_production}
                  onChange={(e) => setForm({ ...form, production_start: e.target.value })}
                />
                {canEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setForm({ ...form, production_start: suggestedProdStart })}
                  >
                    After dev
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Setup time (hours)</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={form.setup_hours}
                disabled={!canEdit || !form.is_production}
                onChange={(e) => setForm({ ...form, setup_hours: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Setter for setup</Label>
              <Select
                value={form.production_setter_id}
                onValueChange={(v) => setForm({ ...form, production_setter_id: v })}
                disabled={!canEdit || !form.is_production}
              >
                <SelectTrigger><SelectValue placeholder="Select setter" /></SelectTrigger>
                <SelectContent>
                  {setters.filter((x) => x.is_active).map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Production status</Label>
              <Select
                value={form.production_status}
                onValueChange={(v) => setForm({ ...form, production_status: v as ProductionStatus })}
                disabled={!canEdit}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRODUCTION_STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted/40 p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Setup time (setter + machine)</div>
              <div className="font-semibold">{setupHours > 0 ? fmtDuration(setupHours) : '—'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Run time (machine only)</div>
              <div className="font-semibold">{production.runHours > 0 ? fmtDuration(production.runHours) : '—'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total machine occupancy</div>
              <div className="font-semibold">
                {hasProduction ? fmtDuration(production.totalMachineHours) : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total setter occupancy</div>
              <div className="font-semibold">{setupHours > 0 ? fmtDuration(setupHours) : '—'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Setup window</div>
              <div className="font-semibold">
                {prodSchedule.setup.startDate ? `${prodSchedule.setup.startDate} → ${prodSchedule.setup.endDate}` : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Run window</div>
              <div className="font-semibold">
                {prodSchedule.run.startDate ? `${prodSchedule.run.startDate} → ${prodSchedule.run.endDate}` : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Machine unavailable from → to</div>
              <div className="font-semibold">
                {prodSchedule.startDate ? `${prodSchedule.startDate} → ${prodSchedule.endDate}` : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Machine days</div>
              <div className="font-semibold">
                {new Set([...prodSchedule.setup.allocations, ...prodSchedule.run.allocations].map((a) => a.alloc_date)).size}
              </div>
            </div>
          </div>
        </div>

        {noMachineDays && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Cannot schedule production</AlertTitle>
            <AlertDescription>
              The selected machine has no working hours available from {form.production_start}. Change the date, the machine,
              or the machine calendar.
            </AlertDescription>
          </Alert>
        )}

        {noSetupDays && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Cannot schedule the setup</AlertTitle>
            <AlertDescription>
              Setup needs the setter and the machine on the same day. Neither is available together from{' '}
              {form.production_start || '—'}. Change the date, the setter, the machine, or their calendars.
            </AlertDescription>
          </Alert>
        )}

        {hasProduction && production.conflicts.setterConflicts.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Setter capacity conflict — production setup</AlertTitle>
            <AlertDescription className="space-y-1">
              <p>
                <strong>{setters.find((x) => x.id === form.production_setter_id)?.name}</strong> is over capacity by{' '}
                <strong>{fmtHours(production.conflicts.totalSetterOver)}</strong> (development + programming + setup).
              </p>
              <div className="max-h-32 overflow-y-auto">
                {production.conflicts.setterConflicts.map((c) => (
                  <div key={c.date} className="text-xs">
                    {c.date}: booked {fmtHours(c.existing)} + required {fmtHours(c.requested)} vs available {fmtHours(c.capacity)} → over {fmtHours(c.over)}
                  </div>
                ))}
              </div>
              <p className="text-xs">Options: change the setup setter, move the production start date, or reduce setup time.</p>
            </AlertDescription>
          </Alert>
        )}

        {hasProduction && production.conflicts.machineConflicts.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Machine conflict — production (setup + run)</AlertTitle>
            <AlertDescription className="space-y-1">
              <p>
                {machines.find((m) => m.id === form.machine_id)?.name} is already booked during this production window. Over
                capacity by <strong>{fmtHours(production.conflicts.totalMachineOver)}</strong>.
              </p>
              <div className="max-h-32 overflow-y-auto">
                {production.conflicts.machineConflicts.map((c) => (
                  <div key={c.date} className="text-xs">
                    {c.date}: booked {fmtHours(c.existing)} + requested {fmtHours(c.requested)} vs capacity {fmtHours(c.capacity)} → over {fmtHours(c.over)}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {production.conflicts.conflictingJobIds.map((id) => (
                  <Badge key={id} variant="outline">{jobById[id]?.po_number ?? jobById[id]?.job_number ?? id.slice(0, 8)}</Badge>
                ))}
              </div>
              <p className="text-xs">Options: move the production start date, choose another machine, or split the quantity.</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Calculated schedule */}

        <div className="rounded-lg border border-border p-3 bg-muted/40 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Planned start</div>
            <div className="font-semibold">{plan.startDate ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Planned end</div>
            <div className="font-semibold">{plan.endDate ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Working days</div>
            <div className="font-semibold">{plan.workingDays}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Hours allocated</div>
            <div className="font-semibold">{fmtHours(plan.allocatedHours)}</div>
          </div>
        </div>

        {plan.allocations.length > 0 && (
          <div className="max-h-32 overflow-y-auto rounded border border-border text-xs">
            <table className="w-full">
              <tbody>
                {plan.allocations.map((a) => (
                  <tr key={a.alloc_date} className="border-b border-border/60 last:border-0">
                    <td className="px-2 py-1">{a.alloc_date}</td>
                    <td className="px-2 py-1 text-right">{fmtHours(a.hours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {missing.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Missing information</AlertTitle>
            <AlertDescription>{missing.join(', ')}</AlertDescription>
          </Alert>
        )}

        {noWorkingDays && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Cannot schedule this job</AlertTitle>
            <AlertDescription>
              The selected setter has no working hours available from {form.start_date}. Change the start date, the setter,
              or the setter's working calendar.
            </AlertDescription>
          </Alert>
        )}

        {conflicts.setterConflicts.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Setter capacity conflict</AlertTitle>
            <AlertDescription className="space-y-1">
              <p>
                {setters.find((s) => s.id === form.setter_id)?.name} is already allocated during this period. Over capacity by{' '}
                <strong>{fmtHours(conflicts.totalSetterOver)}</strong>.
              </p>
              <div className="max-h-32 overflow-y-auto">
                {conflicts.setterConflicts.map((c) => (
                  <div key={c.date} className="text-xs">
                    {c.date}: booked {fmtHours(c.existing)} + requested {fmtHours(c.requested)} vs capacity {fmtHours(c.capacity)} → over {fmtHours(c.over)}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {conflicts.conflictingJobIds.map((id) => (
                  <Badge key={id} variant="outline">{jobById[id]?.po_number ?? jobById[id]?.job_number ?? id.slice(0, 8)}</Badge>
                ))}
              </div>
              <p className="text-xs">Options: change start date, change setter, reduce development time, or cancel.</p>
            </AlertDescription>
          </Alert>
        )}

        {conflicts.machineConflicts.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Machine conflict</AlertTitle>
            <AlertDescription className="space-y-1">
              <p>
                {machines.find((m) => m.id === form.machine_id)?.name} is already allocated during this period. Over capacity by{' '}
                <strong>{fmtHours(conflicts.totalMachineOver)}</strong>.
              </p>
              <div className="max-h-32 overflow-y-auto">
                {conflicts.machineConflicts.map((c) => (
                  <div key={c.date} className="text-xs">
                    {c.date}: booked {fmtHours(c.existing)} + requested {fmtHours(c.requested)} vs capacity {fmtHours(c.capacity)} → over {fmtHours(c.over)}
                  </div>
                ))}
              </div>
              <p className="text-xs">Select another machine or change the start date.</p>
            </AlertDescription>
          </Alert>
        )}

        {!blocked && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Schedule is valid</AlertTitle>
            <AlertDescription>Setter and machine capacity are both available for this period.</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2">
          {job && canEdit && (
            <Button
              variant="destructive"
              onClick={async () => {
                await deleteJob(job.id);
                onOpenChange(false);
              }}
              className="mr-auto"
            >
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {canEdit && (
            <Button onClick={handleSave} disabled={blocked || saving}>
              {saving ? 'Saving…' : job ? 'Save changes' : 'Create job'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
