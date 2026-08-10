import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { SchedulerNav } from '@/components/scheduler/SchedulerNav';
import { JobDialog } from '@/components/scheduler/JobDialog';
import { useScheduler } from '@/hooks/useScheduler';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import { fmtDuration, fmtHours, toISO } from '@/utils/schedulerEngine';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '@/types/scheduler';

const ALL = '__all__';

const priorityVariant = (p: string) =>
  p === 'critical' ? 'destructive' : p === 'high' ? 'default' : 'secondary';

export default function SchedulerJobs() {
  const scheduler = useScheduler();
  const { role } = useUserRole();
  const canEdit = !!role;
  const { jobs, devAllocations: allocations, prodAllocations, machineById, setterById, jobById } = scheduler;
  const [search, setSearch] = useState('');
  const [fStatus, setFStatus] = useState(ALL);
  const [fPriority, setFPriority] = useState(ALL);
  const [fMachine, setFMachine] = useState(ALL);
  const [fSetter, setFSetter] = useState(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editJobId, setEditJobId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return jobs
      .filter((j) => {
        if (fStatus !== ALL && j.status !== fStatus) return false;
        if (fPriority !== ALL && j.priority !== fPriority) return false;
        if (fMachine !== ALL && j.machine_id !== fMachine) return false;
        if (fSetter !== ALL && j.setter_id !== fSetter) return false;
        if (!q) return true;
        return [j.po_number, j.job_number, j.part_number, j.customer, j.notes]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      })
      .map((j) => {
        const allocs = allocations
          .filter((a) => a.job_id === j.id)
          .sort((a, b) => a.alloc_date.localeCompare(b.alloc_date));
        const prod = prodAllocations.filter((a) => a.job_id === j.id);
        return {
          job: j,
          start: allocs[0]?.alloc_date ?? j.start_date,
          end: allocs[allocs.length - 1]?.alloc_date ?? '—',
          days: allocs.length,
          prodHours: prod.reduce((sum, a) => sum + Number(a.hours), 0),
        };
      });
  }, [jobs, allocations, prodAllocations, search, fStatus, fPriority, fMachine, fSetter]);


  return (
    <AppLayout title="Jobs" subtitle="All NPI development jobs" showBackButton backTo="/scheduling">
      <SchedulerNav />
      <div className="p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Search PO#, job, part, customer…" className="w-72" value={search} onChange={(e) => setSearch(e.target.value)} />
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
          <Select value={fMachine} onValueChange={setFMachine}>
            <SelectTrigger className="w-[190px]"><SelectValue placeholder="Machine" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All machines</SelectItem>
              {scheduler.machines.map((m) => <SelectItem key={m.id} value={m.id}>{m.code} — {m.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fSetter} onValueChange={setFSetter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Setter" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All setters</SelectItem>
              {scheduler.setters.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFStatus(ALL); setFPriority(ALL); setFMachine(ALL); setFSetter(ALL); }}>
            <X className="h-4 w-4 mr-1" /> Clear
          </Button>
          {canEdit && (
            <Button className="ml-auto" onClick={() => { setEditJobId(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Job
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left py-2 px-3">PO#</th>
                  <th className="text-left py-2 px-3">Job</th>
                  <th className="text-left py-2 px-3">Part</th>
                  <th className="text-left py-2 px-3">Customer</th>
                  <th className="text-left py-2 px-3">Machine</th>
                  <th className="text-left py-2 px-3">Setter</th>
                  <th className="text-right py-2 px-3">Dev hours</th>
                  <th className="text-left py-2 px-3">Start</th>
                  <th className="text-left py-2 px-3">Planned end</th>
                  <th className="text-right py-2 px-3">Days</th>
                  <th className="text-right py-2 px-3">Prod qty</th>
                  <th className="text-right py-2 px-3">Prod hours</th>
                  <th className="text-left py-2 px-3">Prod start</th>
                  <th className="text-left py-2 px-3">Prod end</th>
                  <th className="text-left py-2 px-3">Priority</th>
                  <th className="text-left py-2 px-3">Status</th>

                </tr>
              </thead>
              <tbody>
                {rows.map(({ job, start, end, days, prodHours }) => (
                  <tr
                    key={job.id}
                    className="border-b border-border/60 last:border-0 hover:bg-accent/50 cursor-pointer"
                    onClick={() => { setEditJobId(job.id); setDialogOpen(true); }}
                  >
                    <td className="py-2 px-3 font-medium">{job.job_number}</td>
                    <td className="py-2 px-3">{job.part_number ?? '—'}</td>
                    <td className="py-2 px-3">{job.customer ?? '—'}</td>
                    <td className="py-2 px-3">{job.machine_id ? machineById[job.machine_id]?.code : '—'}</td>
                    <td className="py-2 px-3">
                      {job.setter_id && (
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: setterById[job.setter_id]?.color }}
                          />
                          {setterById[job.setter_id]?.name}
                        </span>
                      )}
                      {!job.setter_id && '—'}
                    </td>
                    <td className="py-2 px-3 text-right">{fmtHours(job.development_hours)}</td>
                    <td className="py-2 px-3">{start}</td>
                    <td className="py-2 px-3">{end}</td>
                    <td className="py-2 px-3 text-right">{days}</td>
                    <td className="py-2 px-3 text-right">{Number(job.production_quantity) || 0}</td>
                    <td className="py-2 px-3 text-right">{prodHours > 0 ? fmtDuration(prodHours) : '—'}</td>
                    <td className="py-2 px-3">{job.production_start ?? '—'}</td>
                    <td className="py-2 px-3">{job.production_end ?? '—'}</td>

                    <td className="py-2 px-3">
                      <Badge variant={priorityVariant(job.priority) as 'default' | 'secondary' | 'destructive'}>
                        {job.priority}
                      </Badge>
                    </td>
                    <td className="py-2 px-3">
                      <Badge variant="outline">{job.status.replace('_', ' ')}</Badge>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-muted-foreground">No jobs match the filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <JobDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        job={editJobId ? jobById[editJobId] ?? null : null}
        defaultDate={toISO(new Date())}
        scheduler={scheduler}
        canEdit={canEdit}
      />
    </AppLayout>
  );
}
