import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Save, CalendarIcon, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

const PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'] as const;
const STATUSES = ['Planned', 'Scheduled', 'Completed'] as const;

type Resource = {
  id: string;
  resource_name: string;
  resource_type: string;
  resource_category?: string | null;
  lead_time_days?: number | null;
};
type Part = { id: string; part_number: string; revision: string | null; description: string | null; part_type?: 'Single Part' | 'Assembly' };
type PartOp = {
  id: string;
  operation_number: number;
  operation_name: string;
  resource_id: string | null;
  setup_time_hours: number;
  cycle_time_seconds: number;
};
type BomComponent = {
  component_part_id: string;
  quantity_per_assembly: number;
  notes: string | null;
  component: { id: string; part_number: string; revision: string | null; part_type: string } | null;
};
type JobOp = {
  id?: string;
  operation_number: number;
  operation_name: string;
  resource_id: string | null;
  setup_time_hours: number;
  cycle_time_seconds: number;
  sequence_order: number;
  notes?: string | null;
};

type JobForm = {
  job_number: string;
  part_id: string;
  quantity: number;
  planned_start: Date | null;
  due_date: Date | null;
  priority: string;
  status: string;
  development_time_hours: number;
  dev_person_id: string | null;
  notes: string;
};

const blankForm = (): JobForm => ({
  job_number: '',
  part_id: '',
  quantity: 1,
  planned_start: null,
  due_date: null,
  priority: 'Normal',
  status: 'Planned',
  development_time_hours: 0,
  dev_person_id: null,
  notes: '',
});

const calcTotal = (op: { setup_time_hours: number; cycle_time_seconds: number }, qty: number) =>
  Number(op.setup_time_hours || 0) + (Number(op.cycle_time_seconds || 0) * qty) / 3600;

export default function JobEntryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [form, setForm] = useState<JobForm>(blankForm());
  const [parts, setParts] = useState<Part[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [ops, setOps] = useState<JobOp[]>([]);
  const [bom, setBom] = useState<BomComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Display units (synced with Part Library settings via localStorage)
  const [setupUnit, setSetupUnit] = useState<'minutes' | 'hours'>(
    () => (localStorage.getItem('pl_setupUnit') as 'minutes' | 'hours') || 'minutes'
  );
  const [cycleUnit, setCycleUnit] = useState<'seconds' | 'minutes'>(
    () => (localStorage.getItem('pl_cycleUnit') as 'seconds' | 'minutes') || 'minutes'
  );
  useEffect(() => { localStorage.setItem('pl_setupUnit', setupUnit); }, [setupUnit]);
  useEffect(() => { localStorage.setItem('pl_cycleUnit', cycleUnit); }, [cycleUnit]);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'pl_setupUnit' && e.newValue) setSetupUnit(e.newValue as 'minutes' | 'hours');
      if (e.key === 'pl_cycleUnit' && e.newValue) setCycleUnit(e.newValue as 'seconds' | 'minutes');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  const setupToDisplay = (h: number) => setupUnit === 'minutes' ? h * 60 : h;
  const setupFromDisplay = (v: number) => setupUnit === 'minutes' ? v / 60 : v;
  const cycleToDisplay = (s: number) => cycleUnit === 'minutes' ? s / 60 : s;
  const cycleFromDisplay = (v: number) => cycleUnit === 'minutes' ? v * 60 : v;
  const setupLabel = setupUnit === 'minutes' ? 'min' : 'h';
  const cycleLabel = cycleUnit === 'minutes' ? 'min' : 's';

  // Load lookups and (if editing) the job
  useEffect(() => {
    (async () => {
      setLoading(true);
      const [p, r] = await Promise.all([
        supabase.from('parts').select('id, part_number, revision, description, part_type').order('part_number'),
        supabase.from('resources').select('id, resource_name, resource_type, resource_category, lead_time_days').eq('status', 'Active').order('resource_name'),
      ]);
      setParts((p.data || []) as Part[]);
      setResources((r.data || []) as Resource[]);

      if (isNew) {
        // Auto-generate next job number: 001, 002, ...
        const { data: allJobs } = await supabase.from('jobs').select('job_number');
        let maxN = 0;
        (allJobs || []).forEach((j: any) => {
          const m = String(j.job_number || '').match(/(\d+)/);
          if (m) {
            const n = parseInt(m[1], 10);
            if (n > maxN) maxN = n;
          }
        });
        const next = String(maxN + 1).padStart(3, '0');
        setForm(f => ({ ...f, job_number: next }));
      }

      if (!isNew && id) {
        const { data: job } = await supabase.from('jobs').select('*').eq('id', id).single();
        if (job) {
          setForm({
            job_number: job.job_number,
            part_id: job.part_id,
            quantity: job.quantity,
            planned_start: (job as any).earliest_start_date
              ? new Date((job as any).earliest_start_date + 'T00:00:00')
              : null,
            due_date: job.due_date ? new Date(job.due_date) : null,
            priority: job.priority,
            status: job.status,
            development_time_hours: Number(job.development_time_hours) || 0,
            dev_person_id: (job as any).dev_person_id || null,
            notes: job.notes || '',
          });
        }
        const { data: jobOps } = await supabase
          .from('job_operations')
          .select('*')
          .eq('job_id', id)
          .order('sequence_order');
        setOps((jobOps || []).map((o: any) => ({
          id: o.id,
          operation_number: o.operation_number,
          operation_name: o.operation_name,
          resource_id: o.resource_id,
          setup_time_hours: Number(o.setup_time_hours) || 0,
          cycle_time_seconds: Number(o.cycle_time_seconds) || 0,
          sequence_order: o.sequence_order,
          notes: o.notes,
        })));
      }
      setLoading(false);
    })();
  }, [id, isNew]);

  // When the user picks a part on a NEW job, load its routing as the seed for overrides
  const onPartChange = async (partId: string) => {
    setForm(f => ({ ...f, part_id: partId }));
    if (!isNew) return; // don't overwrite saved overrides
    const selected = parts.find(p => p.id === partId);
    const [{ data, error }, { data: prevJob }, { data: bomRows }] = await Promise.all([
      supabase.from('part_operations').select('*').eq('part_id', partId).order('operation_number'),
      supabase.from('jobs').select('development_time_hours')
        .eq('part_id', partId).gt('development_time_hours', 0)
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
      selected?.part_type === 'Assembly'
        ? supabase.from('part_bom_components')
            .select('component_part_id, quantity_per_assembly, notes, component:parts!part_bom_components_component_part_id_fkey(id, part_number, revision, part_type)')
            .eq('assembly_part_id', partId)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    if (error) return toast.error(error.message);
    setOps((data || []).map((o: PartOp, i: number) => ({
      operation_number: o.operation_number,
      operation_name: o.operation_name,
      resource_id: o.resource_id,
      setup_time_hours: Number(o.setup_time_hours) || 0,
      cycle_time_seconds: Number(o.cycle_time_seconds) || 0,
      sequence_order: i + 1,
    })));
    setBom((bomRows || []) as any);
    if (prevJob?.development_time_hours) {
      setForm(f => ({ ...f, part_id: partId, development_time_hours: Number(prevJob.development_time_hours) }));
    }
  };

  const updateOp = (idx: number, patch: Partial<JobOp>) => {
    setOps(prev => prev.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
  };

  const totalsByOp = useMemo(
    () => ops.map(o => {
      const res = resources.find(r => r.id === o.resource_id);
      if (res?.resource_category === 'Subcontractor') {
        const days = res?.lead_time_days ?? ((o.setup_time_hours || 0) / 24);
        return Number(days) * 24;
      }
      return calcTotal(o, form.quantity);
    }),
    [ops, form.quantity, resources]
  );
  const grandTotal = useMemo(
    () => Number(form.development_time_hours || 0) + totalsByOp.reduce((a, b) => a + b, 0),
    [totalsByOp, form.development_time_hours]
  );

  const resourceName = (rid: string | null) =>
    resources.find(r => r.id === rid)?.resource_name || (rid ? '— deleted —' : '—');

  const save = async () => {
    if (!form.job_number.trim()) return toast.error('Job number is required');
    if (!form.part_id) return toast.error('Part is required');
    if (!form.due_date) return toast.error('Due date is required');
    if (!form.quantity || form.quantity <= 0) return toast.error('Quantity must be > 0');
    for (const op of ops) {
      if (!op.resource_id) return toast.error(`Op #${op.operation_number} needs a resource`);
    }

    setSaving(true);
    const payload = {
      job_number: form.job_number.trim(),
      part_id: form.part_id,
      quantity: form.quantity,
      earliest_start_date: form.planned_start ? format(form.planned_start, 'yyyy-MM-dd') : null,
      due_date: format(form.due_date, 'yyyy-MM-dd'),
      priority: form.priority,
      status: form.status,
      development_time_hours: form.development_time_hours || 0,
      dev_person_id: form.dev_person_id || null,
      notes: form.notes.trim() || null,
    };

    const selectedPart = parts.find(p => p.id === form.part_id);
    const isAssembly = isNew && selectedPart?.part_type === 'Assembly' && bom.length > 0;

    let jobId = id;
    if (isNew) {
      const { data, error } = await supabase.from('jobs').insert({
        ...payload,
        job_level: isAssembly ? 'Parent Assembly' : 'Single Job',
      } as any).select().single();
      if (error) { setSaving(false); return toast.error(error.message); }
      jobId = data.id;
    } else {
      const { error } = await supabase.from('jobs').update(payload).eq('id', id!);
      if (error) { setSaving(false); return toast.error(error.message); }
      // Replace operations for simplicity
      await supabase.from('job_operations').delete().eq('job_id', id!);
    }

    if (ops.length > 0 && jobId) {
      const opsPayload = ops.map((o, i) => ({
        job_id: jobId,
        operation_number: o.operation_number,
        operation_name: o.operation_name,
        resource_id: o.resource_id,
        setup_time_hours: o.setup_time_hours || 0,
        cycle_time_seconds: o.cycle_time_seconds || 0,
        total_time_hours: calcTotal(o, form.quantity),
        sequence_order: i + 1,
        notes: o.notes || null,
      }));
      const { error } = await supabase.from('job_operations').insert(opsPayload);
      if (error) { setSaving(false); return toast.error(error.message); }
    }

    // Generate subcomponent jobs for an assembly
    let childCount = 0;
    if (isAssembly && jobId) {
      // Compute child due date: 2 working days before the parent due date.
      const parentDue = form.due_date!;
      const childDue = new Date(parentDue);
      childDue.setDate(childDue.getDate() - 2);

      // Find current max job number to keep auto-increment consistent
      const { data: allJobs } = await supabase.from('jobs').select('job_number');
      let maxN = 0;
      (allJobs || []).forEach((j: any) => {
        const m = String(j.job_number || '').match(/(\d+)/);
        if (m) { const n = parseInt(m[1], 10); if (n > maxN) maxN = n; }
      });

      for (const c of bom) {
        if (!c.component) continue;
        maxN += 1;
        const childJobNumber = String(maxN).padStart(3, '0');
        const childQty = Math.ceil(Number(c.quantity_per_assembly || 0) * form.quantity);
        const { data: childJob, error: cErr } = await supabase.from('jobs').insert({
          job_number: childJobNumber,
          part_id: c.component_part_id,
          quantity: childQty,
          due_date: format(childDue, 'yyyy-MM-dd'),
          earliest_start_date: form.planned_start ? format(form.planned_start, 'yyyy-MM-dd') : null,
          priority: form.priority,
          status: 'Planned',
          development_time_hours: 0,
          notes: `Auto-created for assembly ${form.job_number}`,
          parent_job_id: jobId,
          job_level: 'Subcomponent',
        } as any).select().single();
        if (cErr) { toast.error(`Child job for ${c.component.part_number}: ${cErr.message}`); continue; }

        // Copy the child part's routing into job_operations
        const { data: childOps } = await supabase.from('part_operations')
          .select('*').eq('part_id', c.component_part_id).order('operation_number');
        if (childOps && childOps.length) {
          const childOpsPayload = childOps.map((o: any, i: number) => ({
            job_id: childJob.id,
            operation_number: o.operation_number,
            operation_name: o.operation_name,
            resource_id: o.resource_id,
            setup_time_hours: Number(o.setup_time_hours) || 0,
            cycle_time_seconds: Number(o.cycle_time_seconds) || 0,
            total_time_hours: Number(o.setup_time_hours || 0) + (Number(o.cycle_time_seconds || 0) * childQty) / 3600,
            sequence_order: i + 1,
            notes: o.notes || null,
          }));
          await supabase.from('job_operations').insert(childOpsPayload);
        }
        childCount += 1;
      }
    }

    setSaving(false);
    toast.success(
      isNew
        ? (childCount > 0 ? `Assembly job created + ${childCount} subcomponent job(s)` : 'Job created')
        : 'Job updated'
    );
    navigate('/npi/capacity-planner-mvp/jobs-mvp');
  };

  if (loading) {
    return (
      <AppLayout title="Job" showBackButton backTo="/npi/capacity-planner-mvp/jobs-mvp">
        <main className="container mx-auto px-4 py-8 text-muted-foreground">Loading…</main>
      </AppLayout>
    );
  }

  const selectedPart = parts.find(p => p.id === form.part_id);

  return (
    <AppLayout title={isNew ? 'New job' : form.job_number || 'Job'}
      subtitle="Schedule a job from a Part Library template"
      showBackButton backTo="/npi/capacity-planner-mvp/jobs-mvp">
      <main className="container mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader><CardTitle>Job details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Job number *</Label>
                <Input value={form.job_number} readOnly={isNew}
                  onChange={(e) => setForm({ ...form, job_number: e.target.value })} />
                {isNew && (
                  <p className="text-xs text-muted-foreground mt-1">Auto-assigned from sequence</p>
                )}
              </div>
              <div>
                <Label>Part *</Label>
                <Select value={form.part_id} onValueChange={onPartChange} disabled={!isNew}>
                  <SelectTrigger>
                    <SelectValue placeholder={parts.length ? 'Select a part' : 'No parts in library'} />
                  </SelectTrigger>
                  <SelectContent>
                    {parts.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.part_number}{p.revision ? ` (Rev ${p.revision})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isNew && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Part cannot be changed after creation.
                  </p>
                )}
              </div>
              <div>
                <Label>Quantity *</Label>
                <Input type="number" min={1} value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Start date (earliest)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline"
                      className={cn('w-full justify-start text-left font-normal',
                        !form.planned_start && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.planned_start ? format(form.planned_start, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.planned_start || undefined}
                      onSelect={(d) => setForm({ ...form, planned_start: d || null })}
                      initialFocus className={cn('p-3 pointer-events-auto')} />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground mt-1">Scheduler will not place any operation before this date. For assemblies, subcomponents inherit this unless they have their own later date.</p>
              </div>
              <div>
                <Label>Due date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline"
                      className={cn('w-full justify-start text-left font-normal',
                        !form.due_date && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.due_date ? format(form.due_date, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.due_date || undefined}
                      onSelect={(d) => setForm({ ...form, due_date: d || null })}
                      initialFocus className={cn('p-3 pointer-events-auto')} />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Development time ({setupLabel})</Label>
                <Input type="number" min={0} step={setupUnit === 'minutes' ? 1 : 0.25}
                  value={setupToDisplay(form.development_time_hours)}
                  onChange={(e) => setForm({ ...form, development_time_hours: setupFromDisplay(parseFloat(e.target.value) || 0) })} />
                <p className="text-xs text-muted-foreground mt-1">Runs before Op 10. Set 0 to skip.</p>
              </div>
              <div>
                <Label>Developer (person)</Label>
                <Select
                  value={form.dev_person_id || 'none'}
                  onValueChange={(v) => setForm({ ...form, dev_person_id: v === 'none' ? null : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {resources.filter(r => (r.resource_category || '').toLowerCase() === 'person').map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.resource_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Who runs the development. The Gantt warns if this person is double-booked.</p>
              </div>
              <div className="md:col-span-2">
                <Label>Notes</Label>
                <Textarea rows={2} value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
          </CardContent>
        </Card>

        {isNew && selectedPart?.part_type === 'Assembly' && (
          <Card>
            <CardHeader>
              <CardTitle>
                Subcomponent jobs
                <Badge variant="outline" className="ml-2 bg-violet-500/10 text-violet-700 border-violet-500/30">
                  Assembly
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bom.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  This assembly has no subcomponents in the Part Library yet. Add them in the part page.
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-2">
                    These linked subcomponent jobs will be auto-created when you save. Each child uses its own Part Library routing and a due date 2 days before this assembly's due.
                  </p>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Component</TableHead>
                          <TableHead>Rev</TableHead>
                          <TableHead className="text-right">Qty per assy</TableHead>
                          <TableHead className="text-right">Qty required</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bom.map((c, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{c.component?.part_number || '—'}</TableCell>
                            <TableCell>{c.component?.revision || '—'}</TableCell>
                            <TableCell className="text-right">{c.quantity_per_assembly}</TableCell>
                            <TableCell className="text-right font-medium">
                              {Math.ceil(Number(c.quantity_per_assembly || 0) * (form.quantity || 0))}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{c.notes || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>
              Routing ({ops.length} operations)
              {selectedPart && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  inherited from {selectedPart.part_number}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ops.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {form.part_id ? 'Selected part has no operations defined.' : 'Select a part to load its routing.'}
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Op #</TableHead>
                      <TableHead>Operation</TableHead>
                      <TableHead>Resource (override)</TableHead>
                      <TableHead className="text-right">Setup ({setupLabel})</TableHead>
                      <TableHead className="text-right">Cycle ({cycleLabel}/pc)</TableHead>
                      <TableHead className="text-right">Total (h) = setup + cycle × {form.quantity || 0} pcs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.development_time_hours > 0 && (
                      <TableRow className="bg-muted/30">
                        <TableCell><Badge variant="outline">Dev</Badge></TableCell>
                        <TableCell colSpan={2} className="italic">Development time</TableCell>
                        <TableCell className="text-right">{setupToDisplay(form.development_time_hours)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">—</TableCell>
                        <TableCell className="text-right font-medium">{form.development_time_hours.toFixed(2)}</TableCell>
                      </TableRow>
                    )}
                    {ops.map((op, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{op.operation_number}</TableCell>
                        <TableCell>{op.operation_name}</TableCell>
                        <TableCell>
                          <Select value={op.resource_id || ''}
                            onValueChange={(v) => updateOp(i, { resource_id: v })}>
                            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Pick resource" /></SelectTrigger>
                            <SelectContent>
                              {resources.map(r => (
                                <SelectItem key={r.id} value={r.id}>
                                  {r.resource_name} <span className="text-muted-foreground">({r.resource_type})</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        {(() => {
                          const res = resources.find(r => r.id === op.resource_id);
                          const isSubcon = res?.resource_category === 'Subcontractor';
                          if (isSubcon) {
                            const days = res?.lead_time_days ?? ((op.setup_time_hours || 0) / 24);
                            return (
                              <>
                                <TableCell className="text-right">
                                  <span className="italic text-muted-foreground">
                                    {Number(days).toFixed(0)}d lead
                                  </span>
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">—</TableCell>
                              </>
                            );
                          }
                          return (
                            <>
                              <TableCell className="text-right">
                                <Input type="number" min={0} step={setupUnit === 'minutes' ? 1 : 0.1}
                                  className="w-[90px] ml-auto text-right"
                                  value={setupToDisplay(op.setup_time_hours)}
                                  onChange={(e) => updateOp(i, { setup_time_hours: setupFromDisplay(parseFloat(e.target.value) || 0) })} />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input type="number" min={0} step={cycleUnit === 'minutes' ? 0.1 : 1}
                                  className="w-[100px] ml-auto text-right"
                                  value={cycleToDisplay(op.cycle_time_seconds)}
                                  onChange={(e) => updateOp(i, { cycle_time_seconds: cycleFromDisplay(parseFloat(e.target.value) || 0) })} />
                              </TableCell>
                            </>
                          );
                        })()}
                        <TableCell className="text-right font-medium">
                          {totalsByOp[i].toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50">
                      <TableCell colSpan={5} className="text-right font-semibold">Grand total</TableCell>
                      <TableCell className="text-right font-semibold">{grandTotal.toFixed(2)} h</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <p className="text-xs text-muted-foreground p-3">
                  Overrides apply to this job only and do not modify the Part Library template.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => navigate('/npi/capacity-planner-mvp/jobs-mvp')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Button onClick={save} disabled={saving}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Saving…' : isNew ? 'Create job' : 'Save changes'}
          </Button>
        </div>
      </main>
    </AppLayout>
  );
}
