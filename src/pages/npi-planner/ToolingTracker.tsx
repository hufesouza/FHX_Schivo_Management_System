import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useNPIPlanning } from '@/hooks/useNPIPlanning';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

type CatalogTool = {
  id?: string;
  tool_code?: string | null;
  tooling_description: string;
  supplier?: string | null;
  supplier_id?: string | null;
  default_unit_cost?: number | null;
  default_lead_time_days?: number | null;
  notes?: string | null;
};

const EMPTY: CatalogTool = {
  tool_code: '',
  tooling_description: '',
  supplier: '',
  supplier_id: null,
  default_unit_cost: 0,
  default_lead_time_days: null,
  notes: '',
};

export default function ToolingTracker() {
  const { toolingCatalog, loading, reload } = useNPIPlanning();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CatalogTool>(EMPTY);

  useEffect(() => {
    supabase.from('npi_suppliers').select('*').order('supplier_name').then(({ data }) => setSuppliers(data || []));
  }, []);

  const filtered = useMemo(
    () =>
      toolingCatalog.filter((t: any) =>
        !search ||
        `${t.tooling_description} ${t.tool_code || ''} ${t.supplier || ''}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [toolingCatalog, search],
  );

  const startNew = () => { setForm(EMPTY); setOpen(true); };
  const startEdit = (t: any) => { setForm({ ...t }); setOpen(true); };

  const save = async () => {
    if (!form.tooling_description?.trim()) return toast.error('Description is required');
    const sup = suppliers.find(s => s.id === form.supplier_id);
    const payload: any = {
      tool_code: form.tool_code || null,
      tooling_description: form.tooling_description.trim(),
      supplier: sup?.supplier_name || form.supplier || null,
      supplier_id: form.supplier_id || null,
      default_unit_cost: Number(form.default_unit_cost) || 0,
      default_lead_time_days: form.default_lead_time_days ? Number(form.default_lead_time_days) : null,
      notes: form.notes || null,
    };
    const { error } = form.id
      ? await supabase.from('npi_tooling_catalog').update(payload).eq('id', form.id)
      : await supabase.from('npi_tooling_catalog').insert(payload);
    if (error) return toast.error(error.message);
    toast.success(form.id ? 'Tool updated' : 'Tool added to catalog');
    setOpen(false);
    setForm(EMPTY);
    reload();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this tool from the catalog? It will no longer be available to link to parts.')) return;
    const { error } = await supabase.from('npi_tooling_catalog').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Removed from catalog');
    reload();
  };

  if (loading) return (
    <AppLayout title="Tooling Catalog" showBackButton backTo="/npi/capacity-planner">
      <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" /></div>
    </AppLayout>
  );

  return (
    <AppLayout
      title="Tooling Catalog"
      subtitle="Resource library — set up tools once, reuse across many part numbers"
      showBackButton
      backTo="/npi/capacity-planner"
    >
      <main className="container mx-auto px-4 py-8 space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Catalog ({filtered.length})</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                No part links or status here. Link a tool to a part on the Tooling Status page.
              </p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button onClick={startNew}><Plus className="h-4 w-4 mr-2" />Add tool</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{form.id ? 'Edit tool' : 'New tool'}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Tool code</Label>
                      <Input value={form.tool_code || ''} onChange={e => setForm({ ...form, tool_code: e.target.value })} />
                    </div>
                    <div>
                      <Label>Default lead time (days)</Label>
                      <Input
                        type="number"
                        value={form.default_lead_time_days ?? ''}
                        onChange={e => setForm({ ...form, default_lead_time_days: e.target.value ? Number(e.target.value) : null })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Description *</Label>
                    <Input value={form.tooling_description} onChange={e => setForm({ ...form, tooling_description: e.target.value })} />
                  </div>
                  <div>
                    <Label>Supplier</Label>
                    <Select value={form.supplier_id || 'none'} onValueChange={v => setForm({ ...form, supplier_id: v === 'none' ? null : v })}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— None —</SelectItem>
                        {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.supplier_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Default unit cost (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.default_unit_cost ?? 0}
                      onChange={e => setForm({ ...form, default_unit_cost: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea rows={3} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={save}>{form.id ? 'Save' : 'Add'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Search description, code, supplier" value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" />
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Default cost</TableHead>
                    <TableHead className="text-right">Lead (d)</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No tools in catalog yet.</TableCell></TableRow>
                  ) : filtered.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.tool_code || '-'}</TableCell>
                      <TableCell className="font-medium">
                        {t.tooling_description}
                        {t.notes ? <div className="text-xs text-muted-foreground mt-0.5">{t.notes}</div> : null}
                      </TableCell>
                      <TableCell>{t.supplier || '-'}</TableCell>
                      <TableCell className="text-right">{t.default_unit_cost ? `€${Number(t.default_unit_cost).toFixed(2)}` : '-'}</TableCell>
                      <TableCell className="text-right">{t.default_lead_time_days ?? '-'}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button size="icon" variant="ghost" onClick={() => startEdit(t)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => del(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </AppLayout>
  );
}
