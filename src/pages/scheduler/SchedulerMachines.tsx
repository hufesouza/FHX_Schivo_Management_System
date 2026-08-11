import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { SchedulerNav } from '@/components/scheduler/SchedulerNav';
import { useScheduler } from '@/hooks/useScheduler';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { SchedMachine } from '@/types/scheduler';
import { fmtHours } from '@/utils/schedulerEngine';
import { machineEffectiveness, machinePartCapacity } from '@/utils/capacityModel';
import { CYCLE_TIME_UNITS } from '@/utils/schedulerEngine';
import type { CycleTimeUnit } from '@/types/scheduler';

const ALL_DAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

const emptyMachine = {
  name: '',
  code: '',
  is_active: true,
  daily_hours: 18,
  effective_machines: 1,
  availability_pct: 85,
  days_per_week: 7,
  weeks_per_month: 4.33,
  working_days: [0, 1, 2, 3, 4, 5, 6] as number[],
  notes: '',
};

const emptyCycle = { machine_id: '', part_number: '', cycle_time: '', cycle_time_unit: 'minutes' as CycleTimeUnit };

export default function SchedulerMachines() {
  const {
    machines, saveMachine, deleteMachine, holidays, addHoliday, deleteHoliday, allocations,
    cycleTimes, saveCycleTime, deleteCycleTime,
  } = useScheduler();
  const { role } = useUserRole();
  const canEdit = !!role;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof emptyMachine & { id?: string }>(emptyMachine);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [holForm, setHolForm] = useState({ holiday_date: '', label: '', machine_id: '' });
  const [cycleForm, setCycleForm] = useState<typeof emptyCycle & { id?: string }>(emptyCycle);
  const [savingCycle, setSavingCycle] = useState(false);

  const edit = (m: SchedMachine) => {
    setForm({
      id: m.id,
      name: m.name,
      code: m.code,
      is_active: m.is_active,
      daily_hours: Number(m.planned_hours_per_day ?? m.daily_hours) || 0,
      effective_machines: Number(m.effective_machines) || 1,
      availability_pct: Number(m.availability_pct) || 85,
      days_per_week: Number(m.days_per_week) || 7,
      weeks_per_month: Number(m.weeks_per_month) || 4.33,
      working_days: m.working_days?.length ? m.working_days.map(Number) : [0, 1, 2, 3, 4, 5, 6],
      notes: m.notes ?? '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error('Name and code are required');
      return;
    }
    const ok = await saveMachine({
      id: form.id,
      name: form.name.trim(),
      code: form.code.trim(),
      is_active: form.is_active,
      daily_hours: Number(form.daily_hours) || 0,
      planned_hours_per_day: Number(form.daily_hours) || 0,
      effective_machines: Number(form.effective_machines) || 1,
      availability_pct: Number(form.availability_pct) || 100,
      days_per_week: Number(form.days_per_week) || 7,
      weeks_per_month: Number(form.weeks_per_month) || 4.33,
      working_days: form.working_days.length ? form.working_days : [0, 1, 2, 3, 4, 5, 6],
      notes: form.notes.trim() || null,
    });
    if (ok) {
      toast.success('Machine saved');
      setOpen(false);
    }
  };

  const preview = machineEffectiveness({
    planned_hours_per_day: form.daily_hours,
    daily_hours: form.daily_hours,
    effective_machines: form.effective_machines,
    availability_pct: form.availability_pct,
    days_per_week: form.days_per_week,
    weeks_per_month: form.weeks_per_month,
  } as SchedMachine);

  const machineHolidays = holidays.filter((h) => h.machine_id);

  const saveCycle = async () => {
    if (!cycleForm.machine_id || !cycleForm.part_number.trim() || Number(cycleForm.cycle_time) <= 0) {
      toast.error('Machine, part number and cycle time are required');
      return;
    }
    setSavingCycle(true);
    const ok = await saveCycleTime({
      id: cycleForm.id,
      machine_id: cycleForm.machine_id,
      part_number: cycleForm.part_number,
      cycle_time: Number(cycleForm.cycle_time),
      cycle_time_unit: cycleForm.cycle_time_unit,
    });
    setSavingCycle(false);
    if (ok) {
      toast.success('Cycle time saved');
      setCycleForm(emptyCycle);
    }
  };

  return (
    <AppLayout title="Machines" subtitle="Machine configuration & downtime" showBackButton backTo="/scheduling">
      <SchedulerNav />
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{machines.length} machine(s)</p>
          {canEdit && (
            <Button onClick={() => { setForm(emptyMachine); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Machine
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left py-2 px-3">Code</th>
                  <th className="text-left py-2 px-3">Machine</th>
                  <th className="text-right py-2 px-3">Machines</th>
                  <th className="text-right py-2 px-3">Planned h/day</th>
                  <th className="text-right py-2 px-3">Avail %</th>
                  <th className="text-right py-2 px-3">Effective h/day</th>
                  <th className="text-right py-2 px-3">Effective h/month</th>
                  <th className="text-left py-2 px-3">Working days</th>
                  <th className="text-right py-2 px-3">Allocations</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-left py-2 px-3">Notes</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {machines.map((m) => (
                  <tr key={m.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2 px-3 font-medium">{m.code}</td>
                    <td className="py-2 px-3">{m.name}</td>
                    <td className="py-2 px-3 text-right">{machineEffectiveness(m).effectiveMachines}</td>
                    <td className="py-2 px-3 text-right">{fmtHours(machineEffectiveness(m).plannedHoursPerDay)}</td>
                    <td className="py-2 px-3 text-right">{machineEffectiveness(m).availabilityPct}%</td>
                    <td className="py-2 px-3 text-right font-medium">{fmtHours(machineEffectiveness(m).effectiveHoursPerDay)}</td>
                    <td className="py-2 px-3 text-right">{fmtHours(machineEffectiveness(m).effectiveHoursPerMonth)}</td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">
                      {(m.working_days?.length ? m.working_days : [0, 1, 2, 3, 4, 5, 6])
                        .map((d) => ALL_DAYS.find((x) => x.value === Number(d))?.label)
                        .filter(Boolean)
                        .join(' ')}
                    </td>
                    <td className="py-2 px-3 text-right">{allocations.filter((a) => a.machine_id === m.id).length}</td>
                    <td className="py-2 px-3">
                      <Badge variant={m.is_active ? 'default' : 'secondary'}>{m.is_active ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">{m.notes ?? '—'}</td>
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      {canEdit && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => edit(m)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(m.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cycle times by machine + part number</CardTitle>
            <p className="text-xs text-muted-foreground">
              The same part can run at a different cycle time on each machine. Jobs on that machine + part
              automatically use this cycle time and are recalculated when it changes.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {canEdit && (
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Machine</Label>
                  <Select value={cycleForm.machine_id} onValueChange={(v) => setCycleForm({ ...cycleForm, machine_id: v })}>
                    <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select machine" /></SelectTrigger>
                    <SelectContent>
                      {machines.map((m) => <SelectItem key={m.id} value={m.id}>{m.code} — {m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Part number</Label>
                  <Input
                    className="w-[180px]"
                    value={cycleForm.part_number}
                    onChange={(e) => setCycleForm({ ...cycleForm, part_number: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cycle time</Label>
                  <div className="flex gap-2">
                    <Input
                      className="w-[110px]"
                      type="number"
                      min="0"
                      step="0.01"
                      value={cycleForm.cycle_time}
                      onChange={(e) => setCycleForm({ ...cycleForm, cycle_time: e.target.value })}
                    />
                    <Select
                      value={cycleForm.cycle_time_unit}
                      onValueChange={(v) => setCycleForm({ ...cycleForm, cycle_time_unit: v as CycleTimeUnit })}
                    >
                      <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CYCLE_TIME_UNITS.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={saveCycle} disabled={savingCycle}>{cycleForm.id ? 'Update' : 'Add'}</Button>
                {cycleForm.id && (
                  <Button variant="outline" onClick={() => setCycleForm(emptyCycle)}>Cancel</Button>
                )}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-left py-2 px-3">Machine</th>
                    <th className="text-left py-2 px-3">Part number</th>
                    <th className="text-right py-2 px-3">Cycle time</th>
                    <th className="text-right py-2 px-3">Pieces / hour</th>
                    <th className="text-right py-2 px-3">Gross / month</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody>
                  {cycleTimes.map((c) => {
                    const m = machines.find((x) => x.id === c.machine_id);
                    const cap = machinePartCapacity(m, {
                      partNumber: c.part_number,
                      cycleTime: Number(c.cycle_time),
                      cycleTimeUnit: c.cycle_time_unit,
                    });
                    return (
                      <tr key={c.id} className="border-b border-border/60 last:border-0">
                        <td className="py-2 px-3">{m?.code ?? '—'}</td>
                        <td className="py-2 px-3 font-medium">{c.part_number}</td>
                        <td className="py-2 px-3 text-right">{c.cycle_time} {c.cycle_time_unit}</td>
                        <td className="py-2 px-3 text-right">{cap.piecesPerHour.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right">{cap.grossMonthly.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          {canEdit && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => setCycleForm({
                                id: c.id,
                                machine_id: c.machine_id,
                                part_number: c.part_number,
                                cycle_time: String(c.cycle_time),
                                cycle_time_unit: c.cycle_time_unit,
                              })}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteCycleTime(c.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {cycleTimes.length === 0 && (
                    <tr><td colSpan={6} className="py-3 px-3 text-xs text-muted-foreground">No machine/part cycle times configured.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Machine downtime / unavailable dates</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {canEdit && (
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={holForm.holiday_date} onChange={(e) => setHolForm({ ...holForm, holiday_date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Machine</Label>
                  <Select value={holForm.machine_id} onValueChange={(v) => setHolForm({ ...holForm, machine_id: v })}>
                    <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select machine" /></SelectTrigger>
                    <SelectContent>
                      {machines.map((m) => <SelectItem key={m.id} value={m.id}>{m.code} — {m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Reason</Label>
                  <Input placeholder="Planned maintenance" value={holForm.label} onChange={(e) => setHolForm({ ...holForm, label: e.target.value })} />
                </div>
                <Button
                  onClick={async () => {
                    if (!holForm.holiday_date || !holForm.machine_id) {
                      toast.error('Date and machine are required');
                      return;
                    }
                    const ok = await addHoliday({
                      holiday_date: holForm.holiday_date,
                      label: holForm.label.trim() || null,
                      machine_id: holForm.machine_id,
                      setter_id: null,
                    });
                    if (ok) {
                      toast.success('Downtime added');
                      setHolForm({ holiday_date: '', label: '', machine_id: '' });
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            )}
            <div className="space-y-1">
              {machineHolidays.map((h) => (
                <div key={h.id} className="flex items-center gap-2 text-sm border-b border-border/50 py-1">
                  <span className="font-medium">{h.holiday_date}</span>
                  <span>{machines.find((m) => m.id === h.machine_id)?.code}</span>
                  <span className="text-muted-foreground">{h.label ?? ''}</span>
                  {canEdit && (
                    <Button variant="ghost" size="icon" className="ml-auto" onClick={() => deleteHoliday(h.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              {machineHolidays.length === 0 && <p className="text-xs text-muted-foreground">No machine downtime recorded.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? 'Edit machine' : 'Add machine'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Machine name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Machine code *</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Effective machines</Label>
                <Input type="number" min="1" step="1" value={form.effective_machines}
                  onChange={(e) => setForm({ ...form, effective_machines: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Planned hours / day (per machine)</Label>
                <Input type="number" min="0" max="24" step="0.1" value={form.daily_hours}
                  onChange={(e) => setForm({ ...form, daily_hours: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Availability %</Label>
                <Input type="number" min="1" max="100" step="1" value={form.availability_pct}
                  onChange={(e) => setForm({ ...form, availability_pct: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Days / week</Label>
                <Input type="number" min="1" max="7" step="1" value={form.days_per_week}
                  onChange={(e) => setForm({ ...form, days_per_week: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Weeks / month</Label>
                <Input type="number" min="1" max="5" step="0.01" value={form.weeks_per_month}
                  onChange={(e) => setForm({ ...form, weeks_per_month: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Working days</Label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_DAYS.map((d) => {
                  const on = form.working_days.includes(d.value);
                  return (
                    <Button
                      key={d.value}
                      type="button"
                      size="sm"
                      variant={on ? 'default' : 'outline'}
                      onClick={() =>
                        setForm({
                          ...form,
                          working_days: on
                            ? form.working_days.filter((x) => x !== d.value)
                            : [...form.working_days, d.value],
                        })
                      }
                    >
                      {d.label}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Planned hours / day (all machines)</span>
                <span className="font-medium">{fmtHours(preview.plannedHoursPerDay)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Effective hours / day (x availability)</span>
                <span className="font-medium">{fmtHours(preview.effectiveHoursPerDay)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Effective hours / week</span>
                <span className="font-medium">{fmtHours(preview.effectiveHoursPerWeek)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Effective hours / month</span>
                <span className="font-medium">{fmtHours(preview.effectiveHoursPerMonth)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Active</Label>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete machine?</AlertDialogTitle>
            <AlertDialogDescription>
              Jobs allocated to this machine will keep their schedule but lose the machine assignment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteId) await deleteMachine(deleteId);
                setDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
