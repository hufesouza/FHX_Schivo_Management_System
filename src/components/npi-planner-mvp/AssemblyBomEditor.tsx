import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type PartLite = { id: string; part_number: string; revision: string | null; description: string | null; part_type: string };
type BomRow = {
  id: string;
  component_part_id: string;
  quantity_per_assembly: number;
  notes: string | null;
  component: PartLite | null;
};

export function AssemblyBomEditor({ assemblyPartId }: { assemblyPartId: string }) {
  const [rows, setRows] = useState<BomRow[]>([]);
  const [allParts, setAllParts] = useState<PartLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pickId, setPickId] = useState('');
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [b, p] = await Promise.all([
      supabase.from('part_bom_components')
        .select('id, component_part_id, quantity_per_assembly, notes, component:parts!part_bom_components_component_part_id_fkey(id, part_number, revision, description, part_type)')
        .eq('assembly_part_id', assemblyPartId)
        .order('created_at'),
      supabase.from('parts').select('id, part_number, revision, description, part_type').order('part_number'),
    ]);
    setLoading(false);
    if (b.error) return toast.error(b.error.message);
    setRows((b.data || []) as any);
    setAllParts((p.data || []) as any);
  };

  useEffect(() => { load(); }, [assemblyPartId]);

  const usedIds = new Set(rows.map(r => r.component_part_id));
  const filteredPicks = allParts.filter(p =>
    p.id !== assemblyPartId && !usedIds.has(p.id) &&
    (!search.trim() ||
      p.part_number.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(search.toLowerCase()))
  );

  const openAdd = () => {
    setSearch(''); setPickId(''); setQty(1); setNotes('');
    setDialogOpen(true);
  };

  const addComponent = async () => {
    if (!pickId) return toast.error('Pick a part');
    if (!qty || qty <= 0) return toast.error('Quantity must be > 0');
    setSaving(true);
    const { error } = await supabase.from('part_bom_components').insert({
      assembly_part_id: assemblyPartId,
      component_part_id: pickId,
      quantity_per_assembly: qty,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Component added');
    setDialogOpen(false);
    load();
  };

  const updateQty = async (id: string, q: number) => {
    if (!q || q <= 0) return;
    const { error } = await supabase.from('part_bom_components')
      .update({ quantity_per_assembly: q }).eq('id', id);
    if (error) return toast.error(error.message);
    setRows(prev => prev.map(r => r.id === id ? { ...r, quantity_per_assembly: q } : r));
  };

  const removeRow = async (id: string) => {
    const { error } = await supabase.from('part_bom_components').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Component removed');
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle>Subcomponents ({rows.length})</CardTitle>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add component</Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component PN</TableHead>
                <TableHead>Rev</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[120px] text-right">Qty / assy</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-[60px] text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                  No subcomponents yet. Add existing parts from the library.
                </TableCell></TableRow>
              ) : rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.component?.part_number || '—'}</TableCell>
                  <TableCell>{r.component?.revision || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.component?.description || '—'}</TableCell>
                  <TableCell className="text-right">
                    <Input type="number" min={1} step={1}
                      className="w-20 ml-auto text-right"
                      value={r.quantity_per_assembly}
                      onChange={e => updateQty(r.id, parseFloat(e.target.value) || 0)} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.notes || '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => removeRow(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add subcomponent</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Search part library</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search part number or description…"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Component *</Label>
              <Select value={pickId} onValueChange={setPickId}>
                <SelectTrigger><SelectValue placeholder="Pick a part" /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {filteredPicks.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No matches.</div>
                  ) : filteredPicks.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.part_number}{p.revision ? ` (Rev ${p.revision})` : ''}
                      {p.part_type === 'Assembly' ? ' — Assembly' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Only existing parts from the library can be added. Cannot include itself.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Qty per assembly *</Label>
                <Input type="number" min={1} step={1} value={qty}
                  onChange={e => setQty(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label>Notes</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={addComponent} disabled={saving}>
              {saving ? 'Adding…' : 'Add component'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
