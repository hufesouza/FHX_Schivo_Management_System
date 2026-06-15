import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Play, Trash2, Loader2, Lock } from 'lucide-react';

type Resource = { id: string; resource_name: string; available_hours_per_day: number; status: string; scheduling_mode?: 'Exclusive' | 'Parallel' };
type JobOp = {
  id: string;
  job_id: string;
  operation_number: number;
  operation_name: string;
  resource_id: string | null;
  setup_time_hours: number;
  cycle_time_seconds: number;
  total_time_hours: number | null;
  sequence_order: number | null;
  planned_start: string | null;
  planned_finish: string | null;
  is_locked: boolean;
};
type Job = {
  id: string;
  job_number: string;
  part_id: string | null;
  quantity: number;
  due_date: string | null;
  priority: string;
  status: string;
  development_time_hours: number;
  planned_start: string | null;
  planned_finish: string | null;
  schedule_status: string;
};

const PRIORITY_ORDER: Record<string, number> = { Urgent: 0, High: 1, Normal: 2, Low: 3 };
const DEV_RESOURCE_NAME = 'Development / Engineering';

// Advance a Date to the next working minute (Mon-Fri, 00:00 if weekend)
function nextWorkingMoment(d: Date): Date {
  const out = new Date(d);
  while (out.getDay() === 0 || out.getDay() === 6) {
    out.setDate(out.getDate() + 1);
    out.setHours(0, 0, 0, 0);
  }
  return out;
}

// Add `hours` of work starting at `start`, respecting daily capacity & weekdays
function addWorkingHours(start: Date, hours: number, dailyHours: number): Date {
  if (hours <= 0) return new Date(start);
  let remaining = hours;
  const cursor = nextWorkingMoment(new Date(start));
  // hours used so far on the current calendar day
  const dayStart = new Date(cursor); dayStart.setHours(0, 0, 0, 0);
  let usedToday = (cursor.getTime() - dayStart.getTime()) / 3600000;
  while (remaining > 0) {
    const avail = Math.max(0, dailyHours - usedToday);
    if (avail <= 0) {
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(0, 0, 0, 0);
      while (cursor.getDay() === 0 || cursor.getDay() === 6) cursor.setDate(cursor.getDate() + 1);
      usedToday = 0;
      continue;
    }
    const take = Math.min(remaining, avail);
    cursor.setTime(cursor.getTime() + take * 3600000);
    usedToday += take;
    remaining -= take;
  }
  return cursor;
}

// Subtract `hours` of work ending at `end`, respecting daily capacity & weekdays
function subtractWorkingHours(end: Date, hours: number, dailyHours: number): Date {
  if (hours <= 0) return new Date(end);
  let remaining = hours;
  const cursor = new Date(end);
  // step back from non-working days
  while (cursor.getDay() === 0 || cursor.getDay() === 6) {
    cursor.setDate(cursor.getDate() - 1);
    cursor.setHours(23, 59, 59, 999);
  }
  // hours already consumed today from 00:00 to cursor time
  const dayStart = new Date(cursor); dayStart.setHours(0, 0, 0, 0);
  let availToday = (cursor.getTime() - dayStart.getTime()) / 3600000;
  availToday = Math.min(availToday, dailyHours);
  while (remaining > 0) {
    if (availToday <= 0) {
      cursor.setDate(cursor.getDate() - 1);
      cursor.setHours(23, 59, 59, 999);
      while (cursor.getDay() === 0 || cursor.getDay() === 6) cursor.setDate(cursor.getDate() - 1);
      availToday = dailyHours;
      continue;
    }
    const take = Math.min(remaining, availToday);
    cursor.setTime(cursor.getTime() - take * 3600000);
    availToday -= take;
    remaining -= take;
  }
  return cursor;
}

export default function SchedulingEngine() {
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [running, setRunning] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [ops, setOps] = useState<JobOp[]>([]);

  const load = async () => {
    const [r, j, o] = await Promise.all([
      supabase.from('resources').select('*'),
      supabase.from('jobs').select('*'),
      supabase.from('job_operations').select('*').order('operation_number'),
    ]);
    setResources((r.data as Resource[]) || []);
    setJobs((j.data as Job[]) || []);
    setOps((o.data as JobOp[]) || []);
  };
  useEffect(() => { load(); }, []);

  const partsMap = useMemo(() => new Map<string, string>(), []);
  useEffect(() => {
    (async () => {
      const ids = Array.from(new Set(jobs.map(j => j.part_id).filter(Boolean))) as string[];
      if (!ids.length) return;
      const { data } = await supabase.from('parts').select('id,part_number').in('id', ids);
      partsMap.clear();
      (data || []).forEach((p: any) => partsMap.set(p.id, p.part_number));
      setOps(o => [...o]);
    })();
  }, [jobs, partsMap]);

  const ensureDevResource = async (): Promise<Resource | null> => {
    let dev = resources.find(r => r.resource_name === DEV_RESOURCE_NAME && r.status === 'Active');
    if (dev) return dev;
    const ok = window.confirm(`"${DEV_RESOURCE_NAME}" resource not found. Create it now?`);
    if (!ok) return null;
    const { data, error } = await supabase
      .from('resources')
      .insert({ resource_name: DEV_RESOURCE_NAME, resource_type: 'Engineering', available_hours_per_day: 8, number_of_shifts: 1, status: 'Active' })
      .select()
      .single();
    if (error) { toast.error(error.message); return null; }
    setResources(prev => [...prev, data as Resource]);
    return data as Resource;
  };

  const runSchedule = async () => {
    setRunning(true);
    try {
      const activeResources = new Map<string, Resource>();
      resources.filter(r => r.status === 'Active').forEach(r => activeResources.set(r.id, r));

      // Eligible jobs: Planned or Scheduled
      // EDD: earliest due date first; priority breaks ties; no due date = last
      const eligible = jobs
        .filter(j => j.status === 'Planned' || j.status === 'Scheduled')
        .sort((a, b) => {
          const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
          const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
          if (da !== db) return da - db;
          const pa = PRIORITY_ORDER[a.priority] ?? 2;
          const pb = PRIORITY_ORDER[b.priority] ?? 2;
          return pa - pb;
        });

      // resource_id -> next free Date
      const resourceFree = new Map<string, Date>();
      const baseStart = nextWorkingMoment(new Date(startDate + 'T00:00:00'));

      // Preserve locked ops: their windows occupy the resource
      ops.filter(o => o.is_locked && o.planned_start && o.planned_finish && o.resource_id).forEach(o => {
        const end = new Date(o.planned_finish!);
        const cur = resourceFree.get(o.resource_id!) || baseStart;
        if (end > cur) resourceFree.set(o.resource_id!, end);
      });

      const opUpdates: { id: string; planned_start: string; planned_finish: string }[] = [];
      const jobUpdates: { id: string; planned_start: string | null; planned_finish: string | null; schedule_status: string; status: string; best_commence_date: string | null; latest_start_date: string | null; schedule_risk: string }[] = [];

      let devResource: Resource | null = null;

      for (const job of eligible) {
        const jobOps = ops
          .filter(o => o.job_id === job.id)
          .sort((a, b) => (a.sequence_order ?? a.operation_number) - (b.sequence_order ?? b.operation_number));

        let prevEnd = baseStart;
        let jobStart: Date | null = null;
        let jobEnd: Date | null = null;
        let totalDurationHours = 0;
        let dailyHoursRef = 24;

        // Development time as a virtual op on Dev resource
        if (Number(job.development_time_hours) > 0) {
          if (!devResource) devResource = await ensureDevResource();
          if (!devResource) { toast.error('Aborted: Development resource required'); setRunning(false); return; }
          const resFree = resourceFree.get(devResource.id) || baseStart;
          const startAt = nextWorkingMoment(new Date(Math.max(prevEnd.getTime(), resFree.getTime())));
          const endAt = addWorkingHours(startAt, Number(job.development_time_hours), devResource.available_hours_per_day || 8);
          resourceFree.set(devResource.id, endAt);
          prevEnd = endAt;
          jobStart = startAt;
          jobEnd = endAt;
          totalDurationHours += Number(job.development_time_hours);
          dailyHoursRef = devResource.available_hours_per_day || 8;
        }

        for (const op of jobOps) {
          if (op.is_locked && op.planned_start && op.planned_finish) {
            const s = new Date(op.planned_start);
            const e = new Date(op.planned_finish);
            if (!jobStart || s < jobStart) jobStart = s;
            if (!jobEnd || e > jobEnd) jobEnd = e;
            prevEnd = e > prevEnd ? e : prevEnd;
            totalDurationHours += (e.getTime() - s.getTime()) / 3600000;
            continue;
          }
          if (!op.resource_id || !activeResources.has(op.resource_id)) continue;
          const res = activeResources.get(op.resource_id)!;
          const duration = op.total_time_hours && op.total_time_hours > 0
            ? Number(op.total_time_hours)
            : Number(op.setup_time_hours || 0) + (Number(op.cycle_time_seconds || 0) * Number(job.quantity || 0)) / 3600;
          if (duration <= 0) continue;

          const resFree = resourceFree.get(op.resource_id) || baseStart;
          const startAt = nextWorkingMoment(new Date(Math.max(prevEnd.getTime(), resFree.getTime())));
          const endAt = addWorkingHours(startAt, duration, res.available_hours_per_day || 8);
          resourceFree.set(op.resource_id, endAt);
          prevEnd = endAt;
          if (!jobStart || startAt < jobStart) jobStart = startAt;
          if (!jobEnd || endAt > jobEnd) jobEnd = endAt;
          totalDurationHours += duration;
          dailyHoursRef = Math.max(dailyHoursRef, res.available_hours_per_day || 8);

          opUpdates.push({ id: op.id, planned_start: startAt.toISOString(), planned_finish: endAt.toISOString() });
        }

        const dueDateEnd = job.due_date ? new Date(job.due_date + 'T23:59:59') : null;
        const isLate = !!(jobEnd && dueDateEnd && jobEnd > dueDateEnd);

        // Latest start date = due date end - total job duration (working hours)
        const latestStart = (dueDateEnd && totalDurationHours > 0)
          ? subtractWorkingHours(dueDateEnd, totalDurationHours, dailyHoursRef)
          : null;

        // Schedule risk
        const now = new Date();
        let risk: 'On Track' | 'At Risk' | 'Late' = 'On Track';
        if (isLate) risk = 'Late';
        else if (latestStart && now > latestStart) risk = 'At Risk';

        jobUpdates.push({
          id: job.id,
          planned_start: jobStart ? jobStart.toISOString() : null,
          planned_finish: jobEnd ? jobEnd.toISOString() : null,
          schedule_status: jobEnd ? (isLate ? 'Late' : 'Scheduled') : 'Unscheduled',
          status: jobEnd ? 'Scheduled' : job.status,
          best_commence_date: jobStart ? jobStart.toISOString() : null,
          latest_start_date: latestStart ? latestStart.toISOString() : null,
          schedule_risk: risk,
        });
      }

      // Persist updates
      for (const u of opUpdates) {
        await supabase.from('job_operations').update({ planned_start: u.planned_start, planned_finish: u.planned_finish }).eq('id', u.id);
      }
      for (const u of jobUpdates) {
        await supabase.from('jobs').update({
          planned_start: u.planned_start, planned_finish: u.planned_finish,
          schedule_status: u.schedule_status, status: u.status,
          best_commence_date: u.best_commence_date,
          latest_start_date: u.latest_start_date,
          schedule_risk: u.schedule_risk,
        }).eq('id', u.id);
      }

      toast.success(`Scheduled ${jobUpdates.length} jobs, ${opUpdates.length} operations`);
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Schedule failed');
    } finally {
      setRunning(false);
    }
  };

  const clearSchedule = async () => {
    if (!window.confirm('Clear all planned dates? Locked operations will keep their dates.')) return;
    setClearing(true);
    try {
      await supabase.from('job_operations')
        .update({ planned_start: null, planned_finish: null })
        .eq('is_locked', false);
      await supabase.from('jobs')
        .update({ planned_start: null, planned_finish: null, schedule_status: 'Unscheduled', status: 'Planned', best_commence_date: null, latest_start_date: null, schedule_risk: 'On Track' })
        .in('status', ['Scheduled']);
      toast.success('Schedule cleared');
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setClearing(false);
    }
  };

  const jobsById = useMemo(() => new Map(jobs.map(j => [j.id, j])), [jobs]);
  const resourcesById = useMemo(() => new Map(resources.map(r => [r.id, r])), [resources]);

  const scheduledOps = useMemo(
    () => ops.filter(o => o.planned_start && o.planned_finish)
      .sort((a, b) => new Date(a.planned_start!).getTime() - new Date(b.planned_start!).getTime()),
    [ops]
  );

  const fmt = (s: string | null) => s ? new Date(s).toLocaleString() : '—';

  return (
    <AppLayout title="Scheduling Engine" subtitle="Forward scheduler for jobs & operations" showBackButton backTo="/npi/capacity-planner-mvp">
      <main className="container mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Scheduling Control</CardTitle>
            <CardDescription>Forward schedule Planned/Scheduled jobs sorted by priority and due date.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <Label htmlFor="start">Schedule Start Date</Label>
                <Input id="start" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-48" />
              </div>
              <Button onClick={runSchedule} disabled={running}>
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Run Schedule
              </Button>
              <Button variant="outline" onClick={clearSchedule} disabled={clearing}>
                {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Clear Schedule
              </Button>
            </div>
            <div className="text-xs text-muted-foreground mt-3">
              Rules: Mon–Fri only, per-resource daily capacity, sequenced operations, no overlap.
              Locked operations are preserved. Development time uses the "Development / Engineering" resource.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scheduled Operations ({scheduledOps.length})</CardTitle>
            <CardDescription>Output ready for the Interactive Gantt Chart.</CardDescription>
          </CardHeader>
          <CardContent>
            {scheduledOps.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">No scheduled operations yet. Click "Run Schedule".</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job</TableHead>
                      <TableHead>Op #</TableHead>
                      <TableHead>Operation</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Planned Start</TableHead>
                      <TableHead>Planned Finish</TableHead>
                      <TableHead>Duration (h)</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduledOps.map(op => {
                      const job = jobsById.get(op.job_id);
                      const res = op.resource_id ? resourcesById.get(op.resource_id) : null;
                      const dur = ((new Date(op.planned_finish!).getTime() - new Date(op.planned_start!).getTime()) / 3600000).toFixed(2);
                      const isLate = !!(job?.due_date && op.planned_finish && new Date(op.planned_finish) > new Date(job.due_date + 'T23:59:59'));
                      return (
                        <TableRow key={op.id}>
                          <TableCell className="font-medium">{job?.job_number || '—'}</TableCell>
                          <TableCell>{op.operation_number}</TableCell>
                          <TableCell>{op.operation_name}</TableCell>
                          <TableCell>{res?.resource_name || '—'}</TableCell>
                          <TableCell>{fmt(op.planned_start)}</TableCell>
                          <TableCell>{fmt(op.planned_finish)}</TableCell>
                          <TableCell>{dur}</TableCell>
                          <TableCell className="space-x-1">
                            {op.is_locked && <Badge variant="secondary"><Lock className="h-3 w-3 mr-1" />Locked</Badge>}
                            {isLate && <Badge variant="destructive">Late</Badge>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </AppLayout>
  );
}
