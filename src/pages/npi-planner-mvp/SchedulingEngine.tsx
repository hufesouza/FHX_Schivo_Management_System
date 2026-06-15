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
import { buildSchedule, DEV_RESOURCE_NAME } from './schedulerCore';

type Resource = { id: string; resource_name: string; resource_category?: string | null; resource_type?: string | null; lead_time_days?: number | null; available_hours_per_day: number; status: string; scheduling_mode?: 'Exclusive' | 'Parallel' };
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
      .insert({ resource_name: DEV_RESOURCE_NAME, resource_category: 'Manufacturing', resource_type: 'Engineering', available_hours_per_day: 8, number_of_shifts: 1, status: 'Active', scheduling_mode: 'Parallel' })
      .select()
      .single();
    if (error) { toast.error(error.message); return null; }
    setResources(prev => [...prev, data as Resource]);
    return data as Resource;
  };

  const runSchedule = async () => {
    setRunning(true);
    try {
      let devResource = resources.find(r => r.resource_name === DEV_RESOURCE_NAME && r.status === 'Active') || null;
      const needsDev = jobs.some(j => (j.status === 'Planned' || j.status === 'Scheduled') && Number(j.development_time_hours || 0) > 0);
      if (needsDev && !devResource) {
        devResource = await ensureDevResource();
        if (!devResource) { toast.error('Aborted: Development resource required'); return; }
      }

      const { opUpdates, jobUpdates } = buildSchedule({
        resources: devResource && !resources.some(r => r.id === devResource!.id) ? [...resources, devResource] : resources,
        jobs,
        ops,
        baseStart: new Date(startDate + 'T00:00:00'),
      });

      // Persist updates
      for (const u of opUpdates) {
        await supabase.from('job_operations').update({ planned_start: u.planned_start, planned_finish: u.planned_finish }).eq('id', u.id);
      }
      for (const u of jobUpdates) {
        await supabase.from('jobs').update({
          planned_start: u.planned_start, planned_finish: u.planned_finish,
          schedule_status: u.schedule_status, status: u.status,
          planned_dev_start: u.planned_dev_start,
          planned_dev_finish: u.planned_dev_finish,
          dev_resource_id: u.dev_resource_id,
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
