import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useNPIPlanning, recommendAllocations, upsertPart, type AllocationOption } from '@/hooks/useNPIPlanning';
import { toast } from 'sonner';
import { Loader2, Sparkles, CheckCircle2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { QuickCustomerDialog } from '@/components/npi-planner/QuickCustomerDialog';
import { QuickProjectDialog } from '@/components/npi-planner/QuickProjectDialog';
import { ToolingListEditor, type ToolLine } from '@/components/npi-planner/ToolingListEditor';

const MATERIAL_STATUSES = ['Not Required','Required','Ordered','Received','Delayed','Issue'];
const TOOLING_STATUSES = ['Not Required','Required','Ordered','Received','Delayed','Issue'];
const SUBCON_STATUSES = ['Not Required','Required','Sent Out','In Progress','Returned','Delayed','Issue'];
const OVERALL_STATUSES = ['Not Started','Awaiting Material','Awaiting Tooling','Awaiting Subcon','Ready to Schedule','Scheduled','In Development','In Production','Completed','On Hold','At Risk','Late'];

export default function PartSetup() {
  const navigate = useNavigate();
  const { customers, projects, machines, schedule, loading, reload } = useNPIPlanning();
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState<AllocationOption[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [machineOptionIds, setMachineOptionIds] = useState<string[]>([]);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [toolLines, setToolLines] = useState<ToolLine[]>([]);

  const [form, setForm] = useState<any>({
    customer_id: '', project_id: '', engineer: '',
    part_number: '', part_revision: '', description: '', po: '', qty: 1,
    material: '', material_lead_time: 0, material_status: 'Not Required',
    tooling: '', tooling_lead_time: 0, tooling_status: 'Not Required',
    committed_date: '', best_commence_date: '', ship_date: '',
    cycle_time: 0, development_time: 0,
    subcon: false, supplier_name: '', type_of_service: '', subcon_lead_time: 0, subcon_status: 'Not Required',
    sales_price: 0, notes: '', overall_status: 'Not Started',
  });

  const totalRequired = (Number(form.cycle_time) || 0) + (Number(form.development_time) || 0);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const filteredProjects = useMemo(
    () => projects.filter(p => !form.customer_id || p.customer_id === form.customer_id),
    [projects, form.customer_id],
  );

  const runAllocation = () => {
    if (machineOptionIds.length === 0) {
      toast.error('Select at least one candidate machine');
      return;
    }
    if (totalRequired <= 0) {
      toast.error('Cycle time + development time must be > 0');
      return;
    }
    const candidates = machines.filter(m => machineOptionIds.includes(m.id));
    const opts = recommendAllocations(
      candidates, schedule, totalRequired,
      form.best_commence_date ? new Date(form.best_commence_date) : null,
      form.committed_date ? new Date(form.committed_date) : null,
    );
    setOptions(opts);
    if (opts[0]) setSelectedMachineId(opts[0].machine.id);
  };

  const handleSave = async () => {
    if (!form.part_number.trim()) return toast.error('Part number is required');
    setSaving(true);
    try {
      const customer = customers.find(c => c.id === form.customer_id);
      const project = projects.find(p => p.id === form.project_id);
      const machine = machines.find(m => m.id === selectedMachineId);
      const chosen = options.find(o => o.machine.id === selectedMachineId);

      const partData: any = {
        ...form,
        customer_id: form.customer_id || null,
        project_id: form.project_id || null,
        committed_date: form.committed_date || null,
        best_commence_date: form.best_commence_date || null,
        ship_date: form.ship_date || null,
        customer_name: customer?.customer_name || null,
        project_name: project?.project_name || null,
        machine_id: machine?.id || null,
        machine_name: machine?.machine_name || null,
      };
      delete partData.id;

      const part = await upsertPart(partData, machineOptionIds);

      // If allocation chosen, create schedule entry
      if (part && chosen) {
        await supabase.from('npi_machine_schedule').insert({
          part_id: part.id,
          part_number: part.part_number,
          customer_name: part.customer_name,
          project_name: part.project_name,
          machine_id: chosen.machine.id,
          machine_name: chosen.machine.machine_name,
          start_date: chosen.earliestStart.toISOString(),
          end_date: chosen.end.toISOString(),
          total_required_time: totalRequired,
          allocation_status: 'Confirmed',
        });
      }

      // Persist tooling lines + upsert catalog entries
      if (part && toolLines.length > 0) {
        const rows = toolLines
          .filter(t => t.tooling_description?.trim())
          .map(t => ({
            part_id: part.id,
            part_number: part.part_number,
            po: form.po || null,
            tooling_description: t.tooling_description,
            supplier: t.supplier || null,
            supplier_id: t.supplier_id || null,
            qty: Number(t.qty) || 1,
            unit_cost: Number(t.unit_cost) || 0,
            total_cost: (Number(t.qty) || 0) * (Number(t.unit_cost) || 0),
            lead_time_days: Number(t.lead_time_days) || 0,
            expected_delivery_date: t.expected_delivery_date || null,
            ordered_status: t.ordered_status || 'Not Ordered',
            required_status: 'Required',
            catalog_tool_id: t.catalog_tool_id || null,
          }));
        if (rows.length) await supabase.from('npi_tooling_tracker').insert(rows as any);

        // Add brand-new tools to catalog (no catalog_tool_id, has description)
        const newCatalog = toolLines
          .filter(t => !t.catalog_tool_id && t.tooling_description?.trim() && t.save_to_catalog !== false)
          .map(t => ({
            tool_code: t.tool_code || null,
            description: t.tooling_description,
            supplier: t.supplier || null,
            supplier_id: t.supplier_id || null,
            unit_cost: Number(t.unit_cost) || 0,
            lead_time_days: Number(t.lead_time_days) || 0,
          }));
        if (newCatalog.length) await supabase.from('npi_tools_catalog').insert(newCatalog as any);
      }

      toast.success('Part created and allocated');
      reload();
      navigate('/npi/capacity-planner/jobs');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AppLayout title="New Part" showBackButton backTo="/npi/capacity-planner"><div className="flex items-center justify-center h-96"><Loader2 className="animate-spin"/></div></AppLayout>;

  return (
    <AppLayout title="New Part / Job" subtitle="Setup & machine allocation" showBackButton backTo="/npi/capacity-planner">
      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Part details</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4">
            <Field label="Customer">
              <div className="flex gap-1">
                <Select value={form.customer_id} onValueChange={v => { set('customer_id', v); set('project_id', ''); }}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.customer_code ? `${c.customer_code} — ` : ''}{c.customer_name}</SelectItem>)}</SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setCustomerDialogOpen(true)} title="New customer"><Plus className="h-4 w-4" /></Button>
              </div>
            </Field>
            <Field label="Project">
              <div className="flex gap-1">
                <Select value={form.project_id} onValueChange={v => {
                  set('project_id', v);
                  const proj = projects.find(p => p.id === v);
                  if (proj?.engineer) set('engineer', proj.engineer);
                }} disabled={!form.customer_id}>
                  <SelectTrigger><SelectValue placeholder={form.customer_id ? 'Select' : 'Pick customer first'} /></SelectTrigger>
                  <SelectContent>{filteredProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}</SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setProjectDialogOpen(true)} disabled={!form.customer_id} title="New project"><Plus className="h-4 w-4" /></Button>
              </div>
            </Field>
            <Field label="Engineer">
              <Input value={form.engineer} disabled placeholder="—" />
            </Field>
            <Field label="Part Number *"><Input value={form.part_number} onChange={e => set('part_number', e.target.value)} /></Field>
            <Field label="Part Revision"><Input value={form.part_revision} onChange={e => set('part_revision', e.target.value)} placeholder="e.g. A" /></Field>
            <Field label="Part Description"><Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Short description" /></Field>
            <Field label="PO"><Input value={form.po} onChange={e => set('po', e.target.value)} /></Field>
            <Field label="QTY"><Input type="number" value={form.qty} onChange={e => set('qty', +e.target.value)} /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Material</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4">
            <Field label="Material"><Input value={form.material} onChange={e => set('material', e.target.value)} /></Field>
            <Field label="Lead time (days)"><Input type="number" value={form.material_lead_time} onChange={e => set('material_lead_time', +e.target.value)} /></Field>
            <Field label="Status">
              <Select value={form.material_status} onValueChange={v => set('material_status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MATERIAL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Tooling</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Summary status">
                <Select value={form.tooling_status} onValueChange={v => set('tooling_status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TOOLING_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Lead time (days)"><Input type="number" value={form.tooling_lead_time} onChange={e => set('tooling_lead_time', +e.target.value)} /></Field>
              <Field label="Total tooling cost (€)">
                <Input value={toolLines.reduce((s, t) => s + (Number(t.qty) || 0) * (Number(t.unit_cost) || 0), 0).toFixed(2)} disabled />
              </Field>
            </div>
            <ToolingListEditor lines={toolLines} onChange={setToolLines} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Subcon</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4">
            <Field label="Required"><div className="flex items-center gap-2 h-10"><Checkbox checked={form.subcon} onCheckedChange={v => set('subcon', !!v)} /><span className="text-sm">Has subcon</span></div></Field>
            <Field label="Supplier name"><Input value={form.supplier_name} onChange={e => set('supplier_name', e.target.value)} /></Field>
            <Field label="Type of service"><Input value={form.type_of_service} onChange={e => set('type_of_service', e.target.value)} /></Field>
            <Field label="Subcon lead time (days)"><Input type="number" value={form.subcon_lead_time} onChange={e => set('subcon_lead_time', +e.target.value)} /></Field>
            <Field label="Subcon status">
              <Select value={form.subcon_status} onValueChange={v => set('subcon_status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SUBCON_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Time & dates</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4">
            <Field label="Cycle time (hrs)"><Input type="number" step="0.1" value={form.cycle_time} onChange={e => set('cycle_time', +e.target.value)} /></Field>
            <Field label="Development time (hrs)"><Input type="number" step="0.1" value={form.development_time} onChange={e => set('development_time', +e.target.value)} /></Field>
            <Field label="Total required (auto)"><Input value={totalRequired} disabled /></Field>
            <Field label="Best commence date"><Input type="date" value={form.best_commence_date} onChange={e => set('best_commence_date', e.target.value)} /></Field>
            <Field label="Committed date"><Input type="date" value={form.committed_date} onChange={e => set('committed_date', e.target.value)} /></Field>
            <Field label="Ship date"><Input type="date" value={form.ship_date} onChange={e => set('ship_date', e.target.value)} /></Field>
            <Field label="Sales price (€)"><Input type="number" step="0.01" value={form.sales_price} onChange={e => set('sales_price', +e.target.value)} /></Field>
            <Field label="Overall status">
              <Select value={form.overall_status} onValueChange={v => set('overall_status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{OVERALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Notes" className="md:col-span-3"><Textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Machine allocation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Which machines can run this job?</Label>
              <div className="grid md:grid-cols-3 gap-2 mt-2">
                {machines.map(m => (
                  <label key={m.id} className="flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer hover:bg-muted/40">
                    <Checkbox
                      checked={machineOptionIds.includes(m.id)}
                      onCheckedChange={(v) => setMachineOptionIds(ids => v ? [...ids, m.id] : ids.filter(i => i !== m.id))}
                    />
                    <span className="text-sm">{m.machine_name}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={runAllocation} variant="default"><Sparkles className="mr-2 h-4 w-4" />Recommend allocation</Button>
            {options.length > 0 && (
              <div className="space-y-2">
                <Separator />
                <p className="text-sm font-medium">Recommended options (best first)</p>
                {options.map((o, i) => (
                  <label key={o.machine.id} className={`flex items-center justify-between border rounded-md px-3 py-2 cursor-pointer ${selectedMachineId === o.machine.id ? 'border-primary bg-primary/5' : ''}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" checked={selectedMachineId === o.machine.id} onChange={() => setSelectedMachineId(o.machine.id)} />
                      <div>
                        <div className="font-medium text-sm">{i === 0 && <Badge variant="default" className="mr-2">Best</Badge>}{o.machine.machine_name}</div>
                        <div className="text-xs text-muted-foreground">
                          Start: {o.earliestStart.toLocaleString()} · End: {o.end.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {o.meetsCommittedDate
                        ? <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30"><CheckCircle2 className="h-3 w-3 mr-1"/>Meets committed</Badge>
                        : <Badge variant="destructive">Misses committed</Badge>}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate('/npi/capacity-planner')}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save part'}</Button>
        </div>
      </main>

      <QuickCustomerDialog
        open={customerDialogOpen}
        onOpenChange={setCustomerDialogOpen}
        onCreated={async (c) => { await reload(); set('customer_id', c.id); set('project_id', ''); }}
      />
      <QuickProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        customerId={form.customer_id || null}
        customerName={customers.find(c => c.id === form.customer_id)?.customer_name || null}
        onCreated={async (p) => { await reload(); set('project_id', p.id); }}
      />
    </AppLayout>
  );
}

function Field({ label, children, className = '' }: any) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
