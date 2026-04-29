import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useNPIPlanning } from '@/hooks/useNPIPlanning';
import { Loader2, Library } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addDays, format, parseISO } from 'date-fns';

const MATERIAL_STATUSES = ['Not Required', 'Required', 'Ordered', 'Received', 'Delayed', 'Issue'];

const TONE: Record<string, string> = {
  'Received': 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  'Ordered': 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  'Required': 'bg-amber-500/15 text-amber-800 border-amber-500/30',
  'Not Required': 'bg-muted text-muted-foreground',
  'Delayed': 'bg-destructive/15 text-destructive border-destructive/30',
  'Issue': 'bg-destructive/15 text-destructive border-destructive/30',
};

export default function MaterialTracker() {
  const { parts, materialsCatalog, loading, reload } = useNPIPlanning();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [savingId, setSavingId] = useState<string | null>(null);

  const filtered = useMemo(() => parts.filter(p => {
    if (search && !`${p.part_number} ${p.material || ''}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && (p.material_status || 'Required') !== statusFilter) return false;
    return true;
  }), [parts, search, statusFilter]);

  const updateStatus = async (partId: string, value: string) => {
    setSavingId(partId);
    const patch: any = { material_status: value };
    const now = new Date().toISOString();
    if (value === 'Ordered') patch.material_ordered_at = now;
    if (value === 'Received') patch.material_received_at = now;
    const { error } = await supabase.from('npi_parts').update(patch).eq('id', partId);
    setSavingId(null);
    if (error) return toast.error(error.message);
    toast.success(`Material → ${value}`);
    reload();
  };

  const updateLead = async (partId: string, value: number) => {
    setSavingId(partId);
    const { error } = await supabase.from('npi_parts').update({ material_lead_time: value }).eq('id', partId);
    setSavingId(null);
    if (error) return toast.error(error.message);
    reload();
  };

  const pickFromCatalog = async (partId: string, mat: any) => {
    setSavingId(partId);
    const patch: any = {
      material_catalog_id: mat.id,
      material: mat.material_description,
    };
    // Pre-fill lead time from catalog default if part has none yet
    const part = parts.find((p: any) => p.id === partId);
    if (part && (part.material_lead_time == null || part.material_lead_time === 0) && mat.default_lead_time_days != null) {
      patch.material_lead_time = mat.default_lead_time_days;
    }
    const { error } = await supabase.from('npi_parts').update(patch).eq('id', partId);
    setSavingId(null);
    if (error) return toast.error(error.message);
    toast.success(`Linked to ${mat.material_description}`);
    reload();
  };

  const expectedDate = (p: any) => {
    if (p.material_status === 'Received' && p.material_received_at) {
      return `Received ${format(parseISO(p.material_received_at), 'MMM d')}`;
    }
    if (p.material_status === 'Ordered' && p.material_ordered_at && p.material_lead_time) {
      const eta = addDays(parseISO(p.material_ordered_at), Number(p.material_lead_time));
      return `ETA ${format(eta, 'MMM d, yyyy')}`;
    }
    if (p.material_lead_time) return `${p.material_lead_time}d lead (clock not started)`;
    return '-';
  };

  if (loading) return <AppLayout title="Material Tracker" showBackButton backTo="/npi/capacity-planner"><div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" /></div></AppLayout>;

  return (
    <AppLayout title="Material Tracker" subtitle="Pick from Materials Catalog. Mark Ordered to start lead-time clock; Received frees the part for production." showBackButton backTo="/npi/capacity-planner">
      <main className="container mx-auto px-4 py-8 space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Parts ({filtered.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-3 gap-2">
              <Input placeholder="Search part / material" value={search} onChange={e => setSearch(e.target.value)} />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {MATERIAL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Material (from catalog)</TableHead>
                    <TableHead>Lead time (d)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ordered</TableHead>
                    <TableHead>Received / ETA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No parts.</TableCell></TableRow>
                  ) : filtered.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.part_number}</TableCell>
                      <TableCell>{p.customer_name || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{p.material || <span className="text-muted-foreground italic">— none —</span>}</span>
                          <CatalogPicker catalog={materialsCatalog} onPick={(m) => pickFromCatalog(p.id, m)} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          defaultValue={p.material_lead_time ?? ''}
                          onBlur={(e) => {
                            const v = Number(e.target.value) || 0;
                            if (v !== (p.material_lead_time ?? 0)) updateLead(p.id, v);
                          }}
                          className="h-8 w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select value={p.material_status || 'Required'} onValueChange={v => updateStatus(p.id, v)}>
                            <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {MATERIAL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          {savingId === p.id && <Loader2 className="h-4 w-4 animate-spin" />}
                          <Badge variant="outline" className={TONE[p.material_status || 'Required'] || ''}>{p.material_status || 'Required'}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>{p.material_ordered_at ? format(parseISO(p.material_ordered_at), 'MMM d, yyyy') : '-'}</TableCell>
                      <TableCell>{expectedDate(p)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: lead time is pre-filled from the catalog default the first time you link, but can be overridden here per part for a better/worse supplier quote.
            </p>
          </CardContent>
        </Card>
      </main>
    </AppLayout>
  );
}

function CatalogPicker({ catalog, onPick }: { catalog: any[]; onPick: (m: any) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" size="icon" variant="outline" className="h-7 w-7" title="Pick from Materials Catalog">
          <Library className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-80" align="start">
        <Command>
          <CommandInput placeholder="Search materials…" />
          <CommandList>
            <CommandEmpty>No materials in catalog</CommandEmpty>
            <CommandGroup>
              {catalog.map((m: any) => (
                <CommandItem
                  key={m.id}
                  value={`${m.material_code || ''} ${m.material_description} ${m.supplier || ''}`}
                  onSelect={() => { onPick(m); setOpen(false); }}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {m.material_code ? `${m.material_code} · ` : ''}{m.material_description}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {m.supplier || '—'} · €{Number(m.default_unit_cost || 0).toFixed(2)} · {m.default_lead_time_days ?? 0}d (default)
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
