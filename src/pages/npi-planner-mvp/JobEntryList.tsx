import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Search, Pencil, Trash2, Lock, Unlock, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'] as const;
const STATUSES = ['Planned', 'Scheduled', 'Completed'] as const;

type Job = {
  id: string;
  job_number: string;
  quantity: number;
  due_date: string;
  priority: string;
  status: string;
  planned_start: string | null;
  planned_finish: string | null;
  best_commence_date: string | null;
  latest_start_date: string | null;
  schedule_risk: string | null;
  planned_date_locked: boolean | null;
  pending_planned_date: string | null;
  pending_planned_date_reason: string | null;
  parent_job_id: string | null;
  job_level: string | null;
  parts: { part_number: string; revision: string | null } | null;
};

const priorityColor = (p: string) => ({
  Low: 'bg-slate-500/10 text-slate-600',
  Normal: 'bg-blue-500/10 text-blue-600',
  High: 'bg-amber-500/10 text-amber-600',
  Urgent: 'bg-red-500/10 text-red-600',
} as any)[p] || '';

const statusColor = (s: string) => ({
  Planned: 'bg-slate-500/10 text-slate-600',
  Scheduled: 'bg-cyan-500/10 text-cyan-600',
  Completed: 'bg-emerald-500/10 text-emerald-600',
} as any)[s] || '';

const riskColor = (r: string | null) => ({
  'On Track': 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  'At Risk': 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  'Late': 'bg-red-500/15 text-red-700 border-red-500/30',
} as any)[r || 'On Track'] || 'bg-slate-500/10 text-slate-600';

const isoDay = (iso: string | null) => iso ? iso.slice(0, 10) : '';
const toMidnightIso = (day: string) => new Date(day + 'T00:00:00').toISOString();

function PlannedDateCell({ job, onChanged }: { job: Job; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(isoDay(job.best_commence_date));
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setDay(isoDay(job.best_commence_date)); setReason(''); } }, [open, job.best_commence_date]);

  const save = async () => {
    if (!day) { toast.error('Pick a date'); return; }
    setSaving(true);
    const { error } = await supabase.from('jobs').update({
      best_commence_date: toMidnightIso(day),
      planned_date_locked: true,
      pending_planned_date: null,
      pending_planned_date_reason: null,
    }).eq('id', job.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Planned Date locked');
    setOpen(false);
    onChanged();
  };

  const unlock = async () => {
    const { error } = await supabase.from('jobs').update({
      planned_date_locked: false,
      pending_planned_date: null,
      pending_planned_date_reason: null,
    }).eq('id', job.id);
    if (error) return toast.error(error.message);
    toast.success('Planned Date unlocked — scheduler may move it');
    setOpen(false);
    onChanged();
  };

  const approvePending = async () => {
    if (!job.pending_planned_date) return;
    const { error } = await supabase.from('jobs').update({
      best_commence_date: job.pending_planned_date,
      planned_date_locked: true,
      pending_planned_date: null,
      pending_planned_date_reason: null,
    }).eq('id', job.id);
    if (error) return toast.error(error.message);
    toast.success('Suggested date approved');
    onChanged();
  };

  const rejectPending = async () => {
    const { error } = await supabase.from('jobs').update({
      pending_planned_date: null,
      pending_planned_date_reason: null,
    }).eq('id', job.id);
    if (error) return toast.error(error.message);
    toast.success('Suggestion dismissed');
    onChanged();
  };

  return (
    <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1 text-sm hover:underline">
            {job.planned_date_locked
              ? <Lock className="h-3 w-3 text-amber-600" />
              : <Unlock className="h-3 w-3 text-muted-foreground" />}
            <span className={job.best_commence_date ? '' : 'text-muted-foreground'}>
              {job.best_commence_date ? format(new Date(job.best_commence_date), 'PP') : '—'}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 space-y-3" align="start">
          <div className="text-sm font-medium">Planned Date</div>
          <p className="text-xs text-muted-foreground">
            Saving locks this date. The scheduler will only suggest changes — they need approval before they apply.
          </p>
          <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional, for the audit trail)"
            rows={2}
          />
          <div className="flex gap-2 justify-between">
            {job.planned_date_locked && (
              <Button variant="outline" size="sm" onClick={unlock}>
                <Unlock className="h-3.5 w-3.5 mr-1" /> Unlock
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={save} disabled={saving}>Save &amp; Lock</Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {job.pending_planned_date && (
        <div className="rounded-md border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 text-xs space-y-1">
          <div className="flex items-center gap-1 text-amber-800 dark:text-amber-300">
            <span className="font-medium">Suggest: {format(new Date(job.pending_planned_date), 'PP')}</span>
          </div>
          {job.pending_planned_date_reason && (
            <div className="text-[11px] text-muted-foreground leading-tight">{job.pending_planned_date_reason}</div>
          )}
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-6 px-2" onClick={approvePending}>
              <Check className="h-3 w-3 mr-1" /> Approve
            </Button>
            <Button variant="ghost" size="sm" className="h-6 px-2" onClick={rejectPending}>
              <X className="h-3 w-3 mr-1" /> Dismiss
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function JobEntryList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('jobs')
      .select('id, job_number, quantity, due_date, priority, status, planned_start, planned_finish, best_commence_date, latest_start_date, schedule_risk, planned_date_locked, pending_planned_date, pending_planned_date_reason, parent_job_id, job_level, parts ( part_number, revision )')
      .order('due_date', { ascending: true });
    setLoading(false);
    if (error) return toast.error(error.message);
    setRows((data || []) as any);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base = rows.filter(r =>
      (statusFilter === 'all' || r.status === statusFilter) &&
      (priorityFilter === 'all' || r.priority === priorityFilter) &&
      (!term ||
        r.job_number.toLowerCase().includes(term) ||
        (r.parts?.part_number || '').toLowerCase().includes(term))
    );
    // Group: keep parents/singles in due-date order, place each parent's children right after.
    const byId = new Map(rows.map(r => [r.id, r]));
    const childrenByParent = new Map<string, Job[]>();
    base.forEach(r => {
      if (r.parent_job_id) {
        const list = childrenByParent.get(r.parent_job_id) || [];
        list.push(r);
        childrenByParent.set(r.parent_job_id, list);
      }
    });
    const out: Job[] = [];
    const seen = new Set<string>();
    base.forEach(r => {
      if (r.parent_job_id) return; // children inserted under parent below
      out.push(r); seen.add(r.id);
      (childrenByParent.get(r.id) || []).forEach(c => { out.push(c); seen.add(c.id); });
    });
    // Orphan children whose parent is filtered out — still show them, but flat
    base.forEach(r => { if (!seen.has(r.id)) out.push(r); });
    return out;
  }, [rows, search, statusFilter, priorityFilter]);

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('jobs').delete().eq('id', deleteId);
    if (error) return toast.error(error.message);
    toast.success('Job deleted');
    setDeleteId(null);
    load();
  };

  return (
    <AppLayout title="Jobs" subtitle="Production jobs created from Part Library templates"
      showBackButton backTo="/npi/capacity-planner-mvp">
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Jobs</CardTitle>
            <Button onClick={() => navigate('/npi/capacity-planner-mvp/jobs-mvp/new')}>
              <Plus className="h-4 w-4 mr-1" /> New job
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by job or part number…" value={search}
                  onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job #</TableHead>
                    <TableHead>Part</TableHead>
                    <TableHead>Rev</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Planned Date</TableHead>
                    <TableHead>Latest Start</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Planned Finish</TableHead>
                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={13} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                      {rows.length === 0 ? 'No jobs yet. Create your first one.' : 'No matches.'}
                    </TableCell></TableRow>
                  ) : filtered.map(r => {
                    const isChild = !!r.parent_job_id;
                    const isParent = r.job_level === 'Parent Assembly';
                    return (
                    <TableRow key={r.id} className="cursor-pointer"
                      onClick={() => navigate(`/npi/capacity-planner-mvp/jobs-mvp/${r.id}`)}>
                      <TableCell className="font-medium">
                        <div className={cn('flex items-center gap-2', isChild && 'pl-6')}>
                          {isChild && <span className="text-muted-foreground">↳</span>}
                          <span>{r.job_number}</span>
                          {isParent && (
                            <Badge variant="outline" className="bg-violet-500/10 text-violet-700 border-violet-500/30 text-[10px]">Assembly</Badge>
                          )}
                          {isChild && (
                            <Badge variant="outline" className="bg-cyan-500/10 text-cyan-700 border-cyan-500/30 text-[10px]">Sub</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{r.parts?.part_number || '—'}</TableCell>
                      <TableCell>{r.parts?.revision || '—'}</TableCell>
                      <TableCell className="text-right">{r.quantity}</TableCell>
                      <TableCell>{format(new Date(r.due_date), 'PP')}</TableCell>
                      <TableCell><PlannedDateCell job={r} onChanged={load} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.latest_start_date ? format(new Date(r.latest_start_date), 'PP') : '—'}</TableCell>
                      <TableCell>{(() => {
                        const now = new Date();
                        const due = r.due_date ? new Date(r.due_date + 'T23:59:59') : null;
                        const finish = r.planned_finish ? new Date(r.planned_finish) : null;
                        const latest = r.latest_start_date ? new Date(r.latest_start_date) : null;
                        let live: 'On Track' | 'At Risk' | 'Late' = 'On Track';
                        if (finish && due && finish > due) live = 'Late';
                        else if (latest && now > latest) live = 'At Risk';
                        return <Badge variant="outline" className={riskColor(live)}>{live}</Badge>;
                      })()}</TableCell>
                      <TableCell><Badge variant="outline" className={priorityColor(r.priority)}>{r.priority}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={statusColor(r.status)}>{r.status}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.planned_finish ? format(new Date(r.planned_finish), 'PP') : '—'}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon"
                          onClick={() => navigate(`/npi/capacity-planner-mvp/jobs-mvp/${r.id}`)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(r.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete job?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the job and its operation overrides.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
