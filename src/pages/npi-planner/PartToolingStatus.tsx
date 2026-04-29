import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useNPIPlanning } from '@/hooks/useNPIPlanning';
import { Loader2, Mail, Phone, ExternalLink, Copy, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addDays, format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';

const TOOLING_STATUSES = ['Not Required', 'Required', 'Ordered', 'Received', 'Delayed', 'Issue'];

const TONE: Record<string, string> = {
  'Received': 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  'Ordered': 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  'Required': 'bg-amber-500/15 text-amber-800 border-amber-500/30',
  'Not Required': 'bg-muted text-muted-foreground',
  'Delayed': 'bg-destructive/15 text-destructive border-destructive/30',
  'Issue': 'bg-destructive/15 text-destructive border-destructive/30',
  'Not Ordered': 'bg-destructive/10 text-destructive border-destructive/30',
};

export default function PartToolingStatus() {
  const { parts, partTooling, toolingCatalog, loading, reload } = useNPIPlanning();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [detailPart, setDetailPart] = useState<any | null>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // Add-tool-to-part dialog state
  const [addCatalogId, setAddCatalogId] = useState<string>('');
  const [addQty, setAddQty] = useState<number>(1);

  useEffect(() => {
    supabase.from('npi_suppliers').select('*').then(({ data }) => setSuppliers(data || []));
  }, []);

  // Index part-tooling by part for fast lookup
  const linksByPart = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const l of partTooling) {
      const arr = map.get(l.part_id) || [];
      arr.push(l);
      map.set(l.part_id, arr);
    }
    return map;
  }, [partTooling]);

  // Aggregated per-part status: worst-case across linked tools
  const partAggregate = (p: any) => {
    const links = linksByPart.get(p.id) || [];
    if (links.length === 0) return { status: 'Not Required', leadTime: 0 };
    const order = ['Issue', 'Delayed', 'Required', 'Not Ordered', 'Ordered', 'Received', 'Not Required'];
    let worst = 'Not Required';
    let lead = 0;
    for (const l of links) {
      const s = l.ordered_status || 'Not Ordered';
      if (order.indexOf(s) < order.indexOf(worst)) worst = s;
      if (l.lead_time_days && l.lead_time_days > lead) lead = l.lead_time_days;
    }
    return { status: worst, leadTime: lead };
  };

  const filtered = useMemo(() => parts.filter(p => {
    if (search && !`${p.part_number} ${p.customer_name || ''}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && partAggregate(p).status !== statusFilter) return false;
    return true;
  }), [parts, search, statusFilter, linksByPart]);

  const updateLinkStatus = async (linkId: string, value: string) => {
    setSavingId(linkId);
    const patch: any = { ordered_status: value };
    const now = new Date().toISOString();
    if (value === 'Ordered') patch.ordered_at = now;
    if (value === 'Received') patch.received_at = now;
    const { error } = await supabase.from('npi_part_tooling').update(patch).eq('id', linkId);
    setSavingId(null);
    if (error) return toast.error(error.message);
    toast.success(`Tool → ${value}`);
    reload();
  };

  const updateLinkField = async (linkId: string, patch: any) => {
    const { error } = await supabase.from('npi_part_tooling').update(patch).eq('id', linkId);
    if (error) return toast.error(error.message);
    reload();
  };

  const removeLink = async (linkId: string) => {
    if (!confirm('Unlink this tool from the part?')) return;
    const { error } = await supabase.from('npi_part_tooling').delete().eq('id', linkId);
    if (error) return toast.error(error.message);
    toast.success('Unlinked');
    reload();
  };

  const addToolToPart = async () => {
    if (!detailPart || !addCatalogId) return toast.error('Pick a tool from the catalog');
    const tool = toolingCatalog.find((t: any) => t.id === addCatalogId);
    if (!tool) return;
    const { error } = await supabase.from('npi_part_tooling').insert({
      part_id: detailPart.id,
      catalog_tool_id: tool.id,
      tooling_description: tool.tooling_description,
      supplier: tool.supplier,
      supplier_id: tool.supplier_id,
      qty: addQty || 1,
      unit_cost: tool.default_unit_cost || 0,
      total_cost: (tool.default_unit_cost || 0) * (addQty || 1),
      lead_time_days: tool.default_lead_time_days,
      ordered_status: 'Not Ordered',
    });
    if (error) return toast.error(error.message);
    toast.success('Tool linked');
    setAddCatalogId('');
    setAddQty(1);
    reload();
  };

  const expectedDate = (l: any) => {
    if (l.ordered_status === 'Received' && l.received_at) {
      return `Received ${format(parseISO(l.received_at), 'MMM d')}`;
    }
    if (l.ordered_status === 'Ordered' && l.ordered_at && l.lead_time_days) {
      const eta = addDays(parseISO(l.ordered_at), Number(l.lead_time_days));
      return `ETA ${format(eta, 'MMM d, yyyy')}`;
    }
    if (l.expected_delivery_date) return l.expected_delivery_date;
    if (l.lead_time_days) return `${l.lead_time_days}d lead (clock not started)`;
    return '-';
  };

  const partLinks = useMemo(() => (detailPart ? (linksByPart.get(detailPart.id) || []) : []), [detailPart, linksByPart]);

  const supplierFor = (l: any) =>
    suppliers.find(s => s.id === l.supplier_id) ||
    suppliers.find(s => s.supplier_name && l.supplier && s.supplier_name.toLowerCase() === String(l.supplier).toLowerCase());

  const toolsBySupplier = useMemo(() => {
    const groups = new Map<string, { name: string; email?: string; tools: any[] }>();
    for (const l of partLinks) {
      const sup = supplierFor(l);
      const name = sup?.supplier_name || l.supplier || 'Unknown supplier';
      const key = (sup?.id || name).toString();
      if (!groups.has(key)) groups.set(key, { name, email: sup?.email, tools: [] });
      groups.get(key)!.tools.push(l);
    }
    return Array.from(groups.values());
  }, [partLinks, suppliers]);

  const buildRFQ = (supplierName: string, tools: any[]) => {
    const lines = tools.map((t, i) =>
      `${i + 1}. Tool Description: ${t.tooling_description || '-'}\n   Quantity: ${t.qty || 1}\n   Drawing / Reference: ${detailPart?.part_number || '-'}`
    ).join('\n\n');
    return `Hi ${supplierName},

I hope you are doing well.

We would like to request a quotation and lead time for the following tooling:

${lines}

Could you please provide:
- Unit price
- Lead time
- Any minimum order quantity (if applicable)
- Any additional technical comments or recommendations

If you require further information or clarification, please let me know.

We would appreciate your feedback at your earliest convenience.

Kind regards,`;
  };

  const copyRFQ = async (supplierName: string, tools: any[]) => {
    try {
      await navigator.clipboard.writeText(buildRFQ(supplierName, tools));
      toast.success(`RFQ for ${supplierName} copied to clipboard`);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  if (loading) return (
    <AppLayout title="Tooling Tracker" showBackButton backTo="/npi/capacity-planner">
      <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" /></div>
    </AppLayout>
  );

  return (
    <AppLayout
      title="Tooling Status (per part)"
      subtitle="Link tools from the catalog to a PN, then track status. Mark Ordered to start lead-time clock; Received frees the part for production."
      showBackButton
      backTo="/npi/capacity-planner"
    >
      <main className="container mx-auto px-4 py-8 space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Parts ({filtered.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-3 gap-2">
              <Input placeholder="Search part / customer" value={search} onChange={e => setSearch(e.target.value)} />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {TOOLING_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Tools linked</TableHead>
                    <TableHead>Max lead</TableHead>
                    <TableHead>Aggregate status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No parts.</TableCell></TableRow>
                  ) : filtered.map((p: any) => {
                    const agg = partAggregate(p);
                    const count = (linksByPart.get(p.id) || []).length;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          <button type="button" onClick={() => setDetailPart(p)} className="text-primary hover:underline">
                            {p.part_number}
                          </button>
                        </TableCell>
                        <TableCell>{p.customer_name || '-'}</TableCell>
                        <TableCell>{count}</TableCell>
                        <TableCell>{agg.leadTime ? `${agg.leadTime}d` : '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={TONE[agg.status] || ''}>{agg.status}</Badge>
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

      <Dialog open={!!detailPart} onOpenChange={o => !o && setDetailPart(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{detailPart?.part_number} — Tooling</DialogTitle>
            <DialogDescription>{detailPart?.customer_name || '—'}</DialogDescription>
          </DialogHeader>

          {/* Add from catalog */}
          <div className="border rounded-md p-3 space-y-2 bg-muted/30">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Link a tool from catalog</div>
            <div className="flex gap-2 items-end flex-wrap">
              <div className="flex-1 min-w-[240px]">
                <Label className="text-xs">Tool</Label>
                <Select value={addCatalogId} onValueChange={setAddCatalogId}>
                  <SelectTrigger><SelectValue placeholder="Select catalog tool" /></SelectTrigger>
                  <SelectContent>
                    {toolingCatalog.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.tooling_description}{t.supplier ? ` — ${t.supplier}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-24">
                <Label className="text-xs">Qty</Label>
                <Input type="number" min={1} value={addQty} onChange={e => setAddQty(Number(e.target.value) || 1)} />
              </div>
              <Button onClick={addToolToPart} disabled={!addCatalogId}><Plus className="h-4 w-4 mr-1" />Link</Button>
              <Button variant="ghost" asChild>
                <Link to="/npi/capacity-planner/tooling"><ExternalLink className="h-4 w-4 mr-1" />Manage catalog</Link>
              </Button>
            </div>
          </div>

          {partLinks.length === 0 ? (
            <div className="py-6 text-sm text-muted-foreground text-center border rounded-md">
              No tools linked to this part yet.
            </div>
          ) : (
            <div className="border rounded-md overflow-x-auto max-h-[50vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tool</TableHead>
                    <TableHead>Supplier / Contact</TableHead>
                    <TableHead>Qty / PO</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partLinks.map((l: any) => {
                    const sup = supplierFor(l);
                    return (
                      <TableRow key={l.id} className="align-top">
                        <TableCell className="font-medium">
                          {l.tooling_description}
                          {l.notes ? <div className="text-xs text-muted-foreground mt-1">{l.notes}</div> : null}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{sup?.supplier_name || l.supplier || '-'}</div>
                          {sup?.contact_name && <div className="text-xs text-muted-foreground">{sup.contact_name}</div>}
                          <div className="flex flex-col gap-0.5 mt-1">
                            {sup?.email && (
                              <a href={`mailto:${sup.email}`} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                                <Mail className="h-3 w-3" />{sup.email}
                              </a>
                            )}
                            {sup?.phone && (
                              <a href={`tel:${sup.phone}`} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                                <Phone className="h-3 w-3" />{sup.phone}
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            defaultValue={l.qty || 1}
                            className="h-7 w-20 text-xs"
                            onBlur={e => updateLinkField(l.id, { qty: Number(e.target.value) || 1, total_cost: (Number(e.target.value) || 1) * (l.unit_cost || 0) })}
                          />
                          <Input
                            placeholder="PO"
                            defaultValue={l.po || ''}
                            className="h-7 w-24 text-xs mt-1"
                            onBlur={e => updateLinkField(l.id, { po: e.target.value || null })}
                          />
                        </TableCell>
                        <TableCell>{l.lead_time_days ? `${l.lead_time_days}d` : '-'}</TableCell>
                        <TableCell>
                          <Select value={l.ordered_status || 'Not Ordered'} onValueChange={v => updateLinkStatus(l.id, v)}>
                            <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {TOOLING_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          {savingId === l.id && <Loader2 className="h-4 w-4 animate-spin mt-1" />}
                        </TableCell>
                        <TableCell className="text-xs">{expectedDate(l)}</TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => removeLink(l.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {toolsBySupplier.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">RFQ email (copy & send)</div>
              <div className="flex flex-wrap gap-2">
                {toolsBySupplier.map(g => (
                  <Button key={g.name} size="sm" variant="secondary" onClick={() => copyRFQ(g.name, g.tools)}>
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Copy RFQ for {g.name} ({g.tools.length})
                  </Button>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setDetailPart(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
