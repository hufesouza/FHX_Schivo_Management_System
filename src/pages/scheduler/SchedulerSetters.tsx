import { useMemo, useState } from 'react';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { DOW_LABELS, MONDAY_FIRST, type SchedSetter } from '@/types/scheduler';
import { fmtHours } from '@/utils/schedulerEngine';

const defaultDays: Record<number, number> = { 0: 0, 1: 7.8, 2: 7.8, 3: 7.8, 4: 7.8, 5: 7.8, 6: 0 };

const emptySetter = {
  name: '',
  color: '#2563eb',
  is_active: true,
  start_time: '07:30',
  end_time: '16:00',
  break_minutes: 30,
  notes: '',
};

export default function SchedulerSetters() {
  const { setters, calendar, saveSetter, deleteSetter, holidays, addHoliday, deleteHoliday, allocations } = useScheduler();
  const { role } = useUserRole();
  const canEdit = !!role;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof emptySetter & { id?: string }>(emptySetter);
  const [days, setDays] = useState<Record<number, number>>(defaultDays);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [holForm, setHolForm] = useState({ holiday_date: '', label: '', setter_id: '' });

  const weeklyOf = (setterId: string) =>
    [0, 1, 2, 3, 4, 5, 6].reduce((sum, d) => sum + (calendar[setterId]?.[d] ?? 0), 0);

  const weeklyForm = useMemo(
    () => Math.round(Object.values(days).reduce((a, b) => a + (Number(b) || 0), 0) * 10) / 10,
    [days],
  );

  const edit = (s: SchedSetter) => {
    setForm({
      id: s.id,
      name: s.name,
      color: s.color,
      is_active: s.is_active,
      start_time: s.start_time?.slice(0, 5) ?? '07:30',
      end_time: s.end_time?.slice(0, 5) ?? '16:00',
      break_minutes: s.break_minutes,
      notes: s.notes ?? '',
    });
    setDays({ ...defaultDays, ...(calendar[s.id] ?? {}) });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    const ok = await saveSetter(
      {
        id: form.id,
        name: form.name.trim(),
        color: form.color,
        is_active: form.is_active,
        start_time: form.start_time,
        end_time: form.end_time,
        break_minutes: Number(form.break_minutes) || 0,
        notes: form.notes.trim() || null,
      },
      days,
    );
    if (ok) {
      toast.success('Setter saved');
      setOpen(false);
    }
  };

  const setterHolidays = holidays.filter((h) => h.setter_id || (!h.setter_id && !h.machine_id));

  return (
    <AppLayout title="Setters" subtitle="Working calendars & availability" showBackButton backTo="/scheduling">
      <SchedulerNav />
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{setters.length} setter(s)</p>
          {canEdit && (
            <Button onClick={() => { setForm(emptySetter); setDays(defaultDays); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Setter
            </Button>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {setters.map((s) => (
            <Card key={s.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name}
                  <Badge variant={s.is_active ? 'default' : 'secondary'}>{s.is_active ? 'Active' : 'Inactive'}</Badge>
                  {canEdit && (
                    <span className="ml-auto flex">
                      <Button variant="ghost" size="icon" onClick={() => edit(s)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(s.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {MONDAY_FIRST.map((dow) => (
                    <div key={dow} className="rounded border border-border p-1">
                      <div className="text-muted-foreground">{DOW_LABELS[dow].slice(0, 3)}</div>
                      <div className="font-semibold">{calendar[s.id]?.[dow] ?? 0}</div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Weekly capacity: <strong className="text-foreground">{fmtHours(weeklyOf(s.id))}</strong></span>
                  <span>{s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)}</span>
                  <span>Break {s.break_minutes} min</span>
                  <span>{allocations.filter((a) => a.setter_id === s.id).length} allocations</span>
                </div>
                {s.notes && <p className="text-xs text-muted-foreground">{s.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Holidays & unavailable dates</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {canEdit && (
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={holForm.holiday_date} onChange={(e) => setHolForm({ ...holForm, holiday_date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Applies to</Label>
                  <Select value={holForm.setter_id} onValueChange={(v) => setHolForm({ ...holForm, setter_id: v })}>
                    <SelectTrigger className="w-[200px]"><SelectValue placeholder="Company-wide" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Company-wide holiday</SelectItem>
                      {setters.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Label</Label>
                  <Input placeholder="Annual leave" value={holForm.label} onChange={(e) => setHolForm({ ...holForm, label: e.target.value })} />
                </div>
                <Button
                  onClick={async () => {
                    if (!holForm.holiday_date) {
                      toast.error('Date is required');
                      return;
                    }
                    const ok = await addHoliday({
                      holiday_date: holForm.holiday_date,
                      label: holForm.label.trim() || null,
                      setter_id: holForm.setter_id && holForm.setter_id !== '__all__' ? holForm.setter_id : null,
                      machine_id: null,
                    });
                    if (ok) {
                      toast.success('Holiday added');
                      setHolForm({ holiday_date: '', label: '', setter_id: '' });
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            )}
            <div className="space-y-1">
              {setterHolidays.map((h) => (
                <div key={h.id} className="flex items-center gap-2 text-sm border-b border-border/50 py-1">
                  <span className="font-medium">{h.holiday_date}</span>
                  <span>{h.setter_id ? setters.find((s) => s.id === h.setter_id)?.name : 'Company-wide'}</span>
                  <span className="text-muted-foreground">{h.label ?? ''}</span>
                  {canEdit && (
                    <Button variant="ghost" size="icon" className="ml-auto" onClick={() => deleteHoliday(h.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              {setterHolidays.length === 0 && <p className="text-xs text-muted-foreground">No holidays recorded.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit setter' : 'Add setter'}</DialogTitle>
            <DialogDescription>Working hours are configurable per weekday — nothing is hard-coded to 8 hours.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Colour</Label>
                <Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Start time</Label>
                <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>End time</Label>
                <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Break (minutes)</Label>
                <Input type="number" min="0" value={form.break_minutes}
                  onChange={(e) => setForm({ ...form, break_minutes: Number(e.target.value) })} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Working hours per day</Label>
              <div className="grid grid-cols-2 gap-2">
                {MONDAY_FIRST.map((dow) => (
                  <div key={dow} className="flex items-center gap-2">
                    <span className="text-xs w-20 text-muted-foreground">{DOW_LABELS[dow]}</span>
                    <Input
                      type="number"
                      min="0"
                      max="24"
                      step="0.1"
                      value={days[dow] ?? 0}
                      onChange={(e) => setDays({ ...days, [dow]: Number(e.target.value) })}
                    />
                  </div>
                ))}
              </div>
              <p className="text-sm">
                Total weekly capacity: <strong>{fmtHours(weeklyForm)}</strong>
              </p>
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
            <AlertDialogTitle>Delete setter?</AlertDialogTitle>
            <AlertDialogDescription>
              The working calendar and holidays for this setter are removed. Jobs keep their schedule but lose the setter assignment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteId) await deleteSetter(deleteId);
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
