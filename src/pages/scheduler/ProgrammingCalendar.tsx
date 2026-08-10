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
import { fmtDuration, fmtHours, setterHoursOn } from '@/utils/schedulerEngine';
import { PROGRAMMING_STATUS_OPTIONS } from '@/types/scheduler';

const ALL = '__all__';

export default function ProgrammingCalendar() {
  const scheduler = useScheduler();
  const { role } = useUserRole();
  const canEdit = !!role;
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [fProgrammer, setFProgrammer] = useState(ALL);
  const [fStatus, setFStatus] = useState(ALL);
  const [fPo, setFPo] = useState('');
  const [fCustomer, setFCustomer] = useState('');
  const [fPart, setFPart] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editJobId, setEditJobId] = useState<string | null>(null);

  const { setters, jobs, progAllocations, jobById, setterById, holidays, calendar, devAllocations } = scheduler;

  const matching = useMemo(() => {
    const set = new Set<string>();
    for (const j of jobs) {
      if (Number(j.programming_hours) <= 0) continue;
      if (fStatus !== ALL && j.programming_status !== fStatus) continue;
      if (fPo && !(j.po_number ?? '').toLowerCase().includes(fPo.toLowerCase())) continue;
      if (fCustomer && !(j.customer ?? '').toLowerCase().includes(fCustomer.toLowerCase())) continue;
      if (fPart && !(j.part_number ?? '').toLowerCase().includes(fPart.toLowerCase())) continue;
      set.add(j.id);
    }
    return set;
  }, [jobs, fStatus, fPo, fCustomer, fPart]);

  const filtersActive = fProgrammer !== ALL || fStatus !== ALL || !!fPo || !!fCustomer || !!fPart;

  const rowsFor = (programmerId: string) =>
    jobs
      .filter((j) => j.programmer_id === programmerId && matching.has(j.id))
      .map((j) => {
        const allocs = progAllocations
          .filter((a) => a.job_id === j.id)
          .sort((a, b) => a.alloc_date.localeCompare(b.alloc_date));
        return {
          job: j,
          hours: allocs.reduce((sum, a) => sum + Number(a.hours), 0),
          start: allocs[0]?.alloc_date ?? j.programming_start ?? '—',
          end: allocs[allocs.length - 1]?.alloc_date ?? j.programming_end ?? '—',
          days: allocs.length,
        };
      });

  const shownProgrammers = (fProgrammer === ALL ? setters : setters.filter((s) => s.id === fProgrammer)).filter(
    (s) => !filtersActive || rowsFor(s.id).length > 0,
  );

  return (
    <AppLayout
      title="Programming Calendar"
      subtitle="Which programmer is occupied, with which job, and when — no machine time is consumed"
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
            <Select value={fProgrammer} onValueChange={setFProgrammer}>
              <SelectTrigger className="w-[190px]"><SelectValue placeholder="Programmer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All programmers</SelectItem>
                {setters.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Programming status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {PROGRAMMING_STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative">
              <Input placeholder="PO# search" className="w-[160px] pr-7" value={fPo} onChange={(e) => setFPo(e.target.value)} />
              {fPo && (
                <button
                  onClick={() => setFPo('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear PO# search"
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
              onClick={() => { setFProgrammer(ALL); setFStatus(ALL); setFPo(''); setFCustomer(''); setFPart(''); }}
            >
              <X className="h-4 w-4 mr-1" /> Clear filters
            </Button>
          </CardContent>
        </Card>

        {shownProgrammers.length === 0 && (
          <p className="text-sm text-muted-foreground">No programming work matches the selected filters.</p>
        )}

        {shownProgrammers.map((s) => {
          const allocs = progAllocations.filter((a) => a.setter_id === s.id && matching.has(a.job_id));
          const rows = rowsFor(s.id);
          const weekly = [0, 1, 2, 3, 4, 5, 6].reduce((sum, dow) => sum + (calendar[s.id]?.[dow] ?? 0), 0);
          const devHours = devAllocations.filter((a) => a.setter_id === s.id).reduce((a, b) => a + Number(b.hours), 0);
          const progHours = progAllocations.filter((a) => a.setter_id === s.id).reduce((a, b) => a + Number(b.hours), 0);
          return (
            <Card key={s.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex flex-wrap items-center gap-2">
                  {s.name}
                  <Badge variant="outline" style={{ borderColor: s.color, color: s.color }}>Programmer</Badge>
                  <span className="text-xs font-normal text-muted-foreground">
                    Weekly capacity {fmtHours(weekly)} · development {fmtHours(devHours)} · programming {fmtHours(progHours)} ·{' '}
                    {rows.length} programming job(s)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <MonthCalendar
                  year={year}
                  month={month}
                  mode="programming"
                  allocations={allocs}
                  jobById={jobById}
                  setterById={setterById}
                  holidays={holidays}
                  canEdit={canEdit}
                  nonWorking={(iso) => setterHoursOn(iso, s.id, calendar, holidays) === 0}
                  onOpenJob={(id) => { setEditJobId(id); setDialogOpen(true); }}
                  onMoveJob={async (jobId, iso) => {
                    const res = await scheduler.moveProgramming(jobId, iso);
                    if (res.ok) toast.success('Programming moved');
                    else toast.error(res.error || 'Move rejected');
                  }}
                />
                {rows.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="text-muted-foreground">
                        <tr className="border-b border-border">
                          <th className="text-left py-1 px-2">PO#</th>
                          <th className="text-left py-1 px-2">Part</th>
                          <th className="text-left py-1 px-2">Customer</th>
                          <th className="text-right py-1 px-2">Programming time</th>
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
                            <td className="py-1 px-2 font-semibold">{job.po_number ?? '—'}</td>
                            <td className="py-1 px-2">{job.part_number ?? '—'}</td>
                            <td className="py-1 px-2">{job.customer ?? '—'}</td>
                            <td className="py-1 px-2 text-right">{fmtDuration(hours || Number(job.programming_hours))}</td>
                            <td className="py-1 px-2">{start}</td>
                            <td className="py-1 px-2">{end}</td>
                            <td className="py-1 px-2 text-right">{days}</td>
                            <td className="py-1 px-2">
                              <Badge variant="outline">{job.programming_status.replace('_', ' ')}</Badge>
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
