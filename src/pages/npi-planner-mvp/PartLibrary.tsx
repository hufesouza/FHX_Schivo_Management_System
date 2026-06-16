import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Search, Pencil, Trash2, Copy, Upload, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

type Part = {
  id: string;
  part_number: string;
  revision: string | null;
  description: string | null;
  customer: string | null;
  project: string | null;
  part_type: 'Single Part' | 'Assembly';
  updated_at: string;
  op_count?: number;
};

export default function PartLibrary() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ part_number: '', revision: '', description: '', customer: '', project: '' });
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [dupOpen, setDupOpen] = useState(false);
  const [dupSource, setDupSource] = useState<Part | null>(null);
  const [dupForm, setDupForm] = useState({ part_number: '', revision: '' });
  const [dupSaving, setDupSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('parts')
      .select('*, part_operations(id)')
      .order('updated_at', { ascending: false });
    setLoading(false);
    if (error) return toast.error(error.message);
    setRows((data || []).map((p: any) => ({ ...p, op_count: p.part_operations?.length || 0 })));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      r.part_number.toLowerCase().includes(term) ||
      (r.description || '').toLowerCase().includes(term) ||
      (r.customer || '').toLowerCase().includes(term) ||
      (r.project || '').toLowerCase().includes(term)
    );
  }, [rows, search]);

  const openCreate = () => { setForm({ part_number: '', revision: '', description: '', customer: '', project: '' }); setDialogOpen(true); };

  const handleDrawingUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setExtracting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data, error } = await supabase.functions.invoke('extract-part-from-drawing', { body: fd });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setForm(prev => ({
        ...prev,
        part_number: data?.part_number || prev.part_number,
        revision: data?.revision || prev.revision,
        description: data?.description || prev.description,
      }));
      toast.success('Drawing details extracted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to extract drawing');
    } finally {
      setExtracting(false);
    }
  };

  const createPart = async () => {
    if (!form.part_number.trim()) return toast.error('Part number is required');
    setSaving(true);
    const { data, error } = await supabase.from('parts').insert({
      part_number: form.part_number.trim(),
      revision: form.revision.trim() || null,
      description: form.description.trim() || null,
      customer: form.customer.trim() || null,
      project: form.project.trim() || null,
    }).select().single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Part created');
    setDialogOpen(false);
    navigate(`/npi/capacity-planner-mvp/part-library/${data.id}`);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('parts').delete().eq('id', deleteId);
    if (error) return toast.error(error.message);
    toast.success('Part deleted');
    setDeleteId(null);
    load();
  };

  const openDuplicate = (source: Part) => {
    setDupSource(source);
    setDupForm({ part_number: source.part_number + '-COPY', revision: source.revision || '' });
    setDupOpen(true);
  };

  const doDuplicate = async () => {
    if (!dupSource) return;
    const pn = dupForm.part_number.trim();
    const rev = dupForm.revision.trim() || null;
    if (!pn) return toast.error('Part number is required');
    setDupSaving(true);

    // Check uniqueness
    const { data: existing } = await supabase.from('parts')
      .select('id')
      .eq('part_number', pn)
      .eq('revision', rev || '')
      .maybeSingle();
    if (existing) {
      setDupSaving(false);
      return toast.error('A part with this number and revision already exists');
    }

    // Create new part
    const { data: newPart, error: partErr } = await supabase.from('parts').insert({
      part_number: pn,
      revision: rev,
      description: dupSource.description,
      customer: dupSource.customer,
      project: dupSource.project,
    }).select().single();
    if (partErr) {
      setDupSaving(false);
      return toast.error(partErr.message);
    }

    // Copy operations
    const { data: srcOps } = await supabase.from('part_operations')
      .select('*')
      .eq('part_id', dupSource.id);
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
    load();
  };

  return (
    <AppLayout title="Part Library" subtitle="Reusable part templates and routings"
      showBackButton backTo="/npi/capacity-planner-mvp">
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Parts</CardTitle>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New part</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by part number, description, customer or project…"
                value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Revision</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead className="text-right">Operations</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="w-[160px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {rows.length === 0 ? 'No parts yet. Create your first one.' : 'No matches.'}
                    </TableCell></TableRow>
                  ) : filtered.map(r => (
                    <TableRow key={r.id} className="cursor-pointer"
                      onClick={() => navigate(`/npi/capacity-planner-mvp/part-library/${r.id}`)}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{r.part_number}</span>
                          {r.part_type === 'Assembly' && (
                            <Badge variant="outline" className="bg-violet-500/10 text-violet-700 border-violet-500/30 text-[10px]">Assembly</Badge>
                          )}
                        </div>
                        {r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}
                      </TableCell>
                      <TableCell>{r.revision || '—'}</TableCell>
                      <TableCell>{r.customer || '—'}</TableCell>
                      <TableCell>{r.project || '—'}</TableCell>
                      <TableCell className="text-right">{r.op_count}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(r.updated_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon"
                          onClick={() => navigate(`/npi/capacity-planner-mvp/part-library/${r.id}`)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDuplicate(r)}>
                          <Copy className="h-4 w-4" />
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New part</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border border-dashed p-3 bg-muted/30">
              <Label className="text-xs text-muted-foreground">Auto-fill from drawing (PDF or image)</Label>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  id="dwg-upload"
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={handleDrawingUpload}
                  disabled={extracting}
                  className="text-xs"
                />
                {extracting && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                <Upload className="inline h-3 w-3 mr-1" />
                Extracts Part Number, Description and Revision from the title block.
              </p>
            </div>
            <div>
              <Label>Part number *</Label>
              <Input value={form.part_number}
                onChange={(e) => setForm({ ...form, part_number: e.target.value })} />
            </div>
            <div>
              <Label>Revision</Label>
              <Input value={form.revision}
                onChange={(e) => setForm({ ...form, revision: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Customer</Label>
              <Input value={form.customer}
                onChange={(e) => setForm({ ...form, customer: e.target.value })} />
            </div>
            <div>
              <Label>Project</Label>
              <Input value={form.project}
                onChange={(e) => setForm({ ...form, project: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={createPart} disabled={saving}>
              {saving ? 'Creating…' : 'Create & open'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dupOpen} onOpenChange={setDupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate part</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Duplicating <strong>{dupSource?.part_number}</strong> ({dupSource?.op_count || 0} ops).
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

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete part?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the part and all its operations.
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
