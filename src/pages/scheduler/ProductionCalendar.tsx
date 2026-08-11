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
import { PRODUCTION_STATUS_OPTIONS, PRODUCTION_TYPE_OPTIONS } from '@/types/scheduler';
import { ACTIVITY_COLORS } from '@/utils/schedulerColors';

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

  const [fType, setFType] = useState(ALL);
  const { machines, setters, jobs, prodAllocations, setupAllocations, jobById, setterById, holidays } = scheduler;

  const filtersActive =
    fMachine !== ALL || fStatus !== ALL || fSetter !== ALL || fType !== ALL || !!fPo || !!fCustomer || !!fPart;

  const matching = useMemo(() => {
    const set = new Set<string>();
    for (const j of jobs) {
      if (fStatus !== ALL && j.production_status !== fStatus) continue;
      if (fType !== ALL && j.production_type !== fType) continue;
      if (fSetter !== ALL && j.setter_id !== fSetter && j.production_setter_id !== fSetter) continue;
      if (fPo && !(j.po_number ?? '').toLowerCase().includes(fPo.toLowerCase())) continue;
      if (fCustomer && !(j.customer ?? '').toLowerCase().includes(fCustomer.toLowerCase())) continue;
      if (fPart && !(j.part_number ?? '').toLowerCase().includes(fPart.toLowerCase())) continue;
      set.add(j.id);
    }
    return set;
  }, [jobs, fStatus, fType, fSetter, fPo, fCustomer, fPart]);

  const runsFor = (machineId: string) =>
    jobs
      .filter(
        (j) =>
          j.machine_id === machineId &&
          matching.has(j.id) &&
          (Number(j.production_quantity) > 0 || Number(j.setup_hours) > 0),
      )
      .map((j) => {
        const setup = setupAllocations
          .filter((a) => a.job_id === j.id)
          .sort((a, b) => a.alloc_date.localeCompare(b.alloc_date));
        const allocs = prodAllocations
          .filter((a) => a.job_id === j.id)
          .sort((a, b) => a.alloc_date.localeCompare(b.alloc_date));
        const all = [...setup, ...allocs].sort((a, b) => a.alloc_date.localeCompare(b.alloc_date));
        return {
          job: j,
          setupHours: setup.reduce((sum, a) => sum + Number(a.hours), 0),
          hours: allocs.reduce((sum, a) => sum + Number(a.hours), 0),
          start: all[0]?.alloc_date ?? j.production_start ?? '—',
          end: all[all.length - 1]?.alloc_date ?? j.production_end ?? '—',
          days: new Set(all.map((a) => a.alloc_date)).size,
        };
      });

  const shownMachines = useMemo(() => {
    let list = fMachine === ALL ? machines : machines.filter((m) => m.id === fMachine);
    if (filtersActive) {
      const withRuns = new Set(
        jobs
          .filter(
            (j) =>
              matching.has(j.id) &&
              j.machine_id &&
              (Number(j.production_quantity) > 0 || Number(j.setup_hours) > 0),
          )
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
            <Select value={fType} onValueChange={setFType}>
              <SelectTrigger className="w-[190px]"><SelectValue placeholder="Production type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All production types</SelectItem>
                {PRODUCTION_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fSetter} onValueChange={setFSetter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Setter" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All setters</SelectItem>
                {setters.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative">
              <Input placeholder="PO# search" className="w-[170px] pr-7" value={fPo} onChange={(e) => setFPo(e.target.value)} />
              {fPo && (
                <button
                  aria-label="Clear PO# filter"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setFPo('')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Input placeholder="Customer" className="w-[160px]" value={fCustomer} onChange={(e) => setFCustomer(e.target.value)} />
            <Input placeholder="Part number" className="w-[150px]" value={fPart} onChange={(e) => setFPart(e.target.value)} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFMachine(ALL); setFStatus(ALL); setFSetter(ALL); setFType(ALL); setFPo(''); setFCustomer(''); setFPart(''); }}
            >
              <X className="h-4 w-4 mr-1" /> Clear filters
            </Button>
          </CardContent>
        </Card>

        {shownMachines.length === 0 && (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground text-center">
              No jobs match the selected filters.
            </CardContent>
          </Card>
        )}

        {shownMachines.map((m) => {
          const allocs = [...setupAllocations, ...prodAllocations].filter(
            (a) => a.machine_id === m.id && matching.has(a.job_id),
          );
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
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-4 rounded-sm border-l-2"
                      style={{ backgroundColor: ACTIVITY_COLORS.setup.bg, borderLeftColor: ACTIVITY_COLORS.setup.hex }}
                    />
                    SETUP (setter + machine)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-4 rounded-sm border-l-2"
                      style={{ backgroundColor: ACTIVITY_COLORS.production.bg, borderLeftColor: ACTIVITY_COLORS.production.hex }}
                    />
                    PRODUCTION / RUN (machine only)
                  </span>
                </div>
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
                          <th className="text-left py-1 px-2">PO#</th>
                          <th className="text-left py-1 px-2">Type</th>
                          <th className="text-left py-1 px-2">Job</th>
                          <th className="text-left py-1 px-2">Part</th>
                          <th className="text-left py-1 px-2">Customer</th>
                          <th className="text-left py-1 px-2">Setup setter</th>
                          <th className="text-right py-1 px-2">Setup</th>
                          <th className="text-right py-1 px-2">Qty</th>
                          <th className="text-right py-1 px-2">Cycle time</th>
                          <th className="text-right py-1 px-2">Run time</th>
                          <th className="text-right py-1 px-2">Machine time</th>
                          <th className="text-left py-1 px-2">Start</th>
                          <th className="text-left py-1 px-2">End</th>
                          <th className="text-right py-1 px-2">Days</th>
                          <th className="text-left py-1 px-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(({ job, hours, setupHours, start, end, days }) => (
                          <tr
                            key={job.id}
                            className="border-b border-border/60 last:border-0 hover:bg-accent/50 cursor-pointer"
                            onClick={() => { setEditJobId(job.id); setDialogOpen(true); }}
                          >
                            <td className="py-1 px-2 font-semibold">{job.po_number ?? '—'}</td>
                            <td className="py-1 px-2">
                              <Badge variant="outline">
                                {job.production_type === 'standard_production' ? 'Standard' : 'NPI'}
                              </Badge>
                            </td>
                            <td className="py-1 px-2 font-medium">{job.job_number}</td>
                            <td className="py-1 px-2">{job.part_number ?? '—'}</td>
                            <td className="py-1 px-2">{job.customer ?? '—'}</td>
                            <td className="py-1 px-2">
                              {job.production_setter_id ? setterById[job.production_setter_id]?.name ?? '—' : '—'}
                            </td>
                            <td className="py-1 px-2 text-right">{setupHours > 0 ? fmtDuration(setupHours) : '—'}</td>
                            <td className="py-1 px-2 text-right">{Number(job.production_quantity) || 0}</td>
                            <td className="py-1 px-2 text-right">
                              {Number(job.cycle_time) || 0} {job.cycle_time_unit === 'seconds' ? 's' : job.cycle_time_unit === 'minutes' ? 'min' : 'h'}
                            </td>
                            <td className="py-1 px-2 text-right">{hours > 0 ? fmtDuration(hours) : '—'}</td>
                            <td className="py-1 px-2 text-right">{fmtDuration(hours + setupHours)}</td>
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
