import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
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
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  const openCreate = () => { setForm({ part_number: '', revision: '', description: '' }); setDialogOpen(true); };

  const createPart = async () => {
    if (!form.part_number.trim()) return toast.error('Part number is required');
    setSaving(true);
    const { data, error } = await supabase.from('parts').insert({
      part_number: form.part_number.trim(),
      revision: form.revision.trim() || null,
      description: form.description.trim() || null,
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
              <Input placeholder="Search by part number or description…"
                value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Revision</TableHead>
                    <TableHead className="text-right">Operations</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {rows.length === 0 ? 'No parts yet. Create your first one.' : 'No matches.'}
                    </TableCell></TableRow>
                  ) : filtered.map(r => (
                    <TableRow key={r.id} className="cursor-pointer"
                      onClick={() => navigate(`/npi/capacity-planner-mvp/part-library/${r.id}`)}>
                      <TableCell className="font-medium">
                        <div>{r.part_number}</div>
                        {r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}
                      </TableCell>
                      <TableCell>{r.revision || '—'}</TableCell>
                      <TableCell className="text-right">{r.op_count}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(r.updated_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon"
                          onClick={() => navigate(`/npi/capacity-planner-mvp/part-library/${r.id}`)}>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New part</DialogTitle></DialogHeader>
          <div className="space-y-3">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={createPart} disabled={saving}>
              {saving ? 'Creating…' : 'Create & open'}
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
