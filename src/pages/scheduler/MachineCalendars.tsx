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
import { fmtDuration, fmtHours, machineHoursOn, productionHours } from '@/utils/schedulerEngine';
import { ACTIVITY_COLORS } from '@/utils/schedulerColors';

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
  const [fPo, setFPo] = useState('');
  const [fCustomer, setFCustomer] = useState('');
  const [fJob, setFJob] = useState('');
  const [fPart, setFPart] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editJobId, setEditJobId] = useState<string | null>(null);

  const { machines, setters, jobs, devAllocations, prodAllocations, jobById, setterById, holidays } = scheduler;
  const allocations = devAllocations;

  const filtersActive = fMachine !== ALL || fSetter !== ALL || !!fPo || !!fCustomer || !!fJob || !!fPart;

  const matching = useMemo(() => {
    const set = new Set<string>();
    for (const j of jobs) {
      if (fSetter !== ALL && j.setter_id !== fSetter) continue;
      if (fPo && !(j.po_number ?? '').toLowerCase().includes(fPo.toLowerCase())) continue;
      if (fCustomer && !(j.customer ?? '').toLowerCase().includes(fCustomer.toLowerCase())) continue;
      if (fJob && !j.job_number.toLowerCase().includes(fJob.toLowerCase())) continue;
      if (fPart && !(j.part_number ?? '').toLowerCase().includes(fPart.toLowerCase())) continue;
      set.add(j.id);
    }
    return set;
  }, [jobs, fSetter, fPo, fCustomer, fJob, fPart]);

  const jobRows = (machineId: string) => {
    const rows: {
      key: string;
      activity: 'development' | 'production';
      job: typeof jobs[number];
      hours: number;
      start: string;
      end: string;
    }[] = [];
    for (const j of jobs) {
      if (j.machine_id !== machineId || !matching.has(j.id)) continue;
      const dev = devAllocations
        .filter((a) => a.job_id === j.id)
        .sort((a, b) => a.alloc_date.localeCompare(b.alloc_date));
      if (dev.length > 0 || Number(j.development_hours) > 0) {
        rows.push({
          key: `${j.id}-dev`,
          activity: 'development',
          job: j,
          hours: Number(j.development_hours) || 0,
          start: dev[0]?.alloc_date ?? j.start_date,
          end: dev[dev.length - 1]?.alloc_date ?? j.start_date,
        });
      }
      const prod = prodAllocations
        .filter((a) => a.job_id === j.id)
        .sort((a, b) => a.alloc_date.localeCompare(b.alloc_date));
      if (prod.length > 0) {
        rows.push({
          key: `${j.id}-prod`,
          activity: 'production',
          job: j,
          hours: prod.reduce((sum, a) => sum + Number(a.hours), 0),
          start: prod[0].alloc_date,
          end: prod[prod.length - 1].alloc_date,
        });
      }
    }
    return rows.sort((a, b) => a.start.localeCompare(b.start));
  };

  const shownMachines = useMemo(() => {
    let list = fMachine === ALL ? machines : machines.filter((m) => m.id === fMachine);
    if (filtersActive) {
      const withJobs = new Set(jobs.filter((j) => matching.has(j.id) && j.machine_id).map((j) => j.machine_id as string));
      list = list.filter((m) => withJobs.has(m.id));
    }
    return list;
  }, [machines, fMachine, filtersActive, jobs, matching]);


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
            <Input placeholder="Job number" className="w-[150px]" value={fJob} onChange={(e) => setFJob(e.target.value)} />
            <Input placeholder="Part number" className="w-[150px]" value={fPart} onChange={(e) => setFPart(e.target.value)} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFMachine(ALL); setFSetter(ALL); setFPo(''); setFCustomer(''); setFJob(''); setFPart(''); }}
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
          const machineAllocs = [...devAllocations, ...prodAllocations].filter(
            (a) => a.machine_id === m.id && matching.has(a.job_id),
          );
          const rows = jobRows(m.id);
          const devHours = rows.filter((r) => r.activity === 'development').reduce((s2, r) => s2 + r.hours, 0);
          const prodHours = rows.filter((r) => r.activity === 'production').reduce((s2, r) => s2 + r.hours, 0);
          return (
            <Card key={m.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {m.name}
                  <Badge variant="outline">{m.code}</Badge>
                  <span className="text-xs font-normal text-muted-foreground">
                    {fmtHours(m.daily_hours)}/day available · development {fmtHours(devHours)} · production {fmtHours(prodHours)} · occupied {fmtHours(devHours + prodHours)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-4 rounded-sm border-l-2"
                      style={{ backgroundColor: ACTIVITY_COLORS.development.bg, borderLeftColor: ACTIVITY_COLORS.development.hex }}
                    />
                    DEVELOPMENT
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-4 rounded-sm border-l-2"
                      style={{ backgroundColor: ACTIVITY_COLORS.production.bg, borderLeftColor: ACTIVITY_COLORS.production.hex }}
                    />
                    PRODUCTION / RUN
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-4 rounded-sm border border-border bg-card" />
                    AVAILABLE
                  </span>
                  <span className="text-muted-foreground/70">Programming does not occupy machines</span>
                </div>
                <MonthCalendar
                  mode="machine"
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
                          <th className="text-left py-1 px-2">Activity</th>
                          <th className="text-left py-1 px-2">PO#</th>
                          <th className="text-left py-1 px-2">Job</th>
                          <th className="text-left py-1 px-2">Part</th>
                          <th className="text-left py-1 px-2">Customer</th>
                          <th className="text-left py-1 px-2">Setter</th>
                          <th className="text-right py-1 px-2">Qty</th>
                          <th className="text-right py-1 px-2">Cycle</th>
                          <th className="text-right py-1 px-2">Machine time</th>
                          <th className="text-left py-1 px-2">Start</th>
                          <th className="text-left py-1 px-2">End</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => {
                          const isProd = r.activity === 'production';
                          const c = isProd ? ACTIVITY_COLORS.production : ACTIVITY_COLORS.development;
                          return (
                            <tr
                              key={r.key}
                              className="border-b border-border/60 last:border-0 hover:bg-accent/50 cursor-pointer"
                              onClick={() => { setEditJobId(r.job.id); setDialogOpen(true); }}
                            >
                              <td className="py-1 px-2">
                                <span
                                  className="inline-flex items-center rounded px-1.5 py-0.5 border-l-2 font-semibold"
                                  style={{ backgroundColor: c.bg, borderLeftColor: c.hex, color: c.hex }}
                                >
                                  {isProd ? 'PRODUCTION / RUN' : 'DEVELOPMENT'}
                                </span>
                              </td>
                              <td className="py-1 px-2 font-semibold">{r.job.po_number ?? '—'}</td>
                              <td className="py-1 px-2 font-medium">{r.job.job_number}</td>
                              <td className="py-1 px-2">{r.job.part_number ?? '—'}</td>
                              <td className="py-1 px-2">{r.job.customer ?? '—'}</td>
                              <td className="py-1 px-2">{!isProd && r.job.setter_id ? setterById[r.job.setter_id]?.name ?? '—' : '—'}</td>
                              <td className="py-1 px-2 text-right">{isProd ? `${Number(r.job.production_quantity) || 0} pcs` : '—'}</td>
                              <td className="py-1 px-2 text-right">
                                {isProd && Number(r.job.cycle_time) > 0
                                  ? `${r.job.cycle_time} ${r.job.cycle_time_unit === 'hours' ? 'h' : 'min'}/pc`
                                  : '—'}
                              </td>
                              <td className="py-1 px-2 text-right">
                                {isProd ? fmtDuration(productionHours(r.job.production_quantity, r.job.cycle_time, r.job.cycle_time_unit)) : fmtHours(r.hours)}
                              </td>
                              <td className="py-1 px-2">{r.start}</td>
                              <td className="py-1 px-2">{r.end}</td>
                            </tr>
                          );
                        })}
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
