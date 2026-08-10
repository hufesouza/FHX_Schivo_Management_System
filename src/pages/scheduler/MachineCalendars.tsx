import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { SchedulerNav } from '@/components/scheduler/SchedulerNav';
import { MonthCalendar, MonthNav } from '@/components/scheduler/MonthCalendar';
import { JobDialog } from '@/components/scheduler/JobDialog';
import { useScheduler } from '@/hooks/useScheduler';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { fmtHours, machineHoursOn } from '@/utils/schedulerEngine';

const ALL = '__all__';

export default function MachineCalendars() {
  const scheduler = useScheduler();
  const { role } = useUserRole();
  const canEdit = !!role;
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [fMachine, setFMachine] = useState(ALL);
  const [fSetter, setFSetter] = useState(ALL);
  const [fCustomer, setFCustomer] = useState('');
  const [fJob, setFJob] = useState('');
  const [fPart, setFPart] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editJobId, setEditJobId] = useState<string | null>(null);

  const { machines, setters, jobs, devAllocations: allocations, jobById, setterById, holidays } = scheduler;

  const matching = useMemo(() => {
    const set = new Set<string>();
    for (const j of jobs) {
      if (fSetter !== ALL && j.setter_id !== fSetter) continue;
      if (fCustomer && !(j.customer ?? '').toLowerCase().includes(fCustomer.toLowerCase())) continue;
      if (fJob && !j.job_number.toLowerCase().includes(fJob.toLowerCase())) continue;
      if (fPart && !(j.part_number ?? '').toLowerCase().includes(fPart.toLowerCase())) continue;
      set.add(j.id);
    }
    return set;
  }, [jobs, fSetter, fCustomer, fJob, fPart]);

  const shownMachines = fMachine === ALL ? machines : machines.filter((m) => m.id === fMachine);

  const jobRows = (machineId: string) =>
    jobs
      .filter((j) => j.machine_id === machineId && matching.has(j.id))
      .map((j) => {
        const allocs = allocations.filter((a) => a.job_id === j.id).sort((a, b) => a.alloc_date.localeCompare(b.alloc_date));
        return {
          job: j,
          start: allocs[0]?.alloc_date ?? j.start_date,
          end: allocs[allocs.length - 1]?.alloc_date ?? j.start_date,
        };
      });

  return (
    <AppLayout title="Machine Calendars" subtitle="NPI jobs by machine" showBackButton backTo="/scheduling">
      <SchedulerNav />
      <div className="p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <MonthNav year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
        </div>

        <Card>
          <CardContent className="p-3 flex flex-wrap items-end gap-2">
            <Select value={fMachine} onValueChange={setFMachine}>
              <SelectTrigger className="w-[210px]"><SelectValue placeholder="Machine" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All machines</SelectItem>
                {machines.map((m) => <SelectItem key={m.id} value={m.id}>{m.code} — {m.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fSetter} onValueChange={setFSetter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Setter" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All setters</SelectItem>
                {setters.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Customer" className="w-[160px]" value={fCustomer} onChange={(e) => setFCustomer(e.target.value)} />
            <Input placeholder="Job number" className="w-[150px]" value={fJob} onChange={(e) => setFJob(e.target.value)} />
            <Input placeholder="Part number" className="w-[150px]" value={fPart} onChange={(e) => setFPart(e.target.value)} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFMachine(ALL); setFSetter(ALL); setFCustomer(''); setFJob(''); setFPart(''); }}
            >
              <X className="h-4 w-4 mr-1" /> Clear filters
            </Button>
          </CardContent>
        </Card>

        {shownMachines.map((m) => {
          const machineAllocs = allocations.filter((a) => a.machine_id === m.id && matching.has(a.job_id));
          const rows = jobRows(m.id);
          return (
            <Card key={m.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {m.name}
                  <Badge variant="outline">{m.code}</Badge>
                  <span className="text-xs font-normal text-muted-foreground">
                    {fmtHours(m.daily_hours)}/day available · {rows.length} job(s)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <MonthCalendar
                  year={year}
                  month={month}
                  allocations={machineAllocs}
                  jobById={jobById}
                  setterById={setterById}
                  holidays={holidays}
                  canEdit={canEdit}
                  nonWorking={(iso) => machineHoursOn(iso, m, holidays) === 0}
                  onOpenJob={(id) => { setEditJobId(id); setDialogOpen(true); }}
                  onMoveJob={async (jobId, iso) => {
                    const res = await scheduler.moveJob(jobId, iso);
                    if (res.ok) toast.success('Job moved'); else toast.error(res.error || 'Move rejected');
                  }}
                />
                {rows.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="text-muted-foreground">
                        <tr className="border-b border-border">
                          <th className="text-left py-1 px-2">Job</th>
                          <th className="text-left py-1 px-2">Part</th>
                          <th className="text-left py-1 px-2">Customer</th>
                          <th className="text-left py-1 px-2">Setter</th>
                          <th className="text-right py-1 px-2">Dev hours</th>
                          <th className="text-left py-1 px-2">Start</th>
                          <th className="text-left py-1 px-2">Planned end</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(({ job, start, end }) => (
                          <tr
                            key={job.id}
                            className="border-b border-border/60 last:border-0 hover:bg-accent/50 cursor-pointer"
                            onClick={() => { setEditJobId(job.id); setDialogOpen(true); }}
                          >
                            <td className="py-1 px-2 font-medium">{job.job_number}</td>
                            <td className="py-1 px-2">{job.part_number ?? '—'}</td>
                            <td className="py-1 px-2">{job.customer ?? '—'}</td>
                            <td className="py-1 px-2">{job.setter_id ? setterById[job.setter_id]?.name : '—'}</td>
                            <td className="py-1 px-2 text-right">{fmtHours(job.development_hours)}</td>
                            <td className="py-1 px-2">{start}</td>
                            <td className="py-1 px-2">{end}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <JobDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        job={editJobId ? jobById[editJobId] ?? null : null}
        scheduler={scheduler}
        canEdit={canEdit}
      />
    </AppLayout>
  );
}
