import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { SchedulerNav } from '@/components/scheduler/SchedulerNav';
import { MonthCalendar, MonthNav } from '@/components/scheduler/MonthCalendar';
import { JobDialog } from '@/components/scheduler/JobDialog';
import { useScheduler } from '@/hooks/useScheduler';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { fmtHours, setterHoursOn, toISO } from '@/utils/schedulerEngine';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '@/types/scheduler';

const ALL = '__all__';

export default function SchedulerOverview() {
  const scheduler = useScheduler();
  const { role } = useUserRole();
  const canEdit = !!role;
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(toISO(now));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editJobId, setEditJobId] = useState<string | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | null>(null);

  const [fMachine, setFMachine] = useState(ALL);
  const [fSetter, setFSetter] = useState(ALL);
  const [fStatus, setFStatus] = useState(ALL);
  const [fPriority, setFPriority] = useState(ALL);
  const [fCustomer, setFCustomer] = useState('');

  const {
    jobs,
    devAllocations,
    setupAllocations,
    prodAllocations,
    jobById,
    setterById,
    machineById,
    holidays,
    calendar,
    setters,
  } = scheduler;

  // Overall calendar: development + production setup + production run
  const allocations = useMemo(
    () => [...devAllocations, ...setupAllocations, ...prodAllocations],
    [devAllocations, setupAllocations, prodAllocations],
  );

  const matchingJobIds = useMemo(() => {
    const set = new Set<string>();
    for (const j of jobs) {
      if (fMachine !== ALL && j.machine_id !== fMachine) continue;
      if (fSetter !== ALL && j.setter_id !== fSetter && j.production_setter_id !== fSetter) continue;
      if (fStatus !== ALL && j.status !== fStatus) continue;
      if (fPriority !== ALL && j.priority !== fPriority) continue;
      if (fCustomer && !(j.customer ?? '').toLowerCase().includes(fCustomer.toLowerCase())) continue;
      set.add(j.id);
    }
    return set;
  }, [jobs, fMachine, fSetter, fStatus, fPriority, fCustomer]);

  const visibleAllocations = useMemo(
    () => allocations.filter((a) => matchingJobIds.has(a.job_id)),
    [allocations, matchingJobIds],
  );

  const dayAllocations = useMemo(
    () => visibleAllocations.filter((a) => a.alloc_date === selectedDate),
    [visibleAllocations, selectedDate],
  );

  const nonWorking = (iso: string) => {
    // A day is "non working" when no active setter can work it
    return !setters.some((s) => s.is_active && setterHoursOn(iso, s.id, calendar, holidays) > 0);
  };

  const openJob = (id: string) => {
    setEditJobId(id);
    setDefaultDate(null);
    setDialogOpen(true);
  };

  const createAt = (iso: string) => {
    setEditJobId(null);
    setDefaultDate(iso);
    setDialogOpen(true);
  };

  const handleMove = async (jobId: string, iso: string) => {
    const res = await scheduler.moveJob(jobId, iso);
    if (res.ok) toast.success(`${jobById[jobId]?.job_number ?? 'Job'} moved to ${iso}`);
    else toast.error(res.error || 'Move rejected');
  };

  const clearFilters = () => {
    setFMachine(ALL);
    setFSetter(ALL);
    setFStatus(ALL);
    setFPriority(ALL);
    setFCustomer('');
  };

  return (
    <AppLayout title="NPI Overview" subtitle="Resource scheduling & capacity planning" showBackButton backTo="/npi">
      <SchedulerNav />
      <div className="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MonthNav year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
          {canEdit && (
            <Button onClick={() => createAt(selectedDate ?? toISO(new Date()))}>
              <Plus className="h-4 w-4 mr-1" /> Add Job
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-3 flex flex-wrap items-end gap-2">
            <Select value={fMachine} onValueChange={setFMachine}>
              <SelectTrigger className="w-[190px]"><SelectValue placeholder="Machine" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All machines</SelectItem>
                {scheduler.machines.map((m) => <SelectItem key={m.id} value={m.id}>{m.code} — {m.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fSetter} onValueChange={setFSetter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Setter" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All setters</SelectItem>
                {setters.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fPriority} onValueChange={setFPriority}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All priorities</SelectItem>
                {PRIORITY_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              placeholder="Customer"
              className="w-[180px]"
              value={fCustomer}
              onChange={(e) => setFCustomer(e.target.value)}
            />
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" /> Clear filters
            </Button>
            <span className="text-xs text-muted-foreground ml-auto">
              {matchingJobIds.size} of {jobs.length} jobs · live multi-user data
            </span>
          </CardContent>
        </Card>

        {scheduler.loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading schedule…
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            <MonthCalendar
              year={year}
              month={month}
              allocations={visibleAllocations}
              jobById={jobById}
              setterById={setterById}
              holidays={holidays}
              selectedDate={selectedDate}
              canEdit={canEdit}
              nonWorking={nonWorking}
              onSelectDate={setSelectedDate}
              onCreateAt={createAt}
              onOpenJob={openJob}
              onMoveJob={handleMove}
              mode="machine"
            />

            <Card className="h-fit">
              <CardContent className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-sm">{selectedDate ?? 'Select a day'}</h3>
                  <p className="text-xs text-muted-foreground">{dayAllocations.length} allocation(s)</p>
                </div>
                <div className="space-y-2">
                  {dayAllocations.map((a) => {
                    const job = jobById[a.job_id];
                    if (!job) return null;
                    return (
                      <button
                        key={a.id}
                        onClick={() => openJob(job.id)}
                        className="w-full text-left rounded border border-border p-2 hover:bg-accent transition-colors"
                        style={{ borderLeftColor: job.setter_id ? setterById[job.setter_id]?.color : undefined, borderLeftWidth: 3 }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm">{job.po_number ?? job.job_number}</span>
                          <Badge variant="outline">{fmtHours(a.hours)}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {job.part_number ?? '—'} · {job.customer ?? '—'}
                        </div>
                        <div className="text-xs">
                          {job.setter_id ? setterById[job.setter_id]?.name : 'No setter'} ·{' '}
                          {job.machine_id ? machineById[job.machine_id]?.code : 'No machine'}
                        </div>
                      </button>
                    );
                  })}
                  {dayAllocations.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nothing scheduled. Click a day cell's + to add a job.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <JobDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        job={editJobId ? jobById[editJobId] ?? null : null}
        defaultDate={defaultDate}
        scheduler={scheduler}
        canEdit={canEdit}
      />
    </AppLayout>
  );
}
