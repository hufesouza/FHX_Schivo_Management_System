import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

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
      .select('id, job_number, quantity, due_date, priority, status, planned_start, planned_finish, best_commence_date, latest_start_date, schedule_risk, parts ( part_number, revision )')
      .order('due_date', { ascending: true });
    setLoading(false);
    if (error) return toast.error(error.message);
    setRows((data || []) as any);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter(r =>
      (statusFilter === 'all' || r.status === statusFilter) &&
      (priorityFilter === 'all' || r.priority === priorityFilter) &&
      (!term ||
        r.job_number.toLowerCase().includes(term) ||
        (r.parts?.part_number || '').toLowerCase().includes(term))
    );
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
                    <TableHead>Best Commence</TableHead>
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
                  ) : filtered.map(r => (
                    <TableRow key={r.id} className="cursor-pointer"
                      onClick={() => navigate(`/npi/capacity-planner-mvp/jobs-mvp/${r.id}`)}>
                      <TableCell className="font-medium">{r.job_number}</TableCell>
                      <TableCell>{r.parts?.part_number || '—'}</TableCell>
                      <TableCell>{r.parts?.revision || '—'}</TableCell>
                      <TableCell className="text-right">{r.quantity}</TableCell>
                      <TableCell>{format(new Date(r.due_date), 'PP')}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.best_commence_date ? format(new Date(r.best_commence_date), 'PP') : '—'}</TableCell>
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
                  ))}
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
