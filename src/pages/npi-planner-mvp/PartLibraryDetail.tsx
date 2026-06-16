import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Save, ArrowUp, ArrowDown, Copy, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AssemblyBomEditor } from '@/components/npi-planner-mvp/AssemblyBomEditor';

const FALLBACK_OP_NAMES = ['Turning', 'Swiss Turning', 'Milling', 'Inspection', 'Deburr', 'Assembly', 'Laser', 'Wash', 'Subcon', 'Other'];

type Resource = {
  id: string;
  resource_name: string;
  resource_type: string;
  resource_category?: string | null;
  lead_time_days?: number | null;
};
type Operation = {
  id: string;
  part_id: string;
  operation_number: number;
  operation_name: string;
  resource_id: string | null;
  setup_time_hours: number;
  cycle_time_seconds: number;
  notes: string | null;
};
type Part = {
  id: string;
  part_number: string;
  revision: string | null;
  description: string | null;
  customer: string | null;
  project: string | null;
  part_type: 'Single Part' | 'Assembly';
};

const blankOp = (nextNo: number): Omit<Operation, 'id' | 'part_id'> => ({
  operation_number: nextNo,
  operation_name: 'Turning',
  resource_id: null,
  setup_time_hours: 0,
  cycle_time_seconds: 0,
  notes: '',
});

export default function PartLibraryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [part, setPart] = useState<Part | null>(null);
  const [ops, setOps] = useState<Operation[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [opNames, setOpNames] = useState<string[]>(FALLBACK_OP_NAMES);
  const [loading, setLoading] = useState(true);
  const [savingHeader, setSavingHeader] = useState(false);

  const [opDialog, setOpDialog] = useState(false);
  const [editingOp, setEditingOp] = useState<Operation | null>(null);
  const [opForm, setOpForm] = useState(blankOp(10));
  const [savingOp, setSavingOp] = useState(false);
  const [deleteOpId, setDeleteOpId] = useState<string | null>(null);

  const [dupOpen, setDupOpen] = useState(false);
  const [dupForm, setDupForm] = useState({ part_number: '', revision: '' });
  const [dupSaving, setDupSaving] = useState(false);

  // Display units (persisted). DB always stores setup in HOURS and cycle in SECONDS.
  const [setupUnit, setSetupUnit] = useState<'minutes' | 'hours'>(
    () => (localStorage.getItem('pl_setupUnit') as 'minutes' | 'hours') || 'minutes'
  );
  const [cycleUnit, setCycleUnit] = useState<'seconds' | 'minutes'>(
    () => (localStorage.getItem('pl_cycleUnit') as 'seconds' | 'minutes') || 'minutes'
  );
  useEffect(() => { localStorage.setItem('pl_setupUnit', setupUnit); }, [setupUnit]);
  useEffect(() => { localStorage.setItem('pl_cycleUnit', cycleUnit); }, [cycleUnit]);

  // Conversions
  const setupToDisplay = (h: number) => setupUnit === 'minutes' ? h * 60 : h;
  const setupFromDisplay = (v: number) => setupUnit === 'minutes' ? v / 60 : v;
  const cycleToDisplay = (s: number) => cycleUnit === 'minutes' ? s / 60 : s;
  const cycleFromDisplay = (v: number) => cycleUnit === 'minutes' ? v * 60 : v;
  const setupLabel = setupUnit === 'minutes' ? 'min' : 'h';
  const cycleLabel = cycleUnit === 'minutes' ? 'min' : 's';

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [p, o, r, lk] = await Promise.all([
      supabase.from('parts').select('*').eq('id', id).single(),
      supabase.from('part_operations').select('*').eq('part_id', id).order('operation_number'),
      supabase.from('resources').select('id, resource_name, resource_type, resource_category, lead_time_days').eq('status', 'Active').order('resource_name'),
      supabase.from('resource_lookups' as any).select('name,kind').eq('kind', 'type').order('name'),
    ]);
    setLoading(false);
    if (p.error) return toast.error(p.error.message);
    setPart(p.data as Part);
    setOps((o.data || []) as Operation[]);
    setResources((r.data || []) as Resource[]);
    const names = ((lk.data || []) as any[]).map(x => x.name as string).filter(Boolean);
    const merged = Array.from(new Set([...names, ...FALLBACK_OP_NAMES]));
    setOpNames(merged);
  };

  useEffect(() => { load(); }, [id]);

  const saveHeader = async () => {
    if (!part) return;
    if (!part.part_number.trim()) return toast.error('Part number is required');
    setSavingHeader(true);
    const { error } = await supabase.from('parts').update({
      part_number: part.part_number.trim(),
      revision: part.revision?.trim() || null,
      description: part.description?.trim() || null,
      customer: part.customer?.trim() || null,
      project: part.project?.trim() || null,
      part_type: part.part_type,
    } as any).eq('id', part.id);
    setSavingHeader(false);
    if (error) return toast.error(error.message);
    toast.success('Header saved');
  };

  const openDuplicate = () => {
    if (!part) return;
    setDupForm({ part_number: part.part_number + '-COPY', revision: part.revision || '' });
    setDupOpen(true);
  };

  const doDuplicate = async () => {
    if (!part) return;
    const pn = dupForm.part_number.trim();
    const rev = dupForm.revision.trim() || null;
    if (!pn) return toast.error('Part number is required');
    setDupSaving(true);

    const { data: existing } = await supabase.from('parts')
      .select('id')
      .eq('part_number', pn)
      .eq('revision', rev || '')
      .maybeSingle();
    if (existing) {
      setDupSaving(false);
      return toast.error('A part with this number and revision already exists');
    }

    const { data: newPart, error: partErr } = await supabase.from('parts').insert({
      part_number: pn,
      revision: rev,
      description: part.description,
      customer: part.customer,
      project: part.project,
    }).select().single();
    if (partErr) {
      setDupSaving(false);
      return toast.error(partErr.message);
    }

    const { data: srcOps } = await supabase.from('part_operations')
      .select('*')
      .eq('part_id', part.id);
    if (srcOps && srcOps.length > 0) {
      const inserts = srcOps.map((op: any) => ({
        part_id: newPart.id,
        operation_number: op.operation_number,
        operation_name: op.operation_name,
        resource_id: op.resource_id,
        setup_time_hours: op.setup_time_hours,
        cycle_time_seconds: op.cycle_time_seconds,
        notes: op.notes,
      }));
      const { error: opErr } = await supabase.from('part_operations').insert(inserts);
      if (opErr) toast.error('Part duplicated but operations failed: ' + opErr.message);
    }

    setDupSaving(false);
    setDupOpen(false);
    toast.success('Part duplicated');
    navigate(`/npi/capacity-planner-mvp/part-library/${newPart.id}`);
  };

  const openAddOp = () => {
    const nextNo = ops.length === 0 ? 10 : Math.max(...ops.map(o => o.operation_number)) + 10;
    setEditingOp(null);
    setOpForm(blankOp(nextNo));
    setOpDialog(true);
  };

  const openEditOp = (op: Operation) => {
    setEditingOp(op);
    setOpForm({
      operation_number: op.operation_number,
      operation_name: op.operation_name,
      resource_id: op.resource_id,
      setup_time_hours: op.setup_time_hours,
      cycle_time_seconds: op.cycle_time_seconds,
      notes: op.notes || '',
    });
    setOpDialog(true);
  };

  const saveOp = async () => {
    if (!part) return;
    if (!opForm.operation_name.trim()) return toast.error('Operation name is required');
    if (!opForm.resource_id) return toast.error('Resource is required');
    if (!Number.isInteger(opForm.operation_number) || opForm.operation_number <= 0)
      return toast.error('Operation number must be a positive integer');
    // unique within part
    const conflict = ops.find(o =>
      o.operation_number === opForm.operation_number && o.id !== editingOp?.id);
    if (conflict) return toast.error(`Operation #${opForm.operation_number} already exists`);

    setSavingOp(true);
    const chosen = resources.find(r => r.id === opForm.resource_id);
    const isSubcon = chosen?.resource_category === 'Subcontractor';
    const leadDays = chosen?.lead_time_days || 0;
    const payload = {
      part_id: part.id,
      operation_number: opForm.operation_number,
      operation_name: opForm.operation_name.trim(),
      resource_id: opForm.resource_id,
      // For subcon resources, model lead time as setup hours (days × 24) so the
      // scheduler / totals already in place include the wait window. Cycle = 0.
      setup_time_hours: isSubcon ? leadDays * 24 : (opForm.setup_time_hours || 0),
      cycle_time_seconds: isSubcon ? 0 : (opForm.cycle_time_seconds || 0),
      notes: opForm.notes?.trim() || null,
    };
    const { error } = editingOp
      ? await supabase.from('part_operations').update(payload).eq('id', editingOp.id)
      : await supabase.from('part_operations').insert(payload);
    if (error) { setSavingOp(false); return toast.error(error.message); }

    // Cascade resource/name/time changes to existing open jobs of this part
    // so the Gantt and Scheduling Engine reflect part-library edits.
    // Sync regardless of lock status — a part-definition change is authoritative.
    let syncedCount = 0;
    if (editingOp) {
      const { data: openJobs } = await supabase
        .from('jobs').select('id').eq('part_id', part.id).not('status', 'in', '(Completed,Cancelled)');
      const jobIds = (openJobs || []).map((j: any) => j.id);
      if (jobIds.length) {
        const { data: updated, error: syncErr } = await supabase.from('job_operations').update({
          resource_id: payload.resource_id,
          operation_name: payload.operation_name,
          setup_time_hours: payload.setup_time_hours,
          cycle_time_seconds: payload.cycle_time_seconds,
        })
          .in('job_id', jobIds)
          .eq('operation_number', payload.operation_number)
          .select('id');
        if (syncErr) console.error('Sync error:', syncErr);
        syncedCount = (updated || []).length;
      }
    }

    setSavingOp(false);
    toast.success(
      editingOp
        ? `Operation updated${syncedCount ? ` — synced to ${syncedCount} open job op(s). Re-run schedule to reposition.` : ''}`
        : 'Operation added'
    );

    setOpDialog(false);
    load();
  };

  const deleteOp = async () => {
    if (!deleteOpId) return;
    const { error } = await supabase.from('part_operations').delete().eq('id', deleteOpId);
    if (error) return toast.error(error.message);
    toast.success('Operation deleted');
    setDeleteOpId(null);
    load();
  };

  const reorder = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= ops.length) return;
    const newOrder = [...ops];
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    await persistOrder(newOrder);
  };

  const persistOrder = async (newOrder: Operation[]) => {
    // Renumber sequentially as 10, 20, 30… Two-pass to avoid unique conflicts.
    const optimistic = newOrder.map((o, idx) => ({ ...o, operation_number: (idx + 1) * 10 }));
    setOps(optimistic);

    // Pass 1: move all to negative temp numbers
    for (const o of newOrder) {
      const { error } = await supabase.from('part_operations')
        .update({ operation_number: -Math.abs(o.operation_number) - 100000 })
        .eq('id', o.id);
      if (error) { toast.error(error.message); return load(); }
    }
    // Pass 2: assign final numbers
    for (let i = 0; i < newOrder.length; i++) {
      const { error } = await supabase.from('part_operations')
        .update({ operation_number: (i + 1) * 10 })
        .eq('id', newOrder[i].id);
      if (error) { toast.error(error.message); return load(); }
    }
    load();
  };

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDrop = async (toIndex: number) => {
    if (dragIndex === null || dragIndex === toIndex) {
      setDragIndex(null); setDragOverIndex(null);
      return;
    }
    const newOrder = [...ops];
    const [moved] = newOrder.splice(dragIndex, 1);
    newOrder.splice(toIndex, 0, moved);
    setDragIndex(null); setDragOverIndex(null);
    await persistOrder(newOrder);
  };


  if (loading || !part) {
    return (
      <AppLayout title="Part Library" showBackButton backTo="/npi/capacity-planner-mvp/part-library">
        <main className="container mx-auto px-4 py-8 text-muted-foreground">Loading…</main>
      </AppLayout>
    );
  }

  const resourceById = (rid: string | null) => resources.find(r => r.id === rid);
  const isSubconResource = (rid: string | null) =>
    resourceById(rid)?.resource_category === 'Subcontractor';
  const resourceName = (rid: string | null) =>
    resourceById(rid)?.resource_name || (rid ? '— deleted —' : '—');
  const selectedResource = resourceById(opForm.resource_id);
  const selectedIsSubcon = selectedResource?.resource_category === 'Subcontractor';
  const selectedLeadDays = selectedResource?.lead_time_days || 0;

  return (
    <AppLayout title={part.part_number} subtitle="Part details and routing"
      showBackButton backTo="/npi/capacity-planner-mvp/part-library">
      <main className="container mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle>Header</CardTitle>
            <Button variant="outline" onClick={openDuplicate}>
              <Copy className="h-4 w-4 mr-1" /> Duplicate
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Part number *</Label>
                <Input value={part.part_number}
                  onChange={(e) => setPart({ ...part, part_number: e.target.value })} />
              </div>
              <div>
                <Label>Revision</Label>
                <Input value={part.revision || ''}
                  onChange={(e) => setPart({ ...part, revision: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={part.description || ''}
                  onChange={(e) => setPart({ ...part, description: e.target.value })} />
              </div>
              <div>
                <Label>Customer</Label>
                <Input value={part.customer || ''}
                  onChange={(e) => setPart({ ...part, customer: e.target.value })} />
              </div>
              <div>
                <Label>Project</Label>
                <Input value={part.project || ''}
                  onChange={(e) => setPart({ ...part, project: e.target.value })} />
              </div>
              <div>
                <Label>Part type</Label>
                <Select value={part.part_type}
                  onValueChange={(v: 'Single Part' | 'Assembly') => setPart({ ...part, part_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single Part">Single Part</SelectItem>
                    <SelectItem value="Assembly">Assembly</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Assemblies can include other parts as subcomponents.
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={saveHeader} disabled={savingHeader}>
                <Save className="h-4 w-4 mr-1" />{savingHeader ? 'Saving…' : 'Save header'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {part.part_type === 'Assembly' && <AssemblyBomEditor assemblyPartId={part.id} />}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle>Routing ({ops.length} operations)</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <Label className="text-xs text-muted-foreground">Setup unit</Label>
                <Select value={setupUnit} onValueChange={(v: 'minutes' | 'hours') => setSetupUnit(v)}>
                  <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Label className="text-xs text-muted-foreground">Cycle unit</Label>
                <Select value={cycleUnit} onValueChange={(v: 'seconds' | 'minutes') => setCycleUnit(v)}>
                  <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="seconds">Seconds</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={openAddOp}><Plus className="h-4 w-4 mr-1" /> Add operation</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[32px]"></TableHead>
                    <TableHead className="w-[80px]">Op #</TableHead>
                    <TableHead>Operation</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead className="text-right">Setup ({setupLabel})</TableHead>
                    <TableHead className="text-right">Cycle ({cycleLabel})</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[180px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ops.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No operations yet. Add the first one to define the routing.
                    </TableCell></TableRow>
                  ) : ops.map((op, i) => (
                    <TableRow
                      key={op.id}
                      draggable
                      onDragStart={(e) => { setDragIndex(i); e.dataTransfer.effectAllowed = 'move'; }}
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverIndex(i); }}
                      onDragLeave={() => setDragOverIndex(prev => prev === i ? null : prev)}
                      onDrop={(e) => { e.preventDefault(); handleDrop(i); }}
                      onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                      className={`${dragIndex === i ? 'opacity-50' : ''} ${dragOverIndex === i && dragIndex !== i ? 'bg-accent/50' : ''}`}
                    >
                      <TableCell className="cursor-grab active:cursor-grabbing text-muted-foreground">
                        <GripVertical className="h-4 w-4" />
                      </TableCell>
                      <TableCell className="font-medium">{op.operation_number}</TableCell>
                      <TableCell>{op.operation_name}</TableCell>
                      <TableCell>{resourceName(op.resource_id)}</TableCell>
                      <TableCell className="text-right">
                        {isSubconResource(op.resource_id)
                          ? <span className="text-muted-foreground italic">{(op.setup_time_hours / 24).toFixed(0)}d lead</span>
                          : setupToDisplay(op.setup_time_hours).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {isSubconResource(op.resource_id)
                          ? <span className="text-muted-foreground">—</span>
                          : cycleToDisplay(op.cycle_time_seconds).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {op.notes || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" disabled={i === 0}
                          onClick={() => reorder(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" disabled={i === ops.length - 1}
                          onClick={() => reorder(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditOp(op)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteOpId(op.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {resources.length === 0 && (
              <p className="text-sm text-muted-foreground mt-3">
                No active resources found. Add one in{' '}
                <button className="underline" onClick={() => navigate('/npi/capacity-planner-mvp/resources')}>
                  Resources
                </button>{' '}
                before creating operations.
              </p>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={opDialog} onOpenChange={setOpDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOp ? 'Edit operation' : 'Add operation'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Operation number *</Label>
                <Input type="number" min={1} step={10}
                  value={opForm.operation_number}
                  onChange={(e) => setOpForm({ ...opForm, operation_number: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Operation name *</Label>
                <Select value={opForm.operation_name}
                  onValueChange={(v) => setOpForm({ ...opForm, operation_name: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {opNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Resource *</Label>
              <Select value={opForm.resource_id || ''}
                onValueChange={(v) => setOpForm({ ...opForm, resource_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select resource" /></SelectTrigger>
                <SelectContent>
                  {resources.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.resource_name} <span className="text-muted-foreground">({r.resource_type})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedIsSubcon ? (
              <div className="rounded-md border bg-muted/30 p-3">
                <Label className="text-xs text-muted-foreground">Lead time (from resource)</Label>
                <div className="text-lg font-semibold">
                  {selectedLeadDays} {selectedLeadDays === 1 ? 'day' : 'days'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Subcontractor operations use the lead time defined on the resource itself.
                  Setup and cycle times do not apply. To change it, edit the resource in Resources.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Setup time ({setupUnit})</Label>
                  <Input type="number" min={0} step={setupUnit === 'minutes' ? 1 : 0.1}
                    value={setupToDisplay(opForm.setup_time_hours)}
                    onChange={(e) => setOpForm({ ...opForm, setup_time_hours: setupFromDisplay(parseFloat(e.target.value) || 0) })} />
                </div>
                <div>
                  <Label>Cycle time ({cycleUnit})</Label>
                  <Input type="number" min={0} step={cycleUnit === 'minutes' ? 0.1 : 1}
                    value={cycleToDisplay(opForm.cycle_time_seconds)}
                    onChange={(e) => setOpForm({ ...opForm, cycle_time_seconds: cycleFromDisplay(parseFloat(e.target.value) || 0) })} />
                </div>
              </div>
            )}
            <div>
              <Label>Notes</Label>
              <Textarea rows={2} value={opForm.notes || ''}
                onChange={(e) => setOpForm({ ...opForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpDialog(false)}>Cancel</Button>
            <Button onClick={saveOp} disabled={savingOp}>
              {savingOp ? 'Saving…' : editingOp ? 'Save changes' : 'Add operation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteOpId} onOpenChange={(o) => !o && setDeleteOpId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete operation?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteOp}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dupOpen} onOpenChange={setDupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate part</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Duplicating <strong>{part?.part_number}</strong> ({ops.length} ops).
            </p>
            <div>
              <Label>New part number *</Label>
              <Input value={dupForm.part_number}
                onChange={(e) => setDupForm({ ...dupForm, part_number: e.target.value })} />
            </div>
            <div>
              <Label>Revision</Label>
              <Input value={dupForm.revision}
                onChange={(e) => setDupForm({ ...dupForm, revision: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDupOpen(false)}>Cancel</Button>
            <Button onClick={doDuplicate} disabled={dupSaving}>
              {dupSaving ? 'Duplicating…' : 'Duplicate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
