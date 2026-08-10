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

const emptyMachine = { name: '', code: '', is_active: true, daily_hours: 24, notes: '' };

export default function SchedulerMachines() {
  const { machines, saveMachine, deleteMachine, holidays, addHoliday, deleteHoliday, allocations } = useScheduler();
  const { role } = useUserRole();
  const canEdit = !!role;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof emptyMachine & { id?: string }>(emptyMachine);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [holForm, setHolForm] = useState({ holiday_date: '', label: '', machine_id: '' });

  const edit = (m: SchedMachine) => {
    setForm({ id: m.id, name: m.name, code: m.code, is_active: m.is_active, daily_hours: Number(m.daily_hours), notes: m.notes ?? '' });
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
      notes: form.notes.trim() || null,
    });
    if (ok) {
      toast.success('Machine saved');
      setOpen(false);
    }
  };

  const machineHolidays = holidays.filter((h) => h.machine_id);

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
                  <th className="text-right py-2 px-3">Hours/day</th>
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
                    <td className="py-2 px-3 text-right">{fmtHours(m.daily_hours)}</td>
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
        <DialogContent>
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
            <div className="space-y-1.5">
              <Label>Available hours per day</Label>
              <Input type="number" min="0" max="24" step="0.1" value={form.daily_hours}
                onChange={(e) => setForm({ ...form, daily_hours: Number(e.target.value) })} />
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
