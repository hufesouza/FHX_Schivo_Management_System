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
import type { SchedJob, SchedJobPriority, SchedJobStatus } from '@/types/scheduler';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '@/types/scheduler';
import { fmtHours, toISO } from '@/utils/schedulerEngine';
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
  part_number: '',
  customer: '',
  machine_id: '',
  setter_id: '',
  start_date: date,
  development_hours: '8',
  priority: 'medium' as SchedJobPriority,
  status: 'planned' as SchedJobStatus,
  notes: '',
});

export function JobDialog({ open, onOpenChange, job, defaultDate, scheduler, canEdit = true }: JobDialogProps) {
  const { machines, setters, validate, saveJob, deleteJob, jobById } = scheduler;
  const [form, setForm] = useState(emptyForm(defaultDate || toISO(new Date())));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (job) {
      setForm({
        job_number: job.job_number,
        part_number: job.part_number ?? '',
        customer: job.customer ?? '',
        machine_id: job.machine_id ?? '',
        setter_id: job.setter_id ?? '',
        start_date: job.start_date,
        development_hours: String(job.development_hours),
        priority: job.priority,
        status: job.status,
        notes: job.notes ?? '',
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

  const missing: string[] = [];
  if (!form.job_number.trim()) missing.push('Job number');
  if (!form.start_date) missing.push('Start date');
  if (!form.setter_id) missing.push('Setter');
  if (!form.machine_id) missing.push('Machine');
  if (hours <= 0) missing.push('Development hours');

  const noWorkingDays = form.setter_id && hours > 0 && plan.allocations.length === 0;
  const blocked = missing.length > 0 || conflicts.hasConflicts || !!noWorkingDays;

  const handleSave = async () => {
    if (blocked) return;
    setSaving(true);
    const res = await saveJob({
      id: job?.id,
      job_number: form.job_number.trim(),
      part_number: form.part_number.trim() || null,
      customer: form.customer.trim() || null,
      machine_id: form.machine_id || null,
      setter_id: form.setter_id || null,
      start_date: form.start_date,
      development_hours: hours,
      priority: form.priority,
      status: form.status,
      notes: form.notes.trim() || null,
    });
    setSaving(false);
    if (res.ok) {
      toast.success(job ? 'Job updated' : 'Job created');
      onOpenChange(false);
    } else {
      toast.error(res.error || 'Failed to save job');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{job ? `Job ${job.job_number}` : 'Add Job'}</DialogTitle>
          <DialogDescription>
            The schedule is calculated from the setter's working calendar — weekends, zero-hour days and holidays are skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Job number *</Label>
            <Input
              value={form.job_number}
              disabled={!canEdit}
              onChange={(e) => setForm({ ...form, job_number: e.target.value })}
              placeholder="JOB-004"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Part number</Label>
            <Input
              value={form.part_number}
              disabled={!canEdit}
              onChange={(e) => setForm({ ...form, part_number: e.target.value })}
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
                  <Badge key={id} variant="outline">{jobById[id]?.job_number ?? id.slice(0, 8)}</Badge>
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
