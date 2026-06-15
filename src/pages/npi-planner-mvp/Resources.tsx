import { useEffect, useMemo, useState } from 'react';
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Pencil, Trash2, Settings2, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Lookup = { id: string; kind: 'category' | 'type'; name: string };

type Resource = {
  id: string;
  resource_name: string;
  resource_type: string;
  resource_category: string;
  available_hours_per_day: number;
  number_of_shifts: number;
  status: 'Active' | 'Inactive';
  supplier_name: string | null;
  lead_time_days: number | null;
  scheduling_mode: 'Exclusive' | 'Parallel';
};

const defaultModeFor = (cat: string): 'Exclusive' | 'Parallel' =>
  (cat === 'Subcontractor' || cat === 'Inspection') ? 'Parallel' : 'Exclusive';

const blankFor = (cat: string, type: string): Omit<Resource, 'id'> => ({
  resource_name: '',
  resource_type: type,
  resource_category: cat,
  available_hours_per_day: 8,
  number_of_shifts: 1,
  status: 'Active',
  supplier_name: null,
  lead_time_days: null,
  scheduling_mode: defaultModeFor(cat),
});

export default function Resources() {
  const [rows, setRows] = useState<Resource[]>([]);
  const [lookups, setLookups] = useState<Lookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [form, setForm] = useState<Omit<Resource, 'id'>>(blankFor('Machining', 'Milling'));
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [manageOpen, setManageOpen] = useState(false);

  const categories = useMemo(() => lookups.filter(l => l.kind === 'category'), [lookups]);
  const types = useMemo(() => lookups.filter(l => l.kind === 'type'), [lookups]);

  const load = async () => {
    setLoading(true);
    const [res, lk] = await Promise.all([
      supabase.from('resources').select('*').order('resource_name', { ascending: true }),
      supabase.from('resource_lookups' as any).select('*').order('name', { ascending: true }),
    ]);
    setLoading(false);
    if (res.error) return toast.error(res.error.message);
    if (lk.error) return toast.error(lk.error.message);
    setRows((res.data || []) as Resource[]);
    setLookups((lk.data || []) as unknown as Lookup[]);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter(r =>
      (categoryFilter === 'all' || r.resource_category === categoryFilter) &&
      (!term || r.resource_name.toLowerCase().includes(term))
    );
  }, [rows, search, categoryFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(blankFor(categories[0]?.name || 'Machining', types[0]?.name || 'Milling'));
    setDialogOpen(true);
  };
  const openEdit = (r: Resource) => {
    setEditing(r);
    setForm({
      resource_name: r.resource_name,
      resource_type: r.resource_type,
      resource_category: r.resource_category || (categories[0]?.name || 'Machining'),
      available_hours_per_day: r.available_hours_per_day,
      number_of_shifts: r.number_of_shifts,
      status: r.status,
      supplier_name: r.supplier_name,
      lead_time_days: r.lead_time_days,
      scheduling_mode: r.scheduling_mode || defaultModeFor(r.resource_category),
    });
    setDialogOpen(true);
  };

  const isSubcon = form.resource_category === 'Subcontractor';
  const isPerson = form.resource_category === 'Person';

  const save = async () => {
    if (!form.resource_name.trim()) return toast.error('Resource name is required');
    if (isSubcon) {
      if (!form.supplier_name?.trim()) return toast.error('Supplier name is required');
      if (!form.lead_time_days || form.lead_time_days <= 0)
        return toast.error('Lead time (days) must be greater than 0');
    } else {
      if (!form.available_hours_per_day || form.available_hours_per_day <= 0)
        return toast.error('Available hours per day must be greater than 0');
      if (!isPerson && (!form.number_of_shifts || form.number_of_shifts <= 0))
        return toast.error('Number of shifts must be greater than 0');
    }

    setSaving(true);
    const payload = {
      ...form,
      resource_name: form.resource_name.trim(),
      resource_type: isSubcon ? 'Subcontractor' : isPerson ? 'Person' : form.resource_type,
      number_of_shifts: isPerson ? 1 : form.number_of_shifts,
      supplier_name: isSubcon ? form.supplier_name?.trim() || null : null,
      lead_time_days: isSubcon ? form.lead_time_days : null,
    };
    const { error } = editing
      ? await supabase.from('resources').update(payload).eq('id', editing.id)
      : await supabase.from('resources').insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? 'Resource updated' : 'Resource created');
    setDialogOpen(false);
    load();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('resources').delete().eq('id', deleteId);
    if (error) return toast.error(error.message);
    toast.success('Resource deleted');
    setDeleteId(null);
    load();
  };

  return (
    <AppLayout title="Resources" subtitle="Production resources used by the scheduler"
      showBackButton backTo="/npi/capacity-planner-mvp">
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Resources</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setManageOpen(true)}>
                <Settings2 className="h-4 w-4 mr-1" /> Manage lists
              </Button>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1" /> New resource
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Lead Time</TableHead>
                    <TableHead className="text-right">Hours / Day</TableHead>
                    <TableHead className="text-right">Shifts</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {rows.length === 0 ? 'No resources yet. Create your first one.' : 'No matches.'}
                    </TableCell></TableRow>
                  ) : filtered.map(r => {
                    const sub = r.resource_category === 'Subcontractor';
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.resource_name}</TableCell>
                        <TableCell>
                          <Badge variant={sub ? 'secondary' : 'outline'}>{r.resource_category}</Badge>
                        </TableCell>
                        <TableCell>{r.resource_type}</TableCell>
                        <TableCell>{sub ? (r.supplier_name || '—') : '—'}</TableCell>
                        <TableCell className="text-right">{sub && r.lead_time_days ? `${r.lead_time_days} d` : '—'}</TableCell>
                        <TableCell className="text-right">{sub ? '—' : r.available_hours_per_day}</TableCell>
                        <TableCell className="text-right">{sub ? '—' : r.number_of_shifts}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === 'Active' ? 'default' : 'secondary'}>
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit resource' : 'New resource'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Resource name *</Label>
              <Input value={form.resource_name}
                onChange={(e) => setForm({ ...form, resource_name: e.target.value })} />
            </div>
            <div>
              <Label>Resource category *</Label>
              <Select value={form.resource_category}
                onValueChange={(v) => setForm({ ...form, resource_category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isSubcon ? (
              <>
                <div>
                  <Label>Supplier name *</Label>
                  <Input
                    placeholder="e.g. XYZ Passivation Ltd"
                    value={form.supplier_name || ''}
                    onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} />
                </div>
                <div>
                  <Label>Lead time (days) *</Label>
                  <Input type="number" min={1} step={1}
                    value={form.lead_time_days ?? ''}
                    onChange={(e) => setForm({ ...form, lead_time_days: parseFloat(e.target.value) || 0 })} />
                  <p className="text-xs text-muted-foreground mt-1">
                    The Scheduling Engine will use this as the operation duration.
                  </p>
                </div>
              </>
            ) : isPerson ? (
              <div>
                <Label>Working hours / day *</Label>
                <Input type="number" min={1} max={24} step={0.5}
                  value={form.available_hours_per_day}
                  onChange={(e) => setForm({ ...form, available_hours_per_day: parseFloat(e.target.value) || 0 })} />
                <p className="text-xs text-muted-foreground mt-1">
                  This person can only be allocated to one development at a time. The Gantt will warn on overlaps.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <Label>Resource type *</Label>
                  <Select value={form.resource_type}
                    onValueChange={(v) => setForm({ ...form, resource_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {types.map(t => (
                        <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Available hours / day *</Label>
                    <Input type="number" min={1} max={24} step={0.5}
                      value={form.available_hours_per_day}
                      onChange={(e) => setForm({ ...form, available_hours_per_day: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <Label>Number of shifts *</Label>
                    <Input type="number" min={1} max={3} step={1}
                      value={form.number_of_shifts}
                      onChange={(e) => setForm({ ...form, number_of_shifts: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
              </>
            )}

            <div>
              <Label>Scheduling mode *</Label>
              <Select value={form.scheduling_mode}
                onValueChange={(v) => setForm({ ...form, scheduling_mode: v as 'Exclusive' | 'Parallel' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Exclusive">Exclusive — one operation at a time (queues)</SelectItem>
                  <SelectItem value="Parallel">Parallel — multiple operations simultaneously</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Use Exclusive for machines (Mill, Turn, EDM, Grinding). Use Parallel for Deburr, Wash, Passivation, Inspection, Subcontractors.
              </p>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as 'Active' | 'Inactive' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create resource'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete resource?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The resource will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ManageLookupsDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        lookups={lookups}
        rows={rows}
        onChanged={load}
      />
    </AppLayout>
  );
}

function ManageLookupsDialog({
  open, onOpenChange, lookups, rows, onChanged,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lookups: Lookup[];
  rows: Resource[];
  onChanged: () => void;
}) {
  const categories = lookups.filter(l => l.kind === 'category');
  const types = lookups.filter(l => l.kind === 'type');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage categories & types</DialogTitle>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-6">
          <LookupSection
            title="Resource categories"
            kind="category"
            items={categories}
            usedNames={new Set(rows.map(r => r.resource_category))}
            onChanged={onChanged}
          />
          <LookupSection
            title="Resource types"
            kind="type"
            items={types}
            usedNames={new Set(rows.map(r => r.resource_type))}
            onChanged={onChanged}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LookupSection({
  title, kind, items, usedNames, onChanged,
}: {
  title: string;
  kind: 'category' | 'type';
  items: Lookup[];
  usedNames: Set<string>;
  onChanged: () => void;
}) {
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    const { error } = await supabase.from('resource_lookups' as any).insert({ kind, name });
    setBusy(false);
    if (error) return toast.error(error.message);
    setNewName('');
    onChanged();
  };

  const saveEdit = async (id: string, oldName: string) => {
    const name = editValue.trim();
    if (!name || name === oldName) { setEditId(null); return; }
    setBusy(true);
    // rename usage on resources rows too
    const { error } = await supabase.from('resource_lookups' as any).update({ name }).eq('id', id);
    if (!error) {
      if (kind === 'category') {
        await supabase.from('resources').update({ resource_category: name }).eq('resource_category', oldName);
      } else {
        await supabase.from('resources').update({ resource_type: name }).eq('resource_type', oldName);
      }
    }
    setBusy(false);
    if (error) return toast.error(error.message);
    setEditId(null);
    onChanged();
  };

  const remove = async (id: string, name: string) => {
    if (usedNames.has(name)) {
      return toast.error(`"${name}" is in use by one or more resources. Reassign them first.`);
    }
    setBusy(true);
    const { error } = await supabase.from('resource_lookups' as any).delete().eq('id', id);
    setBusy(false);
    if (error) return toast.error(error.message);
    onChanged();
  };

  return (
    <div className="space-y-2">
      <div className="font-medium text-sm">{title}</div>
      <div className="flex gap-2">
        <Input
          placeholder={`Add ${kind}…`}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <Button size="sm" onClick={add} disabled={busy || !newName.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="rounded-md border divide-y">
        {items.length === 0 ? (
          <div className="p-3 text-sm text-muted-foreground text-center">None yet.</div>
        ) : items.map(it => (
          <div key={it.id} className="flex items-center gap-2 px-3 py-2">
            {editId === it.id ? (
              <>
                <Input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit(it.id, it.name);
                    if (e.key === 'Escape') setEditId(null);
                  }}
                />
                <Button size="icon" variant="ghost" onClick={() => saveEdit(it.id, it.name)}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setEditId(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm">{it.name}</span>
                {usedNames.has(it.name) && (
                  <Badge variant="outline" className="text-xs">in use</Badge>
                )}
                <Button size="icon" variant="ghost"
                  onClick={() => { setEditId(it.id); setEditValue(it.name); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(it.id, it.name)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
