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
import { fmtDuration, fmtHours, machineHoursOn } from '@/utils/schedulerEngine';
import { PRODUCTION_STATUS_OPTIONS } from '@/types/scheduler';

const ALL = '__all__';

export default function ProductionCalendar() {
  const scheduler = useScheduler();
  const { role } = useUserRole();
  const canEdit = !!role;
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [fMachine, setFMachine] = useState(ALL);
  const [fStatus, setFStatus] = useState(ALL);
  const [fSetter, setFSetter] = useState(ALL);
  const [fPo, setFPo] = useState('');
  const [fCustomer, setFCustomer] = useState('');
  const [fPart, setFPart] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editJobId, setEditJobId] = useState<string | null>(null);

  const { machines, setters, jobs, prodAllocations, jobById, setterById, holidays } = scheduler;

  const filtersActive = fMachine !== ALL || fStatus !== ALL || fSetter !== ALL || !!fPo || !!fCustomer || !!fPart;

  const matching = useMemo(() => {
    const set = new Set<string>();
    for (const j of jobs) {
      if (fStatus !== ALL && j.production_status !== fStatus) continue;
      if (fSetter !== ALL && j.setter_id !== fSetter) continue;
      if (fPo && !(j.po_number ?? '').toLowerCase().includes(fPo.toLowerCase())) continue;
      if (fCustomer && !(j.customer ?? '').toLowerCase().includes(fCustomer.toLowerCase())) continue;
      if (fPart && !(j.part_number ?? '').toLowerCase().includes(fPart.toLowerCase())) continue;
      set.add(j.id);
    }
    return set;
  }, [jobs, fStatus, fSetter, fPo, fCustomer, fPart]);

  const runsFor = (machineId: string) =>
    jobs
      .filter((j) => j.machine_id === machineId && matching.has(j.id) && Number(j.production_quantity) > 0)
      .map((j) => {
        const allocs = prodAllocations
          .filter((a) => a.job_id === j.id)
          .sort((a, b) => a.alloc_date.localeCompare(b.alloc_date));
        return {
          job: j,
          hours: allocs.reduce((sum, a) => sum + Number(a.hours), 0),
          start: allocs[0]?.alloc_date ?? j.production_start ?? '—',
          end: allocs[allocs.length - 1]?.alloc_date ?? j.production_end ?? '—',
          days: allocs.length,
        };
      });

  const shownMachines = useMemo(() => {
    let list = fMachine === ALL ? machines : machines.filter((m) => m.id === fMachine);
    if (filtersActive) {
      const withRuns = new Set(
        jobs
          .filter((j) => matching.has(j.id) && j.machine_id && Number(j.production_quantity) > 0)
          .map((j) => j.machine_id as string),
      );
      list = list.filter((m) => withRuns.has(m.id));
    }
    return list;
  }, [machines, fMachine, filtersActive, jobs, matching]);


  return (
    <AppLayout
      title="Production Calendar"
      subtitle="Machine occupancy from production runs (quantity × cycle time)"
      showBackButton
      backTo="/scheduling"
    >
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
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Production status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {PRODUCTION_STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Customer" className="w-[160px]" value={fCustomer} onChange={(e) => setFCustomer(e.target.value)} />
            <Input placeholder="Part number" className="w-[150px]" value={fPart} onChange={(e) => setFPart(e.target.value)} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFMachine(ALL); setFStatus(ALL); setFCustomer(''); setFPart(''); }}
            >
              <X className="h-4 w-4 mr-1" /> Clear filters
            </Button>
          </CardContent>
        </Card>

        {shownMachines.map((m) => {
          const allocs = prodAllocations.filter((a) => a.machine_id === m.id && matching.has(a.job_id));
          const rows = runsFor(m.id);
          return (
            <Card key={m.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {m.name}
                  <Badge variant="outline">{m.code}</Badge>
                  <span className="text-xs font-normal text-muted-foreground">
                    {fmtHours(m.daily_hours)}/day available · {rows.length} production run(s)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <MonthCalendar
                  year={year}
                  month={month}
                  mode="production"
                  allocations={allocs}
                  jobById={jobById}
                  setterById={setterById}
                  holidays={holidays}
                  canEdit={canEdit}
                  nonWorking={(iso) => machineHoursOn(iso, m, holidays) === 0}
                  onOpenJob={(id) => { setEditJobId(id); setDialogOpen(true); }}
                  onMoveJob={async (jobId, iso) => {
                    const res = await scheduler.moveProduction(jobId, iso);
                    if (res.ok) toast.success('Production run moved');
                    else toast.error(res.error || 'Move rejected');
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
                          <th className="text-right py-1 px-2">Qty</th>
                          <th className="text-right py-1 px-2">Cycle time</th>
                          <th className="text-right py-1 px-2">Machine time</th>
                          <th className="text-left py-1 px-2">Start</th>
                          <th className="text-left py-1 px-2">End</th>
                          <th className="text-right py-1 px-2">Days</th>
                          <th className="text-left py-1 px-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(({ job, hours, start, end, days }) => (
                          <tr
                            key={job.id}
                            className="border-b border-border/60 last:border-0 hover:bg-accent/50 cursor-pointer"
                            onClick={() => { setEditJobId(job.id); setDialogOpen(true); }}
                          >
                            <td className="py-1 px-2 font-medium">{job.job_number}</td>
                            <td className="py-1 px-2">{job.part_number ?? '—'}</td>
                            <td className="py-1 px-2">{job.customer ?? '—'}</td>
                            <td className="py-1 px-2 text-right">{Number(job.production_quantity) || 0}</td>
                            <td className="py-1 px-2 text-right">
                              {Number(job.cycle_time) || 0} {job.cycle_time_unit === 'seconds' ? 's' : job.cycle_time_unit === 'minutes' ? 'min' : 'h'}
                            </td>
                            <td className="py-1 px-2 text-right">{fmtDuration(hours)}</td>
                            <td className="py-1 px-2">{start}</td>
                            <td className="py-1 px-2">{end}</td>
                            <td className="py-1 px-2 text-right">{days}</td>
                            <td className="py-1 px-2">
                              <Badge variant="outline">{job.production_status.replace('_', ' ')}</Badge>
                            </td>
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
